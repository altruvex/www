export const DEFAULTS = {
  heading: {
    byWord: true,
    blur: true,
    duration: 1.1,
    stagger: 0.05,
    distance: 40,
  },

  subheading: {
    byLine: true,
    blur: false,
    duration: 0.9,
    stagger: 0.04,
    distance: 24,
  },

  body: {
    duration: 0.8,
    distance: 20,
  },

  element: {
    direction: "up" as const,
    duration: 0.7,
    distance: 16,
  },

  card: {
    duration: 0.7,
    stagger: 0.08,
    distance: 24,
  },
} as const;

export const MOTION = {
  ease: {
    text: "cubic-bezier(0.2, 0, 0, 1)",
    smooth: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    gentle: "cubic-bezier(0.65, 0, 0.35, 1)",
    ui: "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "elastic.out(1, 0.75)",
  },

  duration: {
    micro: 0.15,
    instant: 0.2,
    drawer: 0.3,
    fast: 0.4,
    magnetic: 0.6,
    base: 0.7,
    slow: 1.0,
    text: 0.9,
  },

  loader: {
    shaderReveal: 2.2,
    textReveal: 1.8,
    charReveal: 1.4,
    label: 1.2,
    holdScale: 1.6,
    shaderExit: 1.4,
    textExit: 1.1,
    containerFade: 0.8,
    charStaggerEach: 0.08,
    charExitStaggerEach: 0.04,
    orbMin: 4,
    orbMax: 6,
    orbStaggerEach: 0.5,
  },

  distance: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 40,
    xl: 64,
  },

  stagger: {
    tight: 0.04,
    base: 0.06,
    loose: 0.1,
  },

  trigger: {
    default: "top bottom",
    late: "top 85%",
    latest: "top 75%",
  },

  lenis: {
    duration: 0.9,
    smoothWheel: true,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  },
} as const;

export function isConstrainedDevice(): boolean {
  if (typeof window === "undefined") return false;

  const touch = window.matchMedia(
    "(hover: none) and (pointer: coarse)",
  ).matches;
  const lowCPU = (navigator.hardwareConcurrency ?? 8) <= 4;

  const lowRAM =
    "deviceMemory" in navigator
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory! <= 4
      : false;
  const saveData =
    "connection" in navigator
      ? (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection?.saveData === true
      : false;

  return touch || lowCPU || lowRAM || saveData;
}

let _constrainedCache: boolean | null = null;
export function getConstrainedDevice(): boolean {
  if (_constrainedCache === null) _constrainedCache = isConstrainedDevice();
  return _constrainedCache;
}

export type MotionEase = keyof typeof MOTION.ease;
export type MotionDuration = keyof typeof MOTION.duration;
export type MotionDistance = keyof typeof MOTION.distance;
export type MotionStagger = keyof typeof MOTION.stagger;
export type MotionTrigger = keyof typeof MOTION.trigger;
