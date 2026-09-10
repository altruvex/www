"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { toProductRole, can } from "@/lib/rbac";
import { recordActivity, userActor } from "@/lib/activity-log";
import { getDeletable, type DeletionPlan } from "@/lib/deletable";

/**
 * Deleting records (§ audit trail).
 *
 * Every delete in this app comes through here, for four reasons:
 *
 *  1. **One permission check.** `can(role, "delete", subject)` — the matrix in
 *     lib/rbac.ts decides, not the screen that happens to render the button.
 *  2. **One audit event.** The row's fields are snapshotted into an
 *     `ActivityEvent` *before* it is deleted, so `/audit` can still answer what
 *     was destroyed, by whom, and what it contained.
 *  3. **One protection rule.** Signed contracts, collected payments and
 *     CI-written pipeline records are blocked. An OWNER can override a soft
 *     block deliberately; nobody can override a hard one.
 *  4. **One place that knows the cascade.** Nothing here relies on the caller
 *     to remember that a contract owns a project which owns payments.
 */

async function context() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = toProductRole(
    (session?.user as { role?: string } | undefined)?.role,
  );
  return { session, role };
}

export interface DeletionPreview {
  plans: DeletionPlan[];
  /** Ids that no longer exist — already deleted in another tab, usually. */
  missing: string[];
  /** Whether this operator may delete this kind of record at all. */
  permitted: boolean;
  /** Whether this operator may override a soft block. */
  canOverride: boolean;
  noun: string;
  plural: string;
}

/**
 * What would happen. The confirmation dialog renders this rather than guessing:
 * an operator must see the six rows that go with the one they clicked.
 */
export async function describeDeletion(
  entity: string,
  ids: string[],
): Promise<DeletionPreview> {
  const deletable = getDeletable(entity);
  const { role } = await context();
  const permitted = can(role, "delete", deletable.subject);

  const plans: DeletionPlan[] = [];
  const missing: string[] = [];
  if (permitted) {
    for (const id of ids) {
      const plan = await deletable.plan(id);
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
  /** One line per record that was refused, ready to show as-is. */
  refused: { label: string; reason: string }[];
}

export async function deleteRecords(
  entity: string,
  ids: string[],
  options: { override?: boolean } = {},
): Promise<DeletionResult> {
  const deletable = getDeletable(entity);
  const { session, role } = await context();

  if (!can(role, "delete", deletable.subject)) {
    throw new Error(
      `Your role cannot delete ${deletable.plural}. Ask an owner, or change the role matrix.`,
    );
  }
  const override = options.override === true && role === "OWNER";

  const actor = userActor(session);
  const actorId = (session?.user as { id?: string } | undefined)?.id;
  const result: DeletionResult = { deleted: 0, refused: [] };

  for (const id of ids) {
    // Deleting yourself leaves an app nobody is signed into, from a click that
    // looks like any other row action.
    if (entity === "user" && actorId && id === actorId) {
      result.refused.push({
        label: "Your own account",
        reason: "You cannot remove the account you are signed in with.",
      });
      continue;
    }

    const plan = await deletable.plan(id);
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

    // The audit event is written first and on purpose: if the delete fails the
    // trail shows an attempt, which is the safer of the two wrong answers.
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

export async function deleteRecord(
  entity: string,
  id: string,
  options: { override?: boolean } = {},
): Promise<DeletionResult> {
  return deleteRecords(entity, [id], options);
}
