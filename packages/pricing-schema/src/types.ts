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
export const PRICING_VERSION = 2;
export const PRICING_LAST_UPDATED = "2026-09-06" as const;

export type Locale = "en" | "ar";

/** Copy is authored per locale next to the number it describes. */
export type Localized<T> = Readonly<Record<Locale, T>>;
