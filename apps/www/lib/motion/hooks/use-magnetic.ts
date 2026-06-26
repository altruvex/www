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

    const resetXTo = gsap.quickTo(el, "x", { duration: 0.7, ease: MOTION.ease.spring });
    const resetYTo = gsap.quickTo(el, "y", { duration: 0.7, ease: MOTION.ease.spring });
    const reset = () => {
      resetXTo(0);
      resetYTo(0);
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
