import {
  prisma,
  type BillingInterval,
  type MaintenanceSubscriptionStatus,
  type Prisma,
} from "@repo/database";
import {
  currentBillingCycle,
  MAINTENANCE_PLAN_IDS,
  maintenanceIntervalPrice,
  pricingCopy,
  type MaintenancePlanId,
} from "@repo/pricing-schema";

import {
  BILLING_INTERVAL_LABEL,
  billedPlanPrice,
  intervalPriceLabel,
  MAINTENANCE_INTERVAL,
} from "@/lib/billing-interval";
import { intervalOfPeriod } from "@/lib/period-invoice";
import { RETAINER_CURRENCY } from "@/lib/payment-source";
import { isPaymentOverdue } from "@/lib/payment-overdue";
import { money } from "@/lib/format";
import { getPricing } from "@/lib/pricing-store";
import { diffFields, recordChanges } from "@/lib/pricing-store";
import { recordActivity, recordChange, systemActor, type Actor } from "@/lib/activity-log";
import {
  computeRenewal,
  deriveStatus,
  nextPeriodEnd,
  renewalView,
  STATUS_LABEL,
  type RenewalUrgency,
} from "@/lib/subscription-lifecycle";

export interface AdminRequest {
  readonly id: string;
  readonly title: string;
  readonly detail: string | null;
  readonly status: string;
  readonly countsToCap: boolean;
  readonly submittedAt: string;
  readonly completedAt: string | null;
  readonly cycleStart: string;
}

export interface AdminSubscription {
  readonly id: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly planId: string;
  readonly planName: string;
  readonly planPriceLabel: string;
  readonly planPriceSuffix: string;
  readonly status: MaintenanceSubscriptionStatus;
  readonly effectiveStatus: MaintenanceSubscriptionStatus;
  readonly effectiveStatusLabel: string;
  readonly billingInterval: BillingInterval;
  readonly billingIntervalLabel: string;
  readonly billingIntervalPending: boolean;
  readonly autoRenew: boolean;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly renewsAt: string;
  readonly renewalUrgency: RenewalUrgency;
  readonly daysUntilRenewal: number;
  readonly trialEndsAt: string | null;
  readonly lastRenewedAt: string | null;
  readonly portalToken: string;
  readonly startedAt: string;
  readonly cycleStart: string;
  readonly cycleEnd: string;
  readonly requestsPerCycle: number | null;
  readonly requestsUsed: number;
  readonly openRequests: number;
  readonly requests: readonly AdminRequest[];
  readonly invoiceAmount: number | null;
  readonly quoteOnly: boolean;
  readonly intervalPrices: readonly { value: BillingInterval; label: string; price: string }[];
  readonly quotedMonthlyPrice: number | null;
  readonly currency: string;
  readonly currentPeriodPayment: AdminPeriodPayment | null;
  readonly payments: readonly AdminPeriodPayment[];
}

export interface AdminPeriodPayment {
  readonly id: string;
  readonly amount: number;
  readonly status: "PENDING" | "PAID" | "OVERDUE" | "WAIVED";
  readonly dueDate: string | null;
  readonly paidAt: string | null;
}

function isPlanId(value: string): value is MaintenancePlanId {
  return (MAINTENANCE_PLAN_IDS as readonly string[]).includes(value);
}

function planName(planId: string): string {
  return isPlanId(planId) ? pricingCopy("en").maintenance[planId].name : planId;
}

function retainerLabel(sub: {
  planId: string;
  client: { name: string | null; company: string | null };
}): string {
  return `${planName(sub.planId)} · ${sub.client.company || sub.client.name || "Unnamed client"}`;
}

