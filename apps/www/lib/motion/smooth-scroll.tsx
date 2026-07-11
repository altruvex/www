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
            import("@/lib/motion/config"),
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

        // Handle page geometry changes automatically. ScrollTrigger needs its
        // start/end pixels recomputed on any body-height change — otherwise
        // reveals near the bottom of the page (e.g. the footer) keep stale
        // trigger positions when layout settles AFTER the triggers were created
        // (fonts loading, the giant footer wordmark reflowing, client-side route
        // changes) and can get stuck at opacity 0. When Lenis is active it also
        // needs its scroll bounds resized. This runs on touch too (where Lenis
        // is off but ScrollTrigger reveals still fire), since body-height shifts
        // don't emit a window resize event. Debounced to a single rAF so a burst
        // of resizes only triggers one refresh.
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
      resizeObserver?.disconnect();
    };
  }, []);

  return <>{children}</>;
}