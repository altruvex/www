"use client";

import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { MOTION } from "@/lib/motion/config";
import { useRef } from "react";

// Next.js re-mounts template.tsx on every client navigation, which makes it the
// correct home for a route-enter transition (unlike layout.tsx, which persists).
// A module-level flag survives these re-mounts, so we skip the very first mount:
// the initial-loader already owns that paint, and animating here too would
// double up.
let hasMounted = false;

/**
 * Route-enter transition. Communicated state: "new page content has arrived."
 * 8px lift + fade, ~350ms — the same restrained vocabulary as the section
 * reveals, just at page granularity. Opacity-only under reduced motion.
 */
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