function periodPaymentView(
  payment: { id: string; amount: number; status: string; dueDate: Date | null; paidAt: Date | null },
  now: Date,
): AdminPeriodPayment {
  return {
    id: payment.id,
    amount: payment.amount,
    status:
      payment.status === "PENDING" && isPaymentOverdue(payment, now)
        ? "OVERDUE"
        : (payment.status as AdminPeriodPayment["status"]),
    dueDate: payment.dueDate?.toISOString() ?? null,
    paidAt: payment.paidAt?.toISOString() ?? null,
  };
}

const SUBSCRIPTION_INCLUDE = {
  client: { select: { id: true, name: true, company: true } },
  requests: { orderBy: { createdAt: "desc" } },
  payments: {
    select: { id: true, amount: true, status: true, dueDate: true, paidAt: true },
    orderBy: { dueDate: "desc" },
  },
} satisfies Prisma.MaintenanceSubscriptionInclude;

type SubscriptionWithRelations = Prisma.MaintenanceSubscriptionGetPayload<{
  include: typeof SUBSCRIPTION_INCLUDE;
}>;

type Pricing = Awaited<ReturnType<typeof getPricing>>;

export async function listSubscriptions(
  now: Date = new Date(),
): Promise<readonly AdminSubscription[]> {
  const [subscriptions, pricing] = await Promise.all([
    prisma.maintenanceSubscription.findMany({
      include: SUBSCRIPTION_INCLUDE,
      orderBy: { createdAt: "desc" },
    }),
    getPricing(),
  ]);
  return subscriptions.map((sub) => toAdminSubscription(sub, pricing, now));
}

export async function getSubscription(
  id: string,
  now: Date = new Date(),
): Promise<AdminSubscription | null> {
  const [sub, pricing] = await Promise.all([
    prisma.maintenanceSubscription.findUnique({ where: { id }, include: SUBSCRIPTION_INCLUDE }),
    getPricing(),
  ]);
  return sub ? toAdminSubscription(sub, pricing, now) : null;
}

function toAdminSubscription(
  sub: SubscriptionWithRelations,
  pricing: Pricing,
  now: Date,
): AdminSubscription {
  const copy = pricingCopy("en");

  const cycle = currentBillingCycle(sub.startedAt, now);
  const planId = isPlanId(sub.planId) ? sub.planId : null;
  const plan = planId ? pricing.maintenance[planId] : null;
  const billed = billedPlanPrice(plan, sub.quotedMonthlyPrice);
  const price = intervalPriceLabel(billed, sub.billingInterval);

  const effective = deriveStatus(sub, now);
  const renewal = renewalView(sub, now);

  const inCycle = sub.requests.filter(
    (r) =>
      r.cycleStart.getTime() >= cycle.start.getTime() &&
      r.cycleStart.getTime() < cycle.end.getTime(),
  );

  const periodPayment =
    sub.payments.find((p) => p.dueDate?.getTime() === sub.currentPeriodStart.getTime()) ??
    null;

  return {
    id: sub.id,
    clientId: sub.client.id,
    clientName: sub.client.company || sub.client.name || "Unnamed client",
    planId: sub.planId,
    planName: planId ? copy.maintenance[planId].name : `${sub.planId} (unknown)`,
    planPriceLabel: price.price,
    planPriceSuffix: price.suffix,
    status: sub.status,
    effectiveStatus: effective,
    effectiveStatusLabel: STATUS_LABEL[effective],
    billingInterval: sub.billingInterval,
    billingIntervalLabel: BILLING_INTERVAL_LABEL[sub.billingInterval],
    billingIntervalPending:
      nextPeriodEnd(sub.currentPeriodStart, sub.billingInterval).getTime() !==
      sub.currentPeriodEnd.getTime(),
    autoRenew: sub.autoRenew,
    currentPeriodStart: sub.currentPeriodStart.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    renewsAt: sub.currentPeriodEnd.toISOString(),
    renewalUrgency: renewal.urgency,
    daysUntilRenewal: renewal.daysUntil,
    trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
    lastRenewedAt: sub.lastRenewedAt?.toISOString() ?? null,
    portalToken: sub.portalToken,
    startedAt: sub.startedAt.toISOString(),
    cycleStart: cycle.start.toISOString(),
    cycleEnd: cycle.end.toISOString(),
    requestsPerCycle: plan?.requestsPerCycle ?? null,
    requestsUsed: inCycle.filter((r) => r.countsToCap).length,
    openRequests: sub.requests.filter(
      (r) => r.status === "SUBMITTED" || r.status === "IN_PROGRESS",
    ).length,
    requests: sub.requests.map((r) => ({
      id: r.id,
      title: r.title,
      detail: r.detail,
      status: r.status,
      countsToCap: r.countsToCap,
      submittedAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      cycleStart: r.cycleStart.toISOString(),
    })),
    invoiceAmount: billed ? maintenanceIntervalPrice(billed, MAINTENANCE_INTERVAL[sub.billingInterval]) : null,
    quoteOnly: plan !== null && plan.price === null,
    intervalPrices: (Object.keys(BILLING_INTERVAL_LABEL) as BillingInterval[]).map((interval) => {
      const at = intervalPriceLabel(billed, interval);
      return {
        value: interval,
        label: BILLING_INTERVAL_LABEL[interval],
        price: [at.price, at.suffix].filter(Boolean).join(" "),
      };
    }),
    quotedMonthlyPrice: sub.quotedMonthlyPrice,
    currency: RETAINER_CURRENCY,
    currentPeriodPayment: periodPayment ? periodPaymentView(periodPayment, now) : null,
    payments: sub.payments.map((p) => periodPaymentView(p, now)),
  };
}

