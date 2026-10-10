import "server-only";
import { prisma } from "@repo/database";

/**
 * Stored statuses that end the chase: an alert asking for a follow-up on a
 * lead closed by hand is answered by the closing itself.
 */
const CLOSING_STATUSES = new Set(["LOST", "SPAM", "WON"]);

export function closesFollowUp(status: string | undefined): boolean {
  return status !== undefined && CLOSING_STATUSES.has(status);
}

/**
 * Marks a client's unread FOLLOW_UP_DUE notifications read once the follow-up
 * they asked for has happened (sent, re-dated, cleared, or the lead closed).
 * A notification must never break the mutation it follows, so this swallows
 * its own errors; the audit event stays at the mutation site.
 */
export async function clearFollowUpAlerts(
  clientIds: string | string[],
  context: string,
): Promise<void> {
  const ids = Array.isArray(clientIds) ? clientIds : [clientIds];
  if (ids.length === 0) return;
  try {
    await prisma.notification.updateMany({
      where: {
        type: "FOLLOW_UP_DUE",
        entityType: "client",
        entityId: { in: ids },
        read: false,
      },
      data: { read: true, readAt: new Date() },
    });
  } catch (error) {
    console.error(`[${context}] clearing the follow-up alert failed`, error);
  }
}
