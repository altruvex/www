/**
 * Named motion presets — the vocabulary components speak. Every value here is
 * either a `MOTION` token or the one shape parameter that defines the preset
 * (e.g. a magnetic strength). Components never pass raw numbers.
 */
import type { BatchConfig } from "../hooks/use-batch";
import type { CounterConfig } from "../hooks/use-counter";
import type { MagneticConfig } from "../hooks/use-magnetic";
import type { ParallaxConfig } from "../hooks/use-parallax";
import type { PressConfig } from "../hooks/use-press";
import type { RevealConfig } from "../hooks/use-reveal";
import type { TextConfig } from "../hooks/use-text";
import type { TiltConfig } from "../hooks/use-tilt";
import { MOTION } from "../tokens";

// ── Reveals ────────────────────────────────────────────────────────────────

const fadeUp = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  direction: "up",
  duration: MOTION.duration.base,
  distance: MOTION.distance.md,
  ease: MOTION.ease.smooth,
  ...overrides,
});

const fadeIn = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  direction: "fade",
  duration: MOTION.duration.base,
  ease: MOTION.ease.smooth,
  ...overrides,
});

/** Slides in from the inline-START edge (left in LTR, right in RTL). */
const slideStart = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  direction: "start",
  duration: MOTION.duration.slow,
  distance: MOTION.distance.lg,
  ease: MOTION.ease.smooth,
  ...overrides,
});

/** Slides in from the inline-END edge (right in LTR, left in RTL). */
const slideEnd = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  direction: "end",
  duration: MOTION.duration.slow,
  distance: MOTION.distance.lg,
  ease: MOTION.ease.smooth,
  ...overrides,
});

/** Physical: travels leftward. Prefer `slideStart`/`slideEnd` for anything bilingual. */
const slideLeft = (overrides: Partial<RevealConfig> = {}): RevealConfig =>
  slideEnd({ direction: "left", ...overrides });

/** Physical: travels rightward. Prefer `slideStart`/`slideEnd` for anything bilingual. */
const slideRight = (overrides: Partial<RevealConfig> = {}): RevealConfig =>
  slideStart({ direction: "right", ...overrides });

const scaleIn = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  direction: "scale",
  duration: MOTION.duration.fast,
  ease: MOTION.ease.gentle,
  ...overrides,
});

// ── Section choreography ───────────────────────────────────────────────────

const sectionTitle = (overrides: Partial<TextConfig> = {}): TextConfig => ({
  ...MOTION.text.heading,
  ease: MOTION.ease.text,
  ...overrides,
});

const sectionEyebrow = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  ...MOTION.text.body,
  delay: MOTION.section.eyebrow,
  ...overrides,
});

const sectionDescription = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  ...MOTION.text.body,
  delay: MOTION.section.description,
  ...overrides,
});

const sectionElement = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  ...MOTION.text.element,
  delay: MOTION.section.element,
  // Meaningful reveals (CTAs, featured blocks) get the anticipation
  // micro-beat (principles M2); pass `anticipate: false` to opt out.
  anticipate: true,
  ...overrides,
});

const sectionScrollHint = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  ...MOTION.text.element,
  direction: "fade",
  delay: MOTION.section.scrollHint,
  ...overrides,
});

const sectionCardGrid = (overrides: Partial<BatchConfig> = {}): BatchConfig => ({
  ...MOTION.text.card,
  ...overrides,
});

// ── Text ───────────────────────────────────────────────────────────────────

const headline = (overrides: Partial<TextConfig> = {}): TextConfig =>
  sectionTitle(overrides);

const heroReveal = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  direction: "up",
  duration: MOTION.duration.base,
  distance: MOTION.distance.md,
  ease: MOTION.ease.strong,
  ...overrides,
});

const heroHeadline = (overrides: Partial<TextConfig> = {}): TextConfig => ({
  splitBy: "word",
  blur: true,
  duration: MOTION.duration.display,
  stagger: MOTION.stagger.display,
  distance: MOTION.distance.lg,
  ease: "power4.out",
  trigger: MOTION.trigger.hero,
  scrubExit: false,
  ...overrides,
});

const subheading = (overrides: Partial<TextConfig> = {}): TextConfig => ({
  splitBy: "line",
  blur: false,
  duration: MOTION.duration.base,
  stagger: MOTION.stagger.tight,
  distance: MOTION.distance.md,
  ease: MOTION.ease.smooth,
  ...overrides,
});

const body = (overrides: Partial<TextConfig> = {}): TextConfig => ({
  splitBy: "char",
  blur: false,
  duration: MOTION.duration.base,
  distance: MOTION.distance.sm,
  ease: MOTION.ease.smooth,
  ...overrides,
});

