"use client";
import { PageHero } from "@/components/sections/page-hero";
import { Container } from "@/components/container";
import { ArrowLabel } from "@/components/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { Link } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/commercial";
import { useSectionCardGrid, useSectionDescription, useSectionElement, useSectionTitle } from "@/lib/motion";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function ApproachPage() {
  return (
    <div className="relative min-h-screen w-full">
      <OpeningSection />
      <ProblemSection />
      <DecisionsSection />
      <ConstraintsSection />
      <BilingualSection />
      <BoundariesSection />
      <ClosingSection />
    </div>
  );
}

function OpeningSection() {
  const t = useTranslations("approach.hero");

  return (
    <PageHero
      title={t("title")}
      description={t("description")}
    />
  );
}

function ProblemSection() {
  const t = useTranslations("approach.contrasts");
  const sectionRef = useSectionCardGrid<HTMLElement>({
    selector: "[data-contrast-item]",
  });
  const titleRef = useSectionTitle();

  const contrasts = [
    { common: t("1.common"), altruvex: t("1.altruvex") },
    { common: t("2.common"), altruvex: t("2.altruvex") },
    { common: t("3.common"), altruvex: t("3.altruvex") },
  ];

  return (
    <section
      ref={sectionRef}
      className="accent-world-green pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="mb-16">
          <h2
            ref={titleRef}
            className="mb-3 font-sans font-normal text-primary"
          >
            {t("label.common")} vs {t("label.altruvex")}
          </h2>
        </div>
        <div className="space-y-12">
          {contrasts.map((contrast, i) => (
            <div
              key={i}
              data-contrast-item
              className="grid gap-8 md:grid-cols-2 md:gap-16"
            >
              <div className="flex items-center gap-6">
                <div className="h-px flex-1 bg-foreground/25" />
                <div className="max-w-md">
                  <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/60">
                    {contrast.common}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="h-px w-12 bg-foreground/25" />
                <div className="max-w-md">
                  <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] font-medium text-primary">
                    {contrast.altruvex}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function DecisionsSection() {
  const t = useTranslations("approach.decisions");
  const sectionRef = useSectionCardGrid<HTMLElement>({
    selector: "[data-decision-item]",
  });
  const titleRef = useSectionTitle();

  const decisions = [
    { title: t("data.title"), desc: t("data.description") },
    { title: t("scale.title"), desc: t("scale.description") },
    { title: t("maintenance.title"), desc: t("maintenance.description") },
    { title: t("handoff.title"), desc: t("handoff.description") },
  ];

  return (
    <section
      ref={sectionRef}
      className="accent-world-green pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div ref={titleRef} className="mb-16">
          <h2 className="mb-3 font-sans font-normal text-primary">
            {t("title")}
          </h2>
        </div>
        <div className="grid gap-12">
          {decisions.map((decision, i) => (
            <div
              key={i}
              data-decision-item
              className="ltr:border-l-2 rtl:border-r-2 border-foreground/25 ltr:pl-8 rtl:pr-8"
            >
              <h3 className="mb-4 font-sans font-medium text-primary">
                {decision.title}
              </h3>
              <p className="max-w-2xl text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/75">
                {decision.desc}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function ConstraintsSection() {
  const t = useTranslations("approach.constraints");
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();

  return (
    <section className="accent-world-green pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="mb-12">
          <h2
            ref={titleRef}
            className="mb-3 font-sans font-normal text-primary"
          >
            {t("title")}
          </h2>
        </div>
        <div ref={descRef} className="max-w-3xl space-y-6">
          {t("paragraphs")
            .split("\n\n")
            .map((paragraph: string, i: number) => (
              <p
                key={i}
                className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/85"
              >
                {paragraph}
              </p>
            ))}
        </div>
      </Container>
    </section>
  );
}

function BilingualSection() {
  const t = useTranslations("approach.multilingual");
  const [isRTL, setIsRTL] = useState(false);
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const demoRef = useSectionElement();

  return (
    <section className="accent-world-green pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="mb-12">
          <h2
            ref={titleRef}
            className="mb-3 font-sans font-normal text-primary"
          >
            {t("title")}
          </h2>
        </div>
        <div ref={descRef} className="mb-16 max-w-3xl space-y-6">
          {t("paragraphs")
            .split("\n\n")
            .map((paragraph: string, i: number) => (
              <p
                key={i}
                className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/85"
              >
                {paragraph}
              </p>
            ))}
        </div>
        <div
          ref={demoRef}
          className="rounded-lg border border-foreground/25 p-8 md:p-12"
        >
          <div className="mb-8 flex items-center justify-between">
            <p className="font-mono text-sm leading-normal tracking-wider text-primary/60">
              {t("demo.title")}
            </p>
            <button
              type="button"
              onClick={() => setIsRTL(!isRTL)}
              className="rounded-md border border-foreground/25 bg-foreground/5 px-4 py-2 font-mono text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.7] text-primary transition-colors duration-300 hover:bg-foreground/10"
            >
              {isRTL ? "EN" : "AR"}
            </button>
          </div>
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className="space-y-4 transition-all duration-300"
          >
            <h3 className="font-sans font-medium text-primary">
              {isRTL
                ? t("demo.ar_heading")
                : t("demo.en_heading")}
            </h3>
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/75">
              {isRTL
                ? t("demo.ar_body")
                : t("demo.en_body")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function BoundariesSection() {
  const t = useTranslations("approach.boundaries");
  const sectionRef = useSectionCardGrid<HTMLElement>({
    selector: "[data-boundary-item]",
  });
  const titleRef = useSectionTitle();

  const boundaries = ["1", "2", "3", "4", "5"];

  return (
    <section
      ref={sectionRef}
      className="accent-world-orange pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="mb-12">
          <h2
            ref={titleRef}
            className="mb-6 font-sans font-normal text-primary"
          >
            {t("title")}
          </h2>
          <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/75">
            {t("intro")}
          </p>
        </div>
        <div className="max-w-3xl space-y-4">
          {boundaries.map((num) => (
            <div
              key={num}
              data-boundary-item
              className="flex items-start gap-4 text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/85"
            >
              <span className="mt-1 text-primary/60">-</span>
              <p>{t(`items.${num}`)}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function ClosingSection() {
  const t = useTranslations("approach.closing");
  const tCTAs = useTranslations("commercial.ctas");
  const contactCta = getCommercialCta("technicalCall");
  const scopeCta = getCommercialCta("projectRange");
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const ctaRef = useSectionElement();

  return (
    <section
      className="accent-world-orange pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="max-w-3xl">
          <div className="mb-12">
            <h2
              ref={titleRef}
              className="mb-3 font-sans font-normal text-primary"
            >
              {t("title")}
            </h2>
          </div>
          <div ref={descRef} className="mb-12 space-y-6">
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/85">
              {t("description")}
            </p>
          </div>
          <div ref={ctaRef} className="flex flex-col sm:flex-row flex-wrap gap-3">
            <MagneticButton asChild size="lg" variant="accent">
              <Link href={contactCta.href}>
                <ArrowLabel>{tCTAs("technicalCall")}</ArrowLabel>
              </Link>
            </MagneticButton>
            <MagneticButton asChild size="lg" variant="secondary">
              <Link href={scopeCta.href}>
                <ArrowLabel>{tCTAs("projectRange")}</ArrowLabel>
              </Link>
            </MagneticButton>
            <a
              href="mailto:hello@altruvex.com"
              className="inline-flex items-center self-center gap-2 px-2 font-mono text-sm leading-normal tracking-wider text-muted-foreground transition-colors duration-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {t("cta")}
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
