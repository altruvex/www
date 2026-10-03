import type { MaintenancePlanId } from "./ids";
import type { Amount, BillingCycle, EntityStatus, Versioned } from "./types";

/**
 * Maintenance retainers.
 *
 * Scope is a cap on **edit requests**, never on hours. Selling hours invites a
 * dispute about a stopwatch on every ticket; selling a request count is
 * checkable by both sides. The hour-equivalents used to set these caps are
 * margin planning and are recorded in `internalHourEquivalent`, which is
 * `admin`-only and must never reach a client surface, proposal, or contract —
 * see the guard in `validate-pricing-literals.mjs`.
 *
 * `price: null` means quote-only. Enterprise is always quoted; it never
 * carries a published figure in any locale.
 */
export interface MaintenancePlan extends Versioned {
  readonly id: MaintenancePlanId;
  readonly status: EntityStatus;
  /** EGP per `billingCycle`, or null when the plan is quote-only. */
  readonly price: Amount | null;
  readonly billingCycle: BillingCycle;
  /** Client-facing cap on edit requests per cycle. Null when quote-only. */
  readonly requestsPerCycle: number | null;
  /** INTERNAL ONLY — margin planning. Never render this. */
  readonly internalHourEquivalent: number | null;
  /** EGP per hour for work beyond the cap. Mirrors the contract revision rate. */
  readonly overageHourlyRate: Amount | null;
  readonly priorityTurnaround: boolean;
  readonly clientPortalAccess: boolean;
  readonly order: number;
  readonly highlight: boolean;
}

export const MAINTENANCE_PLANS: Readonly<
  Record<MaintenancePlanId, MaintenancePlan>
> = {
  essential: {
    id: "essential",
    status: "active",
    price: 2_500,
    billingCycle: "monthly",
    requestsPerCycle: 2,
    internalHourEquivalent: 2,
    overageHourlyRate: 800,
    priorityTurnaround: false,
    clientPortalAccess: true,
    order: 1,
    highlight: false,
    version: 2,
    lastUpdated: "2026-09-06",
  },
  professional: {
    id: "professional",
    status: "active",
    price: 5_000,
    billingCycle: "monthly",
    requestsPerCycle: 4,
    internalHourEquivalent: 4,
    overageHourlyRate: 800,
    priorityTurnaround: true,
    clientPortalAccess: true,
    order: 2,
    highlight: true,
    version: 2,
    lastUpdated: "2026-09-06",
  },
  enterprise: {
    id: "enterprise",
    status: "active",
    price: null,
    billingCycle: "monthly",
    requestsPerCycle: null,
    internalHourEquivalent: null,
    overageHourlyRate: null,
    priorityTurnaround: true,
    clientPortalAccess: true,
    order: 3,
    highlight: false,
    version: 2,
    lastUpdated: "2026-09-06",
  },
};

/**
 * How often a retainer is invoiced. A plan's `price` is always the monthly
 * figure; the interval is chosen per subscription, not per plan.
 *
 * Only `monthly` and `annual` are published. `quarterly` exists because the
 * admin can record one; it carries no discount.
 */
export const MAINTENANCE_INTERVALS = ["monthly", "quarterly", "annual"] as const;
export type MaintenanceInterval = (typeof MAINTENANCE_INTERVALS)[number];

/**
 * Months charged per invoice. A year paid up front is charged as ten months —
 * two months free (ruling 2026-10-02). The annual price is derived from the
 * monthly one and never stored, so an admin override of the monthly price
 * moves both and the two can never drift apart.
 *
 * The interval changes the invoice only. The edit-request cap stays per month
 * (`billing-cycle.ts`) on every interval: a yearly pool would let a client
 * spend a year of requests in one month, which the caps were never sized for,
 * and "what is left this month" is a number both sides can check.
 */
export const MAINTENANCE_PAID_MONTHS: Readonly<
  Record<MaintenanceInterval, number>
> = {
  monthly: 1,
  quarterly: 3,
  annual: 10,
};

const MONTHS_COVERED: Readonly<Record<MaintenanceInterval, number>> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

/** Months of service an interval covers without charging for them. */
export function maintenanceFreeMonths(interval: MaintenanceInterval): number {
  return MONTHS_COVERED[interval] - MAINTENANCE_PAID_MONTHS[interval];
}

/** EGP per invoice at `interval`, or null when the plan is quote-only. */
export function maintenanceIntervalPrice(
  plan: Pick<MaintenancePlan, "price">,
  interval: MaintenanceInterval,
): Amount | null {
  return plan.price === null
    ? null
    : plan.price * MAINTENANCE_PAID_MONTHS[interval];
}

export const ORDERED_MAINTENANCE_PLANS: readonly MaintenancePlan[] =
  Object.values(MAINTENANCE_PLANS).sort((a, b) => a.order - b.order);

/** Plans a client may see. Filters `planned`/`retired` out of public surfaces. */
export function publicMaintenancePlans(): readonly MaintenancePlan[] {
  return ORDERED_MAINTENANCE_PLANS.filter((plan) => plan.status === "active");
}
