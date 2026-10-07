import "server-only";
import { headers } from "next/headers";
import { prisma, type Prisma } from "@repo/database";
import { clientPayments, type ClientPayment } from "@/lib/client-payments";
import { listServices, type ServiceRow } from "@/lib/client-services";
import { STAGE_MEETINGS_SELECT, deriveClientStage } from "@/lib/dashboard-data";
import { entityHref } from "@/lib/entity-links";
import { dueLabel, when } from "@/lib/format";
import { isPaymentOverdue } from "@/lib/payment-overdue";
import { publicBaseUrlFromHeaders } from "@/lib/public-url";
import { statusOf } from "@/lib/status";
import { renewalView } from "@/lib/subscription-lifecycle";
import type { Tone } from "@/lib/status";
import { PROJECT_CURRENCY_INCLUDE } from "@/lib/project-currency";

const OPEN_TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED"] as const;
const CLOSED_CHANGE_STATUSES = ["DELIVERED", "DECLINED", "CANCELLED"] as const;

export const CLIENT_HUB_INCLUDE = {
  contactSubmission: {
    include: {
      notes: {
        include: { createdBy: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
      tags: true,
      meetings: true,
    },
  },
  transparencyLead: true,
  proposals: {
    orderBy: { createdAt: "desc" },
    include: { contract: { select: { id: true, status: true } } },
  },
  contracts: {
    orderBy: { createdAt: "desc" },
    include: {
      proposal: { select: { projectType: true } },
      project: { select: { id: true } },
    },
  },
  projects: {
    orderBy: { createdAt: "desc" },
    include: {
      payments: { orderBy: { createdAt: "asc" } },
      ...PROJECT_CURRENCY_INCLUDE,
      changeRequests: {
        orderBy: { requestedAt: "desc" },
        select: { id: true, title: true, status: true, requestedAt: true },
      },
      _count: {
        select: {
          tasks: { where: { status: { in: [...OPEN_TASK_STATUSES] } } },
        },
      },
    },
  },
  subscriptions: {
    orderBy: { createdAt: "desc" },
    include: { payments: { orderBy: { createdAt: "asc" } } },
  },
  products: {
    orderBy: { createdAt: "desc" },
    include: {
      deployments: {
        where: { environment: "PRODUCTION", status: "SUCCEEDED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          number: true,
          version: true,
          finishedAt: true,
          createdAt: true,
        },
      },
      incidents: {
        where: { status: { not: "RESOLVED" } },
        orderBy: { detectedAt: "desc" },
        select: {
          id: true,
          number: true,
          title: true,
          severity: true,
          status: true,
          detectedAt: true,
        },
      },
    },
  },
  messages: { orderBy: { createdAt: "desc" }, take: 60 },
  emails: { orderBy: { createdAt: "desc" }, take: 60 },
  notes: { orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] },
  ...STAGE_MEETINGS_SELECT,
  owner: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ClientInclude;

export type HubClient = Prisma.ClientGetPayload<{
  include: typeof CLIENT_HUB_INCLUDE;
}>;

export interface AttentionItem {
  key: string;
  tone: Tone;
  title: string;
  detail: string;
  href: string | null;
}

export interface HubEvent {
  id: string;
  action: string;
  summary: string;
  actorLabel: string;
  actorKind: string | null;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  createdAt: Date;
}

export const HISTORY_TAKE = 12;

export async function loadClientHub(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: CLIENT_HUB_INCLUDE,
  });
  if (!client) return null;

  const activityWhere: Prisma.ActivityEventWhereInput = {
    OR: [
      { entityType: { in: ["client", "Client"] }, entityId: id },
      { metadata: { path: ["clientId"], equals: id } },
    ],
  };

  const meetingScope: Prisma.MeetingWhereInput[] = [{ clientId: id }];
  if (client.contactSubmissionId)
    meetingScope.push({ submissionId: client.contactSubmissionId });

  const [services, meetings, recentEvents] = await Promise.all([
    listServices({ clientId: id }),
    prisma.meeting.findMany({
      where: { OR: meetingScope },
      orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "desc" }],
      take: 50,
    }),
    prisma.activityEvent.findMany({
      where: activityWhere,
      orderBy: { createdAt: "desc" },
      take: HISTORY_TAKE,
      select: {
        id: true,
        action: true,
        summary: true,
        actorLabel: true,
        actorKind: true,
        entityType: true,
        entityId: true,
        entityLabel: true,
        before: true,
        after: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);

  const stage = deriveClientStage(client);
  const payments = clientPayments(client);
  const now = new Date();
  const derivedPayments = payments.map((p) => ({
    ...p,
    overdue: isPaymentOverdue(p, now),
  }));

  const lastActivityAt = recentEvents[0]?.createdAt ?? client.updatedAt;

  return {
    client,
    stage,
    services,
    meetings,
    recentEvents: recentEvents as HubEvent[],
    payments: derivedPayments,
    lastActivityAt,
    publicBase: publicBaseUrlFromHeaders(await headers()),
    attention: attentionFor(client, derivedPayments, services, now),
  };
}

export type ClientHub = NonNullable<Awaited<ReturnType<typeof loadClientHub>>>;
export type HubPayment = ClientPayment & { overdue: boolean };

export function openChangeRequests(project: HubClient["projects"][number]) {
  return project.changeRequests.filter(
    (cr) => !(CLOSED_CHANGE_STATUSES as readonly string[]).includes(cr.status),
  );
}

function attentionFor(
  client: HubClient,
  payments: HubPayment[],
  services: ServiceRow[],
  now: Date,
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const payment of payments.filter((p) => p.overdue)) {
    items.push({
      key: `payment-${payment.id}`,
      tone: "danger",
      title: `${statusOf("paymentMilestone", payment.milestone).label} is overdue`,
      detail: `Was due ${dueLabel(payment.dueDate)}`,
      href: entityHref("payment", payment.id),
    });
  }

  for (const contract of client.contracts) {
    if (contract.status === "SENT") {
      items.push({
        key: `contract-${contract.id}`,
        tone: "warning",
        title: `${contract.proposal.projectType} contract is not signed`,
        detail: `Created ${when(contract.createdAt)}`,
        href: entityHref("contract", contract.id),
      });
    } else if (contract.status === "DRAFT") {
      items.push({
        key: `contract-${contract.id}`,
        tone: "info",
        title: `${contract.proposal.projectType} contract has not been sent`,
        detail: `Drafted ${when(contract.createdAt)}`,
        href: entityHref("contract", contract.id),
      });
    }
  }

  for (const product of client.products) {
    for (const incident of product.incidents) {
      items.push({
        key: `incident-${incident.id}`,
        tone:
          incident.severity === "SEV1" || incident.severity === "SEV2"
            ? "danger"
            : "warning",
        title: `${product.name}: ${incident.title}`,
        detail: `${statusOf("incidentStatus", incident.status).label} · opened ${when(incident.detectedAt)}`,
        href: entityHref("incident", incident.id),
      });
    }
  }

  for (const sub of client.subscriptions) {
    const view = renewalView(sub, now);
    if (
      view.urgency === "overdue" ||
      view.urgency === "due-soon" ||
      view.urgency === "ending"
    ) {
      items.push({
        key: `subscription-${sub.id}`,
        tone: view.urgency === "overdue" ? "danger" : "warning",
        title:
          view.urgency === "ending"
            ? "Retainer ends without renewing"
            : view.urgency === "overdue"
              ? "Retainer renewal is past due"
              : "Retainer renews soon",
        detail: `Period ends ${dueLabel(view.renewsAt)}`,
        href: entityHref("subscription", sub.id),
      });
    }
  }

  for (const service of services) {
    if (
      service.state === "expired" ||
      service.state === "urgent" ||
      service.state === "renewing-soon"
    ) {
      items.push({
        key: `service-${service.id}`,
        tone: service.state === "renewing-soon" ? "warning" : "danger",
        title: `${service.name} ${service.state === "expired" ? "has expired" : "needs renewing"}`,
        detail: service.expiresAt
          ? `Expires ${dueLabel(service.expiresAt)}`
          : "No expiry recorded",
        href: entityHref("client_service", service.id),
      });
    }
  }

  const lastMessage = client.messages[0];
  if (lastMessage?.direction === "INBOUND") {
    items.push({
      key: "unanswered",
      tone: "warning",
      title: "Their last WhatsApp message has no reply",
      detail: `Received ${when(lastMessage.createdAt)}`,
      href: `/whatsapp/${client.id}`,
    });
  }

  const order: Record<Tone, number> = {
    danger: 0,
    warning: 1,
    progress: 2,
    info: 3,
    neutral: 4,
    success: 5,
  };
  return items.sort((a, b) => order[a.tone] - order[b.tone]);
}
