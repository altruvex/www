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

/**
 * Recurring revenue and receivables, derived — never stored.
 *
 * MRR counts a retainer when its DERIVED status is revenue-bearing (trialing,
 * active, past due, grace): a row whose stored status is ACTIVE but whose
 * period ended with auto-renew off is expired, and is not revenue. The price
 * per retainer is resolved exactly the way the renewal invoice resolves it
 * (`billedPlanPrice` in lib/billing-interval.ts, the same rule
 * `lib/maintenance-admin.ts` bills by): the plan's published price first,
 * the retainer's quoted monthly price only when the plan is quote-only.
 *
 * Two MRR figures are reported because annual billing is ten paid months per
 * twelve (`MAINTENANCE_PAID_MONTHS`): "contracted" is the monthly rate every
 * active retainer is on; "billed" is what the invoices actually average out
 * to per month once the free months are counted. Whichever is shown, the
 * screen says which — the two differ by exactly the annual discount.
 *
 * Retainers bill in EGP (`RETAINER_CURRENCY`); the figures are keyed by
 * currency anyway so a second retainer currency would appear as a second
 * figure rather than being silently added to the first.
 */

export interface PlanRevenue {
  planId: string;
  planName: string;
  activeRetainers: number;
  /** Retainers counted but unpriced: quote-only plan with no quoted figure. */
  unpriced: number;
  contractedMrr: number;
  billedMrr: number;
}

export interface RevenueMetrics {
  /** Σ monthly rate of every revenue-bearing retainer, per currency. */
  contractedMrr: Record<string, number>;
  /** Σ monthly rate × paid months ÷ months in the interval, per currency. */
  billedMrr: Record<string, number>;
  activeRetainers: number;
  /** Counted in `activeRetainers` but with no resolvable price. */
  unpricedRetainers: number;
  byPlan: PlanRevenue[];
  /** Unpaid (pending + overdue) payments, per currency. */
  outstanding: Record<string, number>;
  outstandingCount: number;
  overdue: Record<string, number>;
  overdueCount: number;
  /** The three longest-overdue payments, for a short list with links. */
  topOverdue: OverduePayment[];
  /** Pending, not overdue, due within `DUE_SOON_DAYS` (lib/payment-overdue.ts). */
  dueSoon: Record<string, number>;
  dueSoonCount: number;
  /** PAID with `paidAt` in the current calendar month, per currency. */
  collectedThisMonth: Record<string, number>;
  renewalsNeedingAttention: number;
}

export interface OverduePayment {
  id: string;
  label: string;
  amount: number;
  currency: string;
}

/** "Annual retainers bill 10 of 12 months" — from the schema, so the screen cannot drift from the rule. */
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
            contract: { select: { proposal: { select: { currency: true } } } },
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
            contract: { select: { proposal: { select: { currency: true } } } },
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
      // Rounded per retainer so the total is a sum of whole-unit figures,
      // the same way each retainer's own invoice is a whole-unit amount.
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
      // `unpaid` is ordered by due date, so the first three are the longest overdue.
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

/** A service term bills in the service's currency; everything else follows the project's contract, retainers EGP. */
function currencyOf(payment: {
  project: { contract: { proposal: { currency: string } } } | null;
  service: { currency: string } | null;
}): string {
  return payment.service?.currency ?? paymentCurrency(payment);
}
