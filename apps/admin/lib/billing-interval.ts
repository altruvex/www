import type { BillingInterval } from "@repo/database";
import {
  formatMoney,
  maintenanceIntervalPrice,
  pricingCopy,
  type Locale,
  type MaintenanceInterval,
  type MaintenancePlan,
} from "@repo/pricing-schema";

export const MAINTENANCE_INTERVAL: Readonly<Record<BillingInterval, MaintenanceInterval>> = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  ANNUAL: "annual",
};

export const BILLING_INTERVAL_LABEL: Readonly<Record<BillingInterval, string>> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual",
};

export function billedPlanPrice(
  plan: Pick<MaintenancePlan, "price"> | null,
  quotedMonthlyPrice: number | null,
): Pick<MaintenancePlan, "price"> | null {
  if (plan?.price != null) return plan;
  if (quotedMonthlyPrice !== null) return { price: quotedMonthlyPrice };
  return plan;
}

export interface IntervalPriceLabel {
  readonly price: string;
  readonly suffix: string;
}

export function intervalPriceLabel(
  plan: Pick<MaintenancePlan, "price"> | null,
  interval: BillingInterval,
  locale: Locale = "en",
): IntervalPriceLabel {
  const tpl = pricingCopy(locale).maintenanceTemplates;
  const key = MAINTENANCE_INTERVAL[interval];
  const price = plan === null ? null : maintenanceIntervalPrice(plan, key);
  return price === null
    ? { price: tpl.customPrice, suffix: "" }
    : { price: formatMoney(price, locale), suffix: tpl.perInterval[key] };
}
