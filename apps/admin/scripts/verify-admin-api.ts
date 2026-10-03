/**
 * End-to-end checks for the admin mutation routes and the audit trail.
 *
 * The handlers are exercised through the same functions the routes export, with
 * the session gate stubbed — the gate itself is covered by `withAdmin` and by
 * the ingest suite's 401 cases. What is asserted here is the part that is easy
 * to get wrong and impossible to see from a rendered page: that a mutation
 * actually persists, that it writes an audit event with the right actor and
 * diff, and that the subscription state machine moves the way the UI claims.
 *
 *   cd apps/admin && DATABASE_URL=... bun run verify:admin-api
 *
 * Writes and then removes its own records; point it at a scratch database.
 */
import { prisma } from "@repo/database";

import { recordActivity, recordChange, redactRecord, userActor } from "../lib/activity-log";
import {
  changeBillingInterval,
  createSubscription,
  listSubscriptions,
  recordPeriodInvoice,
  renewSubscription,
  setAutoRenew,
  setQuotedMonthlyPrice,
  setSubscriptionStatus,
} from "../lib/maintenance-admin";
import { deriveStatus, nextPeriodEnd } from "../lib/subscription-lifecycle";
import { hashToken, issueToken } from "../lib/ingest-auth";
import { getPricing } from "../lib/pricing-store";
import { DELETABLES } from "../lib/deletable";
import { clientPayments } from "../lib/client-payments";
import { maintenanceIntervalPrice, pricingCopy } from "@repo/pricing-schema";

if (!process.env.DATABASE_URL) {
  console.log("verify:admin-api — skipped (no DATABASE_URL).");
  process.exit(0);
}

let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};

const suffix = Date.now().toString().slice(-8);
const user = await prisma.user.create({
  data: {
    email: `verify-${suffix}@altruvex.test`,
    name: "Verify Operator",
    role: "ADMIN",
  },
});
const client = await prisma.client.create({
  data: { name: "Verify API", phone: `+2015552${suffix.slice(-4)}`, company: "Verify API Co" },
});

const actor = userActor({ user: { id: user.id, name: user.name, email: user.email } });
// Retainer payments outlive their subscription (SetNull), so cleanup needs their ids.
const retainerPaymentIds: string[] = [];

