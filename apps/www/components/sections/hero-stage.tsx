"use client";

import { MOTION } from "@/lib/motion/tokens";
import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { useRef, type ReactNode } from "react";

/*
 * The homepage hero stage: an inset dark island (scene-inverted, locked dark in
 * both themes) that the header reads as "over the stage" (data-nav-stage).
 *
 * The entrance is not here. The photo settles and the copy rises through the
 * first-paint arrival (data-arrive in hero-section.server.tsx,
 * lib/motion/utils/arrival.ts): CSS that starts with first paint, so it never
 * waits for this component to hydrate. What this adds is the living stage
 * afterwards: the photo trails the scroll (0.85×) and, on fine pointers,
 * drifts up to 12px against the cursor. Both move [data-hero-photo] /
 * [data-hero-zoom], never the arriving <img> inside them.
 */

/** Pointer parallax reach, px each way. The photo layer carries 14px of slack. */
const PARALLAX_REACH = 12;

export function HeroStage({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const photo = stage.querySelector<HTMLElement>("[data-hero-photo]");
    const zoom = stage.querySelector<HTMLElement>("[data-hero-zoom]");
    const mm = gsap.matchMedia();

    // Scroll: the photo trails the stage (stage 1.0, photo 0.85).
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (!photo) return;
      gsap.to(photo, {
        y: () => stage.offsetHeight * MOTION.parallax.slow,
        ease: "none",
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    });

    // Pointer: fine pointers only.
    mm.add("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)", () => {
      if (!zoom) return;
      const toX = gsap.quickTo(zoom, "x", { duration: MOTION.duration.base, ease: MOTION.ease.strong });
      const toY = gsap.quickTo(zoom, "y", { duration: MOTION.duration.base, ease: MOTION.ease.strong });
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const b = stage.getBoundingClientRect();
        toX(-((e.clientX - b.left) / b.width - 0.5) * 2 * PARALLAX_REACH);
        toY(-((e.clientY - b.top) / b.height - 0.5) * 2 * PARALLAX_REACH);
      };
      const onLeave = () => {
        toX(0);
        toY(0);
      };
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerleave", onLeave);
      return () => {
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerleave", onLeave);
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <div
      ref={stageRef}
      data-scene="inverted"
      data-scene-lock="dark"
      data-nav-invert
      data-nav-stage
      className={className}
    >
      {children}
    </div>
  );
}
