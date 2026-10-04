import { prisma } from "@repo/database";
import { cache } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarClock,
  FileSignature,
  FileText,
  Globe,
  MessageCircle,
  RefreshCw,
  Rocket,
  Server,
  ShieldAlert,
  Target,
  Wallet,
} from "lucide-react";
import { paymentSourceLabel } from "@/lib/payment-source";
import { calendarDaysUntil, overdueCutoff } from "@/lib/payment-overdue";
import { deriveStatus, renewalView } from "@/lib/subscription-lifecycle";
import {
  daysUntilExpiry,
  KIND_LABEL,
  remindedThisCycle,
  SERVICE_SOON_DAYS,
  SERVICE_URGENT_DAYS,
} from "@/lib/service-lifecycle";
import { entityHref } from "@/lib/entity-links";
import type { Tone } from "@/lib/status";
import { canSeeFinance, type Role } from "@/lib/nav";
import { pageDecision, ROUTE_GATES, type RouteGate } from "@/lib/route-gates";
import { UNCONTACTED_WHERE } from "@/lib/dashboard-data";

export interface ActionItem {
  id: string;
  kind:
    | "lead"
    | "proposal"
    | "contract"
    | "payment"
    | "message"
    | "meeting"
    | "project"
    | "incident"
    | "deployment"
    | "renewal"
    | "service";
  icon: LucideIcon;
  tone: Tone;
  title: string;
  detail: string;
  href: string;
  cta: string;
  score: number;
  ageDays: number;
}

const DAY = 86_400_000;

function ageInDays(from: Date | null | undefined) {
  if (!from) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / DAY));
}

const allActions = cache(buildActionCentre);

