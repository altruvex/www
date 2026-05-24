import { DEFAULTS, MOTION, SECTION_DELAYS } from "../config";
import type { RevealConfig } from "../hooks/use-reveal";
import type { TextConfig } from "../hooks/use-text";
import type { BatchConfig } from "../hooks/use-batch";

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

export const motion = {
  fadeUp,
  fadeIn,
  slideLeft,
  slideRight,
  scaleIn,
  headline,
  heroHeadline,
  subheading,
  body,
  cardGrid,
  listItems,
  sectionTitle,
  sectionEyebrow,
  sectionDescription,
  sectionElement,
  sectionScrollHint,
  sectionCardGrid,
} as const;
