import { cache } from "react";
import { prisma } from "@repo/database";
import { getActionCentre } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { uncontactedWhere } from "@/lib/dashboard-data";
import type { BadgeKey } from "@/lib/nav";
import { overdueCutoff } from "@/lib/payment-overdue";
import { countRenewalsNeedingAttention } from "@/lib/renewals";

async function buildShellBadges(userId: string): Promise<{
  badges: Partial<Record<BadgeKey, number>>;
  unread: number;
}> {
  const now = new Date();
  const role = await currentRole();

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
    prisma.client.count({ where: uncontactedWhere() }),
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
      where: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: overdueCutoff(now) } },
    }),
    prisma.incident.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.notification.count({ where: { userId, read: false } }),
    countRenewalsNeedingAttention(now),
    getActionCentre(role),
  ]);

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

export const getShellBadges = cache(buildShellBadges);
