import type {
  BillingInterval,
  MaintenanceSubscriptionStatus,
} from "@repo/database";

/**
 * The subscription state machine (§9) and the renewal arithmetic behind it
 * (§10).
 *
 * Two kinds of state are deliberately kept apart:
 *
 *   - **Stored status** — what an operator decided. PAUSED, SUSPENDED and
 *     CANCELLED only ever get there because a human put them there.
 *   - **Derived status** — what the calendar says. A subscription that was
 *     ACTIVE becomes PAST_DUE the moment its period ends unpaid, without
 *     anyone touching it.
 *
 * Deriving the second rather than storing it means the renewals screen is
 * correct on a system that has not run a cron job in a week. Nothing here
 * writes: `deriveStatus` is a pure function of the row and the clock, so the
 * same subscription reads the same way on every surface.
 *
 * Deliberately not `server-only`: the admin table, the dashboard and the client
 * portal must all render the same status for the same row, and duplicating this
 * arithmetic on the client is how they would drift apart. It touches no secret
 * and no database — only a row that has already been fetched, and the clock.
 */

/** Days a subscription stays PAST_DUE before it is escalated to GRACE. */
export const PAST_DUE_DAYS = 7;

/** Days in GRACE before the operator is told to suspend. */
export const GRACE_DAYS = 14;

/** Horizon for "renews soon" on the dashboard and the renewals view. */
export const RENEWAL_SOON_DAYS = 30;

export const DAY_MS = 86_400_000;

export const INTERVAL_MONTHS: Record<BillingInterval, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  ANNUAL: 12,
};

export const INTERVAL_LABEL: Record<BillingInterval, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual",
};

/**
 * Adds whole months, clamping the day to the target month's length.
 *
 * A retainer anchored on the 31st renews on the 30th in April and the 28th in
 * February. JavaScript's native overflow would roll that to May 1st and March
 * 3rd, walking the billing anchor forward a little more every year.
 */
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

/** Statuses an operator sets by hand; the clock must not override them. */
const OPERATOR_HELD: ReadonlySet<MaintenanceSubscriptionStatus> = new Set([
  "PAUSED",
  "SUSPENDED",
  "CANCELLED",
  "EXPIRED",
]);

/**
 * The effective status right now.
 *
 * `EXPIRED` and `PAST_DUE` are both reachable from ACTIVE without a write:
 * whether a lapsed period ends the subscription or merely makes it late is
 * decided by `autoRenew`, which is the whole point of storing that flag.
 */
export function deriveStatus(
  sub: LifecycleInput,
  now: Date = new Date(),
): MaintenanceSubscriptionStatus {
  if (OPERATOR_HELD.has(sub.status)) return sub.status;

  if (sub.status === "TRIALING") {
    // A trial that has not lapsed stays a trial; one that has becomes a normal
    // subscription and is then judged by the same period rules as any other.
    if (sub.trialEndsAt && sub.trialEndsAt.getTime() > now.getTime()) return "TRIALING";
  }

  if (sub.currentPeriodEnd.getTime() > now.getTime()) return "ACTIVE";

  // The period has lapsed.
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

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

export const STATUS_TONE: Record<MaintenanceSubscriptionStatus, StatusTone> = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  GRACE: "danger",
  SUSPENDED: "danger",
  PAUSED: "neutral",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

/** One line saying what this status means for the operator, not for the client. */
export const STATUS_MEANING: Record<MaintenanceSubscriptionStatus, string> = {
  TRIALING: "Inside a trial period. Converts automatically when the trial ends.",
  ACTIVE: "Paid and inside its current period.",
  PAST_DUE: `Renewal date passed without a recorded payment. Escalates after ${PAST_DUE_DAYS} days.`,
  GRACE: `Overdue beyond ${PAST_DUE_DAYS} days. Service is still running — decide whether to suspend.`,
  SUSPENDED: "Service stopped by Altruvex. The subscription is retained.",
  PAUSED: "Halted at the client's request, still inside a paid period.",
  CANCELLED: "Ended by the client or by Altruvex.",
  EXPIRED: "Ran to the end of its final period without renewing.",
};

/** Statuses that mean money is still expected from this client. */
export const REVENUE_BEARING: ReadonlySet<MaintenanceSubscriptionStatus> = new Set([
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "GRACE",
]);

export type RenewalUrgency = "overdue" | "due-soon" | "scheduled" | "ending" | "none";

export interface RenewalView {
  urgency: RenewalUrgency;
  /** Negative when the date has passed. */
  daysUntil: number;
  renewsAt: Date;
  autoRenew: boolean;
}

/**
 * How a subscription reads on the renewals screen.
 *
 * `ending` is the case that a naive "days until renewal" sort hides entirely: a
 * subscription with auto-renew off is not a renewal at all, it is a scheduled
 * churn event, and it needs to be visible *before* the date rather than after.
 */
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

export const URGENCY_TONE: Record<RenewalUrgency, StatusTone> = {
  overdue: "danger",
  "due-soon": "warning",
  ending: "warning",
  scheduled: "neutral",
  none: "neutral",
};

export const URGENCY_LABEL: Record<RenewalUrgency, string> = {
  overdue: "Overdue",
  "due-soon": "Due soon",
  ending: "Not renewing",
  scheduled: "Scheduled",
  none: "—",
};

/**
 * The period a renewal moves the subscription into.
 *
 * Anchored to the period that just ended, not to `now`: renewing three days
 * late must not shift every future renewal three days later. A subscription so
 * far overdue that whole periods were missed is caught up to the present rather
 * than billed for each skipped period — Altruvex does not backdate charges.
 */
export function computeRenewal(
  sub: { currentPeriodEnd: Date; billingInterval: BillingInterval },
  now: Date = new Date(),
): { currentPeriodStart: Date; currentPeriodEnd: Date } {
  let start = sub.currentPeriodEnd;
  let end = nextPeriodEnd(start, sub.billingInterval);

  // Guard the loop as well as the condition: a corrupt interval must not spin.
  let guard = 0;
  while (end.getTime() <= now.getTime() && guard < 120) {
    start = end;
    end = nextPeriodEnd(start, sub.billingInterval);
    guard += 1;
  }

  return { currentPeriodStart: start, currentPeriodEnd: end };
}
