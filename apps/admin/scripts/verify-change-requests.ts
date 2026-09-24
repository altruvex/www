/**
 * Pure-logic checks for change requests and project closure.
 *
 * Needs no database. The project page, the server actions and the close dialog
 * all derive transitions, quotes and the warranty window from
 * `lib/change-requests.ts`; pinning it here is what stops one of them from
 * quietly billing warranty work or letting a request skip its quote.
 *
 *   cd apps/admin && bun run verify:change-requests
 */
import {
  billedAmountFor,
  canTransition,
  closureChecks,
  coveredByWarranty,
  formatHours,
  hourlyAmount,
  hoursToMinutes,
  isOpen,
  quoteAnswerable,
  quoteDraftFor,
  quoteExpiry,
  rateFor,
  warrantyWindow,
} from "../lib/change-requests";

let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};
const throws = (fn: () => unknown) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

const utc = (s: string) => new Date(`${s}T12:00:00.000Z`);

// Rates are passed in, as the page and actions pass the resolved schema terms.
// These are arbitrary fixtures, not Altruvex prices.
const rates = { revisionHourlyRate: 7, revisionHourlyRateUsd: 3 };

console.log("\nTransitions");
check(canTransition("REQUESTED", "QUOTED"), "a request can be quoted");
check(!canTransition("REQUESTED", "APPROVED", null), "an unpriced request cannot be approved");
check(!canTransition("REQUESTED", "APPROVED", "HOURLY"), "a request cannot skip its quote");
check(canTransition("REQUESTED", "APPROVED", "WARRANTY"), "warranty cover approves without a quote");
check(canTransition("QUOTED", "QUOTED"), "a quote can be revised");
check(canTransition("QUOTED", "APPROVED"), "a quote can be approved");
check(!canTransition("QUOTED", "IN_PROGRESS"), "work cannot start before approval");
check(!canTransition("APPROVED", "DELIVERED"), "delivery needs work to have started");
check(canTransition("IN_PROGRESS", "DELIVERED"), "work in progress can be delivered");
for (const terminal of ["DELIVERED", "DECLINED", "CANCELLED"]) {
  check(!canTransition(terminal, "CANCELLED") && !isOpen(terminal), `${terminal.toLowerCase()} is terminal`);
}
check(!canTransition("NOT_A_STATUS", "QUOTED"), "an unknown status moves nowhere");

console.log("\nHours and money");
check(hoursToMinutes(1.25) === 75, "1.25 h is 75 minutes");
check(hoursToMinutes(0.1) === 6, "a tenth of an hour rounds to whole minutes");
check(formatHours(90) === "1.5 h", "90 minutes reads as 1.5 h");
check(formatHours(120) === "2 h", "whole hours carry no decimals");
check(formatHours(null) === "—", "no hours reads as a dash");
check(hourlyAmount(90, rates.revisionHourlyRate) === Math.round(1.5 * rates.revisionHourlyRate), "an hourly quote is hours × rate");
check(rateFor("EGP", rates) === rates.revisionHourlyRate, "EGP projects use the EGP rate");
check(rateFor("USD", rates) === rates.revisionHourlyRateUsd, "USD projects use the USD price list, not a conversion");
check(rateFor("EUR", rates) === null, "a currency with no published rate cannot be quoted hourly");

console.log("\nBilling on delivery");
check(
  billedAmountFor({ pricing: "HOURLY", hourlyRate: 4, quotedAmount: 8, actualMinutes: 180 }) === 12,
  "hourly work bills the actual hours, not the estimate",
);
check(
  billedAmountFor({ pricing: "FIXED", hourlyRate: null, quotedAmount: 50, actualMinutes: 600 }) === 50,
  "fixed work bills the quote whatever the hours",
);
check(
  billedAmountFor({ pricing: "WARRANTY", hourlyRate: null, quotedAmount: 0, actualMinutes: 600 }) === 0,
  "warranty work bills nothing",
);
check(
  throws(() => billedAmountFor({ pricing: "HOURLY", hourlyRate: 4, quotedAmount: 8, actualMinutes: null })),
  "hourly work without actual hours refuses to bill",
);
check(
  throws(() => billedAmountFor({ pricing: null, hourlyRate: null, quotedAmount: null, actualMinutes: null })),
  "an unpriced request refuses to bill rather than billing zero",
);

