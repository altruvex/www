/** Shared primitives. Every priced entity in this package is built from these. */

/**
 * Prices are authored in EGP only. USD is a presentation of the EGP figure at
 * a fixed, quarterly-reviewed rate (see `modifiers.ts`) — it is never a second
 * price list, because two hand-maintained lists is the failure this package
 * exists to remove.
 */
export const CURRENCIES = ["EGP", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Minor units are not used: Altruvex does not quote piastres. */
export type Amount = number;

export const BILLING_CYCLES = ["monthly", "annual", "one_time"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

/**
 * `planned` entities exist in the schema and in admin, and are filtered out of
 * every client-facing surface. This is what lets a roadmap item be modelled
 * now without leaking to a client before it is real.
 */
export const ENTITY_STATUSES = ["active", "planned", "retired"] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

/** An inclusive money range, in EGP. */
export interface PriceRange {
  readonly min: Amount;
  readonly max: Amount;
}

/** An inclusive duration range, in whole weeks. */
export interface WeekRange {
  readonly min: number;
  readonly max: number;
}

/**
 * Staleness metadata carried by every entity.
 *
 * `lastUpdated` is the date the *commercial* figure changed, not the date the
 * file was touched — a formatting edit must not make a stale price look fresh.
 * Consumers that cache (admin os, www ISR) compare against `PRICING_VERSION`.
 */
export interface Versioned {
  readonly version: number;
  readonly lastUpdated: `${number}-${number}-${number}`;
}

/**
 * Bumped whenever any priced figure in this package changes. A cached surface
 * holding a different value knows its copy is stale without diffing entities.
 */
export const PRICING_VERSION = 3;
export const PRICING_LAST_UPDATED = "2026-09-06" as const;

export type Locale = "en" | "ar";

/** Copy is authored per locale next to the number it describes. */
export type Localized<T> = Readonly<Record<Locale, T>>;

/**
 * The published delivery ceiling, in weeks from kick-off.
 *
 * A hard limit, not a typical case: no cell in the service matrix reaches it,
 * the estimator clamps to it after the timeline/brand/content factors are
 * applied, the admin pricing screen cannot set a cell past it, and a proposal
 * whose phases sum past it is refused. Anything bigger is sold as phases.
 *
 * It lives here, beside `PRICE_BOUNDS`, because it is a bound on admin-entered
 * data as much as a published promise — and because `types.ts` imports nothing,
 * so every module can read it without a cycle.
 */
export const MAX_DELIVERY_WEEKS = 12;

/**
 * Validation bounds for admin-entered pricing.
 *
 * The plausible range of a price is pricing-domain knowledge, so it lives here
 * rather than as loose literals in a request validator — which also keeps the
 * CI literal guard honest instead of inviting someone to un-group a number to
 * slip past it.
 */
export const PRICE_BOUNDS = {
  /** Any single money field, in EGP. */
  moneyMin: 0,
  moneyMax: 100_000_000,
  /** Percent or flat markup on a pass-through add-on. */
  markupMax: 10_000,
  /** EGP per USD. */
  exchangeRateMin: 1,
  exchangeRateMax: 10_000,
  weeksMin: 1,
  /** No cell may promise past the published ceiling. */
  weeksMax: MAX_DELIVERY_WEEKS,
  requestsPerCycleMax: 1000,
  revisionRoundsMax: 50,
  durationDaysMax: 365,
} as const;
