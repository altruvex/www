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
  PhoneCall,
  PhoneForwarded,
  RefreshCw,
  Rocket,
  Server,
  ShieldAlert,
  Target,
  Wallet,
} from "lucide-react";
import { paymentSourceLabel } from "@/lib/payment-source";
import { calendarDaysUntil, overdueCutoff } from "@/lib/payment-overdue";
import { isDueByWorkingDay, isOverdueByWorkingDay, workingDaysOverdue } from "@/lib/working-days";
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
import { CLOSED_FIELDS, followUpClosedReason } from "@/lib/lead-follow-up";
import { loadWorkRows, meetingStart, openWorkWhere } from "@/lib/sales-signals";
import {
  businessDayKey,
  MEETING_OUTCOME_GRACE_HOURS,
  type NextActionKind,
  type Priority,
} from "@/lib/sales-intel";

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
  /** The engine's reasons, worst first (sales items only). */
  why?: string[];
  /**
   * The opportunity owner (Client.ownerId) for owner-scoped items, null when
   * nobody owns it (the Unassigned view); undefined for team duties that have
   * no owner by nature (incidents, payments, …). See `scopeActions`.
   */
  ownerId?: string | null;
}

const DAY = 86_400_000;
const HOUR = 3_600_000;

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

/**
 * Whose work a list shows (Ali's ruling, 2026-10-09):
 * - "mine": items whose owner is the viewer, plus team duties (`ownerId`
 *   undefined — incidents, payments, renewals, services: nothing to own, so
 *   whoever's role can open them sees them in every view).
 * - "unassigned": owner-scoped items nobody owns yet (`ownerId === null`) — a
 *   separate view, never folded into every operator's Mine.
 * - "all": everything; only for roles that can `view team`.
 * The owner of a sales item is the opportunity owner, Client.ownerId. A call
 * owed an outcome follows the same rule when the meeting has a client (an
 * unowned client's call is Unassigned even if the meeting has an assignee);
 * only a meeting with no client falls back to Meeting.assignedToId.
 */
export type ActionView = "mine" | "unassigned" | "all";

export function resolveActionView(raw: string | undefined, canSeeAll: boolean): ActionView {
  if (raw === "unassigned") return "unassigned";
  if (raw === "all" && canSeeAll) return "all";
  return "mine";
}

export function scopeActions(items: ActionItem[], view: ActionView, viewerId: string): ActionItem[] {
  if (view === "all") return items;
  if (view === "unassigned") return items.filter((item) => item.ownerId === null);
  return items.filter((item) => item.ownerId === undefined || (Boolean(viewerId) && item.ownerId === viewerId));
}

/** Bounded like /leads: the engine reads at most this many open leads. */
const SALES_TAKE = 200;
/** Calls owed an outcome listed at most; one more is loaded to know when there are more. */
const CALLS_TAKE = 25;

/** Proposal statuses still awaiting the client's answer. */
const LIVE_PROPOSAL_STATUSES: ReadonlySet<string> = new Set(["SENT", "DELIVERED", "READ", "VIEWED"]);
/** Lost, spam and nurture leads raise no document rows. */
const PARKED_STATUSES: ReadonlySet<string> = new Set(["LOST", "SPAM", "NURTURE"]);

/** Where an engine chase points: the document itself when the loaded signals carry its id. */
function documentTarget(
  kind: NextActionKind,
  client: { id: string; proposals: { id: string }[]; contracts: { id: string; status: string }[] },
): Pick<ActionItem, "kind" | "icon" | "href" | "cta"> | null {
  if (kind === "CHASE_PROPOSAL") {
    const p = client.proposals[0];
    return {
      kind: "proposal",
      icon: FileText,
      href: p ? `/proposals/${p.id}#engagement` : `/clients/${client.id}`,
      cta: "Open proposal",
    };
  }
  if (kind === "CHASE_SIGNATURE") {
    const c = client.contracts.find((x) => x.status !== "DRAFT");
    return {
      kind: "contract",
      icon: FileSignature,
      href: c ? `/contracts/${c.id}#signature` : `/clients/${client.id}`,
      cta: "Open contract",
    };
  }
  return null;
}

/** Nothing to do yet — the date or the client is what is awaited. */
const IDLE_KINDS: ReadonlySet<NextActionKind> = new Set(["NONE", "WAIT", "PREPARE_CALL"]);

/**
 * The engine's priority placed on this list's ranking scale (not a second
 * score: it only interleaves sales rows with the other kinds). HIGH sits where
 * a scheduled follow-up sat, MEDIUM where an uncontacted lead sat.
 */
