"use client";

import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { RefObject, useRef } from "react";
import { MOTION } from "../tokens";
import { inlineSign, readDirection } from "../utils/direction";
import { getConstrainedDevice } from "../utils/env";
import { whenMotionReady } from "../utils/ready";

export interface ParallaxConfig {
  /** Fraction of viewport travel. Default `MOTION.parallax.base`. */
  speed?: number;
  /** `y` (physical) or `x` (LOGICAL — mirrored in RTL). */
  direction?: "y" | "x";
  /** Scrub lag in seconds (or `true` for lock-step). Default `MOTION.parallax.scrub`. */
  scrub?: number | boolean;
  /** Progress source: the nearest `<section>` or the element itself. */
  anchor?: "section" | "self";
}

/**
 * Scroll-linked parallax on `yPercent`/`xPercent` via ScrollTrigger scrub.
 * Scroll position is read by ScrollTrigger (one cached read per scroll
 * event, applied on the GSAP ticker), never by a raw `scroll` listener.
 *
 * Reduced motion / constrained: the element stays at rest — parallax is
 * decorative, there is no meaningful reduced form.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(
  config: ParallaxConfig = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  const {
    speed = MOTION.parallax.base,
    direction = "y",
    scrub = MOTION.parallax.scrub,
    anchor = "section",
  } = config;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ctx: gsap.Context | null = null;

    const off = whenMotionReady(() => {
      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add("(prefers-reduced-motion: no-preference)", () => {
          if (getConstrainedDevice()) return;

          const trigger = anchor === "section" ? (el.closest("section") ?? el) : el;
          const travel = speed * MOTION.parallax.travelScale;
          const sign = direction === "x" ? inlineSign(readDirection(el)) : 1;
          const prop = direction === "y" ? "yPercent" : "xPercent";

          gsap.fromTo(
            el,
            { [prop]: -travel * sign },
            {
              [prop]: travel * sign,
              ease: "none",
              force3D: true,
              scrollTrigger: {
                trigger,
                start: "top bottom",
                end: "bottom top",
                scrub,
                invalidateOnRefresh: true,
              },
            },
          );
        });
      }, el);
    });

    return () => {
      off();
      ctx?.revert();
    };
  }, [speed, direction, scrub, anchor]);

  return ref;
}
