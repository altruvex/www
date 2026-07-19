"use client";

import { useLoading } from "@/components/providers/loading-provider";
import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { RefObject, useRef } from "react";
import { MOTION, MotionEase, MotionTrigger, resolveEase, resolveTrigger } from "../config";
import { REDUCED_FADE } from "../utils/env";

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
  /**
   * Anticipation micro-beat (principles M2): a small counter-movement away
   * from rest while the element fades partway in, before the main ease-out
   * settle. Only meaningful for directional/scale reveals; ignored for
   * `fade` and under reduced motion. Off by default.
   */
  anticipate?: boolean;
}

// Anticipation beat shape: ~8% extra travel opposite the settle, spending
// ~18% of the duration, surfacing at 35% opacity so the wind-up is visible.
const ANTICIPATION = { travel: 0.08, durationShare: 0.18, opacity: 0.35 } as const;

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
    anticipate = DEFAULTS.anticipate,
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

          // ── Reduced-motion tier ──────────────────────────────────────────
          // Was: gsap.set(el, { opacity: 1, x: 0, y: 0, scale: 1, clearProps: "willChange" })
          //      - a hard snap that destroys the "new content" signal entirely.
          // Now: short opacity-only settle. No transform/scale/blur, no scroll
          // dependency. Opacity is a visual change, not vestibular movement, so
          // it stays safe under prefers-reduced-motion while keeping the page
          // from feeling dead. (MDN dissolve guidance; WCAG Media Queries L5.)
          if (reduced) {
            gsap.fromTo(
              el,
              { opacity: 0 },
              { opacity: 1, ...REDUCED_FADE, clearProps: "opacity" },
            );
            return;
          }

          // ── Full-motion tier ─────────────────────────────────────────────
          const from = getFrom(direction, distance);
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

          // Anticipation beat (M2): drift ~8% further from rest at partial
          // opacity, then hand over to the main ease-out settle. Fade has no
          // travel to counter, and scrub ties progress to scroll — both skip.
          const canAnticipate = anticipate && direction !== "fade" && !scrub;

          if (canAnticipate) {
            const beat: gsap.TweenVars = { opacity: ANTICIPATION.opacity };
            if (direction === "scale") {
              beat.scale = 1 - (1 - (from.scale as number)) * (1 + ANTICIPATION.travel);
            } else {
              const axis = direction === "up" || direction === "down" ? "y" : "x";
              beat[axis] = (from[axis] as number) * (1 + ANTICIPATION.travel);
            }
            gsap
              .timeline({ delay, scrollTrigger, onComplete: clearWillChange })
              .to(el, {
                ...beat,
                duration: duration * ANTICIPATION.durationShare,
                ease: "power1.out",
              })
              .to(el, {
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
                duration: duration * (1 - ANTICIPATION.durationShare),
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
        }
      );
    }, el);

    return () => ctx.revert();
  }, [isInitialLoadComplete, direction, delay, duration, distance, ease, trigger, once, scrub, anticipate]);

  return ref;
}
