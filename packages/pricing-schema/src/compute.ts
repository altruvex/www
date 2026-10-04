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

export const WORKED_EXAMPLE_INPUT: EstimateInput = {
  serviceId: "website",
  complexityId: "standard",
  timeline: "standard",
  brandIdentity: "partial",
  contentReadiness: "need-help",
};

export function minimumEngagementFrom(pricing: ResolvedPricing): number {
  return Math.min(
    ...Object.values(pricing.services).map((s) => s.price.basic.min),
  );
}

function roundEstimate(value: number): number {
  return Math.round(value / ESTIMATE_ROUNDING) * ESTIMATE_ROUNDING;
}

function clampWeeks(value: number): number {
  return Math.min(Math.max(Math.round(value), 1), MAX_DELIVERY_WEEKS);
}

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

export function egpToUsd(egp: Amount): Amount {
  return Math.round(egp / USD_EXCHANGE_RATE.egpPerUsd / 10) * 10;
}

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
