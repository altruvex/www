"use client";

import { setLenis } from "@/lib/motion/lenis-instance";
import { checkCssMotionTokens } from "@/lib/motion/utils/css-tokens";
import type Lenis from "lenis";
import { useEffect } from "react";

export function SmoothScrollProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  useEffect(() => {
    checkCssMotionTokens();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let gsapRef: typeof import("@/lib/utils/gsap") | null = null;
    let lenisRef: Lenis | null = null;
    let tickFn: ((time: number) => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const init = async () => {
      try {
        const [{ gsap, ScrollTrigger }, { default: Lenis }, { MOTION }] =
          await Promise.all([
            import("@/lib/utils/gsap"),
            import("lenis"),
            import("@/lib/motion/tokens"),
          ]);

        if (cancelled) return;

        gsapRef = { gsap, ScrollTrigger };
        const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

        if (!isTouch && !prefersReducedMotion) {
          const lenis = new Lenis({
            duration: MOTION.lenis.duration,
            easing: MOTION.lenis.easing,
            smoothWheel: MOTION.lenis.smoothWheel,
            autoRaf: false,
          });

          lenisRef = lenis;
          setLenis(lenis);

          lenis.on("scroll", ScrollTrigger.update);

          tickFn = (time: number) => lenis.raf(time * 1000);
          gsap.ticker.add(tickFn);
          gsap.ticker.lagSmoothing(0);
        }

        let refreshPending = false;
        resizeObserver = new ResizeObserver(() => {
          lenisRef?.resize();
          if (!refreshPending) {
            refreshPending = true;
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
              refreshPending = false;
            });
          }
        });
        resizeObserver.observe(document.body);

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
      setLenis(null);
      resizeObserver?.disconnect();
    };
  }, []);

  return <>{children}</>;
}