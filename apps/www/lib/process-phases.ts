import type { WeekRange } from "@repo/pricing-schema";

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
  readonly min: number;
  readonly max: number;
  readonly unit: "session" | "days";
}

const WORKING_DAYS_PER_WEEK = 5;

export const BUILD_PHASE: PhaseKey = "development";

const FIXED: readonly PhaseLength[] = [
  { key: "discovery", min: 1, max: 1, unit: "session" },
  { key: "wireframe", min: 2, max: 5, unit: "days" },
  { key: "design", min: 2, max: 7, unit: "days" },
  { key: "launch", min: 2, max: 5, unit: "days" },
];

export function processPhases(window: WeekRange): readonly PhaseLength[] {
  const fixedMin = FIXED.reduce((sum, phase) => sum + phase.min, 0);
  const fixedMax = FIXED.reduce((sum, phase) => sum + phase.max, 0);
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

export const phaseName = (title: string): string =>
  title.replace(/^[\d٠-٩]+\s*-\s*/, "");
