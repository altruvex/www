"use client";

import { SectionSkeleton } from "@/components/shared/section-skeleton";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

/** Derived from the module so the context stays typed without an `any` escape. */
type GsapContext = ReturnType<
  (typeof import("@/lib/utils/gsap"))["gsap"]["context"]
>;

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
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // `cancelled` matters: the import resolves asynchronously, so without it an
    // unmount before resolution leaves a ScrollTrigger that cleanup already
    // missed (ctx was still undefined when the cleanup ran).
    let cancelled = false;
    let ctx: GsapContext | undefined;

    void import("@/lib/utils/gsap").then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;

      ctx = gsap.context(() => {
        // gsap.matchMedia is how every other surface on this site branches on
        // reduced motion. The inversion is a design state, not motion: reduced
        // motion drops the scroll gate and the transition, never the scene.
        const mm = gsap.matchMedia();

        mm.add(
          {
            motion: "(prefers-reduced-motion: no-preference)",
            reduced: "(prefers-reduced-motion: reduce)",
          },
          (context) => {
            const { reduced } = context.conditions as { reduced: boolean };

            if (reduced) {
              setEntered(true);
              return;
            }

            ScrollTrigger.create({
              trigger: wrapper,
              start: "top 60%",
              once: true,
              onEnter: () => setEntered(true),
            });
          },
        );
      });
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div
      id="services-wrapper"
      ref={wrapperRef}
      // duration-300/ease-smooth matches the transition the children already
      // run, so the scene settles as one surface instead of snapping.
      className="relative overflow-hidden transition-colors duration-300 ease-smooth motion-reduce:transition-none"
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
