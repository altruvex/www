"use client";

import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { RefObject, useRef } from "react";
import { MOTION, resolveSpring, type MotionSpring, type SpringConfig } from "../tokens";
import { readMotionEnv } from "../utils/env";
import { createSpring } from "../utils/spring";

export interface PressConfig {
  scale?: number;
  pressSpring?: SpringConfig | MotionSpring;
  releaseSpring?: SpringConfig | MotionSpring;
  keyboard?: boolean;
}

export function usePress<T extends HTMLElement = HTMLButtonElement>(
  config: PressConfig = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const {
    scale = 0.97,
    pressSpring = "press",
    releaseSpring = "release",
    keyboard = true,
  } = config;
  const pressCfg = resolveSpring(pressSpring);
  const releaseCfg = resolveSpring(releaseSpring);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const env = readMotionEnv();
    const reduce = env.reduce;

    let active = false;

    const isDisabled = () =>
      (el as unknown as { disabled?: boolean }).disabled === true ||
      el.getAttribute("aria-disabled") === "true";

    const dim = (to: number) =>
      gsap.to(el, {
        opacity: to,
        duration: MOTION.duration.instant,
        ease: MOTION.ease.ui,
        overwrite: "auto",
      });

    let spring: ReturnType<typeof createSpring> | null = null;
    if (!reduce) {
      const setX = gsap.quickSetter(el, "scaleX") as (v: number) => void;
      const setY = gsap.quickSetter(el, "scaleY") as (v: number) => void;
      spring = createSpring(
        (v) => {
          setX(v);
          setY(v);
        },
        pressCfg,
        1,
      );
    }

    const press = () => {
      if (active || isDisabled()) return;
      active = true;
      if (spring) {
        spring.retune(pressCfg);
        spring.set(scale);
      } else {
        dim(MOTION.reduced.pressOpacity);
      }
    };

    const release = () => {
      if (!active) return;
      active = false;
      if (spring) {
        spring.retune(releaseCfg);
        spring.set(1);
      } else {
        dim(1);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      press();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === " " || e.key === "Enter") press();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") release();
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointerleave", release);
    el.addEventListener("pointercancel", release);
    if (keyboard) {
      el.addEventListener("keydown", onKeyDown);
      el.addEventListener("keyup", onKeyUp);
      el.addEventListener("blur", release);
    }

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", release);
      el.removeEventListener("pointerleave", release);
      el.removeEventListener("pointercancel", release);
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("blur", release);
      if (spring) {
        spring.kill();
        gsap.set(el, { scale: 1 });
      } else {
        gsap.killTweensOf(el, "opacity");
        gsap.set(el, { clearProps: "opacity" });
      }
    };
  }, [
    scale,
    keyboard,
    pressCfg.stiffness,
    pressCfg.damping,
    pressCfg.mass,
    releaseCfg.stiffness,
    releaseCfg.damping,
    releaseCfg.mass,
  ]);

  return ref;
}
