import { MOTION } from "../tokens";

export interface MotionEnv {
  /** prefers-reduced-motion: reduce */
  reduce: boolean;
  /** Low CPU / RAM / save-data. NOT "is touch" — modern phones are fast. */
  constrained: boolean;
  /** hover: hover + pointer: fine — hover-driven flourishes only make sense here. */
  fine: boolean;
  /** hover: none + pointer: coarse */
  touch: boolean;
}

const matches = (q: string): boolean =>
  typeof window !== "undefined" && window.matchMedia(q).matches;

function detectConstrained(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const lowCPU = (nav.hardwareConcurrency ?? 8) <= 4;
  const lowRAM = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  const saveData = nav.connection?.saveData === true;
  return lowCPU || lowRAM || saveData;
}

let constrainedCache: boolean | null = null;

/** Cached: hardware facts don't change during a session. */
export function getConstrainedDevice(): boolean {
  if (constrainedCache === null) constrainedCache = detectConstrained();
  return constrainedCache;
}

/**
 * Read at hook setup. Media queries are cheap; not cached because the user
 * can flip reduced-motion mid-session (scroll hooks re-run via gsap.matchMedia,
 * interaction hooks read on next mount).
 */
export function readMotionEnv(): MotionEnv {
  return {
    reduce: matches("(prefers-reduced-motion: reduce)"),
    constrained: getConstrainedDevice(),
    fine: matches("(hover: hover) and (pointer: fine)"),
    touch: matches("(hover: none) and (pointer: coarse)"),
  };
}

export const REDUCED_FADE = {
  duration: MOTION.reduced.duration,
  ease: MOTION.reduced.ease,
} as const;
