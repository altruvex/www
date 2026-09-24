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
  /**
   * Blur-in per fragment. `filter` is not a compositor-only property: each
   * blurred fragment re-rasterises every frame for the tween's length. It is
   * therefore a one-shot enter effect only (never interaction-frequency),
   * gated to fine-pointer + non-constrained devices and capped at
   * `MOTION.text.blurCap` fragments.
   */
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

/** A text config resolved against the hook's own defaults, as an entrance shape. */
export function textShape(config: TextConfig = {}) {
  return {
    shape: {
      duration: config.duration ?? DEFAULTS.duration,
      stagger: config.stagger ?? DEFAULTS.stagger,
      distance: config.distance ?? DEFAULTS.distance,
      ease: config.ease ?? DEFAULTS.ease,
      blur: config.blur ?? DEFAULTS.blur,
      delay: config.delay ?? DEFAULTS.delay,
    },
    splitBy: config.splitBy ?? DEFAULTS.splitBy,
  };
}

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

            // ── Reduced-motion tier: whole-element opacity settle ────────
            // No split: a reduced-motion user never sees the stagger, so
            // there is no reason to rewrite their DOM.
            if (reduced) {
              gsap.fromTo(
                el,
                { opacity: 0 },
                { opacity: 1, ...REDUCED_FADE, clearProps: "opacity,filter" },
              );
              return;
            }

            const constrained = readMotionEnv().constrained;

            // The split and the entrance itself live in `text-enter`, shared
            // with surfaces that replay it on demand — one text animation for
            // the whole site. This hook adds only the scroll trigger.
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

            // ── Accent sweep ─────────────────────────────────────────────
            // `<Accent animate="sweep">` gradients wipe across the phrase
            // once, in lockstep with the reveal. Panning one inherited custom
            // property moves every fragment's gradient as a single sheet.
            // This is a paint-bound (background-position) one-shot; it is
            // never interaction-frequency and is off on constrained devices.
            if (!constrained) {
              const sweepAccents = Array.from(
                el.querySelectorAll<HTMLElement>('[data-accent-anim="sweep"]'),
              );
              // Batch the reads before any write.
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
                // Arabic fragments are `display:inline` (shaping must not break),
                // and inline boxes can't be transformed — opacity only there.
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

      // Gradient-accent fragments are aligned to the phrase's measured layout
      // at split time. Reflow (viewport resize, font swap, locale change)
      // shifts those measurements, so re-align on resize.
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
