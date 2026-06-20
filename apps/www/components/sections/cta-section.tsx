"use client";
import { Container } from "@/components/container";
import { Accent } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowLabel } from "@/components/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { Link } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/commercial";
import { accentWorldClass } from "@/lib/accent-world";
import { useSectionDescription, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { useTranslations } from "next-intl";
import { useRef } from "react";

export function CtaSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const t = useTranslations("commercial.cta");
  const tCTAs = useTranslations("commercial.ctas");
  const callCta = getCommercialCta("technicalCall");
  const scopeCta = getCommercialCta("projectRange");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const contentRef = useSectionDescription();

  return (
    <section
      ref={sectionRef}
      id="cta"
      className={`relative overflow-hidden pt-(--section-y-top) pb-(--section-y-bottom) ${accentWorldClass("orange")}`}
      aria-label={t("sectionAriaLabel")}
    >
      <Container>
        <div className="h-px w-full bg-local-accent/40 mb-16" />
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:items-start">
          <div className="min-w-0">
            <Eyebrow ref={eyebrowRef} className="text-muted-foreground/70 mb-6 block">
              {t("eyebrow")}
            </Eyebrow>
            <h2
              ref={titleRef}
              className="text-[clamp(2.125rem,4vw,3.25rem)] leading-[1.08] tracking-[-0.02em] max-w-4xl font-normal text-primary"
            >
              {t("title")} <Accent gradient="ember">{t("titleAccent")}</Accent>
            </h2>
          </div>
          <div ref={contentRef} className="flex min-w-0 flex-col gap-6">
            <p className="eyebrow text-xs text-local-accent">
              {t("nextStepEyebrow")}
            </p>
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {t("body")}
            </p>
            <div className="flex flex-col gap-3">
              <MagneticButton asChild size="lg" variant="accent">
                <Link href={callCta.href}>
                  <ArrowLabel>{tCTAs("technicalCall")}</ArrowLabel>
                </Link>
              </MagneticButton>
              <MagneticButton asChild size="lg" variant="secondary">
                <Link href={scopeCta.href}>
                  <ArrowLabel>{tCTAs("projectRange")}</ArrowLabel>
                </Link>
              </MagneticButton>
            </div>
            <p className="eyebrow text-xs text-muted-foreground/55 text-center">
              {t("footnote")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}