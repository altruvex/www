import type { MaintenancePlanId } from "./ids.js";
import type { Amount, BillingCycle, EntityStatus, Versioned } from "./types.js";

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

export const ORDERED_MAINTENANCE_PLANS: readonly MaintenancePlan[] =
  Object.values(MAINTENANCE_PLANS).sort((a, b) => a.order - b.order);

/** Plans a client may see. Filters `planned`/`retired` out of public surfaces. */
export function publicMaintenancePlans(): readonly MaintenancePlan[] {
  return ORDERED_MAINTENANCE_PLANS.filter((plan) => plan.status === "active");
}