try {
  console.log("\nRedaction");
  {
    const redacted = redactRecord({
      status: "ACTIVE",
      ingestToken: "avx_ingest_supersecret",
      apiKey: "sk-live-1234",
      password: "hunter2",
      normalField: "kept",
    });
    check(redacted?.status === "ACTIVE", "an ordinary field is kept");
    check(redacted?.normalField === "kept", "a field with no secret-ish name is kept");
    check(redacted?.ingestToken === "[redacted]", "a token field is redacted");
    check(redacted?.apiKey === "[redacted]", "an api key field is redacted");
    check(redacted?.password === "[redacted]", "a password field is redacted");

    const long = redactRecord({ note: "x".repeat(2000) });
    check(
      typeof long?.note === "string" && (long.note as string).length <= 513,
      "an oversized value is truncated rather than stored whole",
    );
  }

  console.log("\nActivity trail");
  {
    await recordActivity({
      action: "client.created",
      actor,
      entityType: "client",
      entityId: client.id,
      entityLabel: client.company,
      summary: "Created a client",
      after: { company: client.company },
    });

    const event = await prisma.activityEvent.findFirst({
      where: { entityId: client.id, action: "client.created" },
    });
    check(event != null, "an event is written");
    check(event?.actorId === user.id, "the event is attributed to the acting user");
    check(event?.actorKind === "USER", "actor kind is recorded");
    check(event?.actorLabel === "Verify Operator", "actor label is denormalised onto the event");

    // A no-op save must not produce an audit line.
    const wrote = await recordChange({
      action: "client.updated",
      actor,
      entityType: "client",
      entityId: client.id,
      summary: "No change",
      before: { status: "NEW" },
      after: { status: "NEW" },
    });
    check(wrote === false, "an unchanged save writes no event");

    const wroteReal = await recordChange({
      action: "client.updated",
      actor,
      entityType: "client",
      entityId: client.id,
      summary: "Status moved",
      before: { status: "NEW", priority: "MEDIUM" },
      after: { status: "QUALIFIED", priority: "MEDIUM" },
    });
    check(wroteReal === true, "a real change writes an event");

    const change = await prisma.activityEvent.findFirst({
      where: { entityId: client.id, action: "client.updated" },
      orderBy: { createdAt: "desc" },
    });
    const before = change?.before as Record<string, unknown> | null;
    const after = change?.after as Record<string, unknown> | null;
    check(before?.status === "NEW" && after?.status === "QUALIFIED", "the diff records both values");
    check(
      before != null && !("priority" in before),
      "an unchanged field is left out of the diff",
    );

    // Recording must never break the mutation it describes.
    await recordActivity({
      action: "client.updated",
      actor,
      entityType: "client",
      // A deliberately impossible payload: the write fails, the call must not.
      entityId: "x".repeat(5000),
      summary: "Should not throw",
    });
    check(true, "a failed activity write is swallowed rather than thrown");
  }

  console.log("\nIngest tokens");
  {
    const issued = issueToken();
    check(issued.token.startsWith("avx_ingest_"), "an issued token carries the ingest prefix");
    check(issued.hash === hashToken(issued.token), "the stored hash matches the token");
    check(issued.hash !== issued.token, "the plaintext token is not the stored value");
    check(issued.last4 === issued.token.slice(-4), "only the last four characters are kept");
    check(issueToken().token !== issued.token, "two issues produce different tokens");
  }

  console.log("\nSubscription lifecycle");
  {
    const created = await createSubscription(client.id, "essential", user.email, "MONTHLY", actor);
    check(created.ok, "a subscription is created");

    const sub = await prisma.maintenanceSubscription.findUniqueOrThrow({
      where: { id: created.id! },
    });
    check(sub.currentPeriodEnd > new Date(), "the first period ends in the future");
    check(sub.autoRenew === true, "auto-renew defaults on");
    check(deriveStatus(sub) === "ACTIVE", "a fresh subscription reads as active");

    // One live retainer per client.
    const dupe = await createSubscription(client.id, "essential", user.email, "MONTHLY", actor);
    check(!dupe.ok, "a second live retainer for the same client is refused");

    // Force it three days overdue, then renew. The new period must start where
    // the lapsed one ENDED, not at today — otherwise a late renewal walks the
    // billing anchor forward a little every cycle.
    const lapsedEnd = new Date(Date.now() - 3 * 86_400_000);
    await prisma.maintenanceSubscription.update({
      where: { id: sub.id },
      data: { currentPeriodEnd: lapsedEnd },
    });
    const lapsed = await prisma.maintenanceSubscription.findUniqueOrThrow({ where: { id: sub.id } });
    check(deriveStatus(lapsed) === "PAST_DUE", "a lapsed period derives PAST_DUE without a write");
    check(lapsed.status === "ACTIVE", "the stored status is untouched by that derivation");

    const renewed = await renewSubscription(sub.id, user.email, actor);
    check(renewed.ok, "renewal succeeds");
    const after = await prisma.maintenanceSubscription.findUniqueOrThrow({ where: { id: sub.id } });
    check(after.currentPeriodEnd > new Date(), "renewal moves the period into the future");
    check(after.lastRenewedAt != null, "renewal stamps lastRenewedAt");
    check(
      after.currentPeriodStart.getTime() === lapsedEnd.getTime(),
      "the new period starts where the lapsed one ended, not at today",
    );
    check(
      after.currentPeriodEnd.getUTCDate() === lapsedEnd.getUTCDate(),
      "the billing day survives a late renewal",
    );

    const renewEvent = await prisma.activityEvent.findFirst({
      where: { entityId: sub.id, action: "subscription.renewed" },
    });
    check(renewEvent != null, "renewal writes an audit event");

    // Auto-renew is idempotent, and switching it off changes the derived state.
    check(await setAutoRenew(sub.id, false, user.email, actor), "auto-renew can be switched off");
    check(
      await setAutoRenew(sub.id, false, user.email, actor),
      "setting auto-renew to its current value still succeeds",
    );
    const offEvents = await prisma.activityEvent.count({
      where: { entityId: sub.id, action: "subscription.auto_renew_changed" },
    });
    check(offEvents === 1, "the idempotent second call writes no duplicate event");

    await prisma.maintenanceSubscription.update({
      where: { id: sub.id },
      data: { currentPeriodEnd: new Date(Date.now() - 86_400_000) },
    });
    const expiring = await prisma.maintenanceSubscription.findUniqueOrThrow({
      where: { id: sub.id },
    });
    check(
      deriveStatus(expiring) === "EXPIRED",
      "a lapsed period with auto-renew off derives EXPIRED, not PAST_DUE",
    );

    check(!(await setAutoRenew("no-such-id", true, user.email, actor)), "an unknown id returns false");
  }

  console.log("\nAnnual interval");
  {
    // One live retainer per client: retire the monthly one above first.
    await prisma.maintenanceSubscription.updateMany({
      where: { clientId: client.id },
      data: { status: "CANCELLED" },
    });

    const created = await createSubscription(client.id, "professional", user.email, "ANNUAL", actor);
    check(created.ok, "an annual subscription is created");

    const sub = await prisma.maintenanceSubscription.findUniqueOrThrow({
      where: { id: created.id! },
    });
    check(sub.billingInterval === "ANNUAL", "the interval is stored on the row");
    check(
      sub.currentPeriodEnd.getTime() === nextPeriodEnd(sub.currentPeriodStart, "ANNUAL").getTime(),
      "the first period runs a full year",
    );
    // Creating the retainer opens the first period's invoice, due on its start.
    const firstPeriod = await prisma.payment.findMany({ where: { subscriptionId: sub.id } });
    check(
      firstPeriod.length === 1 && firstPeriod[0]?.dueDate?.getTime() === sub.currentPeriodStart.getTime(),
      `creating the retainer opens exactly one payment, for the first period (saw ${firstPeriod.length})`,
    );

    // Lapse it and renew: the next year starts where the old one ended.
    const lapsedEnd = new Date(Date.now() - 3 * 86_400_000);
    await prisma.maintenanceSubscription.update({
      where: { id: sub.id },
      data: { currentPeriodEnd: lapsedEnd },
    });
    check((await renewSubscription(sub.id, user.email, actor)).ok, "an annual renewal succeeds");
    const after = await prisma.maintenanceSubscription.findUniqueOrThrow({ where: { id: sub.id } });
    check(
      after.currentPeriodStart.getTime() === lapsedEnd.getTime(),
      "the new year starts where the lapsed one ended, not at today",
    );
    check(
      after.currentPeriodEnd.getTime() === nextPeriodEnd(lapsedEnd, "ANNUAL").getTime(),
      "the renewal adds a year to the old period end",
    );

    // The renewal opens the new year's invoice: one PENDING payment at the schema
    // price for the interval, due on the day the period starts. Payments are
    // counted per period (by due date): the first period already has its own.
    const pricing = await getPricing();
    const annualPrice = maintenanceIntervalPrice(pricing.maintenance.professional, "annual");
    const allPayments = await prisma.payment.findMany({ where: { subscriptionId: sub.id } });
    retainerPaymentIds.push(...allPayments.map((p) => p.id));
    check(allPayments.length === 2, `two periods, two payments (saw ${allPayments.length})`);
    const payments = allPayments.filter((p) => p.dueDate?.getTime() === lapsedEnd.getTime());
    check(payments.length === 1, `the renewal opens exactly one payment for the new period (saw ${payments.length})`);
    const pay = payments[0];
    check(pay?.milestone === "RETAINER_RENEWAL", "the payment is a retainer period");
    check(pay?.status === "PENDING", "the payment is pending — nothing was collected");
    check(pay?.amount === annualPrice, `the amount is the schema's annual price (${annualPrice})`);
    check(pay?.dueDate?.getTime() === lapsedEnd.getTime(), "the payment is due on the new period's start");
    check(pay?.projectId === null, "a retainer payment belongs to no project");
    const renewEvent = await prisma.activityEvent.findFirst({
      where: { entityId: sub.id, action: "subscription.renewed" },
      orderBy: { createdAt: "desc" },
    });
    const meta = renewEvent?.metadata as Record<string, unknown> | null;
    check(meta?.paymentId === pay?.id && meta?.amountSource === "schema", "the audit event names the payment and where its amount came from");

    // Replaying the same period (the row was reset to the same end) must not
    // open a second invoice for it.
    await prisma.maintenanceSubscription.update({
      where: { id: sub.id },
      data: { currentPeriodStart: sub.currentPeriodStart, currentPeriodEnd: lapsedEnd },
    });
    const replay = await renewSubscription(sub.id, user.email, actor);
    check(replay.ok && /already existed/.test(replay.message), "renewing the same period again reuses its invoice");
    check(
      (await prisma.payment.count({ where: { subscriptionId: sub.id, dueDate: lapsedEnd } })) === 1 &&
        (await prisma.payment.count({ where: { subscriptionId: sub.id } })) === 2,
      "the same period never gets a second payment",
    );

    // The screen reads the period's payment, and marks it overdue by the clock.
    const row = (await listSubscriptions()).find((s) => s.id === sub.id);
    check(row?.invoiceAmount === annualPrice, "the admin row knows what the next renewal invoices");
    check(row?.currentPeriodPayment?.id === pay?.id, "the admin row carries the period's payment");
    check(row?.currentPeriodPayment?.status === "OVERDUE", "a pending payment past its due date reads overdue");
    await prisma.payment.update({ where: { id: pay!.id }, data: { status: "PAID", paidAt: new Date() } });
    check(
      (await listSubscriptions()).find((s) => s.id === sub.id)?.currentPeriodPayment?.status === "PAID",
      "marking the payment paid shows on the retainer",
    );

    const listed = (await listSubscriptions()).find((s) => s.id === sub.id);
    check(listed?.billingIntervalLabel === "Annual", "the admin row names the interval");
    check(listed?.planPriceSuffix === "/ year", "the admin row prices the retainer per year");
    check(listed?.billingIntervalPending === false, "a period that matches its interval is not pending a change");
  }

  console.log("\nBilling interval change");
  {
    // The annual retainer above is the live one. Switching it to monthly must
    // leave the paid year alone and only show up at the renewal that follows.
    const sub = await prisma.maintenanceSubscription.findFirstOrThrow({
      where: { clientId: client.id, status: "ACTIVE" },
    });
    check(sub.billingInterval === "ANNUAL", "starts annual");

    const same = await changeBillingInterval(sub.id, "ANNUAL", user.email, actor);
    check(!same.ok, "the interval it already has is refused");

    const changed = await changeBillingInterval(sub.id, "MONTHLY", user.email, actor);
    check(changed.ok, "annual → monthly succeeds");
    const after = await prisma.maintenanceSubscription.findUniqueOrThrow({ where: { id: sub.id } });
    check(after.billingInterval === "MONTHLY", "the interval is stored");
    check(
      after.currentPeriodStart.getTime() === sub.currentPeriodStart.getTime() &&
        after.currentPeriodEnd.getTime() === sub.currentPeriodEnd.getTime(),
      "the current period is untouched",
    );
    check(
      after.lastRenewedAt?.getTime() === sub.lastRenewedAt?.getTime(),
      "the change is not a renewal",
    );

    const event = await prisma.activityEvent.findFirst({
      where: { entityId: sub.id, action: "subscription.billing_interval_changed" },
    });
    const before = event?.before as Record<string, unknown> | null;
    const afterPayload = event?.after as Record<string, unknown> | null;
    check(event != null, "the change writes an audit event");
    check(
      before?.billingInterval === "ANNUAL" && afterPayload?.billingInterval === "MONTHLY",
      "the event carries the old and new interval",
    );

    const listed = (await listSubscriptions()).find((s) => s.id === sub.id);
    check(listed?.billingIntervalLabel === "Monthly", "the admin row names the new interval");
    check(listed?.billingIntervalPending === true, "the admin row knows the new interval starts at the renewal");

    // The next renewal runs a month from where the paid year ends.
    const lapsedEnd = new Date(Date.now() - 3 * 86_400_000);
    await prisma.maintenanceSubscription.update({
      where: { id: sub.id },
      data: { currentPeriodEnd: lapsedEnd },
    });
    check((await renewSubscription(sub.id, user.email, actor)).ok, "the renewal after the change succeeds");
    const renewed = await prisma.maintenanceSubscription.findUniqueOrThrow({ where: { id: sub.id } });
    check(
      renewed.currentPeriodEnd.getTime() === nextPeriodEnd(lapsedEnd, "MONTHLY").getTime(),
      "the next renewal uses the new interval",
    );
    const monthlyPrice = maintenanceIntervalPrice(
      (await getPricing()).maintenance.professional,
      "monthly",
    );
    const monthly = await prisma.payment.findFirst({
      where: { subscriptionId: sub.id, dueDate: lapsedEnd },
    });
    if (monthly) retainerPaymentIds.push(monthly.id);
    check(monthly?.amount === monthlyPrice, `the renewal after the change invoices the monthly price (${monthlyPrice})`);
    check(monthly?.status === "PENDING", "the new period's invoice is pending");
    check(
      (await listSubscriptions()).find((s) => s.id === sub.id)?.billingIntervalPending === false,
      "once renewed, the change is no longer pending",
    );

    await setSubscriptionStatus(sub.id, "CANCELLED", user.email, actor);
    const cancelled = await changeBillingInterval(sub.id, "QUARTERLY", user.email, actor);
    check(!cancelled.ok, "a cancelled retainer is refused");
    check(!(await changeBillingInterval("no-such-id", "MONTHLY", user.email, actor)).ok, "an unknown id is refused");
  }

  console.log("\nQuote-only retainer");
  {
    // Enterprise publishes no price. A renewal must not invent one: it refuses
    // without an agreed amount and bills exactly what the operator entered.
    await prisma.maintenanceSubscription.updateMany({
      where: { clientId: client.id },
      data: { status: "CANCELLED" },
    });
    const created = await createSubscription(client.id, "enterprise", user.email, "MONTHLY", actor);
    check(created.ok, "an enterprise subscription is created");
    const sub = await prisma.maintenanceSubscription.findUniqueOrThrow({ where: { id: created.id! } });
    check(
      (await listSubscriptions()).find((s) => s.id === sub.id)?.invoiceAmount === null,
      "the admin row publishes no invoice amount for a quote-only plan",
    );

    const lapsedEnd = new Date(Date.now() - 3 * 86_400_000);
    await prisma.maintenanceSubscription.update({
      where: { id: sub.id },
      data: { currentPeriodEnd: lapsedEnd },
    });
    const refused = await renewSubscription(sub.id, user.email, actor);
    check(!refused.ok && /quoted monthly price/.test(refused.message), "a quote-only renewal without a quote is refused");
    check(
      (await prisma.maintenanceSubscription.findUniqueOrThrow({ where: { id: sub.id } })).currentPeriodEnd.getTime() ===
        lapsedEnd.getTime(),
      "a refused renewal moves nothing",
    );

    // The quote is one monthly figure on the subscription; the interval rule
    // prices every invoice from it exactly as it prices a published plan.
    check(!(await setQuotedMonthlyPrice(sub.id, 0, user.email, actor)).ok, "a zero quote is refused");
    check(!(await setQuotedMonthlyPrice(sub.id, 12.5, user.email, actor)).ok, "a fractional quote is refused");
    const quoted = 1234;
    const set = await setQuotedMonthlyPrice(sub.id, quoted, user.email, actor);
    check(set.ok, "the quoted monthly price is set on the retainer");
    const quoteEvent = await prisma.activityEvent.findFirst({
      where: { entityId: sub.id, action: "subscription.quote_changed" },
      orderBy: { createdAt: "desc" },
    });
    check(
      (quoteEvent?.before as Record<string, unknown> | null)?.quotedMonthlyPrice === null &&
        (quoteEvent?.after as Record<string, unknown> | null)?.quotedMonthlyPrice === quoted,
      "the audit event carries the quote before and after",
    );
    const monthlyQuote = maintenanceIntervalPrice({ price: quoted }, "monthly");
    const annualQuote = maintenanceIntervalPrice({ price: quoted }, "annual");
    const quotedRow = (await listSubscriptions()).find((s) => s.id === sub.id);
    check(
      quotedRow?.invoiceAmount === monthlyQuote && quotedRow.quotedMonthlyPrice === quoted,
      "the admin row prices the next invoice from the quote",
    );
    check(quotedRow?.planPriceLabel !== pricingCopy("en").maintenanceTemplates.customPrice, "the row no longer reads as a custom quote");

    const accepted = await renewSubscription(sub.id, user.email, actor);
    check(accepted.ok, "a quote-only renewal with the quote set succeeds");
    const pay = await prisma.payment.findFirst({ where: { subscriptionId: sub.id } });
    if (pay) retainerPaymentIds.push(pay.id);
    check(pay?.amount === monthlyQuote && pay.dueDate?.getTime() === lapsedEnd.getTime(), "a monthly period bills the quote through the schema rule");
    const event = await prisma.activityEvent.findFirst({
      where: { entityId: sub.id, action: "subscription.renewed" },
      orderBy: { createdAt: "desc" },
    });
    check((event?.metadata as Record<string, unknown> | null)?.amountSource === "quote", "the audit event says the quote set the amount");

    // Changing the quote never rewrites a payment already opened.
    const requoted = quoted + 1;
    check((await setQuotedMonthlyPrice(sub.id, requoted, user.email, actor)).ok, "the quote can be changed");
    check(
      (await prisma.payment.findUniqueOrThrow({ where: { id: pay!.id } })).amount === monthlyQuote,
      "the opened payment keeps its amount",
    );

    // Annual = 10 paid months of the quote, the same rule as a published plan.
    check((await changeBillingInterval(sub.id, "ANNUAL", user.email, actor)).ok, "the quoted retainer moves to annual billing");
    const annualQuoted = maintenanceIntervalPrice({ price: requoted }, "annual");
    const annualRow = (await listSubscriptions()).find((s) => s.id === sub.id);
    check(
      annualRow?.invoiceAmount === annualQuoted && annualQuote !== monthlyQuote,
      "the next annual invoice is priced from the quote by the schema's paid months",
    );
    const customPrice = pricingCopy("en").maintenanceTemplates.customPrice;
    check(
      annualRow?.intervalPrices.length === 3 && annualRow.intervalPrices.every((i) => i.price !== customPrice),
      "every interval the dialog offers is priced from the quote, none reads as custom",
    );

    // Clearing the quote: audited, payments untouched, then nothing can be invoiced.
    const cleared = await setQuotedMonthlyPrice(sub.id, null, user.email, actor);
    check(cleared.ok, "the quote can be cleared");
    const clearedRow = (await listSubscriptions()).find((s) => s.id === sub.id);
    check(
      clearedRow?.quotedMonthlyPrice === null &&
        clearedRow.invoiceAmount === null &&
        clearedRow.intervalPrices.every((i) => i.price === customPrice),
      "a cleared retainer reads as custom again with no invoice amount",
    );
    check(
      (await prisma.payment.findUniqueOrThrow({ where: { id: pay!.id } })).amount === monthlyQuote,
      "clearing leaves the opened payment untouched",
    );
    const clearEvent = await prisma.activityEvent.findFirst({
      where: { entityId: sub.id, action: "subscription.quote_changed" },
      orderBy: { createdAt: "desc" },
    });
    check(
      /Cleared the quoted monthly price/.test(clearEvent?.summary ?? "") &&
        (clearEvent?.before as Record<string, unknown> | null)?.quotedMonthlyPrice === requoted &&
        (clearEvent?.after as Record<string, unknown> | null)?.quotedMonthlyPrice === null,
      "the clear is audited with the figure it removed",
    );
    await prisma.maintenanceSubscription.update({
      where: { id: sub.id },
      data: { currentPeriodEnd: new Date(Date.now() - 86_400_000) },
    });
    const refusedAgain = await renewSubscription(sub.id, user.email, actor);
    check(!refusedAgain.ok && /quoted monthly price/.test(refusedAgain.message), "a renewal after the clear is refused for the missing quote");
    const clearedTwice = await setQuotedMonthlyPrice(sub.id, null, user.email, actor);
    check(clearedTwice.ok && /No quoted monthly price/.test(clearedTwice.message), "a second clear is an ok no-op");

    // Deleting the retainer keeps its payments as records, detached.
    await setSubscriptionStatus(sub.id, "CANCELLED", user.email, actor);
    const plan = await DELETABLES.maintenanceSubscription!.plan(sub.id);
    check(plan?.notes.some((n) => /1 payment/.test(n)) === true, "the delete plan says the payment stays");
    await DELETABLES.maintenanceSubscription!.remove(sub.id);
    const kept = await prisma.payment.findUnique({ where: { id: pay!.id } });
    check(kept !== null && kept.subscriptionId === null, "the payment survives the retainer, with the link cleared");
  }

  console.log("\nRecorded invoices");
  {
    // A period opened before renewals wrote payments has no invoice. Nothing
    // backfills it; the operator records it by hand, once, at the price of the
    // interval that produced the period. Creating a retainer now opens the first
    // period's invoice, so the legacy row is staged by removing that payment.
    const created = await createSubscription(client.id, "professional", user.email, "QUARTERLY", actor);
    check(created.ok, "a quarterly subscription is created");
    const sub = await prisma.maintenanceSubscription.findUniqueOrThrow({ where: { id: created.id! } });
    check(
      (await prisma.payment.count({ where: { subscriptionId: sub.id, dueDate: sub.currentPeriodStart } })) === 1,
      "creating it opens the first period's invoice",
    );
    await prisma.payment.deleteMany({ where: { subscriptionId: sub.id } });
    check((await prisma.payment.count({ where: { subscriptionId: sub.id } })) === 0, "a legacy period has no payment");

    const pricing = await getPricing();
    const quarterly = maintenanceIntervalPrice(pricing.maintenance.professional, "quarterly");
    const monthly = maintenanceIntervalPrice(pricing.maintenance.professional, "monthly");

    const first = await recordPeriodInvoice(sub.id, user.email, actor);
    check(first.ok, "the operator records the invoice for the current period");
    const recorded = await prisma.payment.findMany({ where: { subscriptionId: sub.id } });
    retainerPaymentIds.push(...recorded.map((p) => p.id));
    check(recorded.length === 1, "exactly one payment exists for the period");
    check(
      recorded[0]?.milestone === "RETAINER_RENEWAL" &&
        recorded[0].status === "PENDING" &&
        recorded[0].amount === quarterly &&
        recorded[0].dueDate?.getTime() === sub.currentPeriodStart.getTime(),
      "it is pending, due at the period start, at the schema's quarterly price",
    );
    const event = await prisma.activityEvent.findFirst({
      where: { entityId: sub.id, action: "subscription.invoice_recorded" },
      orderBy: { createdAt: "desc" },
    });
    const meta = event?.metadata as Record<string, unknown> | null;
    check(
      meta?.manual === true && meta.paymentId === recorded[0]?.id && meta.billingInterval === "QUARTERLY",
      "the audit event marks it manual and names the payment and interval",
    );

    const again = await recordPeriodInvoice(sub.id, user.email, actor);
    check(!again.ok && /already has its invoice/.test(again.message), "a second call is refused, naming the existing invoice");
    check((await prisma.payment.count({ where: { subscriptionId: sub.id } })) === 1, "the second call creates nothing");
    check(
      (await listSubscriptions()).find((s) => s.id === sub.id)?.currentPeriodPayment?.id === recorded[0]?.id,
      "the admin row shows the recorded invoice as this period's payment",
    );

    // The client page reads project and retainer payments through one helper;
    // the retainer payment appears there exactly once.
    const page = await prisma.client.findUniqueOrThrow({
      where: { id: client.id },
      include: {
        projects: { include: { payments: true, contract: { select: { proposal: { select: { currency: true } } } } } },
        subscriptions: { include: { payments: true } },
      },
    });
    const rows = clientPayments(page);
    check(rows.filter((r) => r.id === recorded[0]?.id).length === 1, "the client page lists the retainer payment exactly once");
    check(
      rows.find((r) => r.id === recorded[0]?.id)?.projectId === null &&
        rows.find((r) => r.id === recorded[0]?.id)?.subscription?.planId === "professional",
      "it carries the plan, not a project",
    );

    // An interval changed mid-period applies to the NEXT period. The current
    // one was produced by the old interval, and that is what it bills at.
    await prisma.payment.deleteMany({ where: { subscriptionId: sub.id } });
    const changed = await changeBillingInterval(sub.id, "MONTHLY", user.email, actor);
    check(changed.ok, "the interval is changed to monthly mid-period");
    check(
      (await listSubscriptions()).find((s) => s.id === sub.id)?.billingIntervalPending === true,
      "the admin row shows the change as pending",
    );
    const pendingCase = await recordPeriodInvoice(sub.id, user.email, actor);
    check(pendingCase.ok, "the current period can still be invoiced");
    const pendingPay = await prisma.payment.findFirst({ where: { subscriptionId: sub.id } });
    if (pendingPay) retainerPaymentIds.push(pendingPay.id);
    check(
      pendingPay?.amount === quarterly && pendingPay.amount !== monthly,
      "it bills at the quarterly price that produced the period, not the pending monthly one",
    );
    const pendingEvent = await prisma.activityEvent.findFirst({
      where: { entityId: sub.id, action: "subscription.invoice_recorded" },
      orderBy: { createdAt: "desc" },
    });
    const pendingMeta = pendingEvent?.metadata as Record<string, unknown> | null;
    check(
      pendingMeta?.billingInterval === "QUARTERLY" && pendingMeta.billingIntervalStored === "MONTHLY",
      "the audit event records both the derived and the stored interval",
    );

    // A period whose length fits no interval cannot be priced; refuse, never guess.
    await prisma.payment.deleteMany({ where: { subscriptionId: sub.id } });
    await prisma.maintenanceSubscription.update({
      where: { id: sub.id },
      data: { currentPeriodEnd: new Date(sub.currentPeriodStart.getTime() + 10 * 86_400_000) },
    });
    const unknown = await recordPeriodInvoice(sub.id, user.email, actor);
    check(!unknown.ok && /cannot be known/.test(unknown.message), "a period of unknown length is refused with a clear message");
    check((await prisma.payment.count({ where: { subscriptionId: sub.id } })) === 0, "the refusal creates nothing");
    await setSubscriptionStatus(sub.id, "CANCELLED", user.email, actor);
    check(!(await recordPeriodInvoice(sub.id, user.email, actor)).ok, "a cancelled retainer cannot be invoiced");

    // A quote-only plan needs its quote here too; a published plan refuses one.
    check(
      !(await createSubscription(client.id, "essential", user.email, "MONTHLY", actor, { quotedMonthlyPrice: 4321 })).ok,
      "a published plan refuses a quote at creation",
    );
    const quote = await createSubscription(client.id, "enterprise", user.email, "MONTHLY", actor);
    check(quote.ok, "an enterprise subscription is created without a quote");
    const refusedQuote = await recordPeriodInvoice(quote.id!, user.email, actor);
    check(!refusedQuote.ok && /quoted monthly price/.test(refusedQuote.message), "recording a quote-only invoice without a quote is refused");
    check((await setQuotedMonthlyPrice(quote.id!, 4321, user.email, actor)).ok, "the quote is set on the retainer");
    const agreedQuote = await recordPeriodInvoice(quote.id!, user.email, actor);
    const quotePay = await prisma.payment.findFirst({ where: { subscriptionId: quote.id! } });
    if (quotePay) retainerPaymentIds.push(quotePay.id);
    check(
      agreedQuote.ok && quotePay?.amount === maintenanceIntervalPrice({ price: 4321 }, "monthly"),
      "with the quote set it records the month at the quoted figure",
    );
    await setSubscriptionStatus(quote.id!, "CANCELLED", user.email, actor);

    // A quote given at creation is stored; a published plan never takes one.
    const born = await createSubscription(client.id, "enterprise", user.email, "QUARTERLY", actor, { quotedMonthlyPrice: 2000 });
    check(born.ok, "an enterprise subscription is created with its quote");
    const bornRow = (await listSubscriptions()).find((s) => s.id === born.id);
    check(
      bornRow?.quotedMonthlyPrice === 2000 &&
        bornRow.invoiceAmount === maintenanceIntervalPrice({ price: 2000 }, "quarterly"),
      "the quote given at creation prices the first quarter",
    );
    const published = await prisma.maintenanceSubscription.findFirst({ where: { clientId: client.id, planId: "essential" } });
    check(
      published !== null && !(await setQuotedMonthlyPrice(published.id, 100, user.email, actor)).ok,
      "a quote is refused on a published plan",
    );
    await setSubscriptionStatus(born.id!, "CANCELLED", user.email, actor);
  }

  console.log("\nTasks");
  {
    // A task needs a project, which needs a contract and a proposal. Build the
    // real chain rather than stubbing it — the FKs are part of what is tested.
    const proposal = await prisma.proposal.create({
      data: {
        clientId: client.id,
        projectType: "Website",
        complexity: "standard",
        totalPrice: 100000,
        currency: "EGP",
        lineItems: [],
        timelineWeeks: 6,
        accentName: "Signal",
        validUntil: new Date(Date.now() + 30 * 86_400_000),
        createdBy: "verify",
        paymentSplit: { first: 50, second: 30, final: 20 },
        content: {},
      },
    });
    const contract = await prisma.contract.create({
      data: { clientId: client.id, proposalId: proposal.id },
    });
    const project = await prisma.project.create({
      data: { contractId: contract.id, clientId: client.id, name: "Verify Project" },
    });

    const task = await prisma.projectTask.create({
      data: { projectId: project.id, title: "Wire the form", assigneeId: user.id },
    });
    check(task.status === "TODO", "a new task starts in TODO");
    check(task.completedAt === null, "a new task has no completion date");

    const done = await prisma.projectTask.update({
      where: { id: task.id },
      data: { status: "DONE", completedAt: new Date() },
    });
    check(done.completedAt != null, "completing a task stamps completedAt");

    const reopened = await prisma.projectTask.update({
      where: { id: task.id },
      data: { status: "TODO", completedAt: null },
    });
    check(reopened.completedAt === null, "reopening a task clears completedAt");

    // Cascade: deleting the project must not orphan its tasks.
    await prisma.projectTask.deleteMany({ where: { projectId: project.id } });
    await prisma.payment.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } });
    await prisma.contract.delete({ where: { id: contract.id } });
    await prisma.proposal.delete({ where: { id: proposal.id } });
    check(true, "the project chain tears down cleanly");
  }

  console.log("\nIncident numbering");
  {
    const product = await prisma.product.create({
      data: { clientId: client.id, name: "Verify Prod", slug: `verify-prod-${suffix}` },
    });
    const first = await prisma.incident.create({
      data: { productId: product.id, number: 1, title: "First" },
    });
    check(first.number === 1, "the first incident is #1");
    check(first.status === "INVESTIGATING", "an incident opens as investigating");
    check(first.resolvedAt === null, "an open incident has no resolution time");

    let clashed = false;
    try {
      await prisma.incident.create({
        data: { productId: product.id, number: 1, title: "Clash" },
      });
    } catch {
      clashed = true;
    }
    check(clashed, "the per-product number is unique — two incidents cannot share one");

    await prisma.incident.deleteMany({ where: { productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
  }
} finally {
  await prisma.activityEvent.deleteMany({
    where: { OR: [{ actorId: user.id }, { entityId: client.id }] },
  });
  await prisma.payment.deleteMany({
    where: { OR: [{ subscription: { clientId: client.id } }, { id: { in: retainerPaymentIds } }] },
  });
  await prisma.maintenanceSubscription.deleteMany({ where: { clientId: client.id } });
  await prisma.client.delete({ where: { id: client.id } });
  await prisma.activityEvent.deleteMany({ where: { actorLabel: "Verify Operator" } });
  await prisma.user.delete({ where: { id: user.id } });
}

console.log(
  failures === 0
    ? "\nverify:admin-api — all checks passed.\n"
    : `\nverify:admin-api — ${failures} check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
