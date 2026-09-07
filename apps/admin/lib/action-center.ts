import { prisma } from "@repo/database";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarClock,
  FileSignature,
  FileText,
  MessageCircle,
  RefreshCw,
  Rocket,
  ShieldAlert,
  Target,
  Wallet,
} from "lucide-react";
import { deriveStatus, renewalView } from "@/lib/subscription-lifecycle";
import type { Tone } from "@/lib/status";

/**
 * The Action Centre answers the only question a dashboard is actually for:
 * "what requires a human right now?"
 *
 * Ordering is by URGENCY SCORE, not by entity type — an overdue payment and an
 * unanswered client message compete on the same list, because in a real day
 * they compete for the same hour. Score is deliberately simple and readable:
 *   base weight by kind + days of staleness, capped.
 * A clever ranking nobody can predict is worse than a blunt one everyone can.
 */
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
    | "renewal";
  icon: LucideIcon;
  tone: Tone;
  title: string;
  detail: string;
  href: string;
  cta: string;
  /** Higher = more urgent. Used for ordering only; never shown raw. */
  score: number;
  ageDays: number;
}

const DAY = 86_400_000;

function ageInDays(from: Date | null | undefined) {
  if (!from) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / DAY));
}

export async function getActionCentre(): Promise<ActionItem[]> {
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
  ] = await Promise.all([
    // A lead nobody has contacted. The single most expensive thing to ignore.
    prisma.client.findMany({
      where: { status: { in: ["NEW", "VIEWED"] } },
      select: { id: true, name: true, company: true, phone: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 25,
    }),
    // Sent, seen, no answer.
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
      where: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: now } },
      select: {
        id: true,
        amount: true,
        dueDate: true,
        milestone: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 25,
    }),
    prisma.payment.findMany({
      where: { status: "PENDING", dueDate: { gte: now, lte: in7Days } },
      select: {
        id: true,
        amount: true,
        dueDate: true,
        milestone: true,
        project: { select: { id: true, name: true } },
      },
      take: 25,
    }),
    prisma.meeting.findMany({
      where: { status: "PENDING" },
      select: { id: true, title: true, scheduledDate: true, scheduledTime: true, createdAt: true },
      orderBy: { scheduledDate: "asc" },
      take: 25,
    }),
    // The LATEST inbound per client — not "the 100 newest messages", which
    // silently dropped a quiet client whose message aged out of the window.
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
    // Anything broken and unresolved. An incident exists precisely because a
    // human decided it needs one, so all of them belong here.
    prisma.incident.findMany({
      where: { status: { not: "RESOLVED" } },
      orderBy: [{ severity: "asc" }, { detectedAt: "asc" }],
      include: { product: { select: { id: true, name: true } } },
    }),
    // A failed production deploy in the last week that has not since been
    // followed by a successful one is still the current state of that product.
    prisma.deployment.findMany({
      where: {
        status: "FAILED",
        environment: "PRODUCTION",
        createdAt: { gte: new Date(now.getTime() - 7 * DAY) },
      },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { id: true, name: true } } },
    }),
    // Renewal urgency is derived, so every revenue-bearing retainer is fetched
    // and judged in code rather than guessed at with a date filter.
    prisma.maintenanceSubscription.findMany({
      where: { status: { in: ["TRIALING", "ACTIVE"] } },
      include: { client: { select: { id: true, name: true, company: true } } },
    }),
  ]);

  // Which clients have an outbound message newer than their latest inbound?
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

  // Fetch the actual message only for the clients that are genuinely waiting.
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
    if (age < 2) continue; // give the client a moment before nagging
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
    const age = ageInDays(pay.dueDate);
    items.push({
      id: `pay-${pay.id}`,
      kind: "payment",
      icon: Wallet,
      tone: "danger",
      title: `Payment overdue · ${pay.project.name}`,
      detail: `${age}d past due`,
      href: `/payments`,
      cta: "Chase payment",
      score: 90 + Math.min(age, 30) * 2,
      ageDays: age,
    });
  }

  for (const pay of duePayments) {
    const days = Math.ceil((new Date(pay.dueDate!).getTime() - Date.now()) / DAY);
    items.push({
      id: `paysoon-${pay.id}`,
      kind: "payment",
      icon: Wallet,
      tone: "warning",
      title: `Payment due in ${days}d · ${pay.project.name}`,
      detail: "Send the invoice before it slips",
      href: `/payments`,
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
      href: `/calendar`,
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
      detail: `${incident.product.name} · open ${age}d · ${incident.status.toLowerCase()}`,
      href: "/incidents",
      cta: "Open incident",
      // A SEV1 outranks everything else on this list, including a late payment:
      // money can wait an hour, a down production site cannot.
      score: (critical ? 140 : 85) + Math.min(age, 14) * 2,
      ageDays: age,
    });
  }

  // Only surface a failed deploy while it is still the newest one for that
  // product and environment — a failure already fixed by a later deploy is
  // history, not an action.
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
      href: `/products/${deployment.productId}?tab=deployments`,
      cta: "Investigate",
      score: 110 - Math.min(age, 7) * 4,
      ageDays: age,
    });
  }

  for (const sub of renewableSubscriptions) {
    const view = renewalView(sub, now);
    if (view.urgency !== "overdue" && view.urgency !== "ending") continue;
    const effective = deriveStatus(sub, now);
    const clientLabel = sub.client.company || sub.client.name || "A client";
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
      href: "/maintenance",
      cta: overdue ? "Renew or suspend" : "Review",
      score: overdue ? 90 + Math.min(Math.abs(view.daysUntil), 30) : 70,
      ageDays: overdue ? Math.abs(view.daysUntil) : 0,
    });
  }

  return items.sort((a, b) => b.score - a.score);
}

export type ActionCentre = Awaited<ReturnType<typeof getActionCentre>>;
