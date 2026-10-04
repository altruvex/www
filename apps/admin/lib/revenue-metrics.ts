import "server-only";
import { prisma } from "@repo/database";
import {
  MAINTENANCE_PAID_MONTHS,
  maintenanceFreeMonths,
  pricingCopy,
  type MaintenancePlanId,
} from "@repo/pricing-schema";
import { billedPlanPrice, MAINTENANCE_INTERVAL } from "@/lib/billing-interval";
import { getPricing } from "@/lib/pricing-store";
import { isPaymentDueSoon, isPaymentOverdue } from "@/lib/payment-overdue";
import {
  paymentCurrency,
  paymentSourceLabel,
  RETAINER_CURRENCY,
} from "@/lib/payment-source";
import { deriveStatus, REVENUE_BEARING } from "@/lib/subscription-lifecycle";
import { countRenewalsNeedingAttention } from "@/lib/renewals";
import { PROJECT_CURRENCY_SELECT, type ProjectCurrencySource } from "@/lib/project-currency";

export interface PlanRevenue {
  planId: string;
  planName: string;
  activeRetainers: number;
  unpriced: number;
  contractedMrr: number;
  billedMrr: number;
}

export interface RevenueMetrics {
  contractedMrr: Record<string, number>;
  billedMrr: Record<string, number>;
  activeRetainers: number;
  unpricedRetainers: number;
  byPlan: PlanRevenue[];
  outstanding: Record<string, number>;
  outstandingCount: number;
  overdue: Record<string, number>;
  overdueCount: number;
  topOverdue: OverduePayment[];
  dueSoon: Record<string, number>;
  dueSoonCount: number;
  collectedThisMonth: Record<string, number>;
  renewalsNeedingAttention: number;
}

export interface OverduePayment {
  id: string;
  label: string;
  amount: number;
  currency: string;
}

export const ANNUAL_BILLING_NOTE = `Annual retainers bill ${MAINTENANCE_PAID_MONTHS.annual} of ${
  MAINTENANCE_PAID_MONTHS.annual + maintenanceFreeMonths("annual")
} months`;

function add(target: Record<string, number>, currency: string, amount: number) {
  target[currency] = (target[currency] ?? 0) + amount;
}

export async function getRevenueMetrics(
  now: Date = new Date(),
): Promise<RevenueMetrics> {
  const [
    pricing,
    subscriptions,
    unpaid,
    paidThisMonth,
    renewalsNeedingAttention,
  ] = await Promise.all([
    getPricing(),
    prisma.maintenanceSubscription.findMany({
      select: {
        planId: true,
        status: true,
        billingInterval: true,
        quotedMonthlyPrice: true,
        currentPeriodEnd: true,
        autoRenew: true,
        trialEndsAt: true,
        cancelledAt: true,
      },
    }),
    prisma.payment.findMany({
      where: { status: { in: ["PENDING", "OVERDUE"] } },
      select: {
        id: true,
        status: true,
        amount: true,
        dueDate: true,
        milestone: true,
        project: {
          select: {
            id: true,
            name: true,
            ...PROJECT_CURRENCY_SELECT,
          },
        },
        subscription: { select: { planId: true } },
        service: { select: { id: true, name: true, currency: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      select: {
        amount: true,
        project: {
          select: {
            ...PROJECT_CURRENCY_SELECT,
          },
        },
        service: { select: { currency: true } },
      },
    }),
    countRenewalsNeedingAttention(now),
  ]);

  const copy = pricingCopy("en").maintenance;
  const plans = new Map<string, PlanRevenue>();
  const contractedMrr: Record<string, number> = {};
  const billedMrr: Record<string, number> = {};
  let activeRetainers = 0;
  let unpricedRetainers = 0;

  for (const sub of subscriptions) {
    if (!REVENUE_BEARING.has(deriveStatus(sub, now))) continue;
    activeRetainers += 1;

    const plan =
      (
        pricing.maintenance as Record<
          string,
          { price: number | null } | undefined
        >
      )[sub.planId] ?? null;
    const entry = plans.get(sub.planId) ?? {
      planId: sub.planId,
      planName:
        (copy as Record<string, { name: string } | undefined>)[
          sub.planId as MaintenancePlanId
        ]?.name ?? sub.planId,
      activeRetainers: 0,
      unpriced: 0,
      contractedMrr: 0,
      billedMrr: 0,
    };
    entry.activeRetainers += 1;

    const monthly =
      billedPlanPrice(plan, sub.quotedMonthlyPrice)?.price ?? null;
    if (monthly === null) {
      entry.unpriced += 1;
      unpricedRetainers += 1;
    } else {
      const interval = MAINTENANCE_INTERVAL[sub.billingInterval];
      const paidMonths = MAINTENANCE_PAID_MONTHS[interval];
      const totalMonths = paidMonths + maintenanceFreeMonths(interval);
      const billed = Math.round((monthly * paidMonths) / totalMonths);
      entry.contractedMrr += monthly;
      entry.billedMrr += billed;
      add(contractedMrr, RETAINER_CURRENCY, monthly);
      add(billedMrr, RETAINER_CURRENCY, billed);
    }
    plans.set(sub.planId, entry);
  }

  const outstanding: Record<string, number> = {};
  const overdue: Record<string, number> = {};
  const dueSoon: Record<string, number> = {};
  const topOverdue: OverduePayment[] = [];
  let overdueCount = 0;
  let dueSoonCount = 0;
  for (const payment of unpaid) {
    const currency = currencyOf(payment);
    add(outstanding, currency, payment.amount);
    if (isPaymentOverdue(payment, now)) {
      overdueCount += 1;
      add(overdue, currency, payment.amount);
      if (topOverdue.length < 3) {
        topOverdue.push({
          id: payment.id,
          label: paymentSourceLabel(payment),
          amount: payment.amount,
          currency,
        });
      }
    } else if (isPaymentDueSoon(payment, now)) {
      dueSoonCount += 1;
      add(dueSoon, currency, payment.amount);
    }
  }

  const collectedThisMonth: Record<string, number> = {};
  for (const payment of paidThisMonth)
    add(collectedThisMonth, currencyOf(payment), payment.amount);

  return {
    contractedMrr,
    billedMrr,
    activeRetainers,
    unpricedRetainers,
    byPlan: [...plans.values()].sort(
      (a, b) => b.contractedMrr - a.contractedMrr,
    ),
    outstanding,
    outstandingCount: unpaid.length,
    overdue,
    overdueCount,
    topOverdue,
    dueSoon,
    dueSoonCount,
    collectedThisMonth,
    renewalsNeedingAttention,
  };
}

function currencyOf(payment: {
  project: ProjectCurrencySource | null;
  service: { currency: string } | null;
}): string {
  return payment.service?.currency ?? paymentCurrency(payment);
}
