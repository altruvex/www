"use client";

import { SectionSkeleton } from "@/components/section-skeleton";
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const ServicesSection = lazy(() =>
  import("@/components/sections/services-section").then((m) => ({
    default: m.ServicesSection,
  })),
);

const ProcessSection = lazy(() =>
  import("@/components/sections/process-section").then((m) => ({
    default: m.ProcessSection,
  })),
);

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

export function SceneInversionWrapper() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [entered, setEntered] = useState(false);
  const isDark = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof document === "undefined") {
        return () => undefined;
      }

      const observer = new MutationObserver(() => onStoreChange());
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      return () => observer.disconnect();
    },
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
    () => false,
  );

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !mounted) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const { gsap, ScrollTrigger } = await import("@/lib/gsap");

      if (cancelled || !wrapperRef.current) return;

      const ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: wrapperRef.current,
          start: "top 65%",
          once: true,
          onEnter: () => setEntered(true),
        });
      });

      cleanup = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [mounted]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !mounted) return;

    if (!entered) {
      el.style.backgroundColor = "transparent";
      return;
    }

    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--inverted-bg")
      .trim();
    el.style.backgroundColor = raw ? `hsl(${raw})` : "transparent";
  }, [entered, isDark, mounted]);

  return (
    <div
      id="services-wrapper"
      ref={wrapperRef}
      className="ps-section relative overflow-hidden transition-colors duration-420 ease-in-out rtl:text-right"
      data-scene={entered ? "inverted" : undefined}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: NOISE_SVG,
          opacity: isDark ? 0.018 : 0.012,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${
            isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)"
          } 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-1">
        <Suspense fallback={<SectionSkeleton />}>
          <ServicesSection />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <ProcessSection />
        </Suspense>
      </div>
    </div>
  );
}
