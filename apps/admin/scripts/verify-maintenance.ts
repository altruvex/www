/**
 * End-to-end maintenance checks against a real database.
 *
 * The client portal and the admin screen compute allowance usage from the same
 * cycle logic and the same resolved plan. If they ever disagree, a client is
 * told one thing and billed another — so the agreement is asserted here rather
 * than assumed from the fact that both call the same helper.
 *
 * Needs a database. Skips cleanly without one, so it can sit in a pipeline that
 * does not always have Postgres:
 *
 *   cd apps/admin && DATABASE_URL=... bun run verify:maintenance
 *
 * It writes and then removes its own records; point it at a scratch database.
 */
import { prisma } from "@repo/database";
import { formatMoney, maintenanceIntervalPrice, pricingCopy } from "@repo/pricing-schema";
import {
  changePlan,
  createSubscription,
  getSubscription,
  listSubscriptions,
  setQuotedMonthlyPrice,
  setRequestBilling,
  setRequestStatus,
  setSubscriptionStatus,
} from "../lib/maintenance-admin";
import { loadPortal, submitRequest } from "../lib/client-portal";
import { getPricing } from "../lib/pricing-store";

if (!process.env.DATABASE_URL) {
  console.log("verify:maintenance — skipped (no DATABASE_URL).");
  process.exit(0);
}

let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};

const phone = `+2015550${Date.now().toString().slice(-5)}`;
const client = await prisma.client.create({
  data: { name: "Verify", phone, company: "Verify Co" },
});

