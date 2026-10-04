"use client";

import { MOTION } from "@/lib/motion/tokens";
import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { useRef, type ReactNode } from "react";

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
      data-nav-stage
      className={className}
    >
      {children}
    </div>
  );
}
