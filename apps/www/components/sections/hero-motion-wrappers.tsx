"use client";

import { useReveal } from "@/lib/motion/hooks/use-reveal";
import { useText } from "@/lib/motion/hooks/use-text";
import { motion } from "@/lib/motion/utils/presets";
import { type ElementType, type ReactNode } from "react";

interface HeroHeadlineProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  id?: string;
}

export function HeroHeadline({ children, className, as: Tag = "div", id }: HeroHeadlineProps) {
  const ref = useText(motion.heroHeadline());

  return (
    <Tag ref={ref} className={className} id={id}>
      {children}
    </Tag>
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
