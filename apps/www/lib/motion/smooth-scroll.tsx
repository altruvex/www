"use client";

import { useEffect } from "react";
import type Lenis from "lenis";

export function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let cancelled = false;
    let gsapRef: typeof import("@/lib/gsap") | null = null;
    let lenisRef: Lenis | null = null;
    let tickFn: ((time: number) => void) | null = null;

    const init = async () => {
      try {
        const [{ gsap, ScrollTrigger }, { default: Lenis }, { MOTION }] =
          await Promise.all([
            import("@/lib/gsap"),
            import("lenis"),
            import("@/lib/motion/config"),
          ]);

        if (cancelled) return;

        gsapRef = { gsap, ScrollTrigger };
        const isTouch = window.matchMedia(
          "(hover: none) and (pointer: coarse)",
        ).matches;

        if (!isTouch) {
          const lenis = new Lenis({
            duration: MOTION.lenis.duration,
            easing: MOTION.lenis.easing,
            smoothWheel: MOTION.lenis.smoothWheel,
          });

          lenisRef = lenis;
          let stPending = false;
          lenis.on("scroll", () => {
            if (!stPending) {
              stPending = true;
              requestAnimationFrame(() => {
                ScrollTrigger.update();
                stPending = false;
              });
            }
          });
          tickFn = (time: number) => lenis.raf(time * 1000);
          gsap.ticker.add(tickFn);

          gsap.ticker.lagSmoothing(0);
        }

        requestAnimationFrame(() => {
          if (!cancelled) ScrollTrigger.refresh();
        });
      } catch (e) {
        console.warn("Failed to initialize smooth scroll:", e);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (gsapRef && tickFn) {
        gsapRef.gsap.ticker.remove(tickFn);
      }
      lenisRef?.destroy();
    };
  }, []);

  return <>{children}</>;
}
