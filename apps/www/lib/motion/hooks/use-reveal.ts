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

type RevealShape = Required<Omit<RevealConfig, "trigger" | "once">>;

/** A reveal config resolved against the hook's own defaults. */
export function revealShape(config: RevealConfig = {}): RevealShape {
  return {
    direction: config.direction ?? DEFAULTS.direction,
    delay: config.delay ?? DEFAULTS.delay,
    duration: config.duration ?? DEFAULTS.duration,
    distance: config.distance ?? DEFAULTS.distance,
    ease: config.ease ?? DEFAULTS.ease,
    anticipate: config.anticipate ?? DEFAULTS.anticipate,
    scrub: config.scrub ?? DEFAULTS.scrub,
  };
}

/**
 * The site's reveal, as a reusable core: sets the from-state and plays the
 * entrance (with the anticipation beat when asked). `useReveal` passes a
 * scroll trigger; a surface replaying a reveal on a state change passes none
 * and it plays now. Full-motion tier only — callers own reduced motion.
 */
export function playRevealEnter(
  el: HTMLElement,
  shape: RevealShape,
  scrollTrigger?: ScrollTrigger.Vars,
): gsap.core.Animation {
  const { direction, delay, duration, distance, ease, anticipate, scrub } = shape;
  const from = revealFrom(direction, distance, readDirection(el));
  gsap.set(el, { ...from, willChange: "transform, opacity" });

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
    return gsap
      .timeline({ delay, scrollTrigger, onComplete: clearWillChange })
      .to(el, {
        ...beat,
        duration: duration * A.durationShare,
        ease: MOTION.ease.fade,
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
  }

  return gsap.to(el, {
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
            // The tween itself lives in `playRevealEnter`, shared with
            // surfaces that replay a reveal on demand. This hook adds only
            // the scroll trigger.
            playRevealEnter(
              el,
              { direction, delay, duration, distance, ease, anticipate, scrub },
              {
                trigger: el,
                start: resolveTrigger(trigger),
                once,
                scrub: scrub || false,
                toggleActions: once ? "play none none none" : "play none none reverse",
                fastScrollEnd: true,
                invalidateOnRefresh: true,
              },
            );
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
