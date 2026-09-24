import { prisma } from "@repo/database";
import type { BadgeKey } from "@/lib/nav";
import { SERVICE_SOON_DAYS } from "@/lib/service-lifecycle";
import { DAY_MS } from "@/lib/subscription-lifecycle";

/**
 * Sidebar counts. Every one of these is a "needs a human" count, never a total
 * — a badge that shows "412 clients" trains the operator to ignore badges.
 */
export async function getShellBadges(): Promise<{
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
    prisma.payment.count({
      where: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: now } },
    }),
    // Open, not total: a resolved incident is history and needs nobody.
    prisma.incident.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.notification.count({ where: { read: false } }),
    // Inside the first alert threshold or already lapsed. Derived from the
    // clock, so the badge is right whether or not the renewal sweep has run.
    prisma.clientService.count({
      where: {
        status: "ACTIVE",
        expiresAt: { lte: new Date(now.getTime() + SERVICE_SOON_DAYS * DAY_MS) },
      },
    }),
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
      actions: 0,
    },
    unread: unreadNotifications,
  };
}
