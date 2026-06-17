"use client";

import { useTranslations } from "next-intl";
import { HeroReveal } from "./hero-motion-wrappers";
import { cn } from "@/lib/utils";

interface HeroScrollHintProps {
  label?: string;
  delay?: number;
  className?: string;
}

export function HeroScrollHint({
  label,
  delay = 1.1,
  className,
}: HeroScrollHintProps) {
  const t = useTranslations("hero");
  const text = label ?? t("scrollHint");

  return (
    <HeroReveal
      delay={delay}
      className={cn(
        "pointer-events-none absolute bottom-8 inset-s-1/2 -translate-x-1/2 rtl:translate-x-1/2 hidden md:flex flex-col items-center gap-3 opacity-60 mix-blend-difference",
        className,
      )}
    >
      <p
        className="font-mono text-xs leading-none tracking-[0.3em] uppercase text-foreground rtl:font-sans rtl:normal-case rtl:tracking-normal"
        aria-hidden
      >
        {text}
      </p>
      <div
        className="relative flex h-12 w-px justify-center overflow-hidden bg-foreground/10"
        aria-hidden
      >
        <div className="absolute top-0 h-1/2 w-full bg-foreground motion-safe:animate-[slide-down_1.5s_cubic-bezier(0.65,0,0.35,1)_infinite] motion-reduce:animate-none" />
      </div>
    </HeroReveal>
  );
}
