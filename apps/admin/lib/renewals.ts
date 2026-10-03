import "server-only";
import { prisma, type Prisma } from "@repo/database";

import { listServices, type ServiceRow } from "@/lib/client-services";
import { listSubscriptions, type AdminSubscription } from "@/lib/maintenance-admin";
import { KIND_LABEL, SERVICE_SOON_DAYS, needsAttention } from "@/lib/service-lifecycle";
import {
  DAY_MS,
  needsRenewalAttention,
  RENEWAL_SOON_DAYS,
} from "@/lib/subscription-lifecycle";

/**
 * Renewals across retainers and client services — the one place the
 * "what is coming due" question is answered. The sidebar badge, the Today page
 * and /renewals all read from here.
 */

/**
 * The badge: retainers past due, in grace, expired or inside the alert window,
 * plus active services inside theirs or lapsed. Both are derived from the
 * clock, never from a stored flag, so the count is right whether or not the
 * renewal sweep has run.
 *
 * Retainers are read narrowly (five lifecycle fields, only those whose period
 * ends inside the window) and judged in memory, because PAST_DUE / GRACE /
 * EXPIRED do not exist as stored values to count.
 */
export async function countRenewalsNeedingAttention(now: Date = new Date()): Promise<number> {
  const [services, retainers] = await Promise.all([
    prisma.clientService.count({
      where: {
        status: "ACTIVE",
        expiresAt: { lte: new Date(now.getTime() + SERVICE_SOON_DAYS * DAY_MS) },
      },
    }),
    prisma.maintenanceSubscription.findMany({
      where: {
        status: { notIn: ["CANCELLED", "PAUSED", "SUSPENDED"] },
        currentPeriodEnd: { lte: new Date(now.getTime() + RENEWAL_SOON_DAYS * DAY_MS) },
      },
      select: {
        status: true,
        currentPeriodEnd: true,
        autoRenew: true,
        trialEndsAt: true,
        cancelledAt: true,
      },
    }),
  ]);
  return services + retainers.filter((sub) => needsRenewalAttention(sub, now)).length;
}

/** One line of the renewals table: a retainer period or a service term. */
export interface RenewalRow {
  /** Unique across both kinds — the table's row key. */
  readonly key: string;
  readonly kind: "retainer" | "service";
  /** The record id, for `entityHref` and the renew actions. */
  readonly id: string;
  readonly entityType: "subscription" | "client_service";
  readonly clientId: string;
  readonly clientLabel: string;
  /** "Growth · monthly" or "Domain · example.com". */
  readonly what: string;
  readonly detail: string | null;
  readonly amount: number | null;
  readonly currency: string;
  /** Period end or term expiry, ISO. Null for a service with no date yet. */
  readonly dueAt: string | null;
  /** Negative once the date has passed; null without a date. */
  readonly daysUntil: number | null;
  /** The pill: which registry in lib/status.ts and which value. */
  readonly urgency: {
    readonly registry: "renewalUrgency" | "subscriptionStatus" | "clientServiceState";
    readonly value: string;
  };
  /** Sorting weight: 0 needs a decision now, 1 soon, 2 scheduled. */
  readonly rank: 0 | 1 | 2;
  readonly needsAttention: boolean;
  readonly autoRenew: boolean;
  /** Why the renew action is unavailable, or null when it can run. */
  readonly blocked: string | null;
  /** What the renew action will invoice, worded for the confirm step. */
  readonly billingNote: string;
}

