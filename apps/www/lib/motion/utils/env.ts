import { MOTION } from "../tokens";

interface MotionEnv {
  reduce: boolean;
  constrained: boolean;
  fine: boolean;
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

export function getConstrainedDevice(): boolean {
  if (constrainedCache === null) constrainedCache = detectConstrained();
  return constrainedCache;
}

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
