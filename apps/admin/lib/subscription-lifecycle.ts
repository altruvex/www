import type {
  BillingInterval,
  MaintenanceSubscriptionStatus,
} from "@repo/database";

export const PAST_DUE_DAYS = 7;

export const RENEWAL_SOON_DAYS = 30;

export const DAY_MS = 86_400_000;

export const INTERVAL_MONTHS: Record<BillingInterval, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  ANNUAL: 12,
};

export function addMonths(from: Date, months: number): Date {
  const day = from.getUTCDate();
  const target = new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth() + months,
      1,
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds(),
    ),
  );
  const daysInTargetMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, daysInTargetMonth));
  return target;
}

export function nextPeriodEnd(periodStart: Date, interval: BillingInterval): Date {
  return addMonths(periodStart, INTERVAL_MONTHS[interval]);
}

export interface LifecycleInput {
  status: MaintenanceSubscriptionStatus;
  currentPeriodEnd: Date;
  autoRenew: boolean;
  trialEndsAt: Date | null;
  cancelledAt: Date | null;
}

const OPERATOR_HELD: ReadonlySet<MaintenanceSubscriptionStatus> = new Set([
  "PAUSED",
  "SUSPENDED",
  "CANCELLED",
  "EXPIRED",
]);

export function deriveStatus(
  sub: LifecycleInput,
  now: Date = new Date(),
): MaintenanceSubscriptionStatus {
  if (OPERATOR_HELD.has(sub.status)) return sub.status;

  if (sub.status === "TRIALING") {
    if (sub.trialEndsAt && sub.trialEndsAt.getTime() > now.getTime()) return "TRIALING";
  }

  if (sub.currentPeriodEnd.getTime() > now.getTime()) return "ACTIVE";

  if (!sub.autoRenew) return "EXPIRED";

  const overdueDays = Math.floor(
    (now.getTime() - sub.currentPeriodEnd.getTime()) / DAY_MS,
  );
  if (overdueDays >= PAST_DUE_DAYS) return "GRACE";
  return "PAST_DUE";
}

export const STATUS_LABEL: Record<MaintenanceSubscriptionStatus, string> = {
  TRIALING: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  GRACE: "Grace period",
  SUSPENDED: "Suspended",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export const REVENUE_BEARING: ReadonlySet<MaintenanceSubscriptionStatus> = new Set([
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "GRACE",
]);

export type RenewalUrgency = "overdue" | "due-soon" | "scheduled" | "ending" | "none";

export function needsRenewalAttention(sub: LifecycleInput, now: Date = new Date()): boolean {
  const effective = deriveStatus(sub, now);
  if (effective === "EXPIRED") return true;
  const { urgency } = renewalView(sub, now);
  return urgency === "overdue" || urgency === "due-soon" || urgency === "ending";
}

export interface RenewalView {
  urgency: RenewalUrgency;
  daysUntil: number;
  renewsAt: Date;
  autoRenew: boolean;
}

export function renewalView(
  sub: LifecycleInput,
  now: Date = new Date(),
): RenewalView {
  const daysUntil = Math.ceil(
    (sub.currentPeriodEnd.getTime() - now.getTime()) / DAY_MS,
  );
  const base = {
    daysUntil,
    renewsAt: sub.currentPeriodEnd,
    autoRenew: sub.autoRenew,
  };

  const effective = deriveStatus(sub, now);
  if (!REVENUE_BEARING.has(effective)) return { ...base, urgency: "none" };
  if (daysUntil < 0) return { ...base, urgency: "overdue" };
  if (!sub.autoRenew && daysUntil <= RENEWAL_SOON_DAYS) return { ...base, urgency: "ending" };
  if (daysUntil <= RENEWAL_SOON_DAYS) return { ...base, urgency: "due-soon" };
  return { ...base, urgency: "scheduled" };
}

export function computeRenewal(
  sub: { currentPeriodEnd: Date; billingInterval: BillingInterval },
  now: Date = new Date(),
): { currentPeriodStart: Date; currentPeriodEnd: Date } {
  let start = sub.currentPeriodEnd;
  let end = nextPeriodEnd(start, sub.billingInterval);

  let guard = 0;
  while (end.getTime() <= now.getTime() && guard < 120) {
    start = end;
    end = nextPeriodEnd(start, sub.billingInterval);
    guard += 1;
  }

  return { currentPeriodStart: start, currentPeriodEnd: end };
}
