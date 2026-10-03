import { prisma } from "@repo/database";
import { getActionCentre } from "@/lib/action-center";
import type { BadgeKey } from "@/lib/nav";
import { overdueCutoff } from "@/lib/payment-overdue";
import { countRenewalsNeedingAttention } from "@/lib/renewals";

/**
 * Sidebar counts. Every one of these is a "needs a human" count, never a total
 * — a badge that shows "412 clients" trains the operator to ignore badges.
 */
export async function getShellBadges(userId: string): Promise<{
  badges: Partial<Record<BadgeKey, number>>;
  unread: number;
}> {
  const now = new Date();

  const [
    newLeads,
    openProposals,
    unsignedContracts,
    pendingMeetings,
    inboundByClient,
    outboundByClient,
    overduePayments,
    openIncidents,
    unreadNotifications,
    servicesDue,
    attention,
  ] = await Promise.all([
    prisma.client.count({ where: { status: { in: ["NEW", "VIEWED"] } } }),
    prisma.proposal.count({ where: { status: { in: ["SENT", "DELIVERED", "READ", "VIEWED"] } } }),
    prisma.contract.count({ where: { status: "SENT" } }),
    prisma.meeting.count({ where: { status: "PENDING" } }),
    prisma.whatsAppMessage.groupBy({
      by: ["clientId"],
      where: { direction: "INBOUND" },
      _max: { createdAt: true },
    }),
    prisma.whatsAppMessage.groupBy({
      by: ["clientId"],
      where: { direction: "OUTBOUND" },
      _max: { createdAt: true },
    }),
    // Late from the day after the due date — due today is not a badge yet.
    prisma.payment.count({
      where: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: overdueCutoff(now) } },
    }),
    // Open, not total: a resolved incident is history and needs nobody.
    prisma.incident.count({ where: { status: { not: "RESOLVED" } } }),
    // Notifications are written one row per operator, so the unread count is
    // this operator's — an unscoped count multiplied every alert by the team size.
    prisma.notification.count({ where: { userId, read: false } }),
    // Retainers and services inside their alert window or lapsed. Derived from
    // the clock, so the badge is right whether or not the renewal sweep has run.
    countRenewalsNeedingAttention(now),
    // The same memoised list /actions and Today render, so the badge is its
    // length rather than a cheaper estimate that could disagree with it.
    getActionCentre(),
  ]);

  // Unanswered = the client spoke last. A badge showing "every message ever"
  // is a number nobody can act on, and it trains the operator to ignore badges.
  const lastOutbound = new Map(
    outboundByClient.map((row) => [row.clientId, row._max.createdAt?.getTime() ?? 0]),
  );
  const unanswered = inboundByClient.filter(
    (row) => (row._max.createdAt?.getTime() ?? 0) > (lastOutbound.get(row.clientId) ?? 0),
  ).length;

  return {
    badges: {
      leads: newLeads,
      proposals: openProposals,
      contracts: unsignedContracts,
      meetings: pendingMeetings,
      inbox: unanswered,
      payments: overduePayments,
      incidents: openIncidents,
      renewals: servicesDue,
      actions: attention.length,
    },
    unread: unreadNotifications,
  };
}
