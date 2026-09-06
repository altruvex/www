/**
 * Motion tokens — the single source of truth for every duration, easing
 * curve, spring, travel distance, stagger and scroll-trigger position used by
 * the motion system. Components and presets reference these by name; no
 * magic numbers at call sites.
 *
 * Two families of motion, two kinds of token:
 *
 *   - Time-based (enter/exit reveals, route transitions, scroll-linked):
 *     `duration` + `ease`. The eases are CSS `cubic-bezier()` strings so the
 *     same token drives a CSS transition or a GSAP tween; `lib/utils/gsap.ts`
 *     registers each string as a CustomEase under its own literal.
 *
 *   - Interaction-driven (hover pull, press, tilt): `spring`. A spring has no
 *     duration — it has stiffness/damping/mass and carries velocity across
 *     retargets, which is what makes a hover that changes direction mid-flight
 *     feel physical instead of restarting an ease. Solved analytically in
 *     `utils/spring.ts`.
 *
 * `MOTION.md` at the app root documents the system.
 */

export interface SpringConfig {
  /** Restoring force (N/m). Higher = faster. */
  stiffness: number;
  /** Friction. ζ = damping / (2·√(stiffness·mass)); ζ < 1 overshoots. */
  damping: number;
  /** Inertia. Default 1. */
  mass?: number;
  /** Rest threshold on displacement (units of the animated value). Default 0.01. */
  restDelta?: number;
  /** Rest threshold on velocity (units/s). Default 0.1. */
  restSpeed?: number;
}

