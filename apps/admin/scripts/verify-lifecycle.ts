/**
 * Pure-logic checks for the subscription lifecycle and renewal arithmetic.
 *
 * Needs no database — every function under test is a pure function of a row and
 * a clock, which is exactly why they are worth pinning: the renewals screen,
 * the dashboard and the client portal all derive status independently, and a
 * month-length bug here would quietly move a real billing anchor.
 *
 *   cd apps/admin && bun run verify:lifecycle
 */
import { currentBillingCycle } from "@repo/pricing-schema";

import {
  addMonths,
  computeRenewal,
  deriveStatus,
  needsRenewalAttention,
  nextPeriodEnd,
  renewalView,
  PAST_DUE_DAYS,
  RENEWAL_SOON_DAYS,
} from "../lib/subscription-lifecycle";
import {
  BUSINESS_TIME_ZONE,
  calendarDaysUntil,
  isPaymentOverdue,
  overdueCutoff,
} from "../lib/payment-overdue";

let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (s: string) => new Date(`${s}T12:00:00.000Z`);
const days = (n: number) => n * 86_400_000;

console.log("\nMonth arithmetic");
check(iso(addMonths(utc("2026-01-31"), 1)) === "2026-02-28", "Jan 31 + 1mo clamps to Feb 28");
check(iso(addMonths(utc("2028-01-31"), 1)) === "2028-02-29", "Jan 31 + 1mo clamps to Feb 29 in a leap year");
check(iso(addMonths(utc("2026-03-31"), 1)) === "2026-04-30", "Mar 31 + 1mo clamps to Apr 30");
check(iso(addMonths(utc("2026-01-15"), 12)) === "2027-01-15", "mid-month + 12mo keeps the day");
check(iso(addMonths(utc("2026-11-30"), 3)) === "2027-02-28", "Nov 30 + 3mo crosses the year and clamps");
// The anchor must not walk: repeatedly clamping from the ORIGINAL anchor keeps
// the 31st, whereas re-anchoring off each clamped result would decay to the 28th.
check(iso(addMonths(utc("2026-01-31"), 2)) === "2026-03-31", "Jan 31 + 2mo returns to the 31st, anchor does not decay");

console.log("\nPeriod ends by interval");
check(iso(nextPeriodEnd(utc("2026-06-10"), "MONTHLY")) === "2026-07-10", "monthly");
check(iso(nextPeriodEnd(utc("2026-06-10"), "QUARTERLY")) === "2026-09-10", "quarterly");
check(iso(nextPeriodEnd(utc("2026-06-10"), "ANNUAL")) === "2027-06-10", "annual");

console.log("\nDerived status");
const now = utc("2026-09-07");
const base = { autoRenew: true, trialEndsAt: null, cancelledAt: null } as const;

check(
  deriveStatus({ ...base, status: "ACTIVE", currentPeriodEnd: new Date(now.getTime() + days(5)) }, now) === "ACTIVE",
  "inside its period → ACTIVE",
);
check(
  deriveStatus({ ...base, status: "ACTIVE", currentPeriodEnd: new Date(now.getTime() - days(2)) }, now) === "PAST_DUE",
  "2 days lapsed, auto-renew on → PAST_DUE",
);
check(
  deriveStatus({ ...base, status: "ACTIVE", currentPeriodEnd: new Date(now.getTime() - days(PAST_DUE_DAYS + 1)) }, now) === "GRACE",
  `lapsed beyond ${PAST_DUE_DAYS} days → GRACE`,
);
check(
  deriveStatus({ ...base, autoRenew: false, status: "ACTIVE", currentPeriodEnd: new Date(now.getTime() - days(2)) }, now) === "EXPIRED",
  "lapsed with auto-renew off → EXPIRED, never PAST_DUE",
);
check(
  deriveStatus({ ...base, status: "PAUSED", currentPeriodEnd: new Date(now.getTime() - days(90)) }, now) === "PAUSED",
  "operator-held PAUSED survives a long-lapsed period",
);
check(
  deriveStatus({ ...base, status: "CANCELLED", currentPeriodEnd: new Date(now.getTime() - days(90)) }, now) === "CANCELLED",
  "CANCELLED is never re-derived into PAST_DUE",
);
check(
  deriveStatus({ ...base, status: "TRIALING", trialEndsAt: new Date(now.getTime() + days(3)), currentPeriodEnd: new Date(now.getTime() + days(3)) }, now) === "TRIALING",
  "unexpired trial → TRIALING",
);
check(
  deriveStatus({ ...base, status: "TRIALING", trialEndsAt: new Date(now.getTime() - days(1)), currentPeriodEnd: new Date(now.getTime() + days(20)) }, now) === "ACTIVE",
  "lapsed trial inside a paid period → ACTIVE",
);