console.log("\nWarranty window");
const launch = utc("2026-09-01");
check(warrantyWindow(null, 30).state === "not-launched", "no launch date, no warranty");
const active = warrantyWindow(launch, 30, utc("2026-09-20"));
check(active.state === "active" && active.daysLeft === 11, "inside the window with days left counted");
check(active.endsAt?.toISOString().slice(0, 10) === "2026-10-01", "a 30-day window from Sep 1 ends Oct 1");
check(warrantyWindow(launch, 30, utc("2026-10-02")).state === "ended", "after the window it has ended");
check(coveredByWarranty(utc("2026-09-30"), launch, 30), "a request made inside the window is covered");
check(!coveredByWarranty(utc("2026-10-05"), launch, 30), "a request made after the window is not");
check(!coveredByWarranty(utc("2026-08-20"), launch, 30), "a request made before launch is not warranty");
check(!coveredByWarranty(utc("2026-09-10"), null, 30), "no launch date covers nothing");

console.log("\nClosing a project");
const clean = closureChecks({
  phase: "LAUNCHED",
  actualLaunchDate: launch,
  payments: [
    { status: "PAID", amount: 1 },
    { status: "WAIVED", amount: 1 },
  ],
  changeRequests: [{ status: "DELIVERED" }, { status: "CANCELLED" }],
});
check(clean.every((c) => c.ok), "paid, waived and finished work pass every check");

const dirty = closureChecks({
  phase: "DEVELOPMENT",
  actualLaunchDate: null,
  payments: [
    { status: "PENDING", amount: 1 },
    { status: "OVERDUE", amount: 1 },
  ],
  changeRequests: [{ status: "IN_PROGRESS" }],
});
const byId = Object.fromEntries(dirty.map((c) => [c.id, c]));
check(!byId.payments.ok && byId.payments.blocks, "unpaid payments block the close");
check(byId.payments.label.startsWith("2 payments"), "pending and overdue both count as unpaid");
check(!byId["change-requests"].ok && byId["change-requests"].blocks, "open change requests block the close");
check(!byId.launched.ok && !byId.launched.blocks, "not launched is advisory, not a block");

console.log("\nThe quote the client answers");
const sent = utc("2026-09-10");
const expires = quoteExpiry(sent, 30);
check(expires.toISOString().slice(0, 10) === "2026-10-10", "a quote sent Sep 10 with 30 days holds until Oct 10");
check(quoteAnswerable({ status: "QUOTED", quoteSentAt: sent, quoteExpiresAt: expires }, utc("2026-09-20")).ok, "a sent, live quote can be answered");
const reason = (r: ReturnType<typeof quoteAnswerable>) => (r.ok ? "ok" : r.reason);
check(reason(quoteAnswerable({ status: "QUOTED", quoteSentAt: null, quoteExpiresAt: null })) === "revising", "an unsent (or re-quoted) quote cannot be answered");
check(reason(quoteAnswerable({ status: "QUOTED", quoteSentAt: sent, quoteExpiresAt: expires }, utc("2026-10-11"))) === "expired", "an expired quote cannot be answered");
check(reason(quoteAnswerable({ status: "APPROVED", quoteSentAt: sent, quoteExpiresAt: expires })) === "answered", "an approved quote cannot be answered twice");
check(reason(quoteAnswerable({ status: "DECLINED", quoteSentAt: sent, quoteExpiresAt: expires })) === "answered", "nor a declined one");
check(reason(quoteAnswerable({ status: "CANCELLED", quoteSentAt: sent, quoteExpiresAt: expires })) === "closed", "a cancelled request is closed");

const link = "https://admin.example.com/quote/abc";
const hourlyDraft = quoteDraftFor(
  { title: "Footer link", pricing: "HOURLY", quotedAmount: 21, estimatedMinutes: 180, hourlyRate: 7 },
  "Mona",
  "EGP",
  link,
  expires,
);
check(hourlyDraft.subject === "Quote: Footer link", "the subject names the change");
check(hourlyDraft.body.includes(link), "the draft carries the quote link");
check(hourlyDraft.body.includes("billed on the hours actually spent"), "an hourly quote says the bill follows actual hours");
check(hourlyDraft.body.startsWith("Hi Mona,"), "the draft greets the client by name");
const fixedDraft = quoteDraftFor(
  { title: "Footer link", pricing: "FIXED", quotedAmount: 50, estimatedMinutes: null, hourlyRate: null },
  null,
  "USD",
  link,
  null,
);
check(fixedDraft.body.includes("fixed price") && !fixedDraft.body.includes("valid until"), "a fixed quote reads as fixed, with no invented expiry");

console.log(failures === 0 ? "\nAll change-request checks passed.\n" : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
