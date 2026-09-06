/**
 * Compatibility surface. Tokens live in `./tokens`; device detection in
 * `./utils/env`. Existing imports of `@/lib/motion/config` keep working.
 */
export {
  DEFAULTS,
  MOTION,
  SECTION_DELAYS,
  resolveEase,
  resolveSpring,
  resolveTrigger,
} from "./tokens";
export type {
  MotionDistance,
  MotionDuration,
  MotionEase,
  MotionSpring,
  MotionStagger,
  MotionTrigger,
  SpringConfig,
} from "./tokens";
export { getConstrainedDevice } from "./utils/env";
