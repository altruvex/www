import type { Addon } from "./addons";
import {
  CONSULTING_PACKAGES,
  consultingCreditAmount,
  type ConsultingPackage,
} from "./consulting";
import {
  COMPLEXITY_IDS,
  SERVICE_IDS,
  type AddonId,
  type ComplexityId,
  type ServiceId,
} from "./ids";
import {
  BRAND_FACTORS,
  BRAND_IDENTITY_IDS,
  COMMERCIAL_TERMS,
  CONTENT_FACTORS,
  CONTENT_READINESS_IDS,
  ESTIMATE_ROUNDING,
  NEUTRAL_FACTOR,
  TIMELINE_FACTORS,
  TIMELINE_IDS,
  USD_EXCHANGE_RATE,
  type BrandIdentityId,
  type ContentReadinessId,
  type TimelineId,
} from "./modifiers";
import { DEFAULT_PRICING, type ResolvedPricing } from "./overrides";
import { MAX_DELIVERY_WEEKS, type Amount, type Currency } from "./types";

export interface EstimateInput {
  readonly serviceId: ServiceId;
  readonly complexityId: ComplexityId;
  readonly timeline: TimelineId;
  readonly brandIdentity?: BrandIdentityId | null;
  readonly contentReadiness?: ContentReadinessId | null;
}

/**
 * An estimate input with any answer still open. Every open answer is read as
 * "any of its options", which is how the estimator shows a real range before
 * the questionnaire is complete.
 */
export interface EstimatePartialInput {
  readonly serviceId?: ServiceId | null;
  readonly complexityId?: ComplexityId | null;
  readonly timeline?: TimelineId | null;
  readonly brandIdentity?: BrandIdentityId | null;
  readonly contentReadiness?: ContentReadinessId | null;
}

export interface EstimateResult {
  readonly minWeeks: number;
  readonly maxWeeks: number;
  readonly minPrice: number;
  readonly maxPrice: number;
}

/**
 * The one worked example the pricing pages walk a buyer through: a website of
 * standard complexity, partial brand, content help, standard timeline. The ids
 * live here so the copy that narrates it never types a figure — every number
 * in the walkthrough is computed from these five answers.
 */
export const WORKED_EXAMPLE_INPUT: EstimateInput = {
  serviceId: "website",
  complexityId: "standard",
  timeline: "standard",
  brandIdentity: "partial",
  contentReadiness: "need-help",
};

/**
 * The engagement floor: the lowest published cell in whichever pricing set the
 * caller supplied. `/pricing` prints it as "From …" and the estimate engine
 * refuses to quote under it, so both must read the same resolved set.
 */
export function minimumEngagementFrom(pricing: ResolvedPricing): number {
  return Math.min(
    ...Object.values(pricing.services).map((s) => s.price.basic.min),
  );
}

function roundEstimate(value: number): number {
  return Math.round(value / ESTIMATE_ROUNDING) * ESTIMATE_ROUNDING;
}

/** At least one week, never more than the published delivery ceiling. */
function clampWeeks(value: number): number {
  return Math.min(Math.max(Math.round(value), 1), MAX_DELIVERY_WEEKS);
}

/**
 * The estimate engine.
 *
 * Brand and content stay neutral until answered, which is what lets the
 * estimator show a real range from the first two answers instead of withholding
 * the number until the questionnaire is complete.
 *
 * Two published promises are enforced here rather than trusted to the matrix,
 * because the modifiers compound and a future edit to any one cell could break
 * either without the cell looking wrong on its own:
 *
 *   - The estimate never falls below `minimumEngagementFrom(pricing)`. `/pricing`
 *     prints that figure as the floor, and a `flexible` timeline discount used
 *     to be able to round the estimator under it — the floor and the estimator
 *     disagreeing is exactly the contradiction this package exists to prevent.
 *   - The estimate never exceeds `MAX_DELIVERY_WEEKS`. Compounding the timeline,
 *     brand and content week factors reaches 1.45x, so the ceiling is applied
 *     after they are, not before.
 *
 * `pricing` defaults to the shipped figures. A surface that can reach the admin
 * overrides passes the resolved set, so the estimator quotes the same numbers
 * `/pricing` publishes after an edit — never the defaults it shipped with.
 */
