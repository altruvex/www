import type { ComplexityId, ServiceId, TierId } from "./ids";
import { SERVICES } from "./services";
import type { PriceRange, Versioned, WeekRange } from "./types";

/**
 * The four marketed packages on `/pricing`.
 *
 * A tier owns no price. It names a cell of the service matrix and decides how
 * that cell is presented — as a range, or as a "from" floor for the tier where
 * the conversation starts with a call. This is the structural fix for the
 * audit's headline defect: `/pricing` published ranges that were maintained by
 * hand and had drifted from what the estimator quoted one click later. A card
 * and its own CTA now cannot disagree, because both resolve the same cell.
 */
export interface Tier extends Versioned {
  readonly id: TierId;
  readonly serviceId: ServiceId;
  readonly complexityId: ComplexityId;
  /** `range` prints min–max; `from` prints the floor only. */
  readonly display: "range" | "from";
  /** Card order on /pricing, ascending. */
  readonly order: number;
  readonly highlight: boolean;
}

export const TIERS: Readonly<Record<TierId, Tier>> = {
  essential: {
    id: "essential",
    serviceId: "website",
    complexityId: "basic",
    display: "range",
    order: 1,
    highlight: false,
    version: 2,
    lastUpdated: "2026-09-06",
  },
  professional: {
    id: "professional",
    serviceId: "website",
    complexityId: "standard",
    display: "range",
    order: 2,
    highlight: true,
    version: 2,
    lastUpdated: "2026-09-06",
  },
  ecommerce: {
    id: "ecommerce",
    serviceId: "ecommerce",
    complexityId: "standard",
    display: "range",
    order: 3,
    highlight: false,
    version: 2,
    lastUpdated: "2026-09-06",
  },
  flagship: {
    id: "flagship",
    serviceId: "webapp",
    complexityId: "premium",
    display: "from",
    order: 4,
    highlight: false,
    version: 3,
    lastUpdated: "2026-09-06",
  },
};

export const ORDERED_TIERS: readonly Tier[] = Object.values(TIERS).sort(
  (a, b) => a.order - b.order,
);

export function tierPriceRange(id: TierId): PriceRange {
  const tier = TIERS[id];
  return SERVICES[tier.serviceId].price[tier.complexityId];
}

export function tierWeekRange(id: TierId): WeekRange {
  const tier = TIERS[id];
  return SERVICES[tier.serviceId].weeks[tier.complexityId];
}

/**
 * The estimator query a tier's CTA must carry.
 *
 * Built from the tier's own cell rather than hand-written per card, so a card
 * can never link to a band other than the one it advertises.
 */
export function tierEstimatorQuery(id: TierId): string {
  const tier = TIERS[id];
  return `tier=${tier.id}&projectType=${tier.serviceId}`;
}
