"use client";

import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { RefObject, useRef } from "react";
import { resolveSpring, type MotionSpring, type SpringConfig } from "../tokens";
import { readMotionEnv } from "../utils/env";
import { createSpring } from "../utils/spring";

export interface TiltConfig {
  /** Max rotation (deg) on each axis at the edges. Default 6. Keep small — Apple is subtle. */
  max?: number;
  /** Perspective (px). Lower = stronger 3D. Default 800. */
  perspective?: number;
  /** Lift toward the viewer (px) while hovered. 0 = none. Default 0. */
  lift?: number;
  /** Spring token or config. Default `MOTION.spring.tilt`. */
  spring?: SpringConfig | MotionSpring;
}

/**
 * Subtle 3D tilt that follows the pointer — depth for featured cards.
 *
 * - Three springs (rotationX, rotationY, z) on `gsap.quickSetter`s; rest
 *   state costs zero frames.
 * - Rect cached per hover (see useMagnetic for why); rotation doesn't change
 *   the layout box so the cached rect stays valid for the whole hover.
 * - RTL-safe: cursor-relative, symmetric on both axes — a mirrored layout
 *   tilts the mirrored way for free.
 * - Reduced motion / coarse pointer / constrained: no-op. Rotation is
 *   vestibular motion; there is no safe "reduced tilt", so the degrade is
 *   none — the card keeps its CSS hover styling.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>(
  config: TiltConfig = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const { max = 6, perspective = 800, lift = 0, spring = "tilt" } = config;
  const { stiffness, damping, mass = 1 } = resolveSpring(spring);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const env = readMotionEnv();
    if (env.reduce || env.constrained || !env.fine) return;

    gsap.set(el, { transformPerspective: perspective });

    const cfg: SpringConfig = { stiffness, damping, mass };
    const rx = createSpring(gsap.quickSetter(el, "rotationX", "deg") as (v: number) => void, cfg);
    const ry = createSpring(gsap.quickSetter(el, "rotationY", "deg") as (v: number) => void, cfg);
    const rz = lift
      ? createSpring(gsap.quickSetter(el, "z", "px") as (v: number) => void, cfg)
      : null;

    let left = 0;
    let top = 0;
    let width = 1;
    let height = 1;
    let scroll0 = 0;
    let measured = false;

    const measure = () => {
      const r = el.getBoundingClientRect();
      left = r.left;
      top = r.top;
      width = r.width || 1;
      height = r.height || 1;
      scroll0 = window.scrollY;
      measured = true;
    };

    const onEnter = () => measure();

    const onMove = (e: PointerEvent) => {
      if (!measured) measure();
      const dy = window.scrollY - scroll0;
      const px = (e.clientX - left) / width - 0.5; // -0.5 … 0.5
      const py = (e.clientY - (top - dy)) / height - 0.5;
      ry.set(px * max * 2); // horizontal cursor → Y rotation
      rx.set(-py * max * 2); // vertical cursor → X rotation (inverted feels natural)
      rz?.set(lift);
    };

    const reset = () => {
      measured = false;
      rx.set(0);
      ry.set(0);
      rz?.set(0);
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
      rx.kill();
      ry.kill();
      rz?.kill();
      gsap.set(el, { clearProps: "transform,transformPerspective" });
    };
  }, [max, perspective, lift, stiffness, damping, mass]);

  return ref;
}
