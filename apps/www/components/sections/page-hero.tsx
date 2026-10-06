"use client";

import { Container } from "@/components/shared/container";
import { Eyebrow, Highlight } from "@repo/ui/www";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";
import { HeroHeadline, HeroReveal } from "./hero-motion-wrappers";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  titleItalic?: string;
  description: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHero({
  eyebrow,
  title,
  titleItalic,
  description,
  children,
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "accent-world-blue relative w-full pt-(--section-y-top) pb-16 md:pb-20",
        className,
      )}
    >
      <Container className="pt-10 md:pt-14">
        {eyebrow && (
          <HeroReveal delay={0.2} className="mb-6">
            <Eyebrow>{eyebrow}</Eyebrow>
          </HeroReveal>
        )}

        <div className="flex flex-col gap-7 lg:gap-8">
          <HeroHeadline
            as="h1"
            className="max-w-6xl text-balance font-sans text-[clamp(2.75rem,6vw,6.25rem)] leading-[1.05] font-light tracking-[-0.03em] text-foreground select-none lg:leading-[1.02] rtl:tracking-normal"
          >
            {titleItalic ? <span className="block">{title}</span> : title}
            {titleItalic && (
              <Highlight tone="soft" className="block tracking-[-0.02em] rtl:tracking-normal">
                {titleItalic}
              </Highlight>
            )}
          </HeroHeadline>

          <HeroReveal delay={0.5} className="max-w-[46ch]">
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {description}
            </p>
          </HeroReveal>
        </div>

        {children && (
          <HeroReveal delay={0.65} className="mt-12 border-t-2 border-foreground pt-4 md:mt-16">
            {children}
          </HeroReveal>
        )}
      </Container>
    </section>
  );
}
