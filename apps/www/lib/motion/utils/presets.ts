import { DEFAULTS, MOTION, SECTION_DELAYS } from "../config";
import type { BatchConfig } from "../hooks/use-batch";
import type { CounterConfig } from "../hooks/use-counter";
import type { MagneticConfig } from "../hooks/use-magnetic";
import type { ParallaxConfig } from "../hooks/use-parallax";
import type { PressConfig } from "../hooks/use-press";
import type { RevealConfig } from "../hooks/use-reveal";
import type { TextConfig } from "../hooks/use-text";
import type { TiltConfig } from "../hooks/use-tilt";

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

const slideLeft = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  direction: "left",
  duration: MOTION.duration.slow,
  distance: MOTION.distance.lg,
  ease: MOTION.ease.smooth,
  ...overrides,
});

const slideRight = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  direction: "right",
  duration: MOTION.duration.slow,
  distance: MOTION.distance.lg,
  ease: MOTION.ease.smooth,
  ...overrides,
});

const scaleIn = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  direction: "scale",
  duration: MOTION.duration.fast,
  ease: MOTION.ease.gentle,
  ...overrides,
});

const sectionTitle = (overrides: Partial<TextConfig> = {}): TextConfig => ({
  ...DEFAULTS.heading,
  ease: MOTION.ease.text,
  ...overrides,
});

const sectionEyebrow = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  ...DEFAULTS.body,
  delay: SECTION_DELAYS.eyebrow,
  ...overrides,
});

const sectionDescription = (
  overrides: Partial<RevealConfig> = {},
): RevealConfig => ({
  ...DEFAULTS.body,
  delay: SECTION_DELAYS.description,
  ...overrides,
});

const sectionElement = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  ...DEFAULTS.element,
  delay: SECTION_DELAYS.element,
  ...overrides,
});

const sectionScrollHint = (
  overrides: Partial<RevealConfig> = {},
): RevealConfig => ({
  ...DEFAULTS.element,
  direction: "fade",
  delay: SECTION_DELAYS.scrollHint,
  ...overrides,
});

const sectionCardGrid = (overrides: Partial<BatchConfig> = {}): BatchConfig => ({
  ...DEFAULTS.card,
  ...overrides,
});

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
  duration: 1.1,
  stagger: 0.07,
  distance: MOTION.distance.lg,
  ease: "power4.out",
  trigger: "top 95%",
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

const parallax = (overrides: Partial<ParallaxConfig> = {}): ParallaxConfig => ({
  speed: 0.3,
  direction: "y",
  scrub: 1.5,
  anchor: "section",
  ...overrides,
});

const parallaxSlow = (overrides: Partial<ParallaxConfig> = {}): ParallaxConfig =>
  parallax({ speed: 0.15, ...overrides });

const parallaxFast = (overrides: Partial<ParallaxConfig> = {}): ParallaxConfig =>
  parallax({ speed: 0.5, ...overrides });

const counter = (to: number, overrides: Partial<CounterConfig> = {}): CounterConfig => ({
  from: 0,
  to,
  duration: MOTION.duration.slow,
  ease: MOTION.ease.strong,
  trigger: MOTION.trigger.late,
  once: true,
  ...overrides,
});

// ── Micro-interaction presets ──────────────────────────────────────────────
// Same factory pattern as everything above. Keep new presets additive — do
// not invent a fourth interaction primitive without a real, named UI need.

/** Primary CTAs — confident pull, generous travel. */
const magneticCTA = (overrides: Partial<MagneticConfig> = {}): MagneticConfig => ({
  strength: 0.4,
  max: 28,
  smoothing: 0.5,
  ...overrides,
});

/** Icon buttons / nav glyphs — tighter radius, snappier follow. */
const magneticIcon = (overrides: Partial<MagneticConfig> = {}): MagneticConfig => ({
  strength: 0.5,
  max: 16,
  smoothing: 0.35,
  ...overrides,
});

/** Feature / pricing cards — subtle depth, slight lift toward the viewer. */
const tiltCard = (overrides: Partial<TiltConfig> = {}): TiltConfig => ({
  max: 5,
  lift: 8,
  perspective: 900,
  smoothing: 0.4,
  ...overrides,
});

/** Small tiles / logos — barely-there tilt, no lift. */
const tiltSubtle = (overrides: Partial<TiltConfig> = {}): TiltConfig => ({
  max: 3,
  lift: 0,
  perspective: 700,
  smoothing: 0.35,
  ...overrides,
});

/** Default tactile press for any clickable element. */
const pressDefault = (overrides: Partial<PressConfig> = {}): PressConfig => ({
  scale: 0.97,
  inDuration: 0.12,
  outDuration: 0.55,
  ...overrides,
});

/** Smaller hit targets (icon buttons) — press reads at a smaller scale delta too. */
const pressIcon = (overrides: Partial<PressConfig> = {}): PressConfig => ({
  scale: 0.92,
  inDuration: 0.1,
  outDuration: 0.5,
  ...overrides,
});

export const motion = {
  fadeUp,
  fadeIn,
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
  tiltCard,
  tiltSubtle,
  pressDefault,
  pressIcon,
} as const;
