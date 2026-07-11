"use client";
import { Container } from "@/components/shared/container";
import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { PageHero } from "@/components/sections/page-hero";
import { SectionHeading } from "@/components/sections/section-heading";
import { getCommercialCta } from "@/lib/config/commercial";
import { useSectionCardGrid, useSectionDescription, useSectionElement, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { bodyMarks, renderBodyText } from "@/components/ui/rich-text";
import { splitHeadline } from "@/lib/utils/utils";
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
      eyebrow={t("eyebrow")}
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
  const eyebrowRef = useSectionEyebrow();
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
        <SectionHeading
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          eyebrow={t("eyebrow")}
          firstTitle={`${t("label.common")} vs`}
          secondTitle={t("label.altruvex")}
          accent="forest"
          secondTitleBreak={false}
          className="mb-16 block"
          classes={{ title: "text-primary" }}
        />
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
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const { first: firstTitle, second: secondTitle } = splitHeadline(t("title"));

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
        <SectionHeading
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          eyebrow={t("eyebrow")}
          firstTitle={firstTitle}
          secondTitle={secondTitle}
          accent="forest"
          className="mb-16 block"
          classes={{ title: "text-primary" }}
        />
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
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const { first: firstTitle, second: secondTitle } = splitHeadline(t("title"));

  return (
    <section className="accent-world-green pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <SectionHeading
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          eyebrow={t("eyebrow")}
          firstTitle={firstTitle}
          secondTitle={secondTitle}
          accent="forest"
          className="mb-12 block"
          classes={{ title: "text-primary" }}
        />
        <div ref={descRef} className="max-w-3xl space-y-6">
          {t.raw("paragraphs")
            .split("\n\n")
            .map((paragraph: string, i: number) => (
              <p
                key={i}
                className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/85"
              >
                {renderBodyText(paragraph)}
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
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const demoRef = useSectionElement();
  const { first: firstTitle, second: secondTitle } = splitHeadline(t("title"));

  return (
    <section className="accent-world-green pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <SectionHeading
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          eyebrow={t("eyebrow")}
          firstTitle={firstTitle}
          secondTitle={secondTitle}
          accent="forest"
          className="mb-12 block"
          classes={{ title: "text-primary" }}
        />
        <div ref={descRef} className="mb-16 max-w-3xl space-y-6">
          {t.raw("paragraphs")
            .split("\n\n")
            .map((paragraph: string, i: number) => (
              <p
                key={i}
                className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/85"
              >
                {renderBodyText(paragraph)}
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
              className="rounded-md border border-foreground/25 bg-foreground/5 px-4 py-2 font-mono text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.7] text-primary transition-all duration-300 hover:bg-foreground/10"
            >
              {isRTL ? "EN" : "AR"}
            </button>
          </div>
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className="space-y-4"
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
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const { first: firstTitle, second: secondTitle } = splitHeadline(t("title"));

  const boundaries = ["1", "2", "3", "4", "5"];

  return (
    <section
      ref={sectionRef}
      className="accent-world-orange pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="mb-12">
          <SectionHeading
            eyebrowRef={eyebrowRef}
            titleRef={titleRef}
            eyebrow={t("eyebrow")}
            firstTitle={firstTitle}
            secondTitle={secondTitle}
            accent="ember"
            className="mb-6 block"
            classes={{ title: "text-primary" }}
          />
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
          <SectionHeading
            titleRef={titleRef}
            descriptionRef={descRef}
            firstTitle={t("title")}
            secondTitle={t("titleItalic")}
            accent="ember"
            description={t.rich("description", bodyMarks)}
            className="mb-12 block"
            classes={{
              titleWrapper: "space-y-0",
              title: "mb-3 text-primary",
              description: "max-w-none mb-0 text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/85",
            }}
          />
          <div ref={ctaRef} className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
            <CtaButtonGroup
              primaryVariant="accent"
              primary={{ href: contactCta.href, label: tCTAs("technicalCall") }}
              secondary={{ href: scopeCta.href, label: tCTAs("projectRange") }}
              secondaryArrow
              className="gap-3"
            />
            <a
              href="mailto:hello@altruvex.com"
              className="inline-flex items-center self-center gap-2 px-2 font-mono text-sm leading-normal tracking-wider text-muted-foreground transition-all duration-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {t("cta")}
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
