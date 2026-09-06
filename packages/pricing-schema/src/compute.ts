import { ADDONS, type Addon } from "./addons.js";
import type { AddonId, ComplexityId, ServiceId } from "./ids.js";
import {
  BRAND_FACTORS,
  COMMERCIAL_TERMS,
  CONTENT_FACTORS,
  ESTIMATE_ROUNDING,
  NEUTRAL_FACTOR,
  TIMELINE_FACTORS,
  USD_EXCHANGE_RATE,
  type BrandIdentityId,
  type ContentReadinessId,
  type TimelineId,
} from "./modifiers.js";
import { SERVICES } from "./services.js";
import type { Amount } from "./types.js";

export interface EstimateInput {
  readonly serviceId: ServiceId;
  readonly complexityId: ComplexityId;
  readonly timeline: TimelineId;
  readonly brandIdentity?: BrandIdentityId | null;
  readonly contentReadiness?: ContentReadinessId | null;
}

export interface EstimateResult {
  readonly minWeeks: number;
  readonly maxWeeks: number;
  readonly minPrice: number;
  readonly maxPrice: number;
}

function roundEstimate(value: number): number {
  return Math.round(value / ESTIMATE_ROUNDING) * ESTIMATE_ROUNDING;
}

/**
 * The estimate engine.
 *
 * Behaviour is identical to the previous `@repo/pricing.calculateEstimate` —
 * same cells, same factors, same rounding — because proposals already sent were
 * priced with it. Only the source of the matrices moved.
 *
 * Brand and content stay neutral until answered, which is what lets the
 * estimator show a real range from the first two answers instead of withholding
 * the number until the questionnaire is complete.
 */
export function calculateEstimate(input: EstimateInput): EstimateResult {
  const service = SERVICES[input.serviceId];
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

  return {
    minWeeks: Math.max(Math.round(weekRange.min * weekFactor), 1),
    maxWeeks: Math.max(Math.round(weekRange.max * weekFactor), 1),
    minPrice: roundEstimate(priceRange.min * priceFactor),
    maxPrice: roundEstimate(priceRange.max * priceFactor),
  };
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

/**
 * A bundle's line items — never a single opaque total.
 *
 * Returns each member priced individually. A bundle that cannot price every
 * member returns the members it could price plus the ids it could not, so the
 * caller shows a partial breakdown rather than a wrong sum.
 */
export function computeBundleLineItems(addon: Addon): {
  readonly items: readonly AddonPrice[];
  readonly unpriced: readonly AddonId[];
} {
  const items: AddonPrice[] = [];
  const unpriced: AddonId[] = [];

  for (const memberId of addon.bundles) {
    const priced = computeAddonPrice(ADDONS[memberId]);
    if (priced) items.push(priced);
    else unpriced.push(memberId);
  }

  return { items, unpriced };
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
