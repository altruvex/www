import { getLenis } from "../lenis-instance";
import { MOTION } from "../tokens";

export function scrollToY(top: number): void {
  if (typeof window === "undefined") return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(top, { immediate: reduced, duration: MOTION.scroll.glide });
    return;
  }
  window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
}
