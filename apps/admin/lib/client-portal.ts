import { prisma } from "@repo/database";
import {
  currentBillingCycle,
  daysUntilCycleEnd,
  formatMoney,
  MAINTENANCE_PLAN_IDS,
  pricingCopy,
  type Locale,
  type MaintenancePlanId,
} from "@repo/pricing-schema";

import { getPricing } from "@/lib/pricing-store";

/**
 * The client portal's read model.
 *
 * A client sees their plan, how much of this cycle's request allowance they
 * have used, and every request they have made. The cap and the overage rate are
 * resolved from the pricing schema rather than copied onto the subscription, so
 * a plan change reaches existing subscribers instead of leaving them reading a
 * stale number.
 *
 * `internalHourEquivalent` is never read here. The cap a client sees is the
 * request count they were sold; the hours behind it are margin planning.
 */

export interface PortalRequest {
  readonly id: string;
  readonly title: string;
  readonly detail: string | null;
  readonly status: string;
  readonly countsToCap: boolean;
  readonly submittedAt: string;
  readonly completedAt: string | null;
}

export interface PortalView {
  readonly clientName: string;
  readonly planName: string;
  readonly planPriceLabel: string;
  readonly isCustomQuote: boolean;
  readonly subscriptionStatus: string;
  /** Null when the plan is quote-only and has no published cap. */
  readonly requestsPerCycle: number | null;
  readonly requestsUsed: number;
  readonly requestsRemaining: number | null;
  readonly overageNote: string | null;
  readonly cycleStart: string;
  readonly cycleEnd: string;
  readonly daysUntilRenewal: number;
  readonly requestsThisCycle: readonly PortalRequest[];
  readonly history: readonly PortalRequest[];
}

function isPlanId(value: string): value is MaintenancePlanId {
  return (MAINTENANCE_PLAN_IDS as readonly string[]).includes(value);
}

function toPortalRequest(row: {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  countsToCap: boolean;
  createdAt: Date;
  completedAt: Date | null;
}): PortalRequest {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    status: row.status,
    countsToCap: row.countsToCap,
    submittedAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

/** Resolves a portal token. Returns null for an unknown or cancelled link. */
export async function loadPortal(
  token: string,
  locale: Locale = "en",
  now: Date = new Date(),
): Promise<PortalView | null> {
  const subscription = await prisma.maintenanceSubscription.findUnique({
    where: { portalToken: token },
    include: {
      client: { select: { name: true, company: true } },
      requests: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!subscription || subscription.status === "CANCELLED") return null;
  if (!isPlanId(subscription.planId)) return null;

  const pricing = await getPricing();
  const plan = pricing.maintenance[subscription.planId];
  const copy = pricingCopy(locale);
  const tpl = copy.maintenanceTemplates;

  const cycle = currentBillingCycle(subscription.startedAt, now);

  // Only requests stamped into this cycle and marked against the cap count.
  // Overage work is shown but never counted, so the number a client reads
  // always matches what they are billed for.
  const thisCycle = subscription.requests.filter(
    (r) =>
      r.cycleStart.getTime() >= cycle.start.getTime() &&
      r.cycleStart.getTime() < cycle.end.getTime(),
  );
  const used = thisCycle.filter((r) => r.countsToCap).length;

  const cap = plan.requestsPerCycle;

  return {
    clientName:
      subscription.client.company || subscription.client.name || "Your account",
    planName: copy.maintenance[plan.id].name,
    planPriceLabel:
      plan.price === null ? tpl.customPrice : formatMoney(plan.price, locale),
    isCustomQuote: plan.price === null,
    subscriptionStatus: subscription.status,
    requestsPerCycle: cap,
    requestsUsed: used,
    requestsRemaining: cap === null ? null : Math.max(cap - used, 0),
    overageNote:
      plan.overageHourlyRate === null
        ? null
        : tpl.overage.replace(
            "{rate}",
            new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
              plan.overageHourlyRate,
            ),
          ),
    cycleStart: cycle.start.toISOString(),
    cycleEnd: cycle.end.toISOString(),
    daysUntilRenewal: daysUntilCycleEnd(cycle, now),
    requestsThisCycle: thisCycle.map(toPortalRequest),
    history: subscription.requests.map(toPortalRequest),
  };
}

export interface SubmitOutcome {
  readonly ok: boolean;
  readonly message: string;
  readonly overCap: boolean;
}

/**
 * Records a client's request.
 *
 * Being over the cap does NOT reject the request — it is accepted and flagged
 * as overage. Refusing work a client is willing to pay for would be the wrong
 * behaviour, and silently counting it against a cap they have already used up
 * would be worse. The cycle is stamped now so a later change to the billing
 * anchor cannot move this request into another window.
 */
export async function submitRequest(
  token: string,
  title: string,
  detail: string | null,
  now: Date = new Date(),
): Promise<SubmitOutcome> {
  const subscription = await prisma.maintenanceSubscription.findUnique({
    where: { portalToken: token },
    include: { requests: true },
  });

  if (!subscription || subscription.status !== "ACTIVE") {
    return {
      ok: false,
      message: "This portal link is not valid.",
      overCap: false,
    };
  }
  if (!isPlanId(subscription.planId)) {
    return { ok: false, message: "This plan is not recognised.", overCap: false };
  }

  const pricing = await getPricing();
  const cap = pricing.maintenance[subscription.planId].requestsPerCycle;
  const cycle = currentBillingCycle(subscription.startedAt, now);

  const usedThisCycle = subscription.requests.filter(
    (r) =>
      r.countsToCap &&
      r.cycleStart.getTime() >= cycle.start.getTime() &&
      r.cycleStart.getTime() < cycle.end.getTime(),
  ).length;

  const overCap = cap !== null && usedThisCycle >= cap;

  await prisma.maintenanceRequest.create({
    data: {
      subscriptionId: subscription.id,
      title,
      detail,
      cycleStart: cycle.start,
      countsToCap: !overCap,
    },
  });

  return {
    ok: true,
    overCap,
    message: overCap
      ? "Request received. This one is beyond your included allowance for this cycle, so it will be quoted as additional work before anything starts."
      : "Request received.",
  };
}
