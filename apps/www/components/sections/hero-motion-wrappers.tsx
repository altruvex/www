"use client";

import { useBatch } from "@/lib/motion/hooks/use-batch";
import { useReveal } from "@/lib/motion/hooks/use-reveal";
import { useText } from "@/lib/motion/hooks/use-text";
import { motion } from "@/lib/motion/utils/presets";
import { type ReactNode } from "react";

interface HeroHeadlineProps {
  children: ReactNode;
  className?: string;
}

export function HeroHeadline({ children, className }: HeroHeadlineProps) {
  const ref = useText<HTMLDivElement>(motion.heroHeadline());

  return (
    <div ref={ref} className={className} aria-hidden>
      {children}
    </div>
  );
}

interface HeroRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
}

export function HeroReveal({
  children,
  className,
  delay = 0,
  distance,
}: HeroRevealProps) {
  const ref = useReveal<HTMLDivElement>(motion.fadeUp({ delay, distance }));

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

interface HeroBatchProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function HeroBatch({ children, className, delay = 0 }: HeroBatchProps) {
  const ref = useBatch<HTMLDivElement>(motion.listItems({ delay }));

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
