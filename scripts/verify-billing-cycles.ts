/**
 * Billing-cycle edge cases.
 *
 * A maintenance plan's request cap is per cycle, so a wrong boundary either
 * lets a client exceed their cap silently or tells them they are over it when
 * they are not. Month lengths make this easy to get subtly wrong, so the awkward
 * cases are pinned here rather than discovered in a client's portal.
 *
 * Run by `bun run validate`.
 */
import {
  currentBillingCycle,
  daysUntilCycleEnd,
} from "@repo/pricing-schema";

let failures = 0;
const U = (s: string) => new Date(`${s}T00:00:00.000Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

function cycle(
  started: string,
  now: string,
  wantStart: string,
  wantEnd: string,
  label: string,
) {
  const c = currentBillingCycle(U(started), U(now));
  const ok = iso(c.start) === wantStart && iso(c.end) === wantEnd;
  console.log(
    `  ${ok ? "✓" : "✗"} ${label}: ${iso(c.start)} → ${iso(c.end)}` +
      (ok ? "" : `  (want ${wantStart} → ${wantEnd})`),
  );
  if (!ok) failures++;
}

console.log("\nBilling cycles\n" + "=".repeat(64));

console.log("\n[1] Ordinary mid-month anchor");
cycle("2026-01-15", "2026-01-20", "2026-01-15", "2026-02-15", "mid-cycle");
cycle("2026-01-15", "2026-02-14", "2026-01-15", "2026-02-15", "last day of cycle");
cycle("2026-01-15", "2026-02-15", "2026-02-15", "2026-03-15", "rollover day");
cycle("2026-01-15", "2026-01-15", "2026-01-15", "2026-02-15", "on the anchor");

console.log("\n[2] Anchors that no short month contains");
cycle("2026-01-31", "2026-02-10", "2026-01-31", "2026-02-28", "31st into February");
cycle("2026-01-31", "2026-03-01", "2026-02-28", "2026-03-31", "clamped February cycle");
cycle("2026-03-31", "2026-04-15", "2026-03-31", "2026-04-30", "31st into a 30-day month");
cycle("2028-01-31", "2028-02-10", "2028-01-31", "2028-02-29", "31st into a leap February");
cycle("2026-01-30", "2026-02-27", "2026-01-30", "2026-02-28", "30th into February");

console.log("\n[3] Year boundary");
cycle("2025-12-20", "2026-01-05", "2025-12-20", "2026-01-20", "across new year");
cycle("2025-12-20", "2026-01-25", "2026-01-20", "2026-02-20", "the January cycle");

console.log("\n[4] Invariants");
const early = currentBillingCycle(U("2026-06-10"), U("2026-06-01"));
const startsAtSubscription = iso(early.start) === "2026-06-10";
console.log(`  ${startsAtSubscription ? "✓" : "✗"} a cycle never predates the subscription`);
if (!startsAtSubscription) failures++;

let cursor = U("2026-01-31");
let contiguous = true;
for (let i = 0; i < 24; i++) {
  const c = currentBillingCycle(U("2026-01-31"), cursor);
  if (c.end.getTime() <= c.start.getTime()) { contiguous = false; break; }
  if (iso(currentBillingCycle(U("2026-01-31"), c.end).start) !== iso(c.end)) {
    contiguous = false;
    break;
  }
  cursor = c.end;
}
console.log(`  ${contiguous ? "✓" : "✗"} 24 consecutive cycles are contiguous, with no gap or overlap`);
if (!contiguous) failures++;

const days = daysUntilCycleEnd(
  currentBillingCycle(U("2026-01-15"), U("2026-02-10")),
  U("2026-02-10"),
);
console.log(`  ${days === 5 ? "✓" : "✗"} days until rollover reads ${days}`);
if (days !== 5) failures++;

console.log("\n" + "=".repeat(64));
console.log(failures === 0 ? "All billing-cycle checks passed.\n" : `${failures} failed.\n`);
process.exit(failures === 0 ? 0 : 1);
