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
 * v3 (2026-09-09) recalibrates the whole matrix to the Egyptian market and
 * caps delivery. Two problems were being published at once:
 *
 *   1. The top of the matrix (a 495,000 EGP PWA) priced against a market that
 *      does not exist here. It also made `/pricing` and `/transparency` read as
 *      two different companies: the flagship card said "from 280,000" while the
 *      estimator one click later could reach 570,000 on the same answers.
 *   2. The week table ran to 26 weeks before modifiers, which the timeline
 *      factors could stretch past 37. Nothing this studio sells takes nine
 *      months, and saying so on a transparency page was the worst possible
 *      place to overstate.
 *
 * The ladder now moves in one direction with no overlap between bands, and the
 * whole matrix fits under `MAX_DELIVERY_WEEKS`. Scope that genuinely cannot
 * land inside that window is sold as phases, each of which is its own cell —
 * not as one engagement with a longer promise.
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
    version: 3,
    lastUpdated: "2026-09-09",
    price: {
      basic: r(22_000, 40_000),
      standard: r(40_000, 75_000),
      premium: r(75_000, 120_000),
    },
    weeks: { basic: w(2, 3), standard: w(3, 5), premium: w(5, 7) },
  },
  webapp: {
    id: "webapp",
    version: 3,
    lastUpdated: "2026-09-09",
    price: {
      basic: r(45_000, 80_000),
      standard: r(80_000, 150_000),
      premium: r(150_000, 250_000),
    },
    weeks: { basic: w(3, 5), standard: w(5, 7), premium: w(7, 8) },
  },
  ecommerce: {
    id: "ecommerce",
    version: 3,
    lastUpdated: "2026-09-09",
    price: {
      basic: r(35_000, 60_000),
      standard: r(60_000, 105_000),
      premium: r(105_000, 175_000),
    },
    weeks: { basic: w(3, 4), standard: w(4, 6), premium: w(6, 8) },
  },
  pwa: {
    id: "pwa",
    version: 3,
    lastUpdated: "2026-09-09",
    price: {
      basic: r(55_000, 95_000),
      standard: r(95_000, 165_000),
      premium: r(165_000, 275_000),
    },
    weeks: { basic: w(4, 6), standard: w(6, 7), premium: w(7, 8) },
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
