import type { BillingInterval } from "@repo/database";
import {
  formatMoney,
  maintenanceIntervalPrice,
  pricingCopy,
  type Locale,
  type MaintenanceInterval,
  type MaintenancePlan,
} from "@repo/pricing-schema";

/**
 * Prisma stores a subscription's interval in upper case; the pricing schema
 * keys its interval prices in lower case. One mapping, so no screen looks a
 * price up under the wrong key.
 *
 * Deliberately not `server-only`: the admin list and the client portal both
 * label the same subscription, and this is how they agree on the words.
 */
export const MAINTENANCE_INTERVAL: Readonly<Record<BillingInterval, MaintenanceInterval>> = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  ANNUAL: "annual",
};

/** Operator-facing names, in the order the create form offers them. */
export const BILLING_INTERVAL_LABEL: Readonly<Record<BillingInterval, string>> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual",
};

/**
 * The price a subscription bills at, as the plan shape `maintenanceIntervalPrice`
 * takes: a published plan's own price, else the subscription's quoted monthly
 * figure (`MaintenanceSubscription.quotedMonthlyPrice`), else nothing — the
 * custom-quote wording and a refused invoice. One rule for every plan, so a
 * quoted retainer's year is ten paid months exactly like a published one.
 */
export function billedPlanPrice(
  plan: Pick<MaintenancePlan, "price"> | null,
  quotedMonthlyPrice: number | null,
): Pick<MaintenancePlan, "price"> | null {
  if (plan?.price != null) return plan;
  if (quotedMonthlyPrice !== null) return { price: quotedMonthlyPrice };
  return plan;
}

export interface IntervalPriceLabel {
  /** "2,500 EGP", or the custom-quote wording when the plan publishes no price. */
  readonly price: string;
  /** "/ month", "/ year" — empty on a quote-only plan, which has no figure to suffix. */
  readonly suffix: string;
}

/**
 * What one invoice costs, as words. The amount comes from
 * `maintenanceIntervalPrice`, so an annual figure is never multiplied here and
 * a monthly override moves every interval's label with it.
 */
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