function salesRank(level: Priority, lateDays: number): number {
  return level === "HIGH" ? 118 + Math.min(lateDays, 10) * 2 : 60 + Math.min(lateDays, 14) * 4;
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

  const endOfToday = new Date(overdueCutoff(now).getTime() + DAY);

  const [
    salesRows,
    callsOwed,
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
    // Open sales work read by the engine (lib/sales-intel.ts), the same
    // bounded, owed-first load /leads uses; closed leads are left out by its
    // where. Rows only: the queue's scope and won counts are never shown here,
    // and this runs on every dashboard navigation (lib/shell-data.ts).
    loadWorkRows({ where: openWorkWhere(now), now, viewerId: null, take: SALES_TAKE }),
    // Calls whose time has passed while still agreed: the outcome is owed (R7)
    // — unless the client is closed (followUpClosedReason in SQL) or the deal
    // has moved past the call (a sent proposal or live contract), the engine's
    // own rule in lib/sales-intel.ts pastMeetingWithoutOutcome.
    prisma.meeting.findMany({
      where: {
        status: { in: ["APPROVED", "RESCHEDULED"] },
        outcome: null,
        scheduledDate: { lt: endOfToday },
        OR: [
          { clientId: null },
          {
            client: {
              status: { notIn: ["SPAM", "WON", "LOST"] },
              projects: { none: { status: { not: "CANCELLED" } } },
              contracts: { none: { status: { in: ["SENT", "SIGNED"] } } },
              proposals: { none: { status: { not: "DRAFT" } } },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        scheduledDate: true,
        scheduledTime: true,
        assignedToId: true,
        clientId: true,
        client: { select: { name: true, company: true, ownerId: true, ...CLOSED_FIELDS } },
      },
      orderBy: [{ scheduledDate: "asc" }, { id: "asc" }],
      take: CALLS_TAKE + 1,
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

  // A call with its outcome owed is raised once, from the meeting itself.
  const callOwedClients = new Set<string>();
  for (const m of callsOwed.slice(0, CALLS_TAKE)) {
    if (m.client && followUpClosedReason(m.client)) continue;
    const start = meetingStart(m);
    if (now.getTime() < start.getTime() + MEETING_OUTCOME_GRACE_HOURS * HOUR) continue;
    if (m.clientId) callOwedClients.add(m.clientId);
    const late = Math.max(0, -calendarDaysUntil(start, now));
    items.push({
      id: `call-${m.id}`,
      kind: "meeting",
      icon: PhoneCall,
      tone: "danger",
      title: `Record the call · ${m.client ? label(m.client) : m.title}`,
      detail: `${m.title} · ${businessDayKey(start)} ${m.scheduledTime} · no outcome recorded`,
      href: entityHref("meeting", m.id) ?? "/calendar",
      cta: "Record the call",
      score: 100 + Math.min(late, 10) * 2,
      ageDays: late,
      why: [`Call time has passed and the meeting is still ${m.status.toLowerCase()}`],
      // The opportunity owner when there is a client; the assignee only without one (scopeActions).
      ownerId: m.client ? m.client.ownerId : (m.assignedToId ?? null),
    });
  }
  if (callsOwed.length > CALLS_TAKE) {
    items.push({
      id: "call-more",
      kind: "meeting",
      icon: PhoneCall,
      tone: "danger",
      title: "More calls are waiting for an outcome",
      detail: `Only the oldest ${CALLS_TAKE} are listed here; the calendar has the rest`,
      href: "/calendar",
      cta: "Open calendar",
      score: 100,
      ageDays: 0,
      // No ownerId: an overflow pointer, not a record, so it shows in every view.
    });
  }

  for (const { client, reading } of salesRows) {
    // R3: the one closed test, kept as the last word over the queue's where.
    if (followUpClosedReason(client)) continue;
    const { next, priority, replySla } = reading;
    if (priority.level === "LOW" || IDLE_KINDS.has(next.kind)) continue;
    if (next.kind === "RECORD_OUTCOME" && callOwedClients.has(client.id)) continue;
    // Only what is owed by today's working day (lib/working-days.ts, the
    // engine's rule); a step with no date is owed now.
    if (next.due && !isDueByWorkingDay(next.due, now)) continue;
    const late = replySla.state === "OVERDUE" || isOverdueByWorkingDay(next.due, now);
    const lateDays = next.due ? workingDaysOverdue(next.due, now) : 0;
    const when = next.due
      ? late
        ? lateDays > 0
          ? `${lateDays}d overdue`
          : "Overdue"
        : "Due today"
      : "Owed now";
    const owner = client.owner ? client.owner.name || client.owner.email : "Unassigned";
    // A chase is one row per client (R6): the engine reads the latest live
    // proposal version and the newest issued contract, and its reasons are
    // the detail — Contract has no sentAt, so no "sent N days ago" is shown.
    const doc = documentTarget(next.kind, client);
    items.push({
      id: `sales-${client.id}`,
      kind: doc?.kind ?? "lead",
      icon: doc?.icon ?? (next.kind === "FOLLOW_UP" || next.kind === "REVIEW_NURTURE" ? PhoneForwarded : Target),
      tone: late ? "danger" : "warning",
      title: `${next.label} · ${label(client)}`,
      detail: doc
        ? `${next.why[0] ?? when} · ${owner}`
        : `${priority.level === "HIGH" ? "High" : "Medium"} priority · ${when} · ${owner}`,
      href: doc?.href ?? `/clients/${client.id}#lead-record`,
      cta: doc?.cta ?? "Open lead",
      score: salesRank(priority.level, lateDays),
      ageDays: lateDays,
      why: [...new Set([...next.why, ...priority.why])],
      ownerId: client.ownerId,
    });
  }

  // Expiry, once per client: only the latest non-draft proposal (R6), only a
  // live one, and never for a closed or parked lead.
  for (const { client } of salesRows) {
    if (followUpClosedReason(client) || PARKED_STATUSES.has(client.status)) continue;
    const p = client.proposals[0];
    if (!p?.validUntil || !LIVE_PROPOSAL_STATUSES.has(p.status)) continue;
    const days = calendarDaysUntil(p.validUntil, now);
    if (days > 7) continue;
    items.push({
      id: `exp-${p.id}`,
      kind: "proposal",
      icon: CalendarClock,
      tone: days <= 0 ? "danger" : "warning",
      title: `Proposal ${days <= 0 ? "has expired" : `expires in ${days}d`}`,
      detail: label(client),
      href: `/proposals/${p.id}`,
      cta: "Extend or close",
      score: 70 + Math.max(0, 7 - days) * 4,
      ageDays: Math.max(0, -days),
      ownerId: client.ownerId,
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
      detail: `${m.title} · ${businessDayKey(meetingStart(m))} ${m.scheduledTime}`,
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
      href: `/projects/${pr.id}#phases`,
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