console.log("\nRenewal view");
check(
  renewalView({ ...base, status: "ACTIVE", currentPeriodEnd: new Date(now.getTime() - days(3)) }, now).urgency === "overdue",
  "past its date → overdue",
);
check(
  renewalView({ ...base, status: "ACTIVE", currentPeriodEnd: new Date(now.getTime() + days(10)) }, now).urgency === "due-soon",
  "within the horizon → due-soon",
);
check(
  renewalView({ ...base, autoRenew: false, status: "ACTIVE", currentPeriodEnd: new Date(now.getTime() + days(10)) }, now).urgency === "ending",
  "auto-renew off inside the horizon → ending, not due-soon",
);
check(
  renewalView({ ...base, status: "ACTIVE", currentPeriodEnd: new Date(now.getTime() + days(200)) }, now).urgency === "scheduled",
  "far out → scheduled",
);
check(
  renewalView({ ...base, status: "CANCELLED", currentPeriodEnd: new Date(now.getTime() - days(3)) }, now).urgency === "none",
  "a cancelled subscription is not a renewal",
);

console.log("\nRenewal advances the period");
{
  // Renewed three days late: the new period must still start where the old one
  // ended, or every future renewal drifts three days later.
  const late = computeRenewal(
    { currentPeriodEnd: utc("2026-09-04"), billingInterval: "MONTHLY" },
    utc("2026-09-07"),
  );
  check(iso(late.currentPeriodStart) === "2026-09-04", "late renewal anchors to the old period end, not to today");
  check(iso(late.currentPeriodEnd) === "2026-10-04", "late renewal keeps the original billing day");

  // Months missed entirely: catch up to the present rather than bill each one.
  const stale = computeRenewal(
    { currentPeriodEnd: utc("2026-01-15"), billingInterval: "MONTHLY" },
    utc("2026-09-07"),
  );
  check(
    stale.currentPeriodEnd.getTime() > utc("2026-09-07").getTime(),
    "a long-stale subscription catches up to a future period",
  );
  check(iso(stale.currentPeriodEnd) === "2026-09-15", "catch-up lands on the next real boundary, keeping the 15th");

  const annual = computeRenewal(
    { currentPeriodEnd: utc("2026-09-04"), billingInterval: "ANNUAL" },
    utc("2026-09-07"),
  );
  check(iso(annual.currentPeriodEnd) === "2027-09-04", "annual renewal advances a year");
}

console.log("\nInterval change takes effect at renewal");
{
  // A monthly retainer switched to annual mid-period: the paid month is left
  // alone, and the renewal that follows runs a year from where that month
  // ended — not from the day the interval was changed.
  const paid = { currentPeriodStart: utc("2026-08-04"), currentPeriodEnd: utc("2026-09-04") };
  const switched = { ...paid, billingInterval: "ANNUAL" as const };
  check(
    nextPeriodEnd(switched.currentPeriodStart, switched.billingInterval).getTime() !==
      switched.currentPeriodEnd.getTime(),
    "a period shorter than its stored interval reveals the change is still pending",
  );
  const renewed = computeRenewal(switched, utc("2026-09-07"));
  check(iso(renewed.currentPeriodStart) === "2026-09-04", "the new year starts where the paid month ended");
  check(iso(renewed.currentPeriodEnd) === "2027-09-04", "monthly → annual then renewal yields a 12-month period");
  check(
    nextPeriodEnd(renewed.currentPeriodStart, "ANNUAL").getTime() === renewed.currentPeriodEnd.getTime(),
    "after that renewal the period matches its interval again",
  );

  // And back: a year paid, then monthly from its end.
  const shortened = computeRenewal(
    { currentPeriodEnd: utc("2027-09-04"), billingInterval: "MONTHLY" },
    utc("2027-09-04"),
  );
  check(iso(shortened.currentPeriodEnd) === "2027-10-04", "annual → monthly then renewal yields a 1-month period");
}

