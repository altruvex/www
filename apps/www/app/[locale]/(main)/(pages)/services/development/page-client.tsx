"use client";
import { Container } from "@/components/container";
import { MagneticButton } from "@/components/magnetic-button";
import { SectionWatermark } from "@/components/section-watermark";
import { HeroReveal } from "@/components/sections/hero-motion-wrappers";
import { PipelineSection } from "@/components/sections/pipeline-section";
import { TechDNASection } from "@/components/tech-dna-section";
import { Link } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/commercial";
import { monoCaps } from "@/lib/mono-caps";
import { useSectionDescription, useSectionElement, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

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
  const tHero = useTranslations("hero");
  const projectRangeCta = getCommercialCta("projectRange");
  const realBuildCta = getCommercialCta("realBuild");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const ctaRef = useSectionElement();

  return (
    <section className="flex min-h-screen items-center pt-(--section-y-top) pb-(--section-y-bottom)">
      <SectionWatermark>02</SectionWatermark>
      <div className="pointer-events-none absolute inset-0 overflow-hidden block">
        <div className="absolute top-0 ltr:left-1/4 rtl:right-1/4 h-full w-px bg-foreground/6" />
        <div className="absolute top-0 ltr:right-1/4 rtl:left-1/4 h-full w-px bg-foreground/6" />
        <div className="absolute top-1/3 left-0 right-0 h-px bg-foreground/5" />
      </div>
      <div
        ref={eyebrowRef}
        className="absolute top-24 ltr:right-8 rtl:left-8 hidden lg:flex items-center gap-2"
      >
        <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
        <span className={cn(monoCaps, "text-foreground/50")}>
          {t("subtitle")}
        </span>
      </div>
      <Container>
        <div className="sm:max-w-5xl max-w-full">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span className={cn(monoCaps, "text-foreground/50")}>
              {t("subtitle")}
            </span>
          </div>
          <h1
            ref={titleRef}
            className="text-[clamp(3rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em] mb-8 font-sans font-light text-foreground select-none"
          >
            {t("title")}
            <br className="hidden sm:block" />
            <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
              {t("titleItalic")}
            </span>
          </h1>
          <div
            ref={descRef}
            className="mb-12 grid md:grid-cols-[80px_1fr] gap-8 items-start"
          >
            <div className="h-px w-full bg-foreground/8 mt-3 hidden md:block" />
            <p className="text-base text-primary/60 leading-relaxed max-w-[52ch]">
              {t("description")}
            </p>
          </div>
          <div
            ref={ctaRef}
            className="flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <MagneticButton
              size="lg"
              variant="primary"
              className="group w-full sm:w-auto"
            >
              <Link href={projectRangeCta.href}>
                <span className="flex items-center justify-center gap-2">
                  {tCTAs("projectRange")}
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:-rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </span>
              </Link>
            </MagneticButton>
            <MagneticButton
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto text-center"
            >
              <Link href={realBuildCta.href}>{tCTAs("realBuild")}</Link>
            </MagneticButton>
          </div>
        </div>
      </Container>
      <HeroReveal
        delay={1.1}
        className="pointer-events-none absolute bottom-8 inset-s-1/2 -translate-x-1/2 rtl:translate-x-1/2 hidden md:flex flex-col items-center gap-3 opacity-60 mix-blend-difference"
      >
        <p
          className="font-mono text-[9px] leading-none tracking-[0.3em] uppercase text-foreground rtl:font-sans rtl:normal-case rtl:tracking-normal"
          aria-hidden
        >
          {tHero("scrollHint")}
        </p>
        <div className="relative flex h-12 w-px justify-center overflow-hidden bg-foreground/10" aria-hidden>
          <div className="absolute top-0 h-1/2 w-full bg-foreground motion-safe:animate-[slide-down_1.5s_cubic-bezier(0.65,0,0.35,1)_infinite] motion-reduce:animate-none" />
        </div>
      </HeroReveal>
    </section>
  );
}

export function CtaSection() {
  const t = useTranslations("serviceDetails.development");
  const tCTAs = useTranslations("commercial.ctas");
  const projectRangeCta = getCommercialCta("projectRange");
  const cardRef = useSectionElement<HTMLDivElement>();

  return (
    <section className="pt-(--section-y-top) pb-(--section-y-bottom) bg-surface transition-colors duration-300">
      <Container>
        <div
          ref={cardRef}
          className="overflow-hidden rounded-section border border-border bg-card shadow-sm transition-all duration-300"
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
                "text-muted-foreground/60 mx-auto text-[11px] tracking-widest font-semibold"
              )}
            >
              new-project — bash
            </span>
            <div className="w-[42px]" />
          </div>
          <div className="grid md:grid-cols-2">
            <div className="space-y-5 border-b border-border bg-surface/50 p-8 font-mono text-[13px] leading-relaxed tracking-wide md:border-b-0 md:border-e md:p-10">
              <div className="flex gap-3 text-muted-foreground">
                <span className="select-none opacity-50">~</span>
                <span className="text-brand opacity-80">$</span>
                <span className="text-foreground font-medium">npx start-project</span>
              </div>
              <div className="pl-6 space-y-2 text-muted-foreground/70">
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
                <span className="text-brand opacity-80">$</span>
                <span className="text-foreground font-medium">contact --team</span>
              </div>
              <div className="flex gap-2 text-foreground/80 font-medium items-center">
                <span className="text-brand opacity-80">→</span>
                <span>{t("cta.terminal.ready")}</span>
                <span className="inline-block w-2 h-4 bg-foreground/40 animate-[pulse_1s_step-end_infinite] -mb-0.5" />
              </div>
            </div>
            <div className="p-8 md:p-10 flex flex-col justify-between gap-8">
              <div>
                <p
                  className={cn(
                    monoCaps,
                    "text-muted-foreground/60 mb-4 block text-xs tracking-[0.2em]"
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
                  {t("cta.title")}
                </h2>
                <p className="text-[15px] sm:text-base text-muted-foreground leading-relaxed max-w-[40ch] font-sans">
                  {t("cta.description")}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <MagneticButton
                  size="lg"
                  variant="primary"
                  className="group w-full"
                >
                  <Link
                    href={projectRangeCta.href}
                    className="flex w-full h-full items-center justify-center gap-2"
                  >
                    <span>{tCTAs("projectRange")}</span>
                    <svg
                      className="w-4 h-4 transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:-rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </Link>
                </MagneticButton>
                <MagneticButton
                  size="lg"
                  variant="secondary"
                  className="w-full"
                >
                  <Link
                    href="/services"
                    className="flex w-full h-full items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {t("cta.back")}
                  </Link>
                </MagneticButton>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}