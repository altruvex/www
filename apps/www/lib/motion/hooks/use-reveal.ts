"use client";

import { useLoading } from "@/components/providers/loading-provider";
import { useIsomorphicLayoutEffect } from "@/lib/dom-utils";
import { gsap } from "@/lib/gsap";
import { RefObject, useRef } from "react";
import { MOTION, MotionEase, MotionTrigger, resolveEase, resolveTrigger } from "../config";

export type RevealDirection = "up" | "down" | "left" | "right" | "fade" | "scale";

export interface RevealConfig {
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  distance?: number;
  ease?: string | MotionEase;
  trigger?: string | MotionTrigger;
  once?: boolean;
  scrub?: boolean | number;
}

const DEFAULTS: Required<RevealConfig> = {
  direction: "up",
  delay: 0,
  duration: MOTION.duration.base,
  distance: MOTION.distance.md,
  ease: MOTION.ease.smooth,
  trigger: MOTION.trigger.default,
  once: true,
  scrub: false,
};

function getFrom(direction: RevealDirection, distance: number): gsap.TweenVars {
  const base: gsap.TweenVars = { opacity: 0 };
  switch (direction) {
    case "up": return { ...base, y: distance };
    case "down": return { ...base, y: -distance };
    case "left": return { ...base, x: distance };
    case "right": return { ...base, x: -distance };
    case "scale": return { ...base, scale: 0.95 };
    case "fade": default: return base;
  }
}

export function useReveal<T extends HTMLElement = HTMLDivElement>(
  config: RevealConfig = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const { isInitialLoadComplete } = useLoading();

  const {
    direction = DEFAULTS.direction,
    delay = DEFAULTS.delay,
    duration = DEFAULTS.duration,
    distance = DEFAULTS.distance,
    ease = DEFAULTS.ease,
    trigger = DEFAULTS.trigger,
    once = DEFAULTS.once,
    scrub = DEFAULTS.scrub,
  } = config;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || !isInitialLoadComplete) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { reduced } = context.conditions as { reduced: boolean };

          if (reduced) {
            gsap.set(el, { opacity: 1, x: 0, y: 0, scale: 1, clearProps: "willChange" });
            return;
          }

          gsap.set(el, {
            ...getFrom(direction, distance),
            willChange: "transform, opacity",
          });

          gsap.to(el, {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            duration,
            delay,
            ease: resolveEase(ease),
            force3D: true,
            scrollTrigger: {
              trigger: el,
              start: resolveTrigger(trigger),
              once,
              scrub: scrub || false,
              toggleActions: once ? "play none none none" : "play none none reverse",
              fastScrollEnd: true,
              invalidateOnRefresh: true,
            },
            onComplete() {
              gsap.set(el, { clearProps: "willChange,transform" });
            },
          });
        }
      );
    }, el);

    return () => ctx.revert();
  }, [isInitialLoadComplete, direction, delay, duration, distance, ease, trigger, once, scrub]);

  return ref;
}