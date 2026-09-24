"use client";

import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";
import { HeroHeadline, HeroReveal } from "./hero-motion-wrappers";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  titleItalic?: string;
  description: ReactNode;
  /** Facts about the page itself, set under the same 2px ink rule the
      homepage hero opens its readout with. Omit it rather than invent one. */
  children?: ReactNode;
  className?: string;
  minHeightClass?: string;
}

/**
 * The homepage hero's structure for simple pages: bottom-anchored, start
 * aligned, eyebrow → h1 with its Highlight line → one paragraph → an optional
 * record under an ink rule. Same scale, same load-time motion, no status dot.
 */
export function PageHero({
  eyebrow,
  title,
  titleItalic,
  description,
  children,
  className,
  minHeightClass = "lg:min-h-dvh",
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "accent-world-blue relative flex w-full flex-col justify-end pt-(--section-y-top) pb-(--section-y-bottom)",
        minHeightClass,
        className,
      )}
    >
      <Container className="flex w-full flex-col justify-end py-12 lg:py-0">
        {eyebrow && (
          <HeroReveal delay={0.2} className="mb-6">
            <Eyebrow>{eyebrow}</Eyebrow>
          </HeroReveal>
        )}

        <HeroHeadline
          as="h1"
          className="mb-7 max-w-176 font-sans text-[clamp(3rem,4.5vw,4.5rem)] leading-[1.05] font-light tracking-[-0.03em] text-foreground select-none md:mb-8 lg:leading-[1.02] rtl:tracking-normal"
        >
          {titleItalic ? <span className="block">{title}</span> : title}
          {titleItalic && (
            <Highlight className="block tracking-[-0.02em] rtl:tracking-normal">
              {titleItalic}
            </Highlight>
          )}
        </HeroHeadline>

        <HeroReveal delay={0.5} className="max-w-2xl">
          <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
            {description}
          </p>
        </HeroReveal>

        {children && (
          <HeroReveal delay={0.65} className="mt-12 border-t-2 border-foreground pt-4 md:mt-16">
            {children}
          </HeroReveal>
        )}
      </Container>
    </section>
  );
}