function retainerRow(sub: AdminSubscription): RenewalRow {
  const effective = sub.effectiveStatus;
  const lapsed = effective === "EXPIRED" || effective === "PAST_DUE" || effective === "GRACE";
  const attention = lapsed || ["overdue", "due-soon", "ending"].includes(sub.renewalUrgency);
  const blocked =
    sub.status === "CANCELLED"
      ? "Cancelled — start a new retainer instead"
      : sub.quoteOnly && sub.quotedMonthlyPrice === null
        ? "Quoted plan with no quote set — set the monthly price on the retainer first"
        : null;
  return {
    key: `retainer:${sub.id}`,
    kind: "retainer",
    id: sub.id,
    entityType: "subscription",
    clientId: sub.clientId,
    clientLabel: sub.clientName,
    what: `${sub.planName} · ${sub.billingIntervalLabel.toLowerCase()}`,
    detail: sub.currentPeriodPayment
      ? `This period's invoice is ${sub.currentPeriodPayment.status.toLowerCase()}`
      : "No invoice opened for this period",
    amount: sub.invoiceAmount,
    currency: sub.currency,
    dueAt: sub.renewsAt,
    daysUntil: sub.daysUntilRenewal,
    // An EXPIRED retainer has no renewal urgency (it is not auto-renewing), so
    // its derived status is the honest pill; every other retainer reads from
    // the urgency registry the maintenance screen already uses.
    urgency: lapsed && effective === "EXPIRED"
      ? { registry: "subscriptionStatus", value: effective }
      : { registry: "renewalUrgency", value: sub.renewalUrgency },
    rank: lapsed || sub.renewalUrgency === "overdue" ? 0 : attention ? 1 : 2,
    needsAttention: attention,
    autoRenew: sub.autoRenew,
    blocked,
    billingNote:
      sub.invoiceAmount !== null
        ? `Opens the next period and a pending payment of ${sub.currency} ${sub.invoiceAmount} for it.`
        : "Opens the next period; no amount can be invoiced until a quote is set.",
  };
}

function serviceRow(service: ServiceRow): RenewalRow {
  const attention = needsAttention(service.state);
  return {
    key: `service:${service.id}`,
    kind: "service",
    id: service.id,
    entityType: "client_service",
    clientId: service.clientId,
    clientLabel: service.clientLabel,
    what: `${KIND_LABEL[service.kind]} · ${service.name}`,
    detail: service.projectName
      ? `Billed on ${service.projectName}`
      : "Not linked to a project — no payment is opened on renewal",
    amount: service.price,
    currency: service.currency,
    dueAt: service.expiresAt,
    daysUntil: service.daysUntilExpiry,
    urgency: { registry: "clientServiceState", value: service.state },
    rank: service.state === "expired" || service.state === "urgent" ? 0 : attention ? 1 : 2,
    needsAttention: attention,
    autoRenew: service.autoRenew,
    blocked:
      service.status === "CANCELLED"
        ? "Cancelled"
        : service.state === "pending"
          ? "Not registered yet — activate it from the services screen"
          : null,
    billingNote: service.projectId
      ? `Extends the term by ${service.termMonths} month${service.termMonths === 1 ? "" : "s"} and opens a pending payment of ${service.currency} ${service.price} on ${service.projectName ?? "the project"}.`
      : `Extends the term by ${service.termMonths} month${service.termMonths === 1 ? "" : "s"}. No payment is opened: the service is not on a project's schedule, so record it on the payments screen when invoiced.`,
  };
}

/**
 * Everything that renews, as one list: live retainers (cancelled ones have
 * nothing to renew) and dated services. Sorted by what needs a decision first,
 * then by date.
 */
export async function listRenewals(
  options: { clientId?: string } = {},
  now: Date = new Date(),
): Promise<RenewalRow[]> {
  const where: Prisma.ClientServiceWhereInput = {
    status: { not: "CANCELLED" },
    expiresAt: { not: null },
    ...(options.clientId ? { clientId: options.clientId } : {}),
  };
  const [subscriptions, services] = await Promise.all([listSubscriptions(now), listServices(where, now)]);

  const rows = [
    ...subscriptions
      .filter((sub) => sub.status !== "CANCELLED")
      .filter((sub) => !options.clientId || sub.clientId === options.clientId)
      .map(retainerRow),
    ...services.map(serviceRow),
  ];
  return rows.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return (a.daysUntil ?? Number.MAX_SAFE_INTEGER) - (b.daysUntil ?? Number.MAX_SAFE_INTEGER);
  });
}