export const REQUEST_STATUSES = [
  "SUBMITTED",
  "IN_PROGRESS",
  "COMPLETED",
  "DECLINED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "SUSPENDED",
  "PAUSED",
  "CANCELLED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export async function setRequestStatus(
  id: string,
  status: RequestStatus,
  actor: string | null,
  auditActor: Actor = systemActor(actor ?? "System"),
): Promise<boolean> {
  const before = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!before) return false;

  await prisma.maintenanceRequest.update({
    where: { id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? (before.completedAt ?? new Date()) : null,
    },
  });

  await recordChanges(
    diffFields("maintenance_request", id, { status: before.status }, { status }),
    actor,
  );

  await recordActivity({
    action: "maintenance_request.status_changed",
    actor: auditActor,
    entityType: "maintenance_request",
    entityId: id,
    entityLabel: before.title,
    summary: `Request status moved to ${status.toLowerCase()}`,
    before: { status: before.status },
    after: { status },
  });
  return true;
}

export async function setRequestBilling(
  id: string,
  countsToCap: boolean,
  actor: string | null,
  auditActor: Actor = systemActor(actor ?? "System"),
): Promise<boolean> {
  const before = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!before) return false;

  await prisma.maintenanceRequest.update({ where: { id }, data: { countsToCap } });

  await recordChanges(
    diffFields(
      "maintenance_request",
      id,
      { countsToCap: before.countsToCap },
      { countsToCap },
    ),
    actor,
  );

  await recordActivity({
    action: "maintenance_request.billing_changed",
    actor: auditActor,
    entityType: "maintenance_request",
    entityId: id,
    entityLabel: before.title,
    summary: countsToCap
      ? "Request moved back under the allowance cap"
      : "Request reclassified as billable overage",
    before: { countsToCap: before.countsToCap },
    after: { countsToCap },
  });
  return true;
}

