import {
  MAINTENANCE_PLAN_IDS,
  type MaintenancePlanId,
  type ResolvedPricing,
} from "@repo/pricing-schema";

import type {
  AdminPeriodPayment,
  AdminSubscription,
} from "@/lib/maintenance-admin";
import { currentPeriodInvoiceAmount } from "@/lib/period-invoice";

export interface PeriodPaymentView extends Omit<AdminPeriodPayment, "amount"> {
  readonly amount: number | null;
}

export interface SubscriptionView extends Omit<
  AdminSubscription,
  "planPriceLabel" | "intervalPrices" | "currentPeriodPayment" | "payments"
> {
  readonly planPriceLabel: string | null;
  readonly intervalPrices: readonly {
    value: AdminSubscription["intervalPrices"][number]["value"];
    label: string;
    price: string | null;
  }[];
  readonly currentPeriodPayment: PeriodPaymentView | null;
  readonly payments: readonly PeriodPaymentView[];
  readonly currentPeriodInvoiceAmount: number | null;
}

function isPlanId(value: string): value is MaintenancePlanId {
  return (MAINTENANCE_PLAN_IDS as readonly string[]).includes(value);
}

export function toSubscriptionView(
  sub: AdminSubscription,
  pricing: ResolvedPricing,
  showMoney: boolean,
): SubscriptionView {
  const plan = isPlanId(sub.planId) ? pricing.maintenance[sub.planId] : null;
  const periodAmount = currentPeriodInvoiceAmount(sub, plan);
  if (showMoney) return { ...sub, currentPeriodInvoiceAmount: periodAmount };
  return {
    ...sub,
    planPriceLabel: null,
    planPriceSuffix: "",
    invoiceAmount: null,
    quotedMonthlyPrice: null,
    intervalPrices: sub.intervalPrices.map((i) => ({ ...i, price: null })),
    currentPeriodPayment: sub.currentPeriodPayment && {
      ...sub.currentPeriodPayment,
      amount: null,
    },
    payments: sub.payments.map((p) => ({ ...p, amount: null })),
    currentPeriodInvoiceAmount: null,
  };
}
