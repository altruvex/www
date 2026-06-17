"use client";
import { Container } from "@/components/container";
import { MagneticButton } from "@/components/magnetic-button";
import { ServiceHero } from "@/components/sections/service-hero";
import { PipelineSection } from "@/components/sections/pipeline-section";
import { TechDNASection } from "@/components/tech-dna-section";
import { Link } from "@/i18n/navigation";
import { accentWorldClass } from "@/lib/accent-world";
import { getCommercialCta } from "@/lib/commercial";
import { monoCaps } from "@/lib/mono-caps";
import { useSectionElement } from "@/lib/motion";
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
  const projectRangeCta = getCommercialCta("projectRange");
  const realBuildCta = getCommercialCta("realBuild");

  return (
    <ServiceHero
      watermark="02"
      subtitle={t("subtitle")}
      title={t("title")}
      titleItalic={t("titleItalic")}
      description={t("description")}
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
                "text-muted-foreground/60 mx-auto text-sm tracking-widest font-semibold"
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
                <span className="text-local-accent opacity-80">$</span>
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
                <span className="text-local-accent opacity-80">$</span>
                <span className="text-foreground font-medium">contact --team</span>
              </div>
              <div className="flex gap-2 text-foreground/80 font-medium items-center">
                <span className="text-local-accent opacity-80">→</span>
                <span>{t("cta.terminal.ready")}</span>
                <span className="inline-block w-2 h-4 bg-foreground/40 animate-[pulse_1s_step-end_infinite] -mb-0.5" />
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
                  {t("cta.title")}
                </h2>
                <p className="text-[15px] sm:text-base text-muted-foreground leading-relaxed max-w-[40ch] font-sans">
                  {t("cta.description")}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <MagneticButton asChild
                  size="lg"
                  variant="accent"
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
                <MagneticButton asChild
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