export async function setSubscriptionStatus(
  id: string,
  status: SubscriptionStatus,
  actor: string | null,
  auditActor: Actor = systemActor(actor ?? "System"),
): Promise<boolean> {
  const before = await prisma.maintenanceSubscription.findUnique({
    where: { id },
    include: { client: { select: { name: true, company: true } } },
  });
  if (!before) return false;
  if (before.status === status) return true;

  await prisma.maintenanceSubscription.update({
    where: { id },
    data: {
      status,
      cancelledAt: status === "CANCELLED" ? (before.cancelledAt ?? new Date()) : null,
      trialEndsAt: status === "TRIALING" ? before.trialEndsAt : null,
    },
  });

  await recordChanges(
    diffFields("maintenance_subscription", id, { status: before.status }, { status }),
    actor,
  );

  await recordChange({
    action: `subscription.${status.toLowerCase()}`,
    actor: auditActor,
    entityType: "subscription",
    entityId: id,
    entityLabel: retainerLabel(before),
    summary: `Retainer moved to ${STATUS_LABEL[status]}`,
    before: { status: before.status },
    after: { status },
  });
  return true;
}

export async function changePlan(
  id: string,
  planId: MaintenancePlanId,
  actor: string | null,
  auditActor: Actor = systemActor(actor ?? "System"),
): Promise<{ ok: boolean; message: string }> {
  const before = await prisma.maintenanceSubscription.findUnique({
    where: { id },
    include: { client: { select: { name: true, company: true } } },
  });
  if (!before) return { ok: false, message: "That subscription no longer exists." };

  if (before.status === "CANCELLED") {
    return { ok: false, message: "A cancelled retainer cannot change plan. Start a new one." };
  }
  if (before.planId === planId) {
    return { ok: false, message: `This retainer is already on the ${planName(planId)} plan.` };
  }

  const pricing = await getPricing();
  const target = pricing.maintenance[planId];
  const targetPublished = target.price !== null;
  const quotedMonthlyPrice = targetPublished ? null : before.quotedMonthlyPrice;

  await prisma.maintenanceSubscription.update({
    where: { id },
    data: { planId, quotedMonthlyPrice },
  });

  await recordChanges(
    diffFields(
      "maintenance_subscription",
      id,
      { planId: before.planId, quotedMonthlyPrice: before.quotedMonthlyPrice },
      { planId, quotedMonthlyPrice },
    ),
    actor,
  );

  const from = before.currentPeriodEnd.toISOString().slice(0, 10);
  const quoteCleared = before.quotedMonthlyPrice !== null && quotedMonthlyPrice === null;
  await recordChange({
    action: "subscription.plan_changed",
    actor: auditActor,
    entityType: "subscription",
    entityId: id,
    entityLabel: retainerLabel(before),
    summary: `Plan moved from ${planName(before.planId)} to ${planName(planId)}; billed at the new price from the ${from} renewal`,
    before: { planId: before.planId, ...(quoteCleared ? { quotedMonthlyPrice: before.quotedMonthlyPrice } : {}) },
    after: { planId, ...(quoteCleared ? { quotedMonthlyPrice: null } : {}) },
  });

  const billing = targetPublished
    ? `billed at the ${planName(planId)} price from ${from}`
    : before.quotedMonthlyPrice !== null
      ? `the existing quote of ${RETAINER_CURRENCY} ${before.quotedMonthlyPrice} a month still applies from ${from}`
      : `set a quoted monthly price before the ${from} renewal, or it cannot be invoiced`;
  return {
    ok: true,
    message: `Now on ${planName(planId)}. The allowance applies at once; ${billing}. The current period's invoice is unchanged.`,
  };
}

async function periodAmount(
  sub: { planId: string; quotedMonthlyPrice: number | null },
  interval: BillingInterval,
  verb: string,
): Promise<
  | { ok: true; amount: number; amountSource: "schema" | "quote"; planName: string }
  | { ok: false; message: string }
