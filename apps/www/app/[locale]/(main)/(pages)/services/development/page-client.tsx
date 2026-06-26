"use client";
import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { PipelineSection } from "@/components/sections/pipeline-section";
import { ServiceHero } from "@/components/sections/service-hero";
import { TechDNASection } from "@/components/sections/tech-dna-section";
import { Container } from "@/components/shared/container";
import { Accent } from "@/components/ui/emphasis";
import { accentWorldClass } from "@/lib/config/accent-world";
import { getCommercialCta } from "@/lib/config/commercial";
import { useSectionElement } from "@/lib/motion";
import { monoCaps } from "@/lib/utils/mono-caps";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { bodyMarks } from "@/components/ui/rich-text";

export default function DevelopmentPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <HeroSection />
      <TechDNASection />
      <PipelineSection />
      <CtaSection />
    </div>
  );
}

function HeroSection() {
  const t = useTranslations("serviceDetails.development");
  const tCTAs = useTranslations("commercial.ctas");
  const projectRangeCta = getCommercialCta("projectRange");
  const realBuildCta = getCommercialCta("realBuild");

  return (
    <ServiceHero
      watermark="02"
      subtitle={t("subtitle")}
      title={t("title")}
      titleItalic={t("titleItalic")}
      description={t.rich("description", bodyMarks)}
      primaryCta={{ href: projectRangeCta.href, label: tCTAs("projectRange") }}
      secondaryCta={{ href: realBuildCta.href, label: tCTAs("realBuild") }}
    />
  );
}

export function CtaSection() {
  const t = useTranslations("serviceDetails.development");
  const tCTAs = useTranslations("commercial.ctas");
  const projectRangeCta = getCommercialCta("projectRange");
  const cardRef = useSectionElement<HTMLDivElement>();

  return (
    <section
      className={cn("pt-(--section-y-top) pb-(--section-y-bottom) bg-surface transition-colors duration-300", accentWorldClass("orange"))}
    >
      <Container>
        <div
          ref={cardRef}
          // FIX: transition-all duration-300 with no hover/focus/state
          // variant on this element - nothing here was ever animating on
          // interaction. The only realistic trigger is a light/dark theme
          // swap re-coloring the CSS variables, in which case you only
          // need transition-colors (bg/border/shadow-color), not "all"
          // watching every animatable property for no reason.
          className="overflow-hidden rounded-section border border-border bg-card shadow-sm transition-colors duration-300"
        >
          <div className="flex items-center gap-3 border-b border-border bg-surface px-5 py-3">
            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full border border-border bg-error shadow-sm" />
              <div className="h-3 w-3 rounded-full border border-border bg-warning shadow-sm" />
              <div className="h-3 w-3 rounded-full border border-border bg-success shadow-sm" />
            </div>
            <span
              className={cn(
                monoCaps,
                "text-muted-foreground mx-auto text-sm tracking-widest font-semibold"
              )}
            >
              new-project - bash
            </span>
            <div className="w-[42px]" />
          </div>
          <div className="grid md:grid-cols-2">
            <div className="space-y-5 border-b border-border bg-surface/50 p-8 font-mono text-[13px] leading-relaxed tracking-wide md:border-b-0 md:border-e md:p-10">
              <div className="flex gap-3 text-muted-foreground">
                <span className="select-none opacity-50">~</span>
                <span className="text-local-accent opacity-80">$</span>
                <span className="text-foreground font-medium">npx start-project</span>
              </div>
              <div className="pl-6 space-y-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-success">✓</span> {t("cta.terminal.step1")}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-success">✓</span> {t("cta.terminal.step2")}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-success">✓</span> {t("cta.terminal.step3")}
                </div>
              </div>
              <div className="flex gap-3 text-muted-foreground">
                <span className="select-none opacity-50">~</span>
                <span className="text-local-accent opacity-80">$</span>
                <span className="text-foreground font-medium">contact --team</span>
              </div>
              <div className="flex gap-2 text-foreground/80 font-medium items-center">
                <span className="text-local-accent opacity-80">→</span>
                <span>{t("cta.terminal.ready")}</span>
                {/*
                  FIX: animate-[pulse_1s_step-end_infinite] reuses
                  Tailwind's built-in "pulse" keyframe, which animates
                  opacity 1 -> 0.5 -> 1 (an ease-in-out fade), not 1 -> 0.
                  Pairing it with step-end timing doesn't fix that - the
                  cursor was visibly dimming, never actually
                  disappearing, which reads as "broken" rather than as a
                  blinking terminal caret. Defining a real two-state
                  keyframe locally so it hard-cuts like an actual cursor.
                */}
                <span className="inline-block w-2 h-4 bg-foreground/40 -mb-0.5 animate-[altruvex-caret-blink_1s_steps(1,end)_infinite]" />
                <style>{`
                  @keyframes altruvex-caret-blink {
                    50% { opacity: 0; }
                  }
                `}</style>
              </div>
            </div>
            <div className="p-8 md:p-10 flex flex-col justify-between gap-8">
              <div>
                <p
                  className={cn(
                    monoCaps,
                    "text-local-accent mb-4 block text-xs tracking-[0.2em]"
                  )}
                >
                  {t("cta.eyebrow")}
                </p>
                <h2
                  className="font-sans font-light text-foreground leading-[1.05] mb-5 tracking-tight"
                  style={{
                    fontSize: "clamp(22px, 3.5vw, 38px)",
                  }}
                >
                  {t("cta.title")} <Accent gradient="ember">{t("cta.titleAccent")}</Accent>
                </h2>
                <p className="text-[15px] sm:text-base text-muted-foreground leading-relaxed max-w-[40ch] font-sans">
                  {t.rich("cta.description", bodyMarks)}
                </p>
              </div>
              <CtaButtonGroup
                primaryVariant="accent"
                primary={{ href: projectRangeCta.href, label: tCTAs("projectRange") }}
                secondary={{ href: "/services", label: t("cta.back") }}
                className="flex-col gap-3 sm:flex-col sm:items-stretch"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}