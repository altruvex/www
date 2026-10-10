import type { Prisma } from "@repo/database";
import { recordChange, type Actor } from "./activity-log";

/**
 * What made the deal won: the one thing that may move Client.status to WON
 * (docs/sales-os.md R1). Every signing and every project link passes through
 * here; nothing else writes WON.
 */
export type WonCause =
  | { cause: "contract_signed"; contractId: string }
  | { cause: "project_linked"; projectId: string };

/**
 * Moves a client to WON inside the caller's transaction — the same one that
 * signs the contract or links the project, so the stored status can never
 * contradict the record that won it. Idempotent: a client already WON is left
 * alone and nothing is written. Leaving LOST / NURTURE clears the reason that
 * went with it (and the nurture review date, which is that reason's date);
 * the old values survive in the audit event. The event carries `clientId` so
 * the client's History shows it.
 */
export async function markClientWon(
  tx: Prisma.TransactionClient,
  clientId: string,
  actor: Actor,
  cause: WonCause,
): Promise<{ moved: boolean; from: string | null }> {
  const before = await tx.client.findUnique({
    where: { id: clientId },
    select: {
      status: true,
      name: true,
      company: true,
      lostReason: true,
      lostNote: true,
      nurtureReason: true,
      nextActionAt: true,
      nextActionNote: true,
    },
  });
  if (!before) return { moved: false, from: null };
  if (before.status === "WON") return { moved: false, from: "WON" };

  const leavingNurture = before.status === "NURTURE";
  const data = {
    status: "WON" as const,
    lostReason: null,
    lostNote: null,
    nurtureReason: null,
    ...(leavingNurture ? { nextActionAt: null, nextActionNote: null } : {}),
  };
  await tx.client.update({ where: { id: clientId }, data });

  const { cause: why, ...ref } = cause;
  await recordChange(
    {
      action: "client.status_changed",
      actor,
      entityType: "client",
      entityId: clientId,
      entityLabel: before.company || before.name,
      summary:
        why === "contract_signed"
          ? "Status moved to won — the contract was signed"
          : "Status moved to won — a project was opened",
      before: {
        status: before.status,
        lostReason: before.lostReason,
        lostNote: before.lostNote,
        nurtureReason: before.nurtureReason,
        ...(leavingNurture
          ? {
              nextActionAt: before.nextActionAt?.toISOString() ?? null,
              nextActionNote: before.nextActionNote,
            }
          : {}),
      },
      after: data,
      metadata: { clientId, cause: why, ...ref, from: before.status, automatic: true },
    },
    tx,
  );
  return { moved: true, from: before.status };
}