> {
  const pricing = await getPricing();
  const plan = isPlanId(sub.planId) ? pricing.maintenance[sub.planId] : null;
  const planName = plan ? pricingCopy("en").maintenance[sub.planId as MaintenancePlanId].name : sub.planId;
  if (!plan) {
    return { ok: false, message: `Plan "${sub.planId}" is not in the pricing schema — nothing can be invoiced for it.` };
  }

  const schemaAmount = maintenanceIntervalPrice(plan, MAINTENANCE_INTERVAL[interval]);
  if (schemaAmount !== null) return { ok: true, amount: schemaAmount, amountSource: "schema", planName };

  const quoted = sub.quotedMonthlyPrice !== null
    ? maintenanceIntervalPrice({ price: sub.quotedMonthlyPrice }, MAINTENANCE_INTERVAL[interval])
    : null;
  if (quoted !== null) return { ok: true, amount: quoted, amountSource: "quote", planName };

  return {
    ok: false,
    message: `This plan is quoted, not published — set the quoted monthly price on this retainer to ${verb}.`,
  };
}

async function openPeriodPayment(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  input: { subscriptionId: string; dueDate: Date; amount: number; reference: string },
): Promise<{ paymentId: string; reused: boolean }> {
  const existing = await tx.payment.findFirst({
    where: { subscriptionId: input.subscriptionId, dueDate: input.dueDate },
    select: { id: true },
  });
  if (existing) return { paymentId: existing.id, reused: true };

  const payment = await tx.payment.create({
    data: {
      subscriptionId: input.subscriptionId,
      milestone: "RETAINER_RENEWAL",
      amount: input.amount,
      status: "PENDING",
      dueDate: input.dueDate,
      reference: input.reference.slice(0, 120),
    },
    select: { id: true },
  });
  return { paymentId: payment.id, reused: false };
}

export async function renewSubscription(
  id: string,
  actor: string | null,
  auditActor: Actor = systemActor(actor ?? "System"),
  now: Date = new Date(),
): Promise<{ ok: boolean; message: string }> {
  const before = await prisma.maintenanceSubscription.findUnique({
    where: { id },
    include: { client: { select: { name: true, company: true } } },
  });
  if (!before) return { ok: false, message: "That subscription no longer exists." };

  if (before.status === "CANCELLED") {
    return { ok: false, message: "A cancelled retainer cannot be renewed. Start a new one." };
  }

  const priced = await periodAmount(before, before.billingInterval, "renew");
  if (!priced.ok) return priced;
  const { amount, amountSource, planName } = priced;

  const period = computeRenewal(before, now);
  const intervalLabel = BILLING_INTERVAL_LABEL[before.billingInterval];

  const result = await prisma.$transaction(async (tx) => {
    const moved = await tx.maintenanceSubscription.updateMany({
      where: { id, currentPeriodEnd: before.currentPeriodEnd },
      data: {
        ...period,
        lastRenewedAt: now,
        status: before.status === "TRIALING" ? "ACTIVE" : before.status,
        trialEndsAt: null,
      },
    });
    if (moved.count === 0) return null;

    return openPeriodPayment(tx, {
      subscriptionId: id,
      dueDate: period.currentPeriodStart,
      amount,
      reference: `${planName} retainer · ${intervalLabel}`,
    });
  });

  if (!result) {
    return { ok: false, message: "This retainer was already renewed — refresh to see the current period." };
  }

  const through = period.currentPeriodEnd.toISOString().slice(0, 10);
  const due = period.currentPeriodStart.toISOString().slice(0, 10);

  await recordActivity({
    action: "subscription.renewed",
    actor: auditActor,
    entityType: "subscription",
    entityId: id,
    entityLabel: retainerLabel(before),
    summary: result.reused
      ? `Retainer renewed through ${through}; the period's invoice already existed`
      : `Retainer renewed through ${through}; ${RETAINER_CURRENCY} ${amount} invoiced, due ${due}`,
    before: { currentPeriodEnd: before.currentPeriodEnd },
    after: { currentPeriodEnd: period.currentPeriodEnd },
    metadata: {
      paymentId: result.paymentId,
      amount,
      currency: RETAINER_CURRENCY,
      billingInterval: before.billingInterval,
      amountSource,
      reused: result.reused,
    },
  });

  return {
    ok: true,
    message: result.reused
      ? "Renewed. The next period is now current; its invoice already existed."
      : `Renewed. ${RETAINER_CURRENCY} ${amount} is now pending for the period starting ${due}.`,
  };
}