export function roleCanOpen(role: Role | undefined, href: string): boolean {
  const path = href.split(/[?#]/)[0] ?? "/";
  const first = path.split("/").filter(Boolean)[0];
  const key = first ? `/${first}` : "/";
  const gate = (ROUTE_GATES as Record<string, RouteGate | undefined>)[key];
  if (!gate) return true;
  return pageDecision(role, gate.required, gate.roles);
}

const MONEY_KINDS: ReadonlySet<ActionItem["kind"]> = new Set(["payment", "renewal"]);

export async function getActionCentre(role?: Role): Promise<ActionItem[]> {
  const items = await allActions();
  if (!role) return items;
  const finance = canSeeFinance(role);
  return items.filter(
    (item) => roleCanOpen(role, item.href) && (finance || !MONEY_KINDS.has(item.kind)),
  );
}

async function buildActionCentre(): Promise<ActionItem[]> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * DAY);

  const [
    coldLeads,
    awaitingResponse,
    expiringProposals,
    unsignedContracts,
    latePayments,
    duePayments,
    pendingMeetings,
    unansweredInbound,
    slippedProjects,
    failedMessages,
    openIncidents,
    failedDeployments,
    renewableSubscriptions,
    expiringServices,
  ] = await Promise.all([
    prisma.client.findMany({
      where: UNCONTACTED_WHERE,
      select: { id: true, name: true, company: true, phone: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 25,
    }),
    prisma.proposal.findMany({
      where: { status: { in: ["SENT", "DELIVERED", "READ", "VIEWED"] } },
      select: {
        id: true,
        sentAt: true,
        readAt: true,
        totalPrice: true,
        currency: true,
        client: { select: { id: true, name: true, company: true } },
      },
      orderBy: { sentAt: "asc" },
      take: 25,
    }),
    prisma.proposal.findMany({
      where: {
        status: { in: ["SENT", "DELIVERED", "READ", "VIEWED"] },
        validUntil: { lte: in7Days },
      },
      select: {
        id: true,
        validUntil: true,
        client: { select: { name: true, company: true } },
      },
      take: 25,
    }),
    prisma.contract.findMany({
      where: { status: "SENT" },
      select: {
        id: true,
        createdAt: true,
        client: { select: { id: true, name: true, company: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 25,
    }),
    prisma.payment.findMany({
      where: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: overdueCutoff(now) } },
      select: {
        id: true,
        amount: true,
        dueDate: true,
        milestone: true,
        project: { select: { id: true, name: true } },
        subscription: { select: { planId: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 25,
    }),
    prisma.payment.findMany({
      where: { status: "PENDING", dueDate: { gte: overdueCutoff(now), lte: in7Days } },
      select: {
        id: true,
        amount: true,
        dueDate: true,
        milestone: true,
        project: { select: { id: true, name: true } },
        subscription: { select: { planId: true } },
      },
      take: 25,
    }),
    prisma.meeting.findMany({
      where: { status: "PENDING" },
      select: { id: true, title: true, scheduledDate: true, scheduledTime: true, createdAt: true },
      orderBy: { scheduledDate: "asc" },
      take: 25,
    }),
    prisma.whatsAppMessage.groupBy({
      by: ["clientId"],
      where: { direction: "INBOUND" },
      _max: { createdAt: true },
    }),
    prisma.project.findMany({
      where: {
        status: "ACTIVE",
        targetLaunchDate: { lt: now },
        actualLaunchDate: null,
      },
      select: { id: true, name: true, targetLaunchDate: true, phase: true },
      take: 25,
    }),
    prisma.whatsAppMessage.findMany({
      where: { status: "FAILED" },
      select: {
        id: true,
        createdAt: true,
        clientId: true,
        client: { select: { name: true, company: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.incident.findMany({
      where: { status: { not: "RESOLVED" } },
      orderBy: [{ severity: "asc" }, { detectedAt: "asc" }],
      include: { product: { select: { id: true, name: true } } },
    }),
    prisma.deployment.findMany({
      where: {
        status: "FAILED",
        environment: "PRODUCTION",
        createdAt: { gte: new Date(now.getTime() - 7 * DAY) },
      },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { id: true, name: true } } },
    }),
    prisma.maintenanceSubscription.findMany({
      where: { status: { in: ["TRIALING", "ACTIVE"] } },
      include: { client: { select: { id: true, name: true, company: true } } },
    }),
    prisma.clientService.findMany({
      where: {
        status: "ACTIVE",
        termMonths: { not: null },
        expiresAt: { lte: new Date(now.getTime() + SERVICE_SOON_DAYS * DAY) },
      },
      include: { client: { select: { id: true, name: true, company: true } } },
      orderBy: { expiresAt: "asc" },
      take: 50,
    }),
  ]);

  const lastOutbound = await prisma.whatsAppMessage.groupBy({
    by: ["clientId"],
    where: { direction: "OUTBOUND" },
    _max: { createdAt: true },
  });
  const lastOutboundByClient = new Map(
    lastOutbound.map((r) => [r.clientId, r._max.createdAt?.getTime() ?? 0]),
  );

  const waitingClientIds = unansweredInbound
    .filter(
      (row) =>
        (row._max.createdAt?.getTime() ?? 0) > (lastOutboundByClient.get(row.clientId) ?? 0),
    )
    .map((row) => row.clientId);

  const waitingMessages = waitingClientIds.length
    ? await prisma.whatsAppMessage.findMany({
        where: { direction: "INBOUND", clientId: { in: waitingClientIds } },
        select: {
          id: true,
          createdAt: true,
          body: true,
          clientId: true,
          client: { select: { id: true, name: true, company: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const seenClients = new Set<string>();

  const items: ActionItem[] = [];
  const label = (c: { name: string | null; company: string | null }) =>
    c.company || c.name || "Unnamed client";

  for (const lead of coldLeads) {
    const age = ageInDays(lead.createdAt);
    items.push({
      id: `lead-${lead.id}`,
      kind: "lead",
      icon: Target,
      tone: age >= 2 ? "danger" : "warning",
      title: `Follow up with ${label(lead)}`,
      detail:
        age === 0
          ? "Arrived today, nobody has replied yet"
          : `Uncontacted for ${age} day${age === 1 ? "" : "s"}`,
      href: `/clients/${lead.id}`,
      cta: "Open lead",
      score: 60 + Math.min(age, 14) * 4,
      ageDays: age,
    });
  }

  for (const p of awaitingResponse) {
    const age = ageInDays(p.sentAt);
    if (age < 2) continue;
    items.push({
      id: `prop-${p.id}`,
      kind: "proposal",
      icon: FileText,
      tone: age >= 7 ? "danger" : "warning",
      title: `Chase proposal · ${label(p.client)}`,
      detail: p.readAt
        ? `Read ${ageInDays(p.readAt)}d ago, no answer`
        : `Sent ${age}d ago, not opened`,
      href: `/proposals/${p.id}`,
      cta: "Open proposal",
      score: 55 + Math.min(age, 21) * 3 + (p.readAt ? 10 : 0),
      ageDays: age,
    });
  }

  for (const p of expiringProposals) {
    const days = Math.ceil((new Date(p.validUntil).getTime() - Date.now()) / DAY);
    items.push({
      id: `exp-${p.id}`,
      kind: "proposal",
      icon: CalendarClock,
      tone: days <= 0 ? "danger" : "warning",
      title: `Proposal ${days <= 0 ? "has expired" : `expires in ${days}d`}`,
      detail: label(p.client),
      href: `/proposals/${p.id}`,
      cta: "Extend or close",
      score: 70 + Math.max(0, 7 - days) * 4,
      ageDays: Math.max(0, -days),
    });
  }

  for (const c of unsignedContracts) {
    const age = ageInDays(c.createdAt);
    items.push({
      id: `con-${c.id}`,
      kind: "contract",
      icon: FileSignature,
      tone: age >= 5 ? "danger" : "warning",
      title: `Contract awaiting signature · ${label(c.client)}`,
      detail: `Sent ${age}d ago, not signed`,
      href: `/contracts/${c.id}`,
      cta: "Open contract",
      score: 75 + Math.min(age, 14) * 3,
      ageDays: age,
    });
  }

  for (const pay of latePayments) {
    const age = -calendarDaysUntil(pay.dueDate!, now);
    items.push({
      id: `pay-${pay.id}`,
      kind: "payment",
      icon: Wallet,
      tone: "danger",
      title: `Payment overdue · ${paymentSourceLabel(pay)}`,
      detail: `${age}d past due`,
      href: entityHref("payment", pay.id) ?? "/payments",
      cta: "Chase payment",
      score: 90 + Math.min(age, 30) * 2,
      ageDays: age,
    });
  }

  for (const pay of duePayments) {
    const days = calendarDaysUntil(pay.dueDate!, now);
    items.push({
      id: `paysoon-${pay.id}`,
      kind: "payment",
      icon: Wallet,
      tone: "warning",
      title: `Payment due ${days === 0 ? "today" : `in ${days}d`} · ${paymentSourceLabel(pay)}`,
      detail: "Send the invoice before it slips",
      href: entityHref("payment", pay.id) ?? "/payments",
      cta: "Review",
      score: 45,
      ageDays: 0,
    });
  }

  for (const m of pendingMeetings) {
    items.push({
      id: `meet-${m.id}`,
      kind: "meeting",
      icon: CalendarClock,
      tone: "warning",
      title: `Meeting request awaiting approval`,
      detail: `${m.title} · ${m.scheduledDate.toISOString().slice(0, 10)} ${m.scheduledTime}`,
      href: entityHref("meeting", m.id) ?? "/calendar",
      cta: "Approve or decline",
      score: 65 + Math.min(ageInDays(m.createdAt), 5) * 5,
      ageDays: ageInDays(m.createdAt),
    });
  }

  for (const msg of waitingMessages) {
    if (seenClients.has(msg.clientId)) continue;
    seenClients.add(msg.clientId);
    const age = ageInDays(msg.createdAt);
    items.push({
      id: `msg-${msg.id}`,
      kind: "message",
      icon: MessageCircle,
      tone: age >= 1 ? "danger" : "warning",
      title: `Unanswered message · ${label(msg.client)}`,
      detail: msg.body.replace(/\s+/g, " ").slice(0, 60),
      href: `/whatsapp/${msg.clientId}`,
      cta: "Reply",
      score: 85 + Math.min(age, 7) * 6,
      ageDays: age,
    });
  }

  for (const pr of slippedProjects) {
    const age = ageInDays(pr.targetLaunchDate);
    items.push({
      id: `proj-${pr.id}`,
      kind: "project",
      icon: Rocket,
      tone: "danger",
      title: `${pr.name} is past its launch date`,
      detail: `${age}d late, still in ${pr.phase.toLowerCase().replace(/_/g, " ")}`,
      href: `/projects/${pr.id}`,
      cta: "Open project",
      score: 80 + Math.min(age, 30) * 2,
      ageDays: age,
    });
  }

  for (const msg of failedMessages) {
    items.push({
      id: `fail-${msg.id}`,
      kind: "message",
      icon: AlertTriangle,
      tone: "danger",
      title: `WhatsApp delivery failed · ${label(msg.client)}`,
      detail: "The client never received this message",
      href: `/whatsapp/${msg.clientId}`,
      cta: "Retry",
      score: 95,
      ageDays: ageInDays(msg.createdAt),
    });
  }

  for (const incident of openIncidents) {
    const age = ageInDays(incident.detectedAt);
    const critical = incident.severity === "SEV1" || incident.severity === "SEV2";
    items.push({
      id: `inc-${incident.id}`,
      kind: "incident",
      icon: ShieldAlert,
      tone: critical ? "danger" : "warning",
      title: `${incident.severity} · ${incident.title}`,
      detail: `${incident.product.name} · ${age === 0 ? "opened today" : `open ${age}d`} · ${incident.status.toLowerCase()}`,
      href: entityHref("incident", incident.id) ?? "/incidents",
      cta: "Open incident",
      score: (critical ? 140 : 85) + Math.min(age, 14) * 2,
      ageDays: age,
    });
  }

  const supersededProducts = new Set<string>();
  for (const deployment of failedDeployments) {
    if (supersededProducts.has(deployment.productId)) continue;
    supersededProducts.add(deployment.productId);
    const age = ageInDays(deployment.finishedAt ?? deployment.createdAt);
    items.push({
      id: `dep-${deployment.id}`,
      kind: "deployment",
      icon: Rocket,
      tone: "danger",
      title: `Production deploy failed · ${deployment.product.name}`,
      detail: deployment.failureReason ?? `Deployment #${deployment.number}, ${age}d ago`,
      href: entityHref("deployment", deployment.id) ?? `/products/${deployment.productId}`,
      cta: "Investigate",
      score: 110 - Math.min(age, 7) * 4,
      ageDays: age,
    });
  }

  for (const sub of renewableSubscriptions) {
    const view = renewalView(sub, now);
    const effective = deriveStatus(sub, now);
    const clientLabel = sub.client.company || sub.client.name || "A client";
    if (effective === "EXPIRED") {
      const lapsedDays = Math.abs(view.daysUntil);
      items.push({
        id: `ren-${sub.id}`,
        kind: "renewal",
        icon: RefreshCw,
        tone: "danger",
        title: `Retainer expired · ${clientLabel}`,
        detail: `${lapsedDays}d past the renewal date with no payment · grace has ended`,
        href: entityHref("subscription", sub.id) ?? "/maintenance",
        cta: "Renew or cancel",
        score: 95 + Math.min(lapsedDays, 30),
        ageDays: lapsedDays,
      });
      continue;
    }
    if (view.urgency !== "overdue" && view.urgency !== "ending") continue;
    const overdue = view.urgency === "overdue";
    items.push({
      id: `ren-${sub.id}`,
      kind: "renewal",
      icon: RefreshCw,
      tone: overdue ? (effective === "GRACE" ? "danger" : "warning") : "warning",
      title: overdue
        ? `Renewal overdue · ${clientLabel}`
        : `Retainer ending · ${clientLabel}`,
      detail: overdue
        ? `${Math.abs(view.daysUntil)}d past the renewal date · ${effective.toLowerCase().replace("_", " ")}`
        : `Auto-renew is off — expires in ${view.daysUntil}d`,
      href: entityHref("subscription", sub.id) ?? "/maintenance",
      cta: overdue ? "Renew or suspend" : "Review",
      score: overdue ? 90 + Math.min(Math.abs(view.daysUntil), 30) : 70,
      ageDays: overdue ? Math.abs(view.daysUntil) : 0,
    });
  }

  for (const service of expiringServices) {
    if (!service.expiresAt) continue;
    const days = daysUntilExpiry(service.expiresAt, now);
    const lapsed = days <= 0;
    const urgent = days <= SERVICE_URGENT_DAYS;
    items.push({
      id: `svc-${service.id}`,
      kind: "service",
      icon: service.kind === "DOMAIN" ? Globe : Server,
      tone: urgent ? "danger" : "warning",
      title: lapsed
        ? `${KIND_LABEL[service.kind]} expired · ${label(service.client)}`
        : `${KIND_LABEL[service.kind]} expires in ${days}d · ${label(service.client)}`,
      detail: `${service.name}${service.provider ? ` · ${service.provider}` : ""}${remindedThisCycle(service) ? " · client reminded" : " · client not reminded yet"}`,
      href: entityHref("client_service", service.id) ?? "/services",
      cta: lapsed ? "Renew now" : "Renew & invoice",
      score: lapsed ? 105 + Math.min(Math.abs(days), 30) : urgent ? 88 + (SERVICE_URGENT_DAYS - days) * 2 : 60,
      ageDays: lapsed ? Math.abs(days) : 0,
    });
  }

  return items.sort((a, b) => b.score - a.score);
}
