/**
 * Compatibility surface. Tokens live in `./tokens`; device detection in
 * `./utils/env`. Existing imports of `@/lib/motion/config` keep working.
 *
 * Narrowed to what is actually imported through this path — everything else
 * is reached from `@/lib/motion`, and re-exporting it twice only made the
 * motion system look larger than it is.
 */
export { MOTION } from "./tokens";
export type { MotionEase, MotionSpring, MotionTrigger, SpringConfig } from "./tokens";
export { getConstrainedDevice } from "./utils/env";
