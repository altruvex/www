"use client";

import { useLoading } from "@/components/providers/loading-provider";
import { useIsomorphicLayoutEffect } from "@/lib/dom-utils";
import { gsap } from "@/lib/gsap";
import { RefObject, useRef } from "react";
import { getConstrainedDevice } from "../config";

export interface ParallaxConfig {
  speed?: number;
  direction?: "y" | "x";
  scrub?: number | boolean;
  anchor?: "section" | "self";
}

export function useParallax<T extends HTMLElement = HTMLDivElement>(
  config: ParallaxConfig = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const { isInitialLoadComplete } = useLoading();

  const {
    speed = 0.3,
    direction = "y",
    scrub = 1.5,
    anchor = "section",
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
          if (
            window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
            getConstrainedDevice()
          ) {
            return;
          }

          const trigger = anchor === "section"
            ? (el.closest("section") ?? el)
            : el;

          const travel = speed * 20;
          const prop = direction === "y" ? "yPercent" : "xPercent";

          gsap.fromTo(
            el,
            { [prop]: -travel },
            {
              [prop]: travel,
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
        },
      );
    }, el);

    return () => ctx.revert();
  }, [isInitialLoadComplete, speed, direction, scrub, anchor]);

  return ref;
}