// ── Groups ─────────────────────────────────────────────────────────────────

const cardGrid = (overrides: Partial<BatchConfig> = {}): BatchConfig => ({
  direction: "up",
  duration: MOTION.duration.base,
  distance: MOTION.distance.md,
  stagger: MOTION.stagger.loose,
  ease: MOTION.ease.smooth,
  ...overrides,
});

const listItems = (overrides: Partial<BatchConfig> = {}): BatchConfig => ({
  direction: "up",
  duration: MOTION.duration.fast,
  distance: MOTION.distance.sm,
  stagger: MOTION.stagger.tight,
  ease: MOTION.ease.smooth,
  ...overrides,
});

// ── Scroll-linked ──────────────────────────────────────────────────────────

const parallax = (overrides: Partial<ParallaxConfig> = {}): ParallaxConfig => ({
  speed: MOTION.parallax.base,
  direction: "y",
  scrub: MOTION.parallax.scrub,
  anchor: "section",
  ...overrides,
});

const parallaxSlow = (overrides: Partial<ParallaxConfig> = {}): ParallaxConfig =>
  parallax({ speed: MOTION.parallax.slow, ...overrides });

const parallaxFast = (overrides: Partial<ParallaxConfig> = {}): ParallaxConfig =>
  parallax({ speed: MOTION.parallax.fast, ...overrides });

const counter = (to: number, overrides: Partial<CounterConfig> = {}): CounterConfig => ({
  from: 0,
  to,
  duration: MOTION.duration.slow,
  ease: MOTION.ease.strong,
  trigger: MOTION.trigger.late,
  once: true,
  ...overrides,
});

// ── Interaction (spring-driven) ────────────────────────────────────────────
// Keep new presets additive — do not invent a fourth interaction primitive
// without a real, named UI need.

/** Primary CTAs — confident pull, generous travel. */
const magneticCTA = (overrides: Partial<MagneticConfig> = {}): MagneticConfig => ({
  strength: 0.4,
  max: 28,
  spring: "magnetic",
  ...overrides,
});

/** Icon buttons / nav glyphs — tighter radius, crisper follow. */
const magneticIcon = (overrides: Partial<MagneticConfig> = {}): MagneticConfig => ({
  strength: 0.5,
  max: 16,
  spring: "snappy",
  ...overrides,
});

/** MagneticButton's own pull — locked spec (Ali 2026-07-05): strength 0.15. */
const magneticButton = (overrides: Partial<MagneticConfig> = {}): MagneticConfig => ({
  strength: 0.15,
  max: 24,
  spring: "magnetic",
  ...overrides,
});

/** Feature / pricing cards — subtle depth, slight lift toward the viewer. */
const tiltCard = (overrides: Partial<TiltConfig> = {}): TiltConfig => ({
  max: 5,
  lift: 8,
  perspective: 900,
  spring: "tilt",
  ...overrides,
});

/** Small tiles / logos — barely-there tilt, no lift. */
const tiltSubtle = (overrides: Partial<TiltConfig> = {}): TiltConfig => ({
  max: 3,
  lift: 0,
  perspective: 700,
  spring: "tilt",
  ...overrides,
});

/** Default tactile press for any clickable element. */
const pressDefault = (overrides: Partial<PressConfig> = {}): PressConfig => ({
  scale: 0.97,
  pressSpring: "press",
  releaseSpring: "release",
  ...overrides,
});

/** Smaller hit targets (icon buttons) — press reads at a larger scale delta. */
const pressIcon = (overrides: Partial<PressConfig> = {}): PressConfig => ({
  scale: 0.92,
  pressSpring: "press",
  releaseSpring: "release",
  ...overrides,
});

/** MagneticButton's press — locked spec (Ali 2026-07-05): scale 0.95. */
const pressButton = (overrides: Partial<PressConfig> = {}): PressConfig => ({
  scale: 0.95,
  pressSpring: "press",
  releaseSpring: "release",
  ...overrides,
});

export const motion = {
  fadeUp,
  fadeIn,
  slideStart,
  slideEnd,
  slideLeft,
  slideRight,
  scaleIn,
  headline,
  heroReveal,
  heroHeadline,
  subheading,
  body,
  cardGrid,
  listItems,
  parallax,
  parallaxSlow,
  parallaxFast,
  counter,
  sectionTitle,
  sectionEyebrow,
  sectionDescription,
  sectionElement,
  sectionScrollHint,
  sectionCardGrid,
  magneticCTA,
  magneticIcon,
  magneticButton,
  tiltCard,
  tiltSubtle,
  pressDefault,
  pressIcon,
  pressButton,
} as const;
