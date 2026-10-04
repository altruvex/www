import type { ComplexityId, ServiceId } from "./ids";
import type { PriceRange, Versioned, WeekRange } from "./types";

export interface Service extends Versioned {
  readonly id: ServiceId;
  readonly price: Readonly<Record<ComplexityId, PriceRange>>;
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

export function minimumEngagement(): number {
  return Math.min(
    ...Object.values(SERVICES).map((service) => service.price.basic.min),
  );
}
