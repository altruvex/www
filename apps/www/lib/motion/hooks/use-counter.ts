"use client";

import { useLoading } from "@/components/providers/loading-provider";
import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { RefObject, useRef } from "react";
import {
  MOTION,
  MotionEase,
  MotionTrigger,
  getConstrainedDevice,
  resolveEase,
  resolveTrigger,
} from "../config";

export interface CounterConfig {
  from?: number;
  to: number;
  duration?: number;
  delay?: number;
  ease?: string | MotionEase;
  trigger?: string | MotionTrigger;
  once?: boolean;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  format?: "none" | "locale";
}

export function useCounter<T extends HTMLElement = HTMLSpanElement>(
  config: CounterConfig,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const { isInitialLoadComplete } = useLoading();

  const {
    from = 0,
    to,
    duration = MOTION.duration.slow,
    delay = 0,
    ease = MOTION.ease.strong,
    trigger = MOTION.trigger.late,
    once = true,
    prefix = "",
    suffix = "",
    decimals = 0,
    format = "none",
  } = config;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || !isInitialLoadComplete) return;

    const fmt = (n: number): string => {
      if (format === "locale") return Math.floor(n).toLocaleString();
      return decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
    };

    el.textContent = `${prefix}${fmt(from)}${suffix}`;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        () => {
          if (
            window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
            getConstrainedDevice()
          ) {
            el.textContent = `${prefix}${fmt(to)}${suffix}`;
            return;
          }

          const counter = { value: from };
          const resolvedEasing = resolveEase(ease);
          const resolvedTriggering = resolveTrigger(trigger);

          gsap.to(counter, {
            value: to,
            duration,
            delay,
            ease: resolvedEasing,
            force3D: true,
            onUpdate() {
              el.textContent = `${prefix}${fmt(counter.value)}${suffix}`;
            },
            onComplete() {
              el.textContent = `${prefix}${fmt(to)}${suffix}`;
            },
            scrollTrigger: {
              trigger: el,
              start: resolvedTriggering,
              once,
              fastScrollEnd: true,
              invalidateOnRefresh: true,
            },
          });
        },
      );
    }, el);

    return () => ctx.revert();
  }, [isInitialLoadComplete, from, to, duration, delay, ease, trigger, once, prefix, suffix, decimals, format]);

  return ref;
}
