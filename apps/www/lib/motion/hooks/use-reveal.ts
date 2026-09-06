"use client";

import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { RefObject, useRef } from "react";
import { MOTION, MotionEase, MotionTrigger, resolveEase, resolveTrigger } from "../tokens";
import { inlineSign, readDirection, type Direction } from "../utils/direction";
import { REDUCED_FADE } from "../utils/env";
import { whenMotionReady } from "../utils/ready";

/**
 * `up` / `down` / `left` / `right` are PHYSICAL (same in every locale).
 * `start` / `end` are LOGICAL: the element slides in from the inline-start
 * or inline-end edge, so an RTL page mirrors automatically. Prefer logical.
 */
export type RevealDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "start"
  | "end"
  | "fade"
  | "scale";

export interface RevealConfig {
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  distance?: number;
  ease?: string | MotionEase;
  trigger?: string | MotionTrigger;
  once?: boolean;
  scrub?: boolean | number;
  /**
   * Anticipation micro-beat (principles M2): a small counter-movement away
   * from rest while the element fades partway in, before the main ease-out
   * settle. Only meaningful for directional/scale reveals; ignored for
   * `fade` and under reduced motion. Off by default.
   */
  anticipate?: boolean;
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
  anticipate: false,
};

export function revealFrom(
  direction: RevealDirection,
  distance: number,
  dir: Direction,
): gsap.TweenVars {
  const base: gsap.TweenVars = { opacity: 0 };
  switch (direction) {
    case "up": return { ...base, y: distance };
    case "down": return { ...base, y: -distance };
    case "left": return { ...base, x: distance };
    case "right": return { ...base, x: -distance };
    // From the inline-start edge: −x in LTR, +x in RTL.
    case "start": return { ...base, x: -distance * inlineSign(dir) };
    case "end": return { ...base, x: distance * inlineSign(dir) };
    case "scale": return { ...base, scale: 0.95 };
    case "fade": default: return base;
  }
}

export function useReveal<T extends HTMLElement = HTMLDivElement>(
  config: RevealConfig = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  const {
    direction = DEFAULTS.direction,
    delay = DEFAULTS.delay,
    duration = DEFAULTS.duration,
    distance = DEFAULTS.distance,
    ease = DEFAULTS.ease,
    trigger = DEFAULTS.trigger,
    once = DEFAULTS.once,
    scrub = DEFAULTS.scrub,
    anticipate = DEFAULTS.anticipate,
  } = config;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ctx: gsap.Context | null = null;

    const off = whenMotionReady(() => {
      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add(
          {
            motion: "(prefers-reduced-motion: no-preference)",
            reduced: "(prefers-reduced-motion: reduce)",
          },
          (context) => {
            const { reduced } = context.conditions as { reduced: boolean };

            // ── Reduced-motion tier: opacity-only settle ─────────────────
            if (reduced) {
              gsap.fromTo(
                el,
                { opacity: 0 },
                { opacity: 1, ...REDUCED_FADE, clearProps: "opacity" },
              );
              return;
            }

            // ── Full-motion tier ─────────────────────────────────────────
            const from = revealFrom(direction, distance, readDirection(el));
            gsap.set(el, { ...from, willChange: "transform, opacity" });

            const scrollTrigger: ScrollTrigger.Vars = {
              trigger: el,
              start: resolveTrigger(trigger),
              once,
              scrub: scrub || false,
              toggleActions: once ? "play none none none" : "play none none reverse",
              fastScrollEnd: true,
              invalidateOnRefresh: true,
            };
            const clearWillChange = () => {
              gsap.set(el, { clearProps: "willChange,transform" });
            };

            const canAnticipate = anticipate && direction !== "fade" && !scrub;

            if (canAnticipate) {
              const A = MOTION.anticipation;
              const beat: gsap.TweenVars = { opacity: A.opacity };
              if (direction === "scale") {
                beat.scale = 1 - (1 - (from.scale as number)) * (1 + A.travel);
              } else {
                const axis = direction === "up" || direction === "down" ? "y" : "x";
                beat[axis] = (from[axis] as number) * (1 + A.travel);
              }
              gsap
                .timeline({ delay, scrollTrigger, onComplete: clearWillChange })
                .to(el, {
                  ...beat,
                  duration: duration * A.durationShare,
                  ease: "power1.out",
                })
                .to(el, {
                  opacity: 1,
                  x: 0,
                  y: 0,
                  scale: 1,
                  duration: duration * (1 - A.durationShare),
                  ease: resolveEase(ease),
                  force3D: true,
                });
              return;
            }

            gsap.to(el, {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              duration,
              delay,
              ease: resolveEase(ease),
              force3D: true,
              scrollTrigger,
              onComplete: clearWillChange,
            });
          },
        );
      }, el);
    });

    return () => {
      off();
      ctx?.revert();
    };
  }, [direction, delay, duration, distance, ease, trigger, once, scrub, anticipate]);

  return ref;
}
