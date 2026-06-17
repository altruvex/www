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
export { useParallax } from "@/lib/motion/hooks/use-parallax";
export { useReveal } from "@/lib/motion/hooks/use-reveal";
export { useText } from "@/lib/motion/hooks/use-text";
export {
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion/hooks/use-section-motion";
export type { BatchConfig } from "@/lib/motion/hooks/use-batch";
export type { CounterConfig } from "@/lib/motion/hooks/use-counter";
export type { ParallaxConfig } from "@/lib/motion/hooks/use-parallax";
export type {
  RevealConfig,
  RevealDirection,
} from "@/lib/motion/hooks/use-reveal";
export type { TextConfig } from "@/lib/motion/hooks/use-text";
export { motion } from "./utils/presets";
