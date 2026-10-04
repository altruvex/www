"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { resolveRole, can } from "@/lib/rbac";
import { recordActivity, userActor } from "@/lib/activity-log";
import { getDeletable, type DeletionPlan } from "@/lib/deletable";

async function context() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string; role?: string; opsRole?: string | null } | undefined;
  const role = resolveRole(user ?? {});
  return { session, role, userId: user?.id ?? null };
}

export interface DeletionPreview {
  plans: DeletionPlan[];
  missing: string[];
  permitted: boolean;
  canOverride: boolean;
  noun: string;
  plural: string;
}

export async function describeDeletion(
  entity: string,
  ids: string[],
): Promise<DeletionPreview> {
  const deletable = getDeletable(entity);
  const { role, userId } = await context();
  const permitted = can(role, "delete", deletable.subject);

  const plans: DeletionPlan[] = [];
  const missing: string[] = [];
  if (permitted) {
    for (const id of ids) {
      const plan = await deletable.plan(id, { userId });
      if (plan) plans.push(plan);
      else missing.push(id);
    }
  }

  return {
    plans,
    missing,
    permitted,
    canOverride: role === "OWNER",
    noun: deletable.noun,
    plural: deletable.plural,
  };
}

export interface DeletionResult {
  deleted: number;
  refused: { label: string; reason: string }[];
}

export async function deleteRecords(
  entity: string,
  ids: string[],
  options: { override?: boolean } = {},
): Promise<DeletionResult> {
  const deletable = getDeletable(entity);
  const { session, role, userId } = await context();

  if (!can(role, "delete", deletable.subject)) {
    throw new Error(
      `Your role cannot delete ${deletable.plural}. Ask an owner, or change the role matrix.`,
    );
  }
  const override = options.override === true && role === "OWNER";

  const actor = userActor(session);
  const actorId = userId;
  const result: DeletionResult = { deleted: 0, refused: [] };

  for (const id of ids) {
    if (entity === "user" && actorId && id === actorId) {
      result.refused.push({
        label: "Your own account",
        reason: "You cannot remove the account you are signed in with.",
      });
      continue;
    }

    const plan = await deletable.plan(id, { userId });
    if (!plan) {
      result.refused.push({ label: id, reason: "Already gone." });
      continue;
    }

    if (plan.block && (plan.block.hard || !override)) {
      result.refused.push({
        label: plan.label,
        reason: plan.block.hard
          ? plan.block.reason
          : `${plan.block.reason} An owner can override this.`,
      });
      continue;
    }

    await recordActivity({
      action: `${entity}.deleted`,
      actor,
      entityType: entity,
      entityId: id,
      entityLabel: plan.label,
      summary:
        override && plan.block
          ? `Deleted ${deletable.noun} — owner override: ${plan.block.reason}`
          : `Deleted ${deletable.noun}`,
      before: plan.snapshot,
      metadata:
        plan.impact.length > 0
          ? {
              cascaded: plan.impact
                .map((i) => `${i.count} ${i.label.toLowerCase()}`)
                .join(", "),
            }
          : null,
    });

    await deletable.remove(id);
    result.deleted += 1;
  }

  if (result.deleted > 0) {
    for (const path of deletable.revalidate) revalidatePath(path);
  }

  return result;
}
