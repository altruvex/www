"use client";

import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { RefObject, useRef } from "react";
import { resolveSpring, type MotionSpring, type SpringConfig } from "../tokens";
import { readMotionEnv } from "../utils/env";
import { createSpring } from "../utils/spring";

export interface MagneticConfig {
  /** Fraction of the pointer's offset from centre the element follows. Default 0.35. */
  strength?: number;
  /** Clamp on travel per axis (px). Default 24. */
  max?: number;
  /** Spring token or config. Default `MOTION.spring.magnetic`. */
  spring?: SpringConfig | MotionSpring;
}

/**
 * Magnetic hover-pull. The element leans toward the pointer while hovered and
 * springs home on leave.
 *
 * - Two springs (x, y) drive `gsap.quickSetter`s: no per-move tween
 *   allocation, and writes go through GSAP's transform cache so a `usePress`
 *   scale on the same element composes correctly.
 * - Geometry is measured ONCE per hover (`pointerenter`), with the element's
 *   own current translate subtracted so the centre is the resting centre —
 *   reading the rect every move would (a) include the translate we just
 *   applied and drift the target, and (b) force a style flush after every
 *   GSAP write. Page scroll during hover is compensated via `scrollY` delta.
 * - RTL-safe by construction: pull is pointer-relative, no axis sign.
 * - Off (no-op) under reduced motion, on coarse pointers and constrained
 *   devices. Hover colour/opacity still comes from CSS, so the affordance
 *   survives.
 */
export function useMagnetic<T extends HTMLElement = HTMLButtonElement>(
  config: MagneticConfig = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const { strength = 0.35, max = 24, spring = "magnetic" } = config;
  const { stiffness, damping, mass = 1 } = resolveSpring(spring);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const env = readMotionEnv();
    if (env.reduce || env.constrained || !env.fine) return;

    const cfg: SpringConfig = { stiffness, damping, mass };
    const sx = createSpring(gsap.quickSetter(el, "x", "px") as (v: number) => void, cfg);
    const sy = createSpring(gsap.quickSetter(el, "y", "px") as (v: number) => void, cfg);
    const clamp = gsap.utils.clamp(-max, max);

    let cx = 0;
    let cy = 0;
    let scroll0 = 0;
    let measured = false;

    const measure = () => {
      const r = el.getBoundingClientRect();
      cx = r.left + r.width / 2 - sx.value;
      cy = r.top + r.height / 2 - sy.value;
      scroll0 = window.scrollY;
      measured = true;
    };

    const onEnter = () => measure();

    const onMove = (e: PointerEvent) => {
      if (!measured) measure();
      const dy = window.scrollY - scroll0;
      sx.set(clamp((e.clientX - cx) * strength));
      sy.set(clamp((e.clientY - (cy - dy)) * strength));
    };

    const reset = () => {
      measured = false;
      sx.set(0);
      sy.set(0);
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    el.addEventListener("pointercancel", reset);

    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
      el.removeEventListener("pointercancel", reset);
      sx.kill();
      sy.kill();
      gsap.set(el, { x: 0, y: 0 });
    };
  }, [strength, max, stiffness, damping, mass]);

  return ref;
}
