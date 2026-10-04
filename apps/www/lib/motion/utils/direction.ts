export type Direction = "ltr" | "rtl";

export function readDirection(el: Element): Direction {
  if (typeof window === "undefined") return "ltr";
  return getComputedStyle(el).direction === "rtl" ? "rtl" : "ltr";
}

export function inlineSign(dir: Direction): 1 | -1 {
  return dir === "rtl" ? -1 : 1;
}
