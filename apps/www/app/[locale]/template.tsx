"use client";

import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { MOTION } from "@/lib/motion/config";
import { useRef } from "react";

let hasMounted = false;

export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!hasMounted) {
      hasMounted = true;
      return;
    }

    const ctx = gsap.context(() => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      gsap.fromTo(
        el,
        { autoAlpha: 0, y: reduce ? 0 : MOTION.distance.xs },
        {
          autoAlpha: 1,
          y: 0,
          duration: reduce ? 0.2 : MOTION.duration.drawer,
          ease: MOTION.ease.strong,
          clearProps: "transform,opacity,visibility",
        },
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}