console.log("\nAnnual interval");
{
  // A yearly retainer is judged by the same clock as a monthly one: it sits
  // "scheduled" for eleven months and enters the horizon only at the end.
  const start = utc("2025-10-02");
  const end = nextPeriodEnd(start, "ANNUAL");
  const yearly = { ...base, status: "ACTIVE", currentPeriodEnd: end } as const;
  check(iso(end) === "2026-10-02", "a year's period ends on the same day next year");
  check(renewalView(yearly, utc("2026-06-01")).urgency === "scheduled", "eight months in → scheduled, not due-soon");
  check(
    renewalView(yearly, new Date(end.getTime() - days(RENEWAL_SOON_DAYS - 5))).urgency === "due-soon",
    "inside the last 30 days → due-soon",
  );
  check(deriveStatus(yearly, new Date(end.getTime() + days(2))) === "PAST_DUE", "2 days past a yearly end → PAST_DUE");
  check(
    deriveStatus(yearly, new Date(end.getTime() + days(PAST_DUE_DAYS + 1))) === "GRACE",
    `a yearly end lapsed beyond ${PAST_DUE_DAYS} days → GRACE`,
  );

  // The request allowance ignores the interval: it is a monthly window on a
  // yearly retainer too (ruling 2026-10-02), so a client cannot spend a year
  // of requests in one month.
  const window = currentBillingCycle(start, utc("2026-06-15"));
  check(iso(window.start) === "2026-06-02" && iso(window.end) === "2026-07-02", "the allowance window on a yearly retainer is still one month");
  check(window.end.getTime() < end.getTime(), "the allowance resets long before the year renews");
}

// A payment is late from the day AFTER its due date in the business zone
// (ruling 2026-10-03), never from the due instant. Every instant below is
// fixed in UTC, so the expectations hold whatever TZ the process runs in —
// run this once under TZ=UTC and once under TZ=Africa/Cairo to see it.
console.log("\nPayment overdue cut-off (Africa/Cairo, calendar day after the due date)");
{
  check(BUSINESS_TIME_ZONE === "Africa/Cairo", "the business day is Cairo's");
  const pending = (due: string) => ({ status: "PENDING", dueDate: new Date(due) });

  // Saturday 3 Oct 2026, 15:00 Cairo (EEST, UTC+3) → today began at 02 Oct 21:00Z.
  const afternoon = new Date("2026-10-03T12:00:00Z");
  check(overdueCutoff(afternoon).toISOString() === "2026-10-02T21:00:00.000Z", "the cut-off is Cairo midnight, not UTC midnight");
  check(!isPaymentOverdue(pending("2026-10-02T23:05:00Z"), afternoon), "due 02:05 today → still pending this afternoon");
  check(!isPaymentOverdue(pending("2026-10-03T12:00:00Z"), afternoon), "due this very instant → not overdue");
  check(isPaymentOverdue(pending("2026-10-02T20:59:00Z"), afternoon), "due yesterday 23:59 Cairo → overdue");
  check(isPaymentOverdue(pending("2026-10-02T21:00:00Z"), afternoon) === false, "due at today's first instant → due today");
  check(!isPaymentOverdue(pending("2026-10-04T08:00:00Z"), afternoon), "due tomorrow → not overdue");
  check(!isPaymentOverdue({ status: "PAID", dueDate: new Date("2026-09-01T00:00:00Z") }, afternoon), "a paid row is never late");
  check(!isPaymentOverdue({ status: "WAIVED", dueDate: new Date("2026-09-01T00:00:00Z") }, afternoon), "a waived row is never late");
  check(!isPaymentOverdue({ status: "PENDING", dueDate: null }, afternoon), "no due date → nothing to be late against");
  check(isPaymentOverdue({ status: "OVERDUE", dueDate: new Date("2026-10-01T10:00:00Z") }, afternoon), "a stored OVERDUE past the cut-off counts");
  check(!isPaymentOverdue({ status: "OVERDUE", dueDate: new Date("2026-10-03T06:00:00Z") }, afternoon), "a stored OVERDUE due today is due today");

  // The day flips at Cairo midnight: one minute before, the 02:05 invoice is
  // still due today; one minute after, it is a day late.
  check(!isPaymentOverdue(pending("2026-10-02T23:05:00Z"), new Date("2026-10-03T20:59:00Z")), "23:59 Cairo → still due today");
  check(isPaymentOverdue(pending("2026-10-02T23:05:00Z"), new Date("2026-10-03T21:00:00Z")), "00:00 Cairo next day → overdue");

  // Spring forward: Fri 24 Apr 2026 has no 00:00 in Cairo — the clocks jump
  // from 23:59:59 EET to 01:00 EEST at 23 Apr 22:00Z, and that is the day's start.
  const springNoon = new Date("2026-04-24T09:00:00Z"); // 12:00 EEST
  check(overdueCutoff(springNoon).toISOString() === "2026-04-23T22:00:00.000Z", "spring-forward day starts at the gap's end");
  check(isPaymentOverdue(pending("2026-04-23T21:30:00Z"), springNoon), "due 23:30 EET the night before → overdue");
  check(!isPaymentOverdue(pending("2026-04-23T22:30:00Z"), springNoon), "due 01:30 EEST on the day → due today");

  // Fall back: Thu 29 Oct 2026 has 25 hours — 23:00–00:00 happens twice. Both
  // 23:30s belong to the 29th, and the 30th begins at 29 Oct 22:00Z.
  const fallNoon = new Date("2026-10-30T10:00:00Z"); // 12:00 EET
  check(overdueCutoff(fallNoon).toISOString() === "2026-10-29T22:00:00.000Z", "the day after fall-back starts at EET midnight");
  check(isPaymentOverdue(pending("2026-10-29T20:30:00Z"), fallNoon), "due in the first 23:30 (EEST) → overdue next day");
  check(isPaymentOverdue(pending("2026-10-29T21:30:00Z"), fallNoon), "due in the second 23:30 (EET) → overdue next day");
  const lateFallNight = new Date("2026-10-29T21:30:00Z"); // the repeated 23:30, now EET
  check(overdueCutoff(lateFallNight).toISOString() === "2026-10-28T21:00:00.000Z", "inside the repeated hour, today still began at EEST midnight");
  check(!isPaymentOverdue(pending("2026-10-29T20:30:00Z"), lateFallNight), "the earlier 23:30 is the same day → due today");

  // The relative-day arithmetic behind "Due today" / "1d overdue" / "Nd past due".
  check(calendarDaysUntil("2026-10-02T23:05:00Z", afternoon) === 0, "due 02:05 today → 0 days (Due today), not −1");
  check(calendarDaysUntil("2026-10-02T20:59:00Z", afternoon) === -1, "due yesterday 23:59 → −1 (1d overdue)");
  check(calendarDaysUntil("2026-10-03T21:01:00Z", afternoon) === 1, "due 00:01 tomorrow → 1 (Due tomorrow)");
  check(calendarDaysUntil("2026-10-30T10:00:00Z", new Date("2026-10-29T09:00:00Z")) === 1, "a 25-hour day still counts as one day");
  check(calendarDaysUntil("2026-04-24T09:00:00Z", new Date("2026-04-23T10:00:00Z")) === 1, "a 23-hour day still counts as one day");
}

