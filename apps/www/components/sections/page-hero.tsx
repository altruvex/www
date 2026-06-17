"use client";

import { Container } from "@/components/container";
import { useSectionTitle, useSectionEyebrow, useSectionDescription } from "@/lib/motion";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  titleItalic?: string;
  description: string;
  children?: ReactNode;
  className?: string;
  alignCenter?: boolean;
  minHeightClass?: string;
  showStatusIndicator?: boolean;
}

export function PageHero({
  eyebrow,
  title,
  titleItalic,
  description,
  children,
  className,
  alignCenter = false,
  minHeightClass = "min-h-screen",
  showStatusIndicator = false,
}: PageHeroProps) {
  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement & HTMLDivElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement & HTMLDivElement>();

  return (
    <section className={cn("accent-world-blue flex items-center pt-(--section-y-top) pb-(--section-y-bottom)", minHeightClass, className)}>
      <Container>
        <div className={cn("w-full", alignCenter ? "mx-auto max-w-2xl text-center flex flex-col items-center" : "sm:max-w-5xl max-w-full")}>
          {eyebrow && (
            <div
              ref={eyebrowRef}
              className={cn(
                "mb-6 flex items-center gap-2",
                alignCenter ? "justify-center" : "inline-flex"
              )}
            >
              {showStatusIndicator && (
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse shrink-0" />
              )}
              <p className="eyebrow text-muted-foreground/70">
                {eyebrow}
              </p>
            </div>
          )}
          <h1
            ref={titleRef}
            className={cn(
              "text-[clamp(3rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em] mb-8 font-sans font-light text-foreground select-none",
              alignCenter && "mx-auto text-center"
            )}
          >
            {title}
            {titleItalic && (
              <>
                <br />
                <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
                  {titleItalic}
                </span>
              </>
            )}
          </h1>
          <div className={cn("grid gap-8 items-start mb-12", alignCenter ? "justify-center w-full" : "grid-cols-1 md:grid-cols-[80px_1fr]")}>
            {!alignCenter && <div className="h-px w-full bg-foreground/8 mt-3 hidden md:block" />}
            <p
              ref={descRef}
              className={cn("text-base text-primary/60 leading-relaxed max-w-[52ch]", alignCenter && "mx-auto text-center")}
            >
              {description}
            </p>
          </div>
          {children}
        </div>
      </Container>
    </section>
  );
}
