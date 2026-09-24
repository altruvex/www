import { MOTION } from "../tokens";

/**
 * CSS transitions read the duration scale from `--motion-*` in globals.css;
 * GSAP reads it from MOTION.duration. The two are declared in two languages,
 * so this compares them once at boot in development and warns on any drift —
 * the only way a hover and a scroll reveal could fall out of one clock.
 * `micro` is an alias of `hover` and has no CSS twin.
 */
export function checkCssMotionTokens(): void {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
  const style = getComputedStyle(document.documentElement);
  const drift: string[] = [];
  for (const [name, seconds] of Object.entries(MOTION.duration)) {
    if (name === "micro") continue;
    const css = style.getPropertyValue(`--motion-${name}`).trim();
    const ms = css.endsWith("ms") ? parseFloat(css) : parseFloat(css) * 1000;
    if (!css || Math.abs(ms - seconds * 1000) > 0.5) {
      drift.push(`--motion-${name}: css=${css || "missing"} tokens=${seconds * 1000}ms`);
    }
  }
  if (drift.length > 0) {
    console.warn(`[motion] CSS duration tokens drifted from MOTION.duration:\n${drift.join("\n")}`);
  }
}
