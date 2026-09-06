import type { ComplexityId, ServiceId } from "./ids";
import type { PriceRange, Versioned, WeekRange } from "./types";

/**
 * Core productized services and their price/timeline matrices.
 *
 * These matrices are the root authority for every project number Altruvex
 * publishes or quotes. `/pricing`, `/transparency`, the estimate PDF, and the
 * proposal generator all resolve to a cell here — none of them holds a figure
 * of its own.
 *
 * Values are ported verbatim from the previous `@repo/pricing` PRICING_TABLE
 * and TIMELINE_TABLE. That is deliberate: proposals already in flight were
 * priced off these exact cells, and this pass moves the numbers without
 * changing them.
 */
export interface Service extends Versioned {
  readonly id: ServiceId;
  /** EGP range per complexity band. */
  readonly price: Readonly<Record<ComplexityId, PriceRange>>;
  /** Delivery window in weeks per complexity band. */
  readonly weeks: Readonly<Record<ComplexityId, WeekRange>>;
}

const r = (min: number, max: number): PriceRange => ({ min, max });
const w = (min: number, max: number): WeekRange => ({ min, max });

export const SERVICES: Readonly<Record<ServiceId, Service>> = {
  website: {
    id: "website",
    version: 2,
    lastUpdated: "2026-09-06",
    price: {
      basic: r(35_000, 70_000),
      standard: r(70_000, 140_000),
      premium: r(140_000, 220_000),
    },
    weeks: { basic: w(2, 4), standard: w(4, 7), premium: w(7, 11) },
  },
  webapp: {
    id: "webapp",
    version: 2,
    lastUpdated: "2026-09-06",
    price: {
      basic: r(80_000, 150_000),
      standard: r(150_000, 280_000),
      premium: r(280_000, 450_000),
    },
    weeks: { basic: w(5, 8), standard: w(8, 14), premium: w(14, 22) },
  },
  ecommerce: {
    id: "ecommerce",
    version: 2,
    lastUpdated: "2026-09-06",
    price: {
      basic: r(55_000, 95_000),
      standard: r(95_000, 180_000),
      premium: r(180_000, 320_000),
    },
    weeks: { basic: w(4, 6), standard: w(6, 10), premium: w(10, 16) },
  },
  pwa: {
    id: "pwa",
    version: 2,
    lastUpdated: "2026-09-06",
    price: {
      basic: r(95_000, 175_000),
      standard: r(175_000, 310_000),
      premium: r(310_000, 495_000),
    },
    weeks: { basic: w(6, 10), standard: w(10, 16), premium: w(16, 26) },
  },
};

export function getService(id: ServiceId): Service {
  return SERVICES[id];
}

/** The lowest published figure across the whole matrix — the engagement floor. */
export function minimumEngagement(): number {
  return Math.min(
    ...Object.values(SERVICES).map((service) => service.price.basic.min),
  );
}
