/**
 * Named motion presets — the vocabulary components speak. Every value here is
 * either a `MOTION` token or the one shape parameter that defines the preset
 * (e.g. a magnetic strength). Components never pass raw numbers.
 */
import type { BatchConfig } from "../hooks/use-batch";
import type { MagneticConfig } from "../hooks/use-magnetic";
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

const sectionCardGrid = (overrides: Partial<BatchConfig> = {}): BatchConfig => ({
  ...MOTION.text.card,
  ...overrides,
});

// ── Text ───────────────────────────────────────────────────────────────────

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
  ease: MOTION.ease.display,
  trigger: MOTION.trigger.hero,
  scrubExit: false,
  ...overrides,
});

// ── Groups ─────────────────────────────────────────────────────────────────

const listItems = (overrides: Partial<BatchConfig> = {}): BatchConfig => ({
  direction: "up",
  duration: MOTION.duration.fast,
  distance: MOTION.distance.sm,
  stagger: MOTION.stagger.tight,
  ease: MOTION.ease.smooth,
  ...overrides,
});


// ── Interaction (spring-driven) ────────────────────────────────────────────
// Keep new presets additive — do not invent a fourth interaction primitive
// without a real, named UI need.

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
  heroReveal,
  heroHeadline,
  listItems,
  sectionTitle,
  sectionEyebrow,
  sectionDescription,
  sectionElement,
  sectionCardGrid,
  magneticButton,
  tiltCard,
  tiltSubtle,
  pressIcon,
  pressButton,
} as const;
