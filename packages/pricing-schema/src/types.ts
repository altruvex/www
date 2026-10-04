export const CURRENCIES = ["EGP", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type Amount = number;

export const BILLING_CYCLES = ["monthly", "annual", "one_time"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const ENTITY_STATUSES = ["active", "planned", "retired"] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

export interface PriceRange {
  readonly min: Amount;
  readonly max: Amount;
}

export interface WeekRange {
  readonly min: number;
  readonly max: number;
}

export interface Versioned {
  readonly version: number;
  readonly lastUpdated: `${number}-${number}-${number}`;
}

export const PRICING_VERSION = 3;

export type Locale = "en" | "ar";

export type Localized<T> = Readonly<Record<Locale, T>>;

export const MAX_DELIVERY_WEEKS = 12;

export const PRICE_BOUNDS = {
  moneyMin: 0,
  moneyMax: 100_000_000,
  markupMax: 10_000,
  exchangeRateMin: 1,
  exchangeRateMax: 10_000,
  weeksMin: 1,
  weeksMax: MAX_DELIVERY_WEEKS,
  requestsPerCycleMax: 1000,
  revisionRoundsMax: 50,
  durationDaysMax: 365,
} as const;
