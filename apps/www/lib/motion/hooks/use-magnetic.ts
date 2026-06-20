"use client";

import { useIsomorphicLayoutEffect } from "@/lib/dom-utils";
import { gsap } from "@/lib/gsap";
import { RefObject, useRef } from "react";
import { MOTION } from "../config";
import { readMotionEnv } from "../utils/env";

export interface MagneticConfig {
  /** 0–1: fraction of cursor offset the element follows. Default 0.35. */
  strength?: number;
  /** Max travel (px) on each axis — clamps strength on large elements. Default 24. */
  max?: number;
  /** Follow smoothing (s). Lower = snappier. Default 0.5. */
  smoothing?: number;
}

/**
 * Magnetic pull toward the pointer. For primary CTAs, icon buttons, logo marks.
 *
 * - Pointer-fine only (mouse/trackpad). No-op on touch, low-power, or reduced motion.
 * - Uses gsap.quickTo: one reusable tween per axis, no per-move allocation.
 * - Never alters the hit area meaningfully at default strength; the element
 *   stays clickable. Focus/keyboard behavior is untouched.
 */
export function useMagnetic<T extends HTMLElement = HTMLButtonElement>(
  config: MagneticConfig = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const { strength = 0.35, max = 24, smoothing = 0.5 } = config;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const env = readMotionEnv();
    if (env.reduce || env.constrained || !env.fine) return;

    const xTo = gsap.quickTo(el, "x", { duration: smoothing, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: smoothing, ease: "power3" });
    const clamp = gsap.utils.clamp(-max, max);

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const relX = e.clientX - (r.left + r.width / 2);
      const relY = e.clientY - (r.top + r.height / 2);
      xTo(clamp(relX * strength));
      yTo(clamp(relY * strength));
    };

    const reset = () => {
      // Settle back with a touch of overshoot — the "magnet release" feel.
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: MOTION.ease.spring, overwrite: true });
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    el.addEventListener("pointercancel", reset);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
      el.removeEventListener("pointercancel", reset);
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "transform" });
    };
  }, [strength, max, smoothing]);

  return ref;
}
