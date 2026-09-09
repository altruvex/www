import type { Amount, Versioned } from "./types";

/** Estimator refiners. Ported verbatim from `@repo/pricing`. */

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

/** Brand readiness adds design scope. `complete` is the neutral baseline. */
export const BRAND_FACTORS: Readonly<Record<BrandIdentityId, Factor>> = {
  complete: { price: 1, weeks: 1 },
  partial: { price: 1.05, weeks: 1.05 },
  scratch: { price: 1.12, weeks: 1.15 },
};

/** Content readiness adds strategy/copy scope. `provide` is neutral. */
export const CONTENT_FACTORS: Readonly<Record<ContentReadinessId, Factor>> = {
  provide: { price: 1, weeks: 1 },
  "need-help": { price: 1.08, weeks: 1.1 },
  unsure: { price: 1.04, weeks: 1.05 },
};

/** Published estimates round to this grid so a quote never looks spuriously exact. */
export const ESTIMATE_ROUNDING = 5_000;

/**
 * Commercial terms that used to appear for the first time in the contract.
 *
 * VAT and the revision rate were both hardcoded inside `contract-builder.ts`
 * and disclosed nowhere else, so a client who budgeted from `/transparency`
 * was short 14% at signing. They are published terms now, and `/transparency`
 * renders them from here.
 */
export interface CommercialTerms extends Versioned {
  readonly vatRate: number;
  /** EGP per hour for revisions beyond the included rounds. */
  readonly revisionHourlyRate: Amount;
  /**
   * USD-native revision rate. Intentionally NOT the EGP figure converted.
   *
   * At the fixed 50 EGP/USD rate 800 EGP is ~16 USD, so this is a separate USD
   * price list at roughly 5x the EGP rate, not a conversion. Confirmed
   * deliberate — do not "fix" it by deriving it from `revisionHourlyRate` or
   * `egpToUsd`, and do not let the two drift into each other: they are two
   * prices, and each moves on its own.
   */
  readonly revisionHourlyRateUsd: Amount;
  readonly includedRevisionRounds: number;
  /** Milestone split, as percentages summing to 100. */
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

/**
 * Fixed USD rate, reviewed quarterly.
 *
 * Deliberately not a live rate: a floating figure would make two proposals
 * generated a day apart disagree, and the published date is what lets a client
 * see exactly which rate their quote used. `reviewedOn` is surfaced on
 * `/transparency` next to any USD figure.
 */
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

/**
 * Internal lead-scoring bands, in EGP.
 *
 * Not client-facing, but derived from the same table: these thresholds only
 * mean anything relative to what the estimator quotes, so they belong beside
 * it rather than in a scoring file that nobody re-reads when a tier moves.
 */
export const LEAD_SCORE_THRESHOLDS = {
  large: 150_000,
  medium: 60_000,
} as const;
