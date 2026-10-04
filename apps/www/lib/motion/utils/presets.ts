import type { BatchConfig } from "../hooks/use-batch";
import type { MagneticConfig } from "../hooks/use-magnetic";
import type { PressConfig } from "../hooks/use-press";
import type { RevealConfig } from "../hooks/use-reveal";
import type { TextConfig } from "../hooks/use-text";
import { MOTION } from "../tokens";

const fadeUp = (overrides: Partial<RevealConfig> = {}): RevealConfig => ({
  direction: "up",
  duration: MOTION.duration.base,
  distance: MOTION.distance.md,
  ease: MOTION.ease.smooth,
  ...overrides,
});

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
  anticipate: true,
  ...overrides,
});

const sectionCardGrid = (overrides: Partial<BatchConfig> = {}): BatchConfig => ({
  ...MOTION.text.card,
  ...overrides,
});

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

const listItems = (overrides: Partial<BatchConfig> = {}): BatchConfig => ({
  direction: "up",
  duration: MOTION.duration.fast,
  distance: MOTION.distance.sm,
  stagger: MOTION.stagger.tight,
  ease: MOTION.ease.smooth,
  ...overrides,
});


const magneticButton = (overrides: Partial<MagneticConfig> = {}): MagneticConfig => ({
  strength: 0.15,
  max: 24,
  spring: "magnetic",
  ...overrides,
});

const pressIcon = (overrides: Partial<PressConfig> = {}): PressConfig => ({
  scale: 0.92,
  pressSpring: "press",
  releaseSpring: "release",
  ...overrides,
});

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
  pressIcon,
  pressButton,
} as const;
