"use client";

import { getConstrainedDevice } from "../config";

export interface MotionEnv {
  reduce: boolean;
  constrained: boolean;
  fine: boolean;
}

const matches = (q: string): boolean =>
  typeof window !== "undefined" && window.matchMedia(q).matches;

export function readMotionEnv(): MotionEnv {
  return {
    reduce: matches("(prefers-reduced-motion: reduce)"),
    constrained: getConstrainedDevice(),
    fine: matches("(hover: hover) and (pointer: fine)"),
  };
}

export const REDUCED_FADE = {
  duration: 0.18,
  ease: "power1.out",
} as const;
