"use client";

import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { RefObject, useRef } from "react";
import { MOTION } from "../config";
import { readMotionEnv } from "../utils/env";

export interface MagneticConfig {
  strength?: number;
  max?: number;
  smoothing?: number;
}

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

    const clamp = gsap.utils.clamp(-max, max);

    // Plain gsap.to() for both follow and reset — NOT gsap.quickTo(). GSAP
    // does not support two independent quickTo() instances driving the same
    // property on the same target: the follow tween and a separate reset
    // tween corrupt each other's internal state after the first
    // pointerleave, so the button follows the cursor once and then goes
    // dead. Keeping both directions on the same plain-tween system lets
    // overwrite: "auto" actually manage the handoff.
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const relX = e.clientX - (r.left + r.width / 2);
      const relY = e.clientY - (r.top + r.height / 2);
      gsap.to(el, {
        x: clamp(relX * strength),
        y: clamp(relY * strength),
        duration: smoothing,
        ease: "power3",
        overwrite: "auto",
      });
    };

    const reset = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: MOTION.ease.spring, overwrite: "auto" });
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
