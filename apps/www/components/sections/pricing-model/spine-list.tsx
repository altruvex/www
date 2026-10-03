"use client";

import { MOTION } from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * The client island of the pricing spine. Each stage settles once as it
 * enters: its figure lands, then the line to the next stage draws down. The
 * markup is the finished spine, so reduced motion renders it untouched.
 */
export function SpineList({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const stages = gsap.utils.toArray<HTMLElement>("[data-spine-stage]", list);

        const cleanups = stages.map((stage) => {
          const settle = stage.querySelectorAll("[data-spine-settle]");
          const line = stage.querySelector("[data-spine-line]");

          gsap.set(settle, { opacity: 0, y: MOTION.distance.xs });
          if (line) gsap.set(line, { scaleY: 0 });

          const timeline = gsap.timeline({ paused: true }).to(settle, {
            opacity: 1,
            y: 0,
            duration: MOTION.duration.base,
            ease: MOTION.ease.strong,
            stagger: MOTION.stagger.base,
          });
          if (line) {
            timeline.to(
              line,
              {
                scaleY: 1,
                duration: MOTION.duration.slow,
                ease: MOTION.ease.gentle,
              },
              `<${MOTION.stagger.sequence}`,
            );
          }

          const trigger = ScrollTrigger.create({
            trigger: stage,
            start: MOTION.trigger.latest,
            once: true,
            onEnter: () => timeline.play(),
          });

          return () => {
            trigger.kill();
            timeline.kill();
          };
        });

        return () => cleanups.forEach((cleanup) => cleanup());
      });
    }, list);

    return () => ctx.revert();
  }, []);

  return (
    <ol ref={listRef} className={className}>
      {children}
    </ol>
  );
}
