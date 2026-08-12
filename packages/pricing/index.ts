export type ProjectType = "website" | "webapp" | "ecommerce" | "pwa";
export type Complexity = "basic" | "standard" | "premium";
export type Timeline = "urgent" | "standard" | "flexible";
export type BrandIdentity = "complete" | "partial" | "scratch";
export type ContentReadiness = "provide" | "need-help" | "unsure";

export interface EstimateResult {
  minWeeks: number;
  maxWeeks: number;
  minPrice: number;
  maxPrice: number;
}

export interface CalculateEstimateInput {
  projectType: ProjectType;
  complexity: Complexity;
  timeline: Timeline;
  brandIdentity?: BrandIdentity | null;
  contentReadiness?: ContentReadiness | null;
}

const ESTIMATE_ROUNDING = 5_000;

function roundEstimate(value: number): number {
  return Math.round(value / ESTIMATE_ROUNDING) * ESTIMATE_ROUNDING;
}

export const PRICING_TABLE: Record<ProjectType, Record<Complexity, [number, number]>> = {
  website: {
    basic: [35_000, 70_000],
    standard: [70_000, 140_000],
    premium: [140_000, 220_000],
  },
  webapp: {
    basic: [80_000, 150_000],
    standard: [150_000, 280_000],
    premium: [280_000, 450_000],
  },
  ecommerce: {
    basic: [55_000, 95_000],
    standard: [95_000, 180_000],
    premium: [180_000, 320_000],
  },
  pwa: {
    basic: [95_000, 175_000],
    standard: [175_000, 310_000],
    premium: [310_000, 495_000],
  },
};

export const TIMELINE_TABLE: Record<ProjectType, Record<Complexity, [number, number]>> = {
  website: {
    basic: [2, 4],
    standard: [4, 7],
    premium: [7, 11],
  },
  webapp: {
    basic: [5, 8],
    standard: [8, 14],
    premium: [14, 22],
  },
  ecommerce: {
    basic: [4, 6],
    standard: [6, 10],
    premium: [10, 16],
  },
  pwa: {
    basic: [6, 10],
    standard: [10, 16],
    premium: [16, 26],
  },
};

export const TIMELINE_MULTIPLIERS: Record<Timeline, number> = {
  urgent: 1.15,
  standard: 1,
  flexible: 0.95,
};

export const TIMELINE_WEEK_MULTIPLIERS: Record<Timeline, number> = {
  urgent: 0.85,
  standard: 1,
  flexible: 1.15,
};

// Brand readiness adds design/identity scope. "complete" is the neutral
// baseline; building from scratch grows both budget and timeline.
export const BRAND_MULTIPLIERS: Record<BrandIdentity, { price: number; weeks: number }> = {
  complete: { price: 1, weeks: 1 },
  partial: { price: 1.05, weeks: 1.05 },
  scratch: { price: 1.12, weeks: 1.15 },
};

// Content readiness adds strategy/copywriting scope. "provide" is neutral.
export const CONTENT_MULTIPLIERS: Record<ContentReadiness, { price: number; weeks: number }> = {
  provide: { price: 1, weeks: 1 },
  "need-help": { price: 1.08, weeks: 1.1 },
  unsure: { price: 1.04, weeks: 1.05 },
};

const NEUTRAL_FACTOR = { price: 1, weeks: 1 };

export function calculateEstimate(input: CalculateEstimateInput): EstimateResult {
  const { projectType, complexity, timeline, brandIdentity, contentReadiness } = input;

  const priceRange = PRICING_TABLE[projectType][complexity];
  const timelineRange = TIMELINE_TABLE[projectType][complexity];
  const multiplier = TIMELINE_MULTIPLIERS[timeline];
  const weekMultiplier = TIMELINE_WEEK_MULTIPLIERS[timeline];

  // Optional refiners: absent answers stay neutral so the estimate still
  // works with only the three core inputs (e.g. deep-link preselection).
  const brand = brandIdentity ? BRAND_MULTIPLIERS[brandIdentity] : NEUTRAL_FACTOR;
  const content = contentReadiness
    ? CONTENT_MULTIPLIERS[contentReadiness]
    : NEUTRAL_FACTOR;

  const priceFactor = multiplier * brand.price * content.price;
  const weekFactor = weekMultiplier * brand.weeks * content.weeks;

  return {
    minWeeks: Math.max(Math.round(timelineRange[0] * weekFactor), 1),
    maxWeeks: Math.max(Math.round(timelineRange[1] * weekFactor), 1),
    minPrice: roundEstimate(priceRange[0] * priceFactor),
    maxPrice: roundEstimate(priceRange[1] * priceFactor),
  };
}
