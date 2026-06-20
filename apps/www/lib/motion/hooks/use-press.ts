"use client";

import { useIsomorphicLayoutEffect } from "@/lib/dom-utils";
import { gsap } from "@/lib/gsap";
import { RefObject, useRef } from "react";
import { readMotionEnv } from "../utils/env";

export interface PressConfig {
  /** Scale at full press. Default 0.97. */
  scale?: number;
  /** Press-down duration (s). Default 0.12. */
  inDuration?: number;
  /** Spring-release duration (s). Default 0.55. */
  outDuration?: number;
  /** Mirror the press for keyboard Enter/Space so keyboard users get parity. Default true. */
  keyboard?: boolean;
}

/**
 * Tactile press: a small scale-down on press, spring back on release.
 * The detail that makes a button feel like a physical object.
 *
 * - Scale is movement, so it is skipped entirely under reduced motion.
 * - Pointer AND keyboard: Enter/Space mirror the press on focusable elements,
 *   and losing focus mid-press safely releases. Click semantics are untouched.
 */
export function usePress<T extends HTMLElement = HTMLButtonElement>(
  config: PressConfig = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const {
    scale = 0.97,
    inDuration = 0.12,
    outDuration = 0.55,
    keyboard = true,
  } = config;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const env = readMotionEnv();
    if (env.reduce) return;

    let active = false;

    const press = () => {
      active = true;
      gsap.to(el, { scale, duration: inDuration, ease: "power2.out", overwrite: true });
    };
    const release = () => {
      if (!active) return;
      active = false;
      gsap.to(el, { scale: 1, duration: outDuration, ease: "elastic.out(1, 0.6)", overwrite: true });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === " " || e.key === "Enter") press();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") release();
    };

    el.addEventListener("pointerdown", press);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointerleave", release);
    el.addEventListener("pointercancel", release);
    if (keyboard) {
      el.addEventListener("keydown", onKeyDown);
      el.addEventListener("keyup", onKeyUp);
      el.addEventListener("blur", release);
    }

    return () => {
      el.removeEventListener("pointerdown", press);
      el.removeEventListener("pointerup", release);
      el.removeEventListener("pointerleave", release);
      el.removeEventListener("pointercancel", release);
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("blur", release);
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "scale" });
    };
  }, [scale, inDuration, outDuration, keyboard]);

  return ref;
}
