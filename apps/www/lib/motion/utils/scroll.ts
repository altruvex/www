import { getLenis } from "../lenis-instance";
import { MOTION } from "../tokens";

/**
 * Move the page to `top` (document px). Lenis owns the scroll when it runs —
 * a native jump underneath it is overwritten on its next frame — so the move
 * goes through it with the house glide; without Lenis it falls back to the
 * browser. Reduced motion jumps instead of gliding.
 */
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
