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

export function SceneInversionWrapper() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const [entered, setEntered] = useState(false);

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
      className="ps-section relative overflow-hidden rtl:text-right"
      data-scene={entered ? "inverted" : undefined}
    >
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