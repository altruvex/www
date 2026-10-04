import type { MaintenancePlanId } from "./ids";
import type { Amount, BillingCycle, EntityStatus, Versioned } from "./types";

export interface MaintenancePlan extends Versioned {
  readonly id: MaintenancePlanId;
  readonly status: EntityStatus;
  readonly price: Amount | null;
  readonly billingCycle: BillingCycle;
  readonly requestsPerCycle: number | null;
  readonly internalHourEquivalent: number | null;
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

export const MAINTENANCE_INTERVALS = ["monthly", "quarterly", "annual"] as const;
export type MaintenanceInterval = (typeof MAINTENANCE_INTERVALS)[number];

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

export function maintenanceFreeMonths(interval: MaintenanceInterval): number {
  return MONTHS_COVERED[interval] - MAINTENANCE_PAID_MONTHS[interval];
}

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

export function publicMaintenancePlans(): readonly MaintenancePlan[] {
  return ORDERED_MAINTENANCE_PLANS.filter((plan) => plan.status === "active");
}
