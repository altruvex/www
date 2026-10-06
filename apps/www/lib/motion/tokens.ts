import { THEME_CROSSFADE } from "@repo/ui/theme-switch";
import { ACCENT_SHIMMER } from "@repo/ui/www";

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
  restDelta?: number;
  restSpeed?: number;
}

export const MOTION = {
  ease: {
    text: "cubic-bezier(0.2, 0, 0, 1)",
    smooth: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    gentle: "cubic-bezier(0.65, 0, 0.35, 1)",
    ui: "cubic-bezier(0.4, 0, 0.2, 1)",
    strong: "cubic-bezier(0.23, 1, 0.32, 1)",
    exit: "cubic-bezier(0.55, 0, 1, 0.45)",
    display: "power4.out",
    fade: "power1.out",
    fadeOut: "power1.in",
  },

  duration: {
    hover: 0.15,
    micro: 0.15,
    instant: 0.2,
    drawer: 0.3,
    fast: 0.4,
    base: 0.7,
    text: 0.9,
    slow: 1.0,
    display: 1.1,
    settle: 1.4,
    sweep: 2.6,
  },

  spring: {
    press: { stiffness: 700, damping: 34, mass: 1 },
    release: { stiffness: 380, damping: 20, mass: 1 },
    magnetic: { stiffness: 220, damping: 24, mass: 1 },
    snappy: { stiffness: 500, damping: 36, mass: 1 },
    gentle: { stiffness: 170, damping: 26, mass: 1 },
    bouncy: { stiffness: 300, damping: 16, mass: 1 },
  } satisfies Record<string, SpringConfig>,

  distance: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 40,
  },

  stagger: {
    tight: 0.04,
    word: 0.05,
    base: 0.06,
    display: 0.07,
    loose: 0.08,
    line: 0.12,
    annotate: 0.15,
    sequence: 0.22,
  },

  trigger: {
    default: "top bottom",
    late: "top 85%",
    latest: "top 75%",
    early: "top 90%",
    hero: "top 95%",
    immediate: "top 110%",
    inView: "top 60%",
  },

  parallax: {
    slow: 0.15,
    scrub: 1.5,
  },

  scroll: {
    glide: 1.1,
    readStart: "top 78%",
    readEnd: "bottom 45%",
    scrub: {
      tight: 0.3,
      track: 0.5,
      assemble: 0.6,
      stage: 0.9,
      pin: 1,
    },
  },

  reduced: {
    duration: 0.18,
    ease: "power1.out",
    pressOpacity: 0.7,
  },

  text: {
    heading: { byWord: true, blur: true, duration: 1.1, stagger: 0.05, distance: 40 },
    body: { duration: 0.8, distance: 20 },
    element: { direction: "up" as const, duration: 0.7, distance: 16 },
    card: { duration: 0.7, stagger: 0.08, distance: 24 },
    blurCap: 16,
    maxTotalStagger: 0.6,
  },

  section: {
    eyebrow: 0,
    description: 0.15,
    element: 0.25,
  },

  anticipation: { travel: 0.08, durationShare: 0.18, opacity: 0.35 },

  loader: {
    enter: 0.2,
    greetHold: 1.0,
    handover: 0.15,
    markHold: 0.6,
    markLift: 0.6,
  },

  accent: {
    shimmer: ACCENT_SHIMMER,
    sweepRatio: 1.25,
    sweepDelay: 0.12,
  },

  theme: THEME_CROSSFADE,

  lenis: {
    duration: 0.9,
    smoothWheel: true,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  },
} as const;

export type MotionEase = keyof typeof MOTION.ease;
export type MotionSpring = keyof typeof MOTION.spring;
export type MotionTrigger = keyof typeof MOTION.trigger;

export const resolveEase = (ease: string | MotionEase): string =>
  ease in MOTION.ease ? MOTION.ease[ease as MotionEase] : ease;

export const resolveTrigger = (trigger: string | MotionTrigger): string =>
  trigger in MOTION.trigger ? MOTION.trigger[trigger as MotionTrigger] : trigger;

export const resolveSpring = (spring: SpringConfig | MotionSpring): SpringConfig =>
  typeof spring === "string" ? MOTION.spring[spring] : spring;

