"use client";

import { Container } from "@/components/container";
import { MagneticButton } from "@/components/magnetic-button";
import { SectionWatermark } from "@/components/section-watermark";
import { PipelineSection } from "@/components/sections/pipeline-section";
import { TechDNASection } from "@/components/tech-dna-section";
import { Link } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/commercial";
import { monoCaps } from "@/lib/mono-caps";
import { DEFAULTS, MOTION, useReveal, useText } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";

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
  const tCommon = useTranslations("common");
  const tCTAs = useTranslations("commercial.ctas");
  const projectRangeCta = getCommercialCta("projectRange");
  const realBuildCta = getCommercialCta("realBuild");

  const eyebrowRef = useReveal({ ...DEFAULTS.body, delay: 0 });
  const titleRef = useText(DEFAULTS.heading);
  const descRef = useReveal({ ...DEFAULTS.body, delay: 0.15 });
  const ctaRef = useReveal({ ...DEFAULTS.element, delay: 0.25 });
  const scrollRef = useReveal({
    ...DEFAULTS.element,
    direction: "fade",
    delay: 0.45,
  });

  return (
    <section className="relative flex min-h-[80vh] lg:min-h-screen w-full flex-col justify-end overflow-hidden pt-(--section-y-top) pb-(--section-y-bottom)">
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
      <div
        ref={scrollRef}
        className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2"
        aria-hidden="true"
      >
        <p className={cn(monoCaps, "text-muted-foreground/70")}>
          {tCommon("scroll")}
        </p>
        <div className="relative h-10 w-px overflow-hidden bg-foreground/8">
          <div className="absolute top-0 h-1/2 w-full bg-foreground/40 animate-slide-down" />
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  const t = useTranslations("serviceDetails.development");
  const tCTAs = useTranslations("commercial.ctas");
  const projectRangeCta = getCommercialCta("projectRange");
  const cardRef = useReveal<HTMLDivElement>({
    ...DEFAULTS.body,
    ease: MOTION.ease.smooth,
  });

  return (
    <section className="pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8">
      <Container>
        <div
          ref={cardRef}
          className="border border-foreground/8 rounded-2xl overflow-hidden"
        >
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-foreground/8 bg-foreground/2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            </div>
            <span className={cn(monoCaps, "text-muted-foreground/70 mx-auto")}>
              new-project - bash
            </span>
          </div>
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-10 border-b border-foreground/8 md:border-b-0 ltr:md:border-r rtl:md:border-l font-mono text-sm leading-normal tracking-wider space-y-3">
              <div className="flex gap-3 text-primary/70">
                <span className="select-none">~</span>
                <span className="text-primary/70">$</span>
                <span className="text-primary/70">npx start-project</span>
              </div>
              <div className="pl-6 space-y-1.5 text-primary/30">
                <div>✓ {t("cta.terminal.step1")}</div>
                <div>✓ {t("cta.terminal.step2")}</div>
                <div>✓ {t("cta.terminal.step3")}</div>
              </div>
              <div className="flex gap-3 text-primary/70">
                <span className="select-none">~</span>
                <span className="text-primary/70">$</span>
                <span className="text-primary/70">contact --team</span>
              </div>
              <div className="flex gap-2 text-primary/55">
                <span>→</span>
                <span>{t("cta.terminal.ready")}</span>
                <span className="inline-block w-2 h-4 bg-primary/35 animate-pulse" />
              </div>
            </div>
            <div className="p-8 md:p-10 flex flex-col justify-between gap-8">
              <div>
                <p
                  className={cn(
                    monoCaps,
                    "text-muted-foreground/70 mb-5 block",
                  )}
                >
                  {t("cta.eyebrow")}
                </p>
                <h2
                  className="font-sans font-normal text-primary leading-[1.05] mb-4"
                  style={{
                    fontSize: "clamp(22px, 3.5vw, 38px)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {t("cta.title")}
                </h2>
                <p className="text-base text-primary/60 leading-relaxed max-w-[40ch]">
                  {t("cta.description")}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <MagneticButton
                  size="lg"
                  variant="primary"
                  className="group w-full justify-center"
                >
                  <Link href={projectRangeCta.href}>
                    <span className="flex items-center gap-2">
                      {tCTAs("projectRange")}
                      <svg
                        className="w-4 h-4 transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:-rotate-180"
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
                  className="w-full justify-center"
                >
                  <Link href="/services">{t("cta.back")}</Link>
                </MagneticButton>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
