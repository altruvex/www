export type Direction = "ltr" | "rtl";

/**
 * Resolved writing direction of an element — computed style, so a nested
 * `dir` attribute or a `direction:` rule is honoured, not just `<html dir>`.
 * One style read at setup time; never call per frame.
 */
export function readDirection(el: Element): Direction {
  if (typeof window === "undefined") return "ltr";
  return getComputedStyle(el).direction === "rtl" ? "rtl" : "ltr";
}

/**
 * Sign multiplier that turns a logical inline-axis offset into a physical
 * translateX: +1 in LTR, −1 in RTL.
 */
export function inlineSign(dir: Direction): 1 | -1 {
  return dir === "rtl" ? -1 : 1;
}
