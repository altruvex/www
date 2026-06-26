"use client";
import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useSectionDescription, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { SectionHeading } from "./section-heading";
import { getCommercialCta } from "@/lib/config/commercial";
import { accentWorldClass } from "@/lib/config/accent-world";
import { Container } from "../shared/container";

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
          <SectionHeading
            eyebrowRef={eyebrowRef}
            titleRef={titleRef}
            eyebrow={t("eyebrow")}
            firstTitle={t("title")}
            secondTitle={t("titleAccent")}
            accent="ember"
            secondTitleBreak={false}
            className="block min-w-0"
            classes={{
              titleWrapper: "space-y-0",
              eyebrow: "text-muted-foreground mb-6 block",
              title: "text-[clamp(2.125rem,4vw,3.25rem)] leading-[1.08] tracking-[-0.02em] max-w-4xl font-normal text-primary",
            }}
          />
          <div ref={contentRef} className="flex min-w-0 flex-col gap-6">
            <Eyebrow tone="accent" className="text-xs">{t("nextStepEyebrow")}</Eyebrow>
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {t("body")}
            </p>
            <CtaButtonGroup
              primaryVariant="accent"
              primary={{ href: callCta.href, label: tCTAs("technicalCall") }}
              secondary={{ href: scopeCta.href, label: tCTAs("projectRange") }}
              secondaryArrow
              className="flex-col gap-3 sm:flex-col sm:items-stretch"
            />
            <Eyebrow className="text-xs text-center">{t("footnote")}</Eyebrow>
          </div>
        </div>
      </Container>
    </section>
  );
}