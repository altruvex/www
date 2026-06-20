export { MOTION, DEFAULTS, SECTION_DELAYS } from "./config";
export type {
  MotionDistance,
  MotionDuration,
  MotionEase,
  MotionStagger,
  MotionTrigger,
} from "./config";
export { useBatch } from "@/lib/motion/hooks/use-batch";
export { useCounter } from "@/lib/motion/hooks/use-counter";
export { useMagnetic } from "@/lib/motion/hooks/use-magnetic";
export { useParallax } from "@/lib/motion/hooks/use-parallax";
export { usePress } from "@/lib/motion/hooks/use-press";
export { useReveal } from "@/lib/motion/hooks/use-reveal";
export { useText } from "@/lib/motion/hooks/use-text";
export { useTilt } from "@/lib/motion/hooks/use-tilt";
export {
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion/hooks/use-section-motion";
export type { BatchConfig } from "@/lib/motion/hooks/use-batch";
export type { CounterConfig } from "@/lib/motion/hooks/use-counter";
export type { MagneticConfig } from "@/lib/motion/hooks/use-magnetic";
export type { ParallaxConfig } from "@/lib/motion/hooks/use-parallax";
export type { PressConfig } from "@/lib/motion/hooks/use-press";
export type {
  RevealConfig,
  RevealDirection,
} from "@/lib/motion/hooks/use-reveal";
export type { TextConfig } from "@/lib/motion/hooks/use-text";
export type { TiltConfig } from "@/lib/motion/hooks/use-tilt";
export { motion } from "./utils/presets";