export function calculateEstimate(
  input: EstimateInput,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): EstimateResult {
  const service = pricing.services[input.serviceId];
  const priceRange = service.price[input.complexityId];
  const weekRange = service.weeks[input.complexityId];

  const timeline = TIMELINE_FACTORS[input.timeline];
  const brand = input.brandIdentity
    ? BRAND_FACTORS[input.brandIdentity]
    : NEUTRAL_FACTOR;
  const content = input.contentReadiness
    ? CONTENT_FACTORS[input.contentReadiness]
    : NEUTRAL_FACTOR;

  const priceFactor = timeline.price * brand.price * content.price;
  const weekFactor = timeline.weeks * brand.weeks * content.weeks;

  const floor = minimumEngagementFrom(pricing);

  return {
    minWeeks: clampWeeks(weekRange.min * weekFactor),
    maxWeeks: clampWeeks(weekRange.max * weekFactor),
    minPrice: Math.max(roundEstimate(priceRange.min * priceFactor), floor),
    maxPrice: Math.max(roundEstimate(priceRange.max * priceFactor), floor),
  };
}

/**
 * The widest range still possible given the answers so far.
 *
 * Every unanswered question is expanded to all of its options and the
 * envelope of every resulting estimate is returned: the estimator opens at the
 * widest span this package publishes and narrows with each answer. With no
 * answers at all this is the whole matrix under every condition.
 */
export function estimateSpan(
  partial: EstimatePartialInput = {},
  pricing: ResolvedPricing = DEFAULT_PRICING,
): EstimateResult {
  const services = partial.serviceId ? [partial.serviceId] : SERVICE_IDS;
  const complexities = partial.complexityId
    ? [partial.complexityId]
    : COMPLEXITY_IDS;
  const timelines = partial.timeline ? [partial.timeline] : TIMELINE_IDS;
  const brands = partial.brandIdentity
    ? [partial.brandIdentity]
    : BRAND_IDENTITY_IDS;
  const contents = partial.contentReadiness
    ? [partial.contentReadiness]
    : CONTENT_READINESS_IDS;

  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = 0;
  let minWeeks = Number.POSITIVE_INFINITY;
  let maxWeeks = 0;

  for (const serviceId of services)
    for (const complexityId of complexities)
      for (const timeline of timelines)
        for (const brandIdentity of brands)
          for (const contentReadiness of contents) {
            const cell = calculateEstimate(
              {
                serviceId,
                complexityId,
                timeline,
                brandIdentity,
                contentReadiness,
              },
              pricing,
            );
            minPrice = Math.min(minPrice, cell.minPrice);
            maxPrice = Math.max(maxPrice, cell.maxPrice);
            minWeeks = Math.min(minWeeks, cell.minWeeks);
            maxWeeks = Math.max(maxWeeks, cell.maxWeeks);
          }

  return { minPrice, maxPrice, minWeeks, maxWeeks };
}

export interface AddonPrice {
  readonly addonId: AddonId;
  readonly costBasis: Amount;
  readonly markup: Amount;
  readonly total: Amount;
}

/**
 * `costBasis + markup`, always as two visible halves.
 *
 * Returns null when the supplier cost is not on file. Callers must render
 * "pending" rather than a number — quoting an add-on at zero because its cost
 * was unknown is the one failure mode worth being noisy about.
 */
export function computeAddonPrice(addon: Addon): AddonPrice | null {
  if (addon.costBasis === null) return null;

  const markup =
    addon.markupType === "percent"
      ? Math.round((addon.costBasis * addon.markupValue) / 100)
      : addon.markupValue;

  return {
    addonId: addon.id,
    costBasis: addon.costBasis,
    markup,
    total: addon.costBasis + markup,
  };
}

export interface VatBreakdown {
  readonly net: Amount;
  readonly vat: Amount;
  readonly gross: Amount;
  readonly rate: number;
}

export function applyVat(net: Amount): VatBreakdown {
  const vat = Math.round(net * COMMERCIAL_TERMS.vatRate);
  return { net, vat, gross: net + vat, rate: COMMERCIAL_TERMS.vatRate };
}

/** EGP → USD at the fixed, quarterly-reviewed rate. Rounded to the nearest 10. */
export function egpToUsd(egp: Amount): Amount {
  return Math.round(egp / USD_EXCHANGE_RATE.egpPerUsd / 10) * 10;
}

/**
 * A consulting package's build credit, in the currency the engagement is
 * priced in.
 *
 * The audit's fee is published in EGP only, so a USD engagement credits the
 * same money through `egpToUsd` — the one published conversion — rather than
 * a second audit price nobody maintains. Returns null for a currency this
 * package cannot be credited in, which is the signal to refuse the credit
 * with a reason instead of applying a figure in the wrong money.
 */
export function consultingCreditIn(
  currency: Currency,
  pkg: ConsultingPackage = CONSULTING_PACKAGES["technical-audit"],
): Amount | null {
  const egp = consultingCreditAmount(pkg);
  if (egp <= 0) return null;
  if (currency === "EGP") return egp;
  if (currency === "USD") return egpToUsd(egp);
  return null;
}