export async function recordPeriodInvoice(
  id: string,
  actor: string | null,
  auditActor: Actor = systemActor(actor ?? "System"),
): Promise<{ ok: boolean; message: string }> {
  const sub = await prisma.maintenanceSubscription.findUnique({
    where: { id },
    include: { client: { select: { name: true, company: true } } },
  });
  if (!sub) return { ok: false, message: "That subscription no longer exists." };
  if (sub.status === "CANCELLED") {
    return { ok: false, message: "A cancelled retainer has no period to invoice." };
  }

  const interval = intervalOfPeriod(sub);
  if (!interval) {
    return {
      ok: false,
      message:
        "This period's length matches no billing interval, so its price cannot be known. Invoice it by hand from the payments screen.",
    };
  }

  const priced = await periodAmount(sub, interval, "record the invoice");
  if (!priced.ok) return priced;
  const { amount, amountSource, planName } = priced;

  const result = await prisma.$transaction((tx) =>
    openPeriodPayment(tx, {
      subscriptionId: id,
      dueDate: sub.currentPeriodStart,
      amount,
      reference: `${planName} retainer · ${BILLING_INTERVAL_LABEL[interval]}`,
    }),
  );
  if (result.reused) {
    return { ok: false, message: "This period already has its invoice — nothing was recorded." };
  }

  const due = sub.currentPeriodStart.toISOString().slice(0, 10);
  await recordActivity({
    action: "subscription.invoice_recorded",
    actor: auditActor,
    entityType: "subscription",
    entityId: id,
    entityLabel: retainerLabel(sub),
    summary: `Invoice recorded by hand for the period from ${due}: ${RETAINER_CURRENCY} ${amount}`,
    after: { paymentId: result.paymentId, amount, dueDate: sub.currentPeriodStart },
    metadata: {
      manual: true,
      paymentId: result.paymentId,
      amount,
      currency: RETAINER_CURRENCY,
      billingInterval: interval,
      billingIntervalStored: sub.billingInterval,
      amountSource,
    },
  });

  return {
    ok: true,
    message: `Recorded. ${RETAINER_CURRENCY} ${amount} is now pending for the period from ${due}.`,
  };
}

