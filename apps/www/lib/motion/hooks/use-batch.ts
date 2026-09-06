"use client";

import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { RefObject, useRef } from "react";
import { MOTION, MotionEase, MotionTrigger, resolveEase, resolveTrigger } from "../tokens";
import { readDirection } from "../utils/direction";
import { REDUCED_FADE, getConstrainedDevice } from "../utils/env";
import { whenMotionReady } from "../utils/ready";
import { RevealDirection, revealFrom } from "./use-reveal";

export interface BatchConfig {
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  distance?: number;
  stagger?: number;
  ease?: string | MotionEase;
  trigger?: string | MotionTrigger;
  once?: boolean;
  selector?: string;
  /** Alternate odd/even items from opposite inline sides (needs a horizontal direction). */
  alternate?: boolean;
  batchMax?: number;
}

const DEFAULTS = {
  direction: "up" as RevealDirection,
  delay: 0,
  duration: MOTION.duration.base,
  distance: MOTION.distance.md,
  stagger: MOTION.stagger.base,
  ease: MOTION.ease.smooth,
  trigger: MOTION.trigger.default,
  once: true,
  selector: "",
  alternate: false,
  batchMax: 6,
} as const;

const OPPOSITE: Partial<Record<RevealDirection, RevealDirection>> = {
  left: "right",
  right: "left",
  start: "end",
  end: "start",
};

/** Reduced-motion stagger: kept tiny because it costs no vestibular risk and preserves "arriving as a group". */
const REDUCED_STAGGER = 0.02;

export function useBatch<T extends HTMLElement = HTMLDivElement>(
  config: BatchConfig = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  const {
    direction = DEFAULTS.direction,
    delay = DEFAULTS.delay,
    duration = DEFAULTS.duration,
    distance = DEFAULTS.distance,
    stagger = DEFAULTS.stagger,
    ease = DEFAULTS.ease,
    trigger = DEFAULTS.trigger,
    once = DEFAULTS.once,
    selector = DEFAULTS.selector,
    alternate = DEFAULTS.alternate,
    batchMax = DEFAULTS.batchMax,
  } = config;

  useIsomorphicLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;

    let ctx: gsap.Context | null = null;

    const off = whenMotionReady(() => {
      const items = selector
        ? Array.from(container.querySelectorAll<HTMLElement>(selector))
        : (Array.from(container.children) as HTMLElement[]);

      if (!items.length) return;

      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add(
          {
            motion: "(prefers-reduced-motion: no-preference)",
            reduced: "(prefers-reduced-motion: reduce)",
          },
          (context) => {
            const { reduced } = context.conditions as { reduced: boolean };

            // ── Reduced-motion tier ──────────────────────────────────────
            if (reduced) {
              gsap.fromTo(
                items,
                { opacity: 0 },
                {
                  opacity: 1,
                  ...REDUCED_FADE,
                  stagger: REDUCED_STAGGER,
                  clearProps: "opacity,willChange",
                },
              );
              return;
            }

            const dir = readDirection(container);
            const constrained = getConstrainedDevice();
            const effectiveDistance = constrained ? Math.round(distance * 0.6) : distance;
            const resolvedEasing = resolveEase(ease);
            const resolvedTriggering = resolveTrigger(trigger);
            const opposite = OPPOSITE[direction];
            const useAlternate = alternate && opposite !== undefined;

            if (useAlternate) {
              const evens = items.filter((_, i) => i % 2 === 0);
              const odds = items.filter((_, i) => i % 2 === 1);
              gsap.set(evens, {
                ...revealFrom(direction, effectiveDistance, dir),
                willChange: "transform, opacity",
              });
              gsap.set(odds, {
                ...revealFrom(opposite, effectiveDistance, dir),
                willChange: "transform, opacity",
              });

              items.forEach((item, i) => {
                gsap.to(item, {
                  opacity: 1,
                  x: 0,
                  y: 0,
                  scale: 1,
                  duration,
                  delay: delay + i * stagger,
                  ease: resolvedEasing,
                  force3D: true,
                  overwrite: "auto",
                  scrollTrigger: {
                    trigger: item,
                    start: resolvedTriggering,
                    once,
                    fastScrollEnd: true,
                    toggleActions: once ? "play none none none" : "play none none reverse",
                    invalidateOnRefresh: true,
                  },
                  onComplete() {
                    gsap.set(item, { clearProps: "willChange,transform" });
                  },
                });
              });
              return;
            }

            const from = revealFrom(direction, effectiveDistance, dir);
            gsap.set(items, { ...from, willChange: "transform, opacity" });

            ScrollTrigger.batch(items, {
              start: resolvedTriggering,
              once,
              batchMax,
              onEnter(batch: Element[]) {
                gsap.to(batch, {
                  opacity: 1,
                  x: 0,
                  y: 0,
                  scale: 1,
                  duration,
                  delay,
                  ease: resolvedEasing,
                  force3D: true,
                  stagger: { each: stagger },
                  onComplete() {
                    gsap.set(batch, { clearProps: "willChange,transform" });
                  },
                });
              },
              onLeaveBack: once
                ? undefined
                : (batch: Element[]) => {
                    gsap.to(batch, {
                      ...from,
                      duration: duration * 0.6,
                      ease: "power1.in",
                      force3D: true,
                      overwrite: "auto",
                      onStart() {
                        gsap.set(batch, { willChange: "transform, opacity" });
                      },
                      onComplete() {
                        gsap.set(batch, { clearProps: "willChange,transform" });
                      },
                    });
                  },
            });
          },
        );
      }, container);
    });

    return () => {
      off();
      ctx?.revert();
    };
  }, [direction, delay, duration, distance, stagger, ease, trigger, once, selector, alternate, batchMax]);

  return ref;
}
