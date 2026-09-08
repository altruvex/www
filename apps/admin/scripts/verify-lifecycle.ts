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
import {
  addMonths,
  computeRenewal,
  deriveStatus,
  nextPeriodEnd,
  renewalView,
  PAST_DUE_DAYS,
} from "../lib/subscription-lifecycle";

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

console.log(
  failures === 0
    ? "\nverify:lifecycle — all checks passed.\n"
    : `\nverify:lifecycle — ${failures} check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
