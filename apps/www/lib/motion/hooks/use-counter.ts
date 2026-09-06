"use client";

import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { RefObject, useRef } from "react";
import { MOTION, MotionEase, MotionTrigger, resolveEase, resolveTrigger } from "../tokens";
import { getConstrainedDevice } from "../utils/env";
import { whenMotionReady } from "../utils/ready";

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

/**
 * Number count-up. This is the one primitive that cannot be transform-only:
 * text changes lay out. Mitigations — `tabular-nums` so the glyph box never
 * changes width (no sibling reflow, the layout stays local), and the tween
 * runs on a plain object so GSAP does no style work beyond the one text write.
 *
 * Reduced motion / constrained: the final value is written immediately.
 */
export function useCounter<T extends HTMLElement = HTMLSpanElement>(
  config: CounterConfig,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

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
    if (!el) return;

    const fmt = (n: number): string => {
      if (format === "locale") return Math.floor(n).toLocaleString();
      return decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
    };

    if (!el.style.fontVariantNumeric) el.style.fontVariantNumeric = "tabular-nums";
    el.textContent = `${prefix}${fmt(from)}${suffix}`;

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

            if (reduced || getConstrainedDevice()) {
              el.textContent = `${prefix}${fmt(to)}${suffix}`;
              return;
            }

            const counter = { value: from };

            gsap.to(counter, {
              value: to,
              duration,
              delay,
              ease: resolveEase(ease),
              onUpdate() {
                el.textContent = `${prefix}${fmt(counter.value)}${suffix}`;
              },
              onComplete() {
                el.textContent = `${prefix}${fmt(to)}${suffix}`;
              },
              scrollTrigger: {
                trigger: el,
                start: resolveTrigger(trigger),
                once,
                fastScrollEnd: true,
                invalidateOnRefresh: true,
              },
            });
          },
        );
      }, el);
    });

    return () => {
      off();
      ctx?.revert();
    };
  }, [from, to, duration, delay, ease, trigger, once, prefix, suffix, decimals, format]);

  return ref;
}