export async function setQuotedMonthlyPrice(
  id: string,
  quotedMonthlyPrice: number | null,
  actor: string | null,
  auditActor: Actor = systemActor(actor ?? "System"),
): Promise<{ ok: boolean; message: string }> {
  const before = await prisma.maintenanceSubscription.findUnique({
    where: { id },
    include: { client: { select: { name: true, company: true } } },
  });
  if (!before) return { ok: false, message: "That subscription no longer exists." };
  if (before.status === "CANCELLED") {
    return { ok: false, message: "A cancelled retainer has no next invoice to price." };
  }
  if (quotedMonthlyPrice !== null && (!Number.isInteger(quotedMonthlyPrice) || quotedMonthlyPrice <= 0)) {
    return { ok: false, message: "The quoted monthly price must be a whole number above zero." };
  }

  const pricing = await getPricing();
  const plan = isPlanId(before.planId) ? pricing.maintenance[before.planId] : null;
  if (!plan) {
    return { ok: false, message: `Plan "${before.planId}" is not in the pricing schema — nothing can be priced for it.` };
  }
  if (plan.price !== null) {
    return {
      ok: false,
      message: "This plan is published — its price comes from the pricing schema, not a quote.",
    };
  }
  if (before.quotedMonthlyPrice === quotedMonthlyPrice) {
    return {
      ok: true,
      message:
        quotedMonthlyPrice === null
          ? "No quoted monthly price is set."
          : "The quoted monthly price is already that figure.",
    };
  }

  await prisma.maintenanceSubscription.update({
    where: { id },
    data: { quotedMonthlyPrice },
  });

  await recordChanges(
    diffFields(
      "maintenance_subscription",
      id,
      { quotedMonthlyPrice: before.quotedMonthlyPrice },
      { quotedMonthlyPrice },
    ),
    actor,
  );

  await recordActivity({
    action: "subscription.quote_changed",
    actor: auditActor,
    entityType: "subscription",
    entityId: id,
    entityLabel: retainerLabel(before),
    summary:
      quotedMonthlyPrice === null
        ? `Cleared the quoted monthly price (was ${RETAINER_CURRENCY} ${before.quotedMonthlyPrice})`
        : before.quotedMonthlyPrice === null
          ? `Quoted the retainer at ${RETAINER_CURRENCY} ${quotedMonthlyPrice} a month`
          : `Changed the quoted monthly price from ${RETAINER_CURRENCY} ${before.quotedMonthlyPrice} to ${RETAINER_CURRENCY} ${quotedMonthlyPrice}`,
    before: { quotedMonthlyPrice: before.quotedMonthlyPrice },
    after: { quotedMonthlyPrice },
    metadata: { currency: RETAINER_CURRENCY, appliesFrom: "next invoice" },
  });

  return {
    ok: true,
    message:
      quotedMonthlyPrice === null
        ? "Quoted price cleared — nothing can be invoiced until a new one is set. Opened payments keep their amount."
        : `Quoted at ${RETAINER_CURRENCY} ${quotedMonthlyPrice} a month from the next invoice. Opened payments keep their amount.`,
  };
}

export async function changeBillingInterval(
  id: string,
  interval: BillingInterval,
  actor: string | null,
  auditActor: Actor = systemActor(actor ?? "System"),
): Promise<{ ok: boolean; message: string }> {
  const before = await prisma.maintenanceSubscription.findUnique({
    where: { id },
    include: { client: { select: { name: true, company: true } } },
  });
  if (!before) return { ok: false, message: "That subscription no longer exists." };

  if (before.status === "CANCELLED") {
    return { ok: false, message: "A cancelled retainer has no next invoice to change." };
  }
  if (before.billingInterval === interval) {
    return {
      ok: false,
      message: `This retainer is already billed ${BILLING_INTERVAL_LABEL[interval].toLowerCase()}.`,
    };
  }

  await prisma.maintenanceSubscription.update({
    where: { id },
    data: { billingInterval: interval },
  });

  await recordChanges(
    diffFields(
      "maintenance_subscription",
      id,
      { billingInterval: before.billingInterval },
      { billingInterval: interval },
    ),
    actor,
  );

  const from = before.currentPeriodEnd.toISOString().slice(0, 10);
  await recordChange({
    action: "subscription.billing_interval_changed",
    actor: auditActor,
    entityType: "subscription",
    entityId: id,
    entityLabel: retainerLabel(before),
    summary: `Billing moved to ${BILLING_INTERVAL_LABEL[interval].toLowerCase()} from the ${from} renewal`,
    before: { billingInterval: before.billingInterval },
    after: { billingInterval: interval },
  });

  return {
    ok: true,
    message: `Billed ${BILLING_INTERVAL_LABEL[interval].toLowerCase()} from ${from}. The current period is unchanged.`,
  };
}

export async function setAutoRenew(
  id: string,
  autoRenew: boolean,
  actor: string | null,
  auditActor: Actor = systemActor(actor ?? "System"),
): Promise<boolean> {
  const before = await prisma.maintenanceSubscription.findUnique({
    where: { id },
    include: { client: { select: { name: true, company: true } } },
  });
  if (!before) return false;

  if (before.autoRenew === autoRenew) return true;

  await prisma.maintenanceSubscription.update({ where: { id }, data: { autoRenew } });

  await recordActivity({
    action: "subscription.auto_renew_changed",
    actor: auditActor,
    entityType: "subscription",
    entityId: id,
    entityLabel: retainerLabel(before),
    summary: autoRenew
      ? "Auto-renewal switched on"
      : `Auto-renewal switched off — expires ${before.currentPeriodEnd.toISOString().slice(0, 10)}`,
    before: { autoRenew: before.autoRenew },
    after: { autoRenew },
  });
  return true;
}

