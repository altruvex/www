/**
 * Canonical mono-caps eyebrow style. Now maps to the `.eyebrow` utility
 * (see globals.css) so there is a single source of truth.
 * Prefer the <Eyebrow> primitive for new code; this remains for composed
 * call sites that supply their own scene-aware color (e.g. text-s-muted).
 */
export const monoCaps = "eyebrow";
