"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/database";

import { recordActivity, userActor } from "@/lib/activity-log";
import { getOperator } from "@/lib/authorize";
import {
  FULL_RESET_PHRASE,
  fullResetEnabled,
  isFullResetOwner,
  wipeBusinessData,
} from "@/lib/full-reset";

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

/**
 * Empties every business table. The gate is decided here from the database
 * row, not from anything the client sent: the feature flag, the SUPERADMIN
 * role and the owner's email must all hold.
 */
export async function resetAllData(phrase: string): Promise<ActionResult> {
  const operator = await getOperator();
  if (!operator) return { ok: false, message: "Sign in again to continue." };

  const user = await prisma.user.findUnique({
    where: { id: operator.session.user.id },
    select: { email: true, role: true },
  });

  if (!fullResetEnabled() || !isFullResetOwner(user)) {
    return { ok: false, message: "A full reset is not available for this account." };
  }
  if (phrase.trim() !== FULL_RESET_PHRASE) {
    return { ok: false, message: `Type ${FULL_RESET_PHRASE} exactly to confirm.` };
  }

  let tables: string[];
  try {
    tables = await wipeBusinessData();
  } catch (error) {
    console.error("Full reset failed", error);
    return { ok: false, message: "The reset failed and nothing was changed. See the server log." };
  }

  // The audit table was emptied with the rest, so this is its first row.
  await recordActivity({
    action: "system.full_reset",
    actor: userActor(operator.session),
    entityType: "system",
    entityId: "database",
    entityLabel: "Database",
    summary: `Emptied ${tables.length} tables. Sign-in tables and migrations were kept.`,
    metadata: { tables: tables.join(", ") },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: `Emptied ${tables.length} tables.` };
}
