/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { SectionSkeleton } from "@/components/shared/section-skeleton";
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
      if (typeof document === "undefined") return () => undefined;
      const observer = new MutationObserver(() => onStoreChange());
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => observer.disconnect();
    },
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
    () => false,
  );

  useEffect(() => {
    if (!wrapperRef.current || !mounted) return;
    let ctx: any;
    void import("@/lib/utils/gsap").then(({ gsap, ScrollTrigger }) => {
      if (!wrapperRef.current) return;

      ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: wrapperRef.current,
          start: "top 60%",
          once: true,
          onEnter: () => setEntered(true),
        });
      });
    });

    return () => {
      if (ctx) ctx.revert();
    };
  }, [mounted]);
  return (
    <div
      id="services-wrapper"
      ref={wrapperRef}
      className="ps-section relative overflow-hidden transition-colors duration-800 ease-[cubic-bezier(0.16,1,0.3,1)] bg-transparent data-[scene=inverted]:bg-inverted-bg rtl:text-right"
      data-scene={entered ? "inverted" : undefined}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-0 mix-blend-overlay transition-opacity duration-800"
        style={{
          backgroundImage: NOISE_SVG,
          opacity: isDark ? 0.025 : 0.015,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-800"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--scene-dot) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
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