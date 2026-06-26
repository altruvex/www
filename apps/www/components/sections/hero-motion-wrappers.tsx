"use client";

import { MOTION } from "@/lib/motion/config";
import { useBatch } from "@/lib/motion/hooks/use-batch";
import { useCounter } from "@/lib/motion/hooks/use-counter";
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
  const ref = useReveal<HTMLDivElement>(motion.heroReveal({ delay, distance }));

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

function parseMetricValue(raw: string): { num: number; suffix: string } {
  const match = raw.match(/^([\d.]+)(.*)$/);
  if (!match) return { num: 0, suffix: raw };
  return { num: parseFloat(match[1]), suffix: match[2] };
}

export function HeroMetricValue({ value, delay = 0 }: { value: string; delay?: number }) {
  const { num, suffix } = parseMetricValue(value);
  const ref = useCounter<HTMLSpanElement>({
    to: num,
    suffix,
    duration: MOTION.duration.slow,
    delay: 0.9 + delay,
    ease: MOTION.ease.strong,
    trigger: "top 110%",
    once: true,
  });
  return <span ref={ref}>{value}</span>;
}
