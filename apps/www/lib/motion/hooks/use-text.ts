"use client";

import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { RefObject, useRef } from "react";
import { MOTION, MotionEase, MotionTrigger, resolveEase, resolveTrigger } from "../tokens";
import { REDUCED_FADE, readMotionEnv } from "../utils/env";
import { whenMotionReady } from "../utils/ready";
import { alignAccentGradients } from "../utils/splite";
import { splitText, textEnterVars } from "../utils/text-enter";

export interface TextConfig {
  delay?: number;
  duration?: number;
  stagger?: number;
  distance?: number;
  ease?: string | MotionEase;
  trigger?: string | MotionTrigger;
  once?: boolean;
  splitBy?: "char" | "word" | "line";
  blur?: boolean;
  scrubExit?: boolean;
}

const DEFAULTS: Required<TextConfig> = {
  delay: 0,
  duration: MOTION.duration.text,
  stagger: MOTION.stagger.base,
  distance: MOTION.distance.md,
  ease: MOTION.ease.text,
  trigger: MOTION.trigger.default,
  once: true,
  splitBy: "word",
  blur: true,
  scrubExit: false,
};

export function useText<T extends HTMLElement = HTMLHeadingElement>(
  config: TextConfig = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  const {
    delay = DEFAULTS.delay,
    duration = DEFAULTS.duration,
    stagger = DEFAULTS.stagger,
    distance = DEFAULTS.distance,
    ease = DEFAULTS.ease,
    trigger = DEFAULTS.trigger,
    once = DEFAULTS.once,
    splitBy = DEFAULTS.splitBy,
    blur = DEFAULTS.blur,
    scrubExit = DEFAULTS.scrubExit,
  } = config;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ctx: gsap.Context | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeFrame = 0;

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

            if (reduced) {
              gsap.fromTo(
                el,
                { opacity: 0 },
                { opacity: 1, ...REDUCED_FADE, clearProps: "opacity,filter" },
              );
              return;
            }

            const constrained = readMotionEnv().constrained;

            const split = splitText(el, splitBy);
            const { targets, isRTL } = split;
            const { from, to } = textEnterVars(split, {
              duration,
              stagger,
              distance,
              ease,
              blur,
              delay,
            });

            gsap.set(targets, from);

            const resolvedEasing = resolveEase(ease);
            const resolvedTriggering = resolveTrigger(trigger);

            gsap.to(targets, {
              ...to,
              scrollTrigger: {
                trigger: el,
                start: resolvedTriggering,
                once,
                fastScrollEnd: true,
                toggleActions: once ? "play none none none" : "play none none reverse",
                invalidateOnRefresh: true,
              },
            });

            if (!constrained) {
              const sweepAccents = Array.from(
                el.querySelectorAll<HTMLElement>('[data-accent-anim="sweep"]'),
              );
              const widths = sweepAccents.map((a) => a.getBoundingClientRect().width);
              sweepAccents.forEach((accentEl, i) => {
                const accentWidth = widths[i];
                if (!accentWidth) return;
                gsap.fromTo(
                  accentEl,
                  { "--sweep-x": `${isRTL ? accentWidth : -accentWidth}px` },
                  {
                    "--sweep-x": "0px",
                    duration: duration * MOTION.accent.sweepRatio,
                    delay: delay + MOTION.accent.sweepDelay,
                    ease: resolvedEasing,
                    scrollTrigger: {
                      trigger: el,
                      start: resolvedTriggering,
                      once,
                      fastScrollEnd: true,
                      toggleActions: once ? "play none none none" : "play none none reverse",
                    },
                  },
                );
              });
            }

            if (scrubExit && !constrained) {
              const section = el.closest("section") ?? el;
              gsap.to(targets, {
                yPercent: isRTL ? 0 : -20,
                opacity: 0,
                ease: MOTION.ease.fadeOut,
                overwrite: "auto",
                force3D: true,
                scrollTrigger: {
                  trigger: section,
                  start: "center top",
                  end: "bottom top",
                  scrub: MOTION.parallax.scrub,
                },
              });
            }
          },
        );
      }, el);

      resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => alignAccentGradients(el));
      });
      resizeObserver.observe(el);
    });

    return () => {
      off();
      cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      ctx?.revert();
    };
  }, [delay, duration, stagger, distance, ease, trigger, once, splitBy, blur, scrubExit]);

  return ref;
}