export const MOTION = {
  /**
   * Eases — CSS cubic-bezier strings. Ease-out dominant for entrances
   * (design-principles M1); `exit` is the only ease-in.
   */
  ease: {
    /** Text reveals: fast start, long settle. */
    text: "cubic-bezier(0.2, 0, 0, 1)",
    /** Default reveal ease. */
    smooth: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    /** Symmetric ease-in-out for scale-type reveals. */
    gentle: "cubic-bezier(0.65, 0, 0.35, 1)",
    /** Material-style UI ease for small state changes. */
    ui: "cubic-bezier(0.4, 0, 0.2, 1)",
    /** Quintic-out: hero/route arrivals. */
    strong: "cubic-bezier(0.23, 1, 0.32, 1)",
    /** Exits may accelerate. */
    exit: "cubic-bezier(0.55, 0, 1, 0.45)",
  },

  /** Durations (seconds). Scale, not use-site names. */
  duration: {
    /** Press-down, hover colour changes. */
    hover: 0.15,
    micro: 0.15,
    /** Opacity flips, reduced-motion crossfades. */
    instant: 0.2,
    /** Drawers, route enter. */
    drawer: 0.3,
    /** Small element reveals. */
    fast: 0.4,
    /** Standard reveal. */
    base: 0.7,
    /** Text reveals. */
    text: 0.9,
    /** Counters, slides. */
    slow: 1.0,
    /** Hero headline (word stagger on top). */
    display: 1.1,
  },

  /**
   * Springs for interaction-driven motion. ζ noted per token so the feel is
   * reviewable without running it: ζ≈1 no overshoot, ζ≈0.5 one soft bounce.
   */
  spring: {
    /** Press-down: stiff and quick, ζ≈0.64. Settles in ~180ms. */
    press: { stiffness: 700, damping: 34, mass: 1 },
    /** Press release: one soft overshoot back to rest, ζ≈0.51. */
    release: { stiffness: 380, damping: 20, mass: 1 },
    /** Magnetic follow: responsive but never snaps, ζ≈0.81. */
    magnetic: { stiffness: 220, damping: 24, mass: 1 },
    /** Tilt follow, ζ≈0.85. */
    tilt: { stiffness: 200, damping: 24, mass: 1 },
    /** General-purpose: crisp, minimal overshoot, ζ≈0.80. */
    snappy: { stiffness: 500, damping: 36, mass: 1 },
    /** General-purpose: critically damped, ζ≈1.0. */
    gentle: { stiffness: 170, damping: 26, mass: 1 },
    /** Playful, ζ≈0.46. Use sparingly. */
    bouncy: { stiffness: 300, damping: 16, mass: 1 },
  } satisfies Record<string, SpringConfig>,

  /** Travel distances (px) for reveals. */
  distance: {
    xs: 8,
    sm: 16,
    /** Body-copy reveal. */
    body: 20,
    md: 24,
    lg: 40,
    xl: 64,
  },

  /** Stagger between siblings (seconds). */
  stagger: {
    tight: 0.04,
    /** Heading words. */
    word: 0.05,
    base: 0.06,
    /** Hero headline words. */
    display: 0.07,
    loose: 0.08,
  },

  /** ScrollTrigger start positions. */
  trigger: {
    default: "top bottom",
    late: "top 85%",
    latest: "top 75%",
    /** Hero: fires even slightly below the fold. */
    hero: "top 95%",
    /** Above-the-fold counters: fire immediately. */
    immediate: "top 110%",
  },

  /** Parallax speeds (fraction of viewport travel) and scrub lag. */
  parallax: {
    slow: 0.15,
    base: 0.3,
    fast: 0.5,
    /** Seconds of scrub catch-up. */
    scrub: 1.5,
    /** Multiplier from `speed` to percent travel. */
    travelScale: 20,
  },

  /**
   * prefers-reduced-motion tier. Opacity is a visual change, not vestibular
   * movement, so a short crossfade stays safe while keeping "new content
   * arrived" legible. Pressed controls dim instead of scaling.
   */
  reduced: {
    duration: 0.18,
    ease: "power1.out",
    pressOpacity: 0.7,
  },

  /** Text-reveal shapes per role. Consumed by presets + section hooks. */
  text: {
    heading: { byWord: true, blur: true, duration: 1.1, stagger: 0.05, distance: 40 },
    subheading: { byLine: true, blur: false, duration: 0.9, stagger: 0.04, distance: 24 },
    body: { duration: 0.8, distance: 20 },
    element: { direction: "up" as const, duration: 0.7, distance: 16 },
    card: { duration: 0.7, stagger: 0.08, distance: 24 },
    /** Max word/char targets that may receive a blur filter. */
    blurCap: 16,
    /** Total stagger across a phrase is capped so long headlines stay brisk. */
    maxTotalStagger: 0.6,
  },

  /** Section choreography offsets (seconds after the title fires). */
  section: {
    eyebrow: 0,
    description: 0.15,
    element: 0.25,
    scrollHint: 0.45,
  },

  /** Anticipation beat shape (design-principles M2). */
  anticipation: { travel: 0.08, durationShare: 0.18, opacity: 0.35 },

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

  accent: {
    // Gradient shimmer loop (CSS keyframe pan) - seconds per cycle.
    shimmer: { slow: 9, base: 6, fast: 3.5 },
    // One-shot gradient sweep, orchestrated by useText against the phrase
    // reveal: duration = text duration * sweepRatio, offset by sweepDelay so
    // the ink arrives just after the words do.
    sweepRatio: 1.25,
    sweepDelay: 0.12,
  },

  lenis: {
    duration: 0.9,
    smoothWheel: true,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  },
} as const;

export type MotionEase = keyof typeof MOTION.ease;
export type MotionDuration = keyof typeof MOTION.duration;
export type MotionSpring = keyof typeof MOTION.spring;
export type MotionDistance = keyof typeof MOTION.distance;
export type MotionStagger = keyof typeof MOTION.stagger;
export type MotionTrigger = keyof typeof MOTION.trigger;

export const resolveEase = (ease: string | MotionEase): string =>
  ease in MOTION.ease ? MOTION.ease[ease as MotionEase] : ease;

export const resolveTrigger = (trigger: string | MotionTrigger): string =>
  trigger in MOTION.trigger ? MOTION.trigger[trigger as MotionTrigger] : trigger;

export const resolveSpring = (spring: SpringConfig | MotionSpring): SpringConfig =>
  typeof spring === "string" ? MOTION.spring[spring] : spring;

/** Back-compat aliases. Prefer `MOTION.text` / `MOTION.section`. */
export const DEFAULTS = MOTION.text;
export const SECTION_DELAYS = MOTION.section;