console.log("\nWhat the renewals screen and its badge count");
{
  const now = utc("2026-06-15");
  const base = { trialEndsAt: null, cancelledAt: null };
  check(needsRenewalAttention({ ...base, status: "ACTIVE", autoRenew: false, currentPeriodEnd: utc("2026-06-01") }, now), "an EXPIRED retainer (lapsed, auto-renew off) still needs a decision");
  check(needsRenewalAttention({ ...base, status: "ACTIVE", autoRenew: true, currentPeriodEnd: utc("2026-06-10") }, now), "a lapsed auto-renewing one is overdue → counted");
  check(needsRenewalAttention({ ...base, status: "ACTIVE", autoRenew: true, currentPeriodEnd: utc("2026-07-01") }, now), "due inside the window → counted");
  check(needsRenewalAttention({ ...base, status: "ACTIVE", autoRenew: false, currentPeriodEnd: utc("2026-07-01") }, now), "ending inside the window (not renewing) → counted");
  check(!needsRenewalAttention({ ...base, status: "ACTIVE", autoRenew: true, currentPeriodEnd: utc("2026-09-01") }, now), "a scheduled renewal months away is not counted");
  check(!needsRenewalAttention({ ...base, status: "PAUSED", autoRenew: true, currentPeriodEnd: utc("2026-06-01") }, now), "a paused retainer was decided by hand → not counted");
  check(!needsRenewalAttention({ ...base, status: "CANCELLED", autoRenew: true, currentPeriodEnd: utc("2026-06-01"), cancelledAt: utc("2026-05-01") }, now), "a cancelled one has nothing to renew");
  check(!needsRenewalAttention({ ...base, status: "SUSPENDED", autoRenew: true, currentPeriodEnd: utc("2026-06-01") }, now), "a suspended one is held, not renewed");
}

console.log(
  failures === 0
    ? "\nverify:lifecycle — all checks passed.\n"
    : `\nverify:lifecycle — ${failures} check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
