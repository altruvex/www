import type { Amount, Versioned } from "./types";

export const TIMELINE_IDS = ["urgent", "standard", "flexible"] as const;
export type TimelineId = (typeof TIMELINE_IDS)[number];

export const BRAND_IDENTITY_IDS = ["complete", "partial", "scratch"] as const;
export type BrandIdentityId = (typeof BRAND_IDENTITY_IDS)[number];

export const CONTENT_READINESS_IDS = [
  "provide",
  "need-help",
  "unsure",
] as const;
export type ContentReadinessId = (typeof CONTENT_READINESS_IDS)[number];

export interface Factor {
  readonly price: number;
  readonly weeks: number;
}

export const NEUTRAL_FACTOR: Factor = { price: 1, weeks: 1 };

export const TIMELINE_FACTORS: Readonly<Record<TimelineId, Factor>> = {
  urgent: { price: 1.15, weeks: 0.85 },
  standard: { price: 1, weeks: 1 },
  flexible: { price: 0.95, weeks: 1.15 },
};

export const BRAND_FACTORS: Readonly<Record<BrandIdentityId, Factor>> = {
  complete: { price: 1, weeks: 1 },
  partial: { price: 1.05, weeks: 1.05 },
  scratch: { price: 1.12, weeks: 1.15 },
};

export const CONTENT_FACTORS: Readonly<Record<ContentReadinessId, Factor>> = {
  provide: { price: 1, weeks: 1 },
  "need-help": { price: 1.08, weeks: 1.1 },
  unsure: { price: 1.04, weeks: 1.05 },
};

export const ESTIMATE_ROUNDING = 5_000;

export const FACTOR_GROUP_IDS = ["timeline", "brand", "content"] as const;
export type FactorGroupId = (typeof FACTOR_GROUP_IDS)[number];

export interface FactorGroup {
  readonly id: FactorGroupId;
  readonly optionIds: readonly string[];
  readonly factors: Readonly<Record<string, Factor>>;
}

export const FACTOR_GROUPS: Readonly<Record<FactorGroupId, FactorGroup>> = {
  timeline: {
    id: "timeline",
    optionIds: TIMELINE_IDS,
    factors: TIMELINE_FACTORS,
  },
  brand: {
    id: "brand",
    optionIds: BRAND_IDENTITY_IDS,
    factors: BRAND_FACTORS,
  },
  content: {
    id: "content",
    optionIds: CONTENT_READINESS_IDS,
    factors: CONTENT_FACTORS,
  },
};

export const PRICING_DRIVER_IDS = [
  "scope",
  "complexity",
  "content",
  "timeline",
  "integrations",
  "performance",
  "operation",
] as const;
export type PricingDriverId = (typeof PRICING_DRIVER_IDS)[number];

export type PricingDriverEffect = "moves" | "review" | "monthly";

export interface PricingDriver {
  readonly id: PricingDriverId;
  readonly effect: PricingDriverEffect;
  readonly factorGroups: readonly FactorGroupId[];
}

export const PRICING_DRIVERS: readonly PricingDriver[] = [
  { id: "scope", effect: "moves", factorGroups: [] },
  { id: "complexity", effect: "moves", factorGroups: [] },
  { id: "content", effect: "moves", factorGroups: ["content", "brand"] },
  { id: "timeline", effect: "moves", factorGroups: ["timeline"] },
  { id: "integrations", effect: "review", factorGroups: [] },
  { id: "performance", effect: "review", factorGroups: [] },
  { id: "operation", effect: "monthly", factorGroups: [] },
];

export interface CommercialTerms extends Versioned {
  readonly vatRate: number;
  readonly revisionHourlyRate: Amount;
  readonly revisionHourlyRateUsd: Amount;
  readonly includedRevisionRounds: number;
  readonly paymentSplit: readonly [number, number, number];
  readonly proposalValidityDays: number;
  readonly postLaunchWarrantyDays: number;
}

export const COMMERCIAL_TERMS: CommercialTerms = {
  vatRate: 0.14,
  revisionHourlyRate: 800,
  revisionHourlyRateUsd: 80,
  includedRevisionRounds: 3,
  paymentSplit: [50, 30, 20],
  proposalValidityDays: 30,
  postLaunchWarrantyDays: 30,
  version: 2,
  lastUpdated: "2026-09-06",
};

export interface ExchangeRate extends Versioned {
  readonly egpPerUsd: number;
  readonly reviewedOn: `${number}-${number}-${number}`;
  readonly nextReviewDue: `${number}-${number}-${number}`;
}

export const USD_EXCHANGE_RATE: ExchangeRate = {
  egpPerUsd: 50,
  reviewedOn: "2026-09-06",
  nextReviewDue: "2026-12-06",
  version: 2,
  lastUpdated: "2026-09-06",
};

export const LEAD_SCORE_THRESHOLDS = {
  large: 150_000,
  medium: 60_000,
} as const;
