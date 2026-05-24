"use client";

import type Lenis from "lenis";
import { useEffect } from "react";

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
    let resizeObserver: ResizeObserver | null = null;

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
        const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

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

          // Handle page geometry changes automatically
          resizeObserver = new ResizeObserver(() => {
            lenis.resize();
          });
          resizeObserver.observe(document.body);
        }

        requestAnimationFrame(() => {
          if (!cancelled) ScrollTrigger.refresh();
        });
      } catch (e) {
        console.warn("Smooth scroll initialization bypassed:", e);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (gsapRef && tickFn) {
        gsapRef.gsap.ticker.remove(tickFn);
      }
      lenisRef?.destroy();
      resizeObserver?.disconnect();
    };
  }, []);

  return <>{children}</>;
}