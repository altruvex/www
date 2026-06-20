"use client";

import { useLoading } from "@/components/providers/loading-provider";
import { useIsomorphicLayoutEffect } from "@/lib/dom-utils";
import { gsap } from "@/lib/gsap";
import { RefObject, useRef } from "react";
import { MOTION, getConstrainedDevice, resolveEase, resolveTrigger, MotionEase, MotionTrigger } from "../config";
import { REDUCED_FADE } from "../utils/env";
import { autoSplit } from "../utils/splite";

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

const MAX_TOTAL_STAGGER_DURATION = 0.6;

export function useText<T extends HTMLElement = HTMLHeadingElement>(
  config: TextConfig = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const { isInitialLoadComplete } = useLoading();

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
    if (!el || !isInitialLoadComplete) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        () => {
          // ── Reduced-motion tier ──────────────────────────────────────────
          // Was: gsap.set(el, { opacity: 1, y: 0, x: 0, filter: "none" })
          //      — instant, no signal that content settled in.
          // Now: short opacity-only settle on the whole element (not the
          // split chars/words — no point splitting text a reduced-motion
          // user will never see staggered). No transform/blur.
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            gsap.fromTo(
              el,
              { opacity: 0 },
              { opacity: 1, ...REDUCED_FADE, clearProps: "opacity,filter" },
            );
            return;
          }

          const constrained = getConstrainedDevice();
          let targets: Element[];
          let isRTL = false;
          let canBlur = blur && !constrained;

          const alreadySplit = el.hasAttribute("data-m-split");

          if (!alreadySplit) {
            el.setAttribute("data-m-split", splitBy);
            const result = autoSplit(el, splitBy);
            targets = result.targets;
            isRTL = result.isRTL;
            canBlur = blur && result.canBlur && !constrained;
          } else {
            const splitType = el.getAttribute("data-m-split");
            const selector = splitType === "char" ? ".m-char" : splitType === "word" ? ".m-word" : ".m-line";
            targets = Array.from(el.querySelectorAll(selector));
            isRTL = targets.some((t) => (t as HTMLElement).dataset.script === "arabic");
            canBlur = blur && !isRTL && !constrained;
          }

          if (!targets.length) targets = [el];
          
          const effectiveStagger = targets.length > 1
            ? Math.min(stagger, MAX_TOTAL_STAGGER_DURATION / targets.length)
            : stagger;

          const fromVars: gsap.TweenVars = {
            opacity: 0,
            y: distance,
            willChange: "transform, opacity",
          };

          if (!constrained) fromVars.scale = 0.96;
          if (canBlur) fromVars.filter = "blur(4px)";

          gsap.set(targets, fromVars);

          const resolvedEasing = resolveEase(ease);
          const resolvedTriggering = resolveTrigger(trigger);

          const animProps: gsap.TweenVars = {
            opacity: 1,
            y: 0,
            duration,
            stagger: { each: effectiveStagger, from: isRTL ? "end" : "start" },
            delay,
            ease: resolvedEasing,
            force3D: true,
            overwrite: "auto",
            scrollTrigger: {
              trigger: el,
              start: resolvedTriggering,
              once,
              fastScrollEnd: true,
              toggleActions: once ? "play none none none" : "play none none reverse",
              invalidateOnRefresh: true,
            },
            onComplete() {
              gsap.set(targets, { clearProps: "willChange,filter,transform" });
            },
          };

          if (!constrained) animProps.scale = 1;
          if (canBlur) animProps.filter = "blur(0px)";

          gsap.to(targets, animProps);

          if (scrubExit && !constrained) {
            const section = el.closest("section") ?? el;
            gsap.to(targets, {
              yPercent: isRTL ? 0 : -20,
              opacity: 0,
              ease: "power1.in",
              overwrite: "auto",
              force3D: true,
              scrollTrigger: {
                trigger: section,
                start: "center top",
                end: "bottom top",
                scrub: 1.5,
              },
            });
          }
        }
      );
    }, el);

    return () => ctx.revert();
  }, [isInitialLoadComplete, delay, duration, stagger, distance, ease, trigger, once, splitBy, blur, scrubExit]);

  return ref;
}
