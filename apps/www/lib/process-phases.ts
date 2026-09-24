import type { WeekRange } from "@repo/pricing-schema";

/**
 * The delivery process, once, for every surface that describes it: the
 * homepage process section, /process, /how-we-work and both HowTo schemas.
 *
 * There used to be two models - four phases on the homepage (up to 47 working
 * days) and five on /process (31 to 56) - and neither fit the delivery window
 * the price matrix publishes. Lengths are now a split of that window: the short
 * phases have their own bounds, and development takes what remains, so the
 * phases always add up to exactly what a price cell promises.
 */
export const PHASE_KEYS = [
  "discovery",
  "wireframe",
  "design",
  "development",
  "launch",
] as const;

export type PhaseKey = (typeof PHASE_KEYS)[number];

export interface PhaseLength {
  readonly key: PhaseKey;
  /** Working days at the smallest and largest scope. */
  readonly min: number;
  readonly max: number;
  /** A session is the discovery call; it occupies one working day. */
  readonly unit: "session" | "days";
}

const WORKING_DAYS_PER_WEEK = 5;

/** The phase that absorbs whatever the window leaves after the others. */
export const BUILD_PHASE: PhaseKey = "development";

const FIXED: readonly PhaseLength[] = [
  { key: "discovery", min: 1, max: 1, unit: "session" },
  { key: "wireframe", min: 2, max: 5, unit: "days" },
  { key: "design", min: 2, max: 7, unit: "days" },
  { key: "launch", min: 2, max: 5, unit: "days" },
];

/** Every phase with its length, for a delivery window in weeks. */
export function processPhases(window: WeekRange): readonly PhaseLength[] {
  const fixedMin = FIXED.reduce((sum, phase) => sum + phase.min, 0);
  const fixedMax = FIXED.reduce((sum, phase) => sum + phase.max, 0);
  // Clamped so a window narrowed in the admin app cannot produce a build
  // phase of zero days, or one whose longest case is shorter than its shortest.
  const buildMin = Math.max(1, window.min * WORKING_DAYS_PER_WEEK - fixedMin);
  const buildMax = Math.max(buildMin, window.max * WORKING_DAYS_PER_WEEK - fixedMax);

  return PHASE_KEYS.map(
    (key) =>
      FIXED.find((phase) => phase.key === key) ?? {
        key,
        min: buildMin,
        max: buildMax,
        unit: "days",
      },
  );
}

/** "01 - Discovery" → "Discovery"; surfaces draw the index themselves. */
export const phaseName = (title: string): string =>
  title.replace(/^[\d٠-٩]+\s*-\s*/, "");
