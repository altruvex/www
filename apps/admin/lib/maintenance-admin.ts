import {
  prisma,
  type BillingInterval,
  type MaintenanceSubscriptionStatus,
} from "@repo/database";
import {
  currentBillingCycle,
  formatMoney,
  MAINTENANCE_PLAN_IDS,
  pricingCopy,
  type MaintenancePlanId,
} from "@repo/pricing-schema";

import { getPricing } from "@/lib/pricing-store";
import { diffFields, recordChanges } from "@/lib/pricing-store";
import { recordActivity, systemActor, type Actor } from "@/lib/activity-log";
import {
  computeRenewal,
  deriveStatus,
  nextPeriodEnd,
  renewalView,
  STATUS_LABEL,
  type RenewalUrgency,
} from "@/lib/subscription-lifecycle";

/**
 * Admin view of maintenance retainers.
 *
 * The client portal is read-and-submit; this is where the work is actually
 * moved. Cap usage is computed exactly as the portal computes it, from the same
 * cycle logic and the same resolved plan, so the operator and the client are
 * never looking at two different counts of the same thing.
 */

export interface AdminRequest {
  readonly id: string;
  readonly title: string;
  readonly detail: string | null;
  readonly status: string;
  readonly countsToCap: boolean;
  readonly submittedAt: string;
  readonly completedAt: string | null;
  readonly cycleStart: string;
}

export interface AdminSubscription {
  readonly id: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly planId: string;
  readonly planName: string;
  readonly planPriceLabel: string;
  /** What an operator set. PAUSED/SUSPENDED/CANCELLED only get here by hand. */
  readonly status: MaintenanceSubscriptionStatus;
  /** What the calendar says today — see `deriveStatus`. */
  readonly effectiveStatus: MaintenanceSubscriptionStatus;
  readonly effectiveStatusLabel: string;
  readonly billingInterval: BillingInterval;
  readonly autoRenew: boolean;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  /** Alias of `currentPeriodEnd`: the renewal date IS the period end. */
  readonly renewsAt: string;
  readonly renewalUrgency: RenewalUrgency;
  /** Negative once the renewal date has passed. */
  readonly daysUntilRenewal: number;
  readonly trialEndsAt: string | null;
  readonly lastRenewedAt: string | null;
  /** Plan price per interval, in minor units. Null on a quote-only plan. */
  readonly monthlyValue: number | null;
  readonly portalToken: string;
  readonly startedAt: string;
  readonly cycleStart: string;
  readonly cycleEnd: string;
  /** Null on a quote-only plan, which publishes no cap. */
  readonly requestsPerCycle: number | null;
  readonly requestsUsed: number;
  readonly openRequests: number;
  readonly requests: readonly AdminRequest[];
}

function isPlanId(value: string): value is MaintenancePlanId {
  return (MAINTENANCE_PLAN_IDS as readonly string[]).includes(value);
}