try {
  console.log("\nMaintenance, end to end\n" + "=".repeat(64));

  console.log("\n[1] Retainers");
  check((await createSubscription(client.id, "essential", "verify")).ok, "a retainer can be started");
  check(
    !(await createSubscription(client.id, "professional", "verify")).ok,
    "a second live retainer for the same client is refused",
  );

  const subs = await listSubscriptions();
  const sub = subs.find((s) => s.clientId === client.id)!;
  check(
    sub.planName === "Essential" && sub.requestsPerCycle === 2,
    `plan and cap resolve from the pricing schema (${sub.planName}, cap ${sub.requestsPerCycle})`,
  );

  // Starting a retainer invoices its first period, at the schema's price for
  // the interval, in the same transaction — a retainer is never live and
  // unbilled by accident.
  const firstPrice = maintenanceIntervalPrice((await getPricing()).maintenance.essential, "monthly");
  check(
    sub.payments.length === 1 && sub.currentPeriodPayment !== null,
    "starting a retainer opens exactly one payment, for the first period",
  );
  check(
    sub.currentPeriodPayment?.status === "PENDING" && sub.currentPeriodPayment.amount === firstPrice,
    `the first period is pending at the schema price (${sub.currentPeriodPayment?.amount} = ${firstPrice})`,
  );
  check(
    sub.currentPeriodPayment?.dueDate !== null &&
      new Date(sub.currentPeriodPayment!.dueDate!).getTime() === new Date(sub.currentPeriodStart).getTime(),
    "due on the day the period starts",
  );
  check((await getSubscription(sub.id))?.id === sub.id, "the retainer page reads the same record");
  check((await getSubscription("nope")) === null, "an unknown id reads as null, not a throw");

  console.log("\n[2] The cap, from both sides");
  for (const title of ["Hero image", "Footer text", "A whole new page"]) {
    await submitRequest(sub.portalToken, title, null);
  }
  let admin = (await listSubscriptions()).find((s) => s.clientId === client.id)!;
  let portal = await loadPortal(sub.portalToken);
  check(admin.requestsUsed === 2 && admin.requests.length === 3, "a third request does not count against a cap of 2");
  check(portal!.requestsUsed === admin.requestsUsed, "admin and the client portal report the same usage");

  console.log("\n[3] Status transitions");
  const target = admin.requests[admin.requests.length - 1]!;
  await setRequestStatus(target.id, "COMPLETED", "verify");
  admin = (await listSubscriptions()).find((s) => s.clientId === client.id)!;
  check(admin.requests.find((r) => r.id === target.id)!.completedAt !== null, "completing stamps a completion date");
  await setRequestStatus(target.id, "IN_PROGRESS", "verify");
  admin = (await listSubscriptions()).find((s) => s.clientId === client.id)!;
  check(admin.requests.find((r) => r.id === target.id)!.completedAt === null, "reopening clears it again");

  console.log("\n[4] Reclassifying what a client is billed for");
  await setRequestBilling(target.id, false, "verify");
  admin = (await listSubscriptions()).find((s) => s.clientId === client.id)!;
  portal = await loadPortal(sub.portalToken);
  check(admin.requestsUsed === 1, "marking a request as overage returns its allowance");
  check(portal!.requestsRemaining === 1, "the client sees that immediately");

  const log = await prisma.pricingChangeLog.findMany({
    where: { entityType: { startsWith: "maintenance" }, changedBy: "verify" },
  });
  check(log.length >= 3, `status and billing changes are recorded (${log.length} entries)`);
  check(log.every((l) => l.changedBy === "verify"), "each entry records who made the change");

  console.log("\n[5] Cancellation");
  await setSubscriptionStatus(sub.id, "CANCELLED", "verify");
  check((await loadPortal(sub.portalToken)) === null, "a cancelled retainer revokes its portal link");
  check(!(await submitRequest(sub.portalToken, "after cancellation", null)).ok, "and refuses new requests");

  console.log("\n[6] A yearly retainer");
  const yearly = await createSubscription(client.id, "essential", "verify", "ANNUAL");
  check(yearly.ok, "a yearly retainer can be started once the monthly one is cancelled");
  const yearlyAdmin = (await listSubscriptions()).find((s) => s.id === yearly.id)!;
  const yearlyPortal = (await loadPortal(yearlyAdmin.portalToken))!;
  const plan = (await getPricing()).maintenance.essential;
  const perYear = maintenanceIntervalPrice(plan, "annual");
  check(
    perYear !== null && yearlyAdmin.planPriceLabel === formatMoney(perYear, "en"),
    `the admin prices the year from the schema (${yearlyAdmin.planPriceLabel} ${yearlyAdmin.planPriceSuffix})`,
  );
  check(
    yearlyAdmin.planPriceLabel === yearlyPortal.planPriceLabel &&
      yearlyAdmin.planPriceSuffix === yearlyPortal.planPriceSuffix,
    "admin and the client portal price the year the same way",
  );
  // The cap is per month on every interval (ruling 2026-10-02).
  check(
    yearlyAdmin.requestsPerCycle === 2 && yearlyPortal.requestsPerCycle === 2,
    "the cap is still the monthly one, not twelve months of it",
  );
  check(
    yearlyAdmin.cycleEnd === yearlyPortal.cycleEnd &&
      new Date(yearlyPortal.cycleEnd).getTime() - new Date(yearlyPortal.cycleStart).getTime() <= 31 * 86_400_000,
    "both sides reset the allowance on a monthly window",
  );
  check(
    new Date(yearlyPortal.renewsAt).getTime() > new Date(yearlyPortal.cycleEnd).getTime(),
    "the portal's renewal date is the year's end, beyond the allowance window",
  );

  console.log("\n[7] A quoted retainer");
  // Enterprise publishes no price. Until a quote is set both sides read the
  // custom-quote wording; once set, both price the interval from it by the
  // schema's rule, and they agree.
  await setSubscriptionStatus(yearly.id!, "CANCELLED", "verify");
  const quotedSub = await createSubscription(client.id, "enterprise", "verify", "ANNUAL");
  check(quotedSub.ok, "an enterprise retainer can be started");
  const unquotedAdmin = (await listSubscriptions()).find((s) => s.id === quotedSub.id)!;
  const unquotedPortal = (await loadPortal(unquotedAdmin.portalToken))!;
  const customPrice = pricingCopy("en").maintenanceTemplates.customPrice;
  check(
    unquotedAdmin.planPriceLabel === customPrice && unquotedPortal.planPriceLabel === customPrice && unquotedPortal.isCustomQuote,
    "before a quote, admin and portal both read the custom-quote wording",
  );
  const quotedMonthly = 3000;
  check((await setQuotedMonthlyPrice(quotedSub.id!, quotedMonthly, "verify")).ok, "the quoted monthly price is set");
  const quotedAdmin = (await listSubscriptions()).find((s) => s.id === quotedSub.id)!;
  const quotedPortal = (await loadPortal(quotedAdmin.portalToken))!;
  const quotedYear = maintenanceIntervalPrice({ price: quotedMonthly }, "annual");
  check(
    quotedYear !== null && quotedAdmin.planPriceLabel === formatMoney(quotedYear, "en"),
    `the admin prices the quoted year by the schema's paid months (${quotedAdmin.planPriceLabel} ${quotedAdmin.planPriceSuffix})`,
  );
  check(
    quotedAdmin.planPriceLabel === quotedPortal.planPriceLabel &&
      quotedAdmin.planPriceSuffix === quotedPortal.planPriceSuffix &&
      !quotedPortal.isCustomQuote,
    "admin and the client portal price the quoted year the same way",
  );
  check(
    unquotedAdmin.payments.length === 0 && unquotedAdmin.currentPeriodPayment === null,
    "a quoted plan with no quote starts without an invoice — nothing is guessed",
  );

  console.log("\n[8] Changing plan, and a status that does not move");
  check(!(await changePlan(quotedSub.id!, "enterprise", "verify")).ok, "moving to the plan it is already on is refused");
  check(!(await changePlan("nope", "essential", "verify")).ok, "an unknown retainer is refused");
  const moved = await changePlan(quotedSub.id!, "professional", "verify");
  check(moved.ok, `a quoted retainer moves to a published plan (${moved.message.slice(0, 60)}…)`);
  const movedAdmin = (await getSubscription(quotedSub.id!))!;
  check(
    movedAdmin.planName === "Professional" && movedAdmin.quotedMonthlyPrice === null && !movedAdmin.quoteOnly,
    "the plan moved and the quote was cleared, because the new plan publishes its own price",
  );
  check(
    movedAdmin.currentPeriodEnd === quotedAdmin.currentPeriodEnd && movedAdmin.payments.length === quotedAdmin.payments.length,
    "the current period and its invoices are untouched — the price applies from the renewal",
  );
  const planEvent = await prisma.activityEvent.findFirst({
    where: { entityId: quotedSub.id!, action: "subscription.plan_changed" },
    orderBy: { createdAt: "desc" },
  });
  check(
    planEvent !== null && typeof planEvent.entityLabel === "string" && planEvent.entityLabel.includes("Verify Co"),
    `the change is audited under a human label (${planEvent?.entityLabel})`,
  );
  const eventsBefore = await prisma.activityEvent.count({ where: { entityId: quotedSub.id! } });
  check(await setSubscriptionStatus(quotedSub.id!, "ACTIVE", "verify"), "setting the status it already has is accepted");
  const eventsAfter = await prisma.activityEvent.count({ where: { entityId: quotedSub.id! } });
  check(eventsAfter === eventsBefore, "but writes no audit event, because nothing moved");
  await setSubscriptionStatus(quotedSub.id!, "CANCELLED", "verify");
  check(!(await changePlan(quotedSub.id!, "essential", "verify")).ok, "a cancelled retainer cannot change plan");
} finally {
  // Cascades remove the subscription and its requests with the client; the
  // period payments it opened would survive (SetNull), so they go first.
  await prisma.payment.deleteMany({ where: { subscription: { clientId: client.id } } }).catch(() => {});
  await prisma.pricingChangeLog.deleteMany({ where: { changedBy: "verify" } });
  await prisma.client.delete({ where: { id: client.id } }).catch(() => {});
  await prisma.$disconnect();
}

console.log("\n" + "=".repeat(64));
console.log(failures === 0 ? "All maintenance checks passed.\n" : `${failures} failed.\n`);
process.exit(failures === 0 ? 0 : 1);
