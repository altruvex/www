"use client";

import type { ReactNode } from "react";

import { Container } from "@/components/shared/container";
import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { SectionWatermark } from "@/components/section-watermark";
import { HeroScrollHint } from "@/components/sections/hero-scroll-hint";
import { Highlight } from "@/components/ui/emphasis";
import { monoCaps } from "@/lib/utils/mono-caps";
import {
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn } from "@/lib/utils/utils";

type ServiceHeroProps = {
  watermark: string;
  subtitle: string;
  title: string;
  titleItalic: string;
  description: ReactNode;
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
  showScrollHint?: boolean;
  showMobileSubtitle?: boolean;
  titleSize?: "default" | "large";
  gridVisibility?: "always" | "md-up";
  showHorizontalGridLine?: boolean;
};

function HeroGridOverlay({
  visibility,
  showHorizontalLine,
}: {
  visibility: "always" | "md-up";
  showHorizontalLine: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        visibility === "md-up" ? "hidden md:block" : "block",
      )}
      aria-hidden
    >
      <div className="absolute top-0 ltr:left-1/4 rtl:right-1/4 h-full w-px bg-foreground/6" />
      <div className="absolute top-0 ltr:right-1/4 rtl:left-1/4 h-full w-px bg-foreground/6" />
      {showHorizontalLine ? (
        <div className="absolute top-1/3 left-0 right-0 h-px bg-foreground/5" />
      ) : null}
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <>
      <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
      <span className={cn(monoCaps, "text-foreground/50")}>{label}</span>
    </>
  );
}

export function ServiceHero({
  watermark,
  subtitle,
  title,
  titleItalic,
  description,
  primaryCta,
  secondaryCta,
  showScrollHint = true,
  showMobileSubtitle = true,
  titleSize = "default",
  gridVisibility = "always",
  showHorizontalGridLine = true,
}: ServiceHeroProps) {
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const ctaRef = useSectionElement();

  return (
    <section className="relative accent-world-blue flex min-h-screen items-center pt-(--section-y-top) pb-(--section-y-bottom)">
      <SectionWatermark>{watermark}</SectionWatermark>
      <HeroGridOverlay
        visibility={gridVisibility}
        showHorizontalLine={showHorizontalGridLine}
      />
      <div
        ref={eyebrowRef}
        className="absolute top-24 ltr:right-8 rtl:left-8 hidden lg:flex items-center gap-2"
      >
        <StatusPill label={subtitle} />
      </div>
      <Container>
        <div className="sm:max-w-5xl max-w-full">
          {showMobileSubtitle ? (
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <StatusPill label={subtitle} />
            </div>
          ) : null}
          <h1
            ref={titleRef}
            className={cn(
              "mb-8 font-sans font-light text-foreground select-none",
              titleSize === "default" &&
              "text-[clamp(3rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em]",
              titleSize === "large" &&
              "mb-10 font-normal text-primary leading-[1.03] rtl:leading-[1.2]",
            )}
            style={
              titleSize === "large"
                ? {
                  fontSize: "clamp(44px, 7vw, 96px)",
                  letterSpacing: "-0.025em",
                }
                : undefined
            }
          >
            {title}
            <br className="hidden sm:block" />
            <Highlight
              className={cn(titleSize === "large" && "block mt-2 sm:mt-0")}
            >
              {titleItalic}
            </Highlight>
          </h1>
          <div
            ref={descRef}
            className="mb-12 grid md:grid-cols-[80px_1fr] gap-8 items-start"
          >
            <div
              className="h-px w-full bg-foreground/8 mt-3 hidden md:block"
              aria-hidden
            />
            <p className="text-base text-primary/60 leading-relaxed max-w-[52ch]">
              {description}
            </p>
          </div>
          <CtaButtonGroup
            ref={ctaRef}
            primary={primaryCta}
            secondary={secondaryCta}
          />
        </div>
      </Container>
      {showScrollHint ? <HeroScrollHint /> : null}
    </section>
  );
}
