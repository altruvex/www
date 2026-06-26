"use client";

import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { RefObject, useRef } from "react";
import { readMotionEnv } from "../utils/env";

export interface TiltConfig {
  /** Max rotation (deg) on each axis at the edges. Default 6. Keep small - Apple is subtle. */
  max?: number;
  /** Perspective (px). Lower = stronger 3D. Default 800. */
  perspective?: number;
  /** Lift toward the viewer (px) while hovered. 0 = none; try 6–10 for elevation. Default 0. */
  lift?: number;
  /** Follow smoothing (s). Default 0.4. */
  smoothing?: number;
}

/**
 * Subtle 3D tilt that follows the pointer - depth for feature cards / tiles.
 *
 * - Pointer-fine only; no-op on touch, low-power, or reduced motion (rotation
 *   is vestibular motion).
 * - quickTo per axis: no per-move tween allocation.
 * - For the 3D to read, the card's inner content can sit on its own layer; the
 *   hook sets transformPerspective + preserve-3d on the element itself.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>(
  config: TiltConfig = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const { max = 6, perspective = 800, lift = 0, smoothing = 0.4 } = config;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const env = readMotionEnv();
    if (env.reduce || env.constrained || !env.fine) return;

    gsap.set(el, { transformPerspective: perspective, transformStyle: "preserve-3d" });

    const rxTo = gsap.quickTo(el, "rotationX", { duration: smoothing, ease: "power3" });
    const ryTo = gsap.quickTo(el, "rotationY", { duration: smoothing, ease: "power3" });
    const zTo = lift ? gsap.quickTo(el, "z", { duration: smoothing, ease: "power3" }) : null;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;  // -0.5 … 0.5
      const py = (e.clientY - r.top) / r.height - 0.5;
      ryTo(px * max * 2);   // horizontal cursor → Y rotation
      rxTo(-py * max * 2);  // vertical cursor → X rotation (inverted feels natural)
      zTo?.(lift);
    };

    const reset = () => {
      rxTo(0);
      ryTo(0);
      zTo?.(0);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    el.addEventListener("pointercancel", reset);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
      el.removeEventListener("pointercancel", reset);
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "transform,transformPerspective,transformStyle" });
    };
  }, [max, perspective, lift, smoothing]);

  return ref;
}
