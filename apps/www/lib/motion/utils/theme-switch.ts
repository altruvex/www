import {
  crossfadeTheme as crossfade,
  type ResolvedTheme,
} from "@repo/ui/theme-switch";
import { MOTION } from "../tokens";

export { resolveThemeChoice } from "@repo/ui/theme-switch";

export function crossfadeTheme(target: ResolvedTheme, apply: () => void): void {
  crossfade(target, apply, MOTION.theme);
}