export async function createSubscription(
  clientId: string,
  planId: MaintenancePlanId,
  actor: string | null,
  interval: BillingInterval = "MONTHLY",
  auditActor: Actor = systemActor(actor ?? "System"),
  options: { quotedMonthlyPrice?: number | null } = {},
): Promise<{ ok: boolean; message: string; id?: string }> {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, message: "That client no longer exists." };

  const quotedMonthlyPrice = options.quotedMonthlyPrice ?? null;
  if (quotedMonthlyPrice !== null) {
    if (!Number.isInteger(quotedMonthlyPrice) || quotedMonthlyPrice <= 0) {
      return { ok: false, message: "The quoted monthly price must be a whole number above zero." };
    }
    if ((await getPricing()).maintenance[planId].price !== null) {
      return {
        ok: false,
        message: "This plan is published — its price comes from the pricing schema, not a quote.",
      };
    }
  }

  const existing = await prisma.maintenanceSubscription.findFirst({
    where: {
      clientId,
      status: { in: ["TRIALING", "ACTIVE", "PAUSED", "SUSPENDED"] },
    },
  });
  if (existing) {
    return {
      ok: false,
      message: "This client already has a maintenance plan. Cancel it first.",
    };
  }

  const priced = await periodAmount({ planId, quotedMonthlyPrice }, interval, "invoice the first period");

  const startedAt = new Date();
  const { created, payment } = await prisma.$transaction(async (tx) => {
    const created = await tx.maintenanceSubscription.create({
      data: {
        clientId,
        planId,
        billingInterval: interval,
        quotedMonthlyPrice,
        startedAt,
        currentPeriodStart: startedAt,
        currentPeriodEnd: nextPeriodEnd(startedAt, interval),
      },
    });
    const payment = priced.ok
      ? await openPeriodPayment(tx, {
          subscriptionId: created.id,
          dueDate: startedAt,
          amount: priced.amount,
          reference: `${priced.planName} retainer · ${BILLING_INTERVAL_LABEL[interval]}`,
        })
      : null;
    return { created, payment };
  });

  await recordChanges(
    [
      {
        entityType: "maintenance_subscription",
        entityId: created.id,
        field: "created",
        oldValue: null,
        newValue: planId,
      },
    ],
    actor,
  );

  const label = retainerLabel({ planId, client });
  const clientName = client.company || client.name || "a client";
  await recordActivity({
    action: "subscription.created",
    actor: auditActor,
    entityType: "subscription",
    entityId: created.id,
    entityLabel: label,
    summary:
      priced.ok && payment
        ? `Started the ${planName(planId)} retainer for ${clientName}; ${money(priced.amount, RETAINER_CURRENCY)} invoiced for the first period`
        : `Started the ${planName(planId)} retainer for ${clientName}; nothing invoiced yet — no quote set`,
    after: {
      planId,
      billingInterval: interval,
      quotedMonthlyPrice,
      currentPeriodEnd: created.currentPeriodEnd,
    },
    metadata: {
      paymentId: payment?.paymentId ?? null,
      amount: priced.ok ? priced.amount : null,
      currency: RETAINER_CURRENCY,
      amountSource: priced.ok ? priced.amountSource : null,
    },
  });

  return {
    ok: true,
    id: created.id,
    message:
      priced.ok && payment
        ? `Retainer started. ${money(priced.amount, RETAINER_CURRENCY)} is pending for the first period.`
        : "Retainer started. No invoice was opened — set the quoted monthly price and it is invoiced from the next renewal.",
  };
}
