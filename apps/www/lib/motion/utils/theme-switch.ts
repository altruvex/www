import {
  crossfadeTheme as crossfade,
  type ResolvedTheme,
} from "@repo/ui/theme-switch";
import { MOTION } from "../tokens";

export { resolveThemeChoice } from "@repo/ui/theme-switch";

/**
 * The shared theme crossfade (`@repo/ui/theme-switch`) on `MOTION.theme`,
 * which is that package's THEME_CROSSFADE — one clock for www and admin.
 */
export function crossfadeTheme(target: ResolvedTheme, apply: () => void): void {
  crossfade(target, apply, MOTION.theme);
}
