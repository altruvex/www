"use client";

import { gsap } from "@/lib/utils/gsap";
import { useEffect, useRef, type RefObject } from "react";
import { MOTION } from "../tokens";
import { inlineSign, readDirection } from "../utils/direction";

/**
 * An element that trails the pointer (a preview beside a hovered row): its
 * transform follows the cursor with the house drawer timing and strong ease,
 * offset toward the inline end (mirrored in RTL) so it never sits under the
 * text being pointed at. Only on fine pointers and without reduced motion —
 * elsewhere the element keeps its resting position and the caller decides
 * whether to show it at all.
 */
export function useFollowPointer<T extends HTMLElement = HTMLDivElement>({
  offset = 220,
}: { offset?: number } = {}): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference) and (pointer: fine)", () => {
      const sign = inlineSign(readDirection(el));
      const toX = gsap.quickTo(el, "x", { duration: MOTION.duration.drawer, ease: MOTION.ease.strong });
      const toY = gsap.quickTo(el, "y", { duration: MOTION.duration.drawer, ease: MOTION.ease.strong });
      const onMove = (e: PointerEvent) => {
        toX(e.clientX + sign * offset);
        toY(e.clientY);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      return () => window.removeEventListener("pointermove", onMove);
    });
    return () => mm.revert();
  }, [offset]);
  return ref;
}