export async function listSubscriptions(
  now: Date = new Date(),
): Promise<readonly AdminSubscription[]> {
  const [subscriptions, pricing] = await Promise.all([
    prisma.maintenanceSubscription.findMany({
      include: {
        client: { select: { id: true, name: true, company: true } },
        requests: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getPricing(),
  ]);

  const copy = pricingCopy("en");
  const tpl = copy.maintenanceTemplates;

  return subscriptions.map((sub) => {
    const cycle = currentBillingCycle(sub.startedAt, now);
    const planId = isPlanId(sub.planId) ? sub.planId : null;
    const plan = planId ? pricing.maintenance[planId] : null;

    const effective = deriveStatus(sub, now);
    const renewal = renewalView(sub, now);

    const inCycle = sub.requests.filter(
      (r) =>
        r.cycleStart.getTime() >= cycle.start.getTime() &&
        r.cycleStart.getTime() < cycle.end.getTime(),
    );

    return {
      id: sub.id,
      clientId: sub.client.id,
      clientName: sub.client.company || sub.client.name || "Unnamed client",
      planId: sub.planId,
      // A plan id the schema no longer knows about is shown as-is rather than
      // hidden, so a renamed plan surfaces as something to fix.
      planName: planId ? copy.maintenance[planId].name : `${sub.planId} (unknown)`,
      planPriceLabel:
        plan === null || plan.price === null
          ? tpl.customPrice
          : formatMoney(plan.price, "en"),
      // Stored status is what an operator set; effective status is what the
      // calendar says today. Both are exposed so a screen can show "Active"
      // that has silently become "Past due" without a write.
      status: sub.status,
      effectiveStatus: effective,
      effectiveStatusLabel: STATUS_LABEL[effective],
      billingInterval: sub.billingInterval,
      autoRenew: sub.autoRenew,
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      renewsAt: sub.currentPeriodEnd.toISOString(),
      renewalUrgency: renewal.urgency,
      daysUntilRenewal: renewal.daysUntil,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      lastRenewedAt: sub.lastRenewedAt?.toISOString() ?? null,
      monthlyValue: plan?.price ?? null,
      portalToken: sub.portalToken,
      startedAt: sub.startedAt.toISOString(),
      cycleStart: cycle.start.toISOString(),
      cycleEnd: cycle.end.toISOString(),
      requestsPerCycle: plan?.requestsPerCycle ?? null,
      requestsUsed: inCycle.filter((r) => r.countsToCap).length,
      openRequests: sub.requests.filter(
        (r) => r.status === "SUBMITTED" || r.status === "IN_PROGRESS",
      ).length,
      requests: sub.requests.map((r) => ({
        id: r.id,
        title: r.title,
        detail: r.detail,
        status: r.status,
        countsToCap: r.countsToCap,
        submittedAt: r.createdAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        cycleStart: r.cycleStart.toISOString(),
      })),
    };
  });
}

export const REQUEST_STATUSES = [
  "SUBMITTED",
  "IN_PROGRESS",
  "COMPLETED",
  "DECLINED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/**
 * Statuses an operator may set by hand.
 *
 * PAST_DUE, GRACE and EXPIRED are deliberately absent: those are *derived* from
 * the billing period by `deriveStatus`, and letting someone set them by hand
 * would put the stored value and the calendar into permanent disagreement.
 */
export const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "SUSPENDED",
  "PAUSED",
  "CANCELLED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * Moves a request's status.
 *
 * `completedAt` follows the status rather than being set independently, so a
 * request cannot end up marked done with no completion date, or reopened while
 * still carrying one.
 */
export async function setRequestStatus(
  id: string,
  status: RequestStatus,
  actor: string | null,
): Promise<boolean> {
  const before = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!before) return false;

  await prisma.maintenanceRequest.update({
    where: { id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? (before.completedAt ?? new Date()) : null,
    },
  });

  await recordChanges(
    diffFields("maintenance_request", id, { status: before.status }, { status }),
    actor,
  );
  return true;
}

/**
 * Reclassifies a request as counting against the cap, or as billable overage.
 *
 * This changes what a client is charged and what their portal shows as used, so
 * it is written to the same change log as a price edit — an operator moving a
 * request out of someone's allowance should leave a record.
 */
export async function setRequestBilling(
  id: string,
  countsToCap: boolean,
  actor: string | null,
): Promise<boolean> {
  const before = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!before) return false;

  await prisma.maintenanceRequest.update({ where: { id }, data: { countsToCap } });

  await recordChanges(
    diffFields(
      "maintenance_request",
      id,
      { countsToCap: before.countsToCap },
      { countsToCap },
    ),
    actor,
  );
  return true;
}

export async function setSubscriptionStatus(
  id: string,
  status: SubscriptionStatus,
  actor: string | null,
  auditActor: Actor = systemActor(actor ?? "System"),
): Promise<boolean> {
  const before = await prisma.maintenanceSubscription.findUnique({ where: { id } });
  if (!before) return false;

  await prisma.maintenanceSubscription.update({
    where: { id },
    data: {
      status,
      cancelledAt: status === "CANCELLED" ? (before.cancelledAt ?? new Date()) : null,
      // Moving off a trial by hand clears the trial deadline, so `deriveStatus`
      // cannot later read the row back as still trialing.
      trialEndsAt: status === "TRIALING" ? before.trialEndsAt : null,
    },
  });

  await recordChanges(
    diffFields("maintenance_subscription", id, { status: before.status }, { status }),
    actor,
  );

  await recordActivity({
    action: `subscription.${status.toLowerCase()}`,
    actor: auditActor,
    entityType: "subscription",
    entityId: id,
    entityLabel: before.planId,
    summary: `Retainer moved to ${STATUS_LABEL[status]}`,
    before: { status: before.status },
    after: { status },
  });
  return true;
}

/**
 * Advances a subscription into its next billing period (§10).
 *
 * The new period is anchored to the end of the one that just closed, never to
 * `now` — see `computeRenewal`. Renewing three days late must not move the
 * billing anchor three days later, every time, forever.
 *
 * This records the renewal; it does not take a payment. There is no payment
 * provider wired into this system, so `lastRenewedAt` means "an operator
 * confirmed this was collected", which is exactly what it is.
 */
export async function renewSubscription(
  id: string,
  actor: string | null,
  auditActor: Actor = systemActor(actor ?? "System"),
  now: Date = new Date(),
): Promise<{ ok: boolean; message: string }> {
  const before = await prisma.maintenanceSubscription.findUnique({ where: { id } });
  if (!before) return { ok: false, message: "That subscription no longer exists." };

  if (before.status === "CANCELLED") {
    return { ok: false, message: "A cancelled retainer cannot be renewed. Start a new one." };
  }

  const period = computeRenewal(before, now);

  await prisma.maintenanceSubscription.update({
    where: { id },
    data: {
      ...period,
      lastRenewedAt: now,
      // Renewing resolves whatever lapsed state the calendar had derived, and
      // converts a trial into a normal paid subscription.
      status: before.status === "TRIALING" ? "ACTIVE" : before.status,
      trialEndsAt: null,
    },
  });

  await recordActivity({
    action: "subscription.renewed",
    actor: auditActor,
    entityType: "subscription",
    entityId: id,
    entityLabel: before.planId,
    summary: `Retainer renewed through ${period.currentPeriodEnd.toISOString().slice(0, 10)}`,
    before: { currentPeriodEnd: before.currentPeriodEnd },
    after: { currentPeriodEnd: period.currentPeriodEnd },
  });

  return { ok: true, message: "Renewed. The next period is now current." };
}

/**
 * Turns auto-renewal on or off.
 *
 * Off is not a cancellation: the retainer runs to the end of its paid period
 * and then EXPIRES. The renewals screen shows it as "Not renewing" from the
 * moment it enters the horizon, so a churn event is visible before the date
 * rather than discovered after it.
 *
 * Returns false only when the subscription does not exist.
 */
export async function setAutoRenew(
  id: string,
  autoRenew: boolean,
  actor: string | null,
  auditActor: Actor = systemActor(actor ?? "System"),
): Promise<boolean> {
  const before = await prisma.maintenanceSubscription.findUnique({ where: { id } });
  if (!before) return false;

  // Idempotent: setting the value it already holds succeeds silently and writes
  // no activity line. `false` is reserved for "no such subscription", which is
  // the only case the caller should turn into a 404.
  if (before.autoRenew === autoRenew) return true;

  await prisma.maintenanceSubscription.update({ where: { id }, data: { autoRenew } });

  await recordActivity({
    action: "subscription.auto_renew_changed",
    actor: auditActor,
    entityType: "subscription",
    entityId: id,
    entityLabel: before.planId,
    summary: autoRenew
      ? "Auto-renewal switched on"
      : `Auto-renewal switched off — expires ${before.currentPeriodEnd.toISOString().slice(0, 10)}`,
    before: { autoRenew: before.autoRenew },
    after: { autoRenew },
  });
  return true;
}

export async function createSubscription(
  clientId: string,
  planId: MaintenancePlanId,
  actor: string | null,
  interval: BillingInterval = "MONTHLY",
  auditActor: Actor = systemActor(actor ?? "System"),
): Promise<{ ok: boolean; message: string; id?: string }> {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, message: "That client no longer exists." };

  // One live retainer per client: two active subscriptions would give the same
  // client two separate allowances and two portal links.
  const existing = await prisma.maintenanceSubscription.findFirst({
    where: {
      clientId,
      status: { in: ["TRIALING", "ACTIVE", "PAUSED", "SUSPENDED"] },
    },
  });
  if (existing) {
    return {
      ok: false,
      message: "This client already has a maintenance plan. Cancel it first.",
    };
  }

  const startedAt = new Date();
  const created = await prisma.maintenanceSubscription.create({
    data: {
      clientId,
      planId,
      billingInterval: interval,
      startedAt,
      currentPeriodStart: startedAt,
      // The first period is computed the same way every later renewal is, so a
      // subscription's first renewal date is never a special case.
      currentPeriodEnd: nextPeriodEnd(startedAt, interval),
    },
  });

  await recordChanges(
    [
      {
        entityType: "maintenance_subscription",
        entityId: created.id,
        field: "created",
        oldValue: null,
        newValue: planId,
      },
    ],
    actor,
  );

  await recordActivity({
    action: "subscription.created",
    actor: auditActor,
    entityType: "subscription",
    entityId: created.id,
    entityLabel: client.company || client.name || "Client",
    summary: `Started the ${planId} retainer for ${client.company || client.name || "a client"}`,
    after: {
      planId,
      billingInterval: interval,
      currentPeriodEnd: created.currentPeriodEnd,
    },
  });

  return { ok: true, message: "Maintenance plan started.", id: created.id };
}
