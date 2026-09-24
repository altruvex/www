"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { DirectionalLink } from "@/components/shared/directional-link";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import { getCommercialCta } from "@/lib/config/commercial";
import {
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { HandoffChainSection } from "./handoff-chain";
import { NamePrincipleSection } from "./name-principle";

export default memo(function AboutPageClient() {
  return (
    <main className="relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <AboutHero />
      <ErrorBoundary>
        <HandoffChainSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <NamePrincipleSection />
      </ErrorBoundary>
      <ContinueRow />
      <AboutEndCta />
    </main>
  );
});

/**
 * The hero already offers the scope request; the page argues there is nobody
 * between the client and the engineer, so the close offers exactly that call.
 */
function AboutEndCta() {
  const t = useTranslations("common.endCta.pages.about");

  return (
    <SectionEndCta
      title={t("title")}
      titleAccent={t("titleAccent")}
      body={t("body")}
      primary="technicalCall"
      secondary="describeTheBuild"
    />
  );
}

const RECORD_ITEMS = ["base", "languages", "lead", "floor"] as const;

/**
 * The page opens on its statement and closes the fold on a plain record of
 * the company: four facts a visitor can check, set as a definition list rather
 * than as counters. The previous hero led with "Zero" and "Native" at display
 * size - words dressed as figures.
 */
function AboutHero() {
  const t = useTranslations("about");
  const tCTAs = useTranslations("commercial.ctas");
  const tNav = useTranslations("nav");
  const projectRangeCta = getCommercialCta("projectRange");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const ctaRef = useSectionElement();
  const recordRef = useSectionElement<HTMLElement>();

  return (
    <section
      aria-labelledby="about-hero-heading"
      className="accent-world-blue pt-(--section-y-top)"
    >
      <Container>
        <SectionHeading
          titleAs="h1"
          titleId="about-hero-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={`${t("title")} ${t("title2")}`}
          secondTitle={t("title3")}
          description={t.rich("description1", bodyMarks)}
          classes={{
            titleWrapper: "space-y-6",
            title:
              "max-w-[20ch] text-[clamp(2.5rem,5.2vw,4.75rem)] font-light leading-[1.04] tracking-[-0.03em]",
            description:
              "max-w-[40ch] text-[clamp(1rem,1.1vw,1.125rem)] md:max-w-[40ch] lg:max-w-[22rem]",
          }}
        />

        <CtaButtonGroup
          ref={ctaRef}
          primary={{ href: projectRangeCta.href, label: tCTAs("projectRange") }}
          secondary={{ href: "/work", label: tNav("work") }}
          secondaryArrow
          className="mt-10 lg:mt-12"
        />

        <section
          ref={recordRef}
          aria-labelledby="about-record-heading"
          className="mt-(--section-y-bottom) border-t border-border-subtle py-10 lg:py-12"
        >
          <h2 id="about-record-heading" className="sr-only">
            {t("record.label")}
          </h2>
          <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {RECORD_ITEMS.map((key) => (
              <div key={key}>
                <dt className="eyebrow text-muted-foreground">
                  {t(`record.items.${key}.term`)}
                </dt>
                <dd className="mt-2 max-w-[28ch] text-[0.9375rem] leading-relaxed text-foreground">
                  {t(`record.items.${key}.value`)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </Container>
    </section>
  );
}

const CONTINUE_LINKS = [
  { key: "services", href: "/services" },
  { key: "work", href: "/work" },
  { key: "process", href: "/process" },
  { key: "how-we-work", href: "/how-we-work" },
  { key: "pricing", href: "/pricing" },
] as const;

/**
 * Where the old page spent two sections - a four-step process grid that
 * repeated /process and a 2x2 card grid that repeated the navigation - this is
 * one line of links. The closing CTA below already carries the conversion.
 */
function ContinueRow() {
  const t = useTranslations("about.continue");
  const tNav = useTranslations("nav");

  return (
    <nav aria-labelledby="about-continue-label" className="border-t border-border-subtle">
      <Container className="flex flex-col gap-4 py-8 md:flex-row md:items-baseline md:gap-10">
        <Eyebrow id="about-continue-label" className="m-0 shrink-0">
          {t("label")}
        </Eyebrow>
        <ul className="flex flex-wrap gap-x-8 gap-y-3">
          {CONTINUE_LINKS.map((link) => (
            <li key={link.href}>
              <DirectionalLink
                href={link.href}
                className="text-[0.9375rem] text-foreground underline-offset-4 hover:underline"
              >
                {tNav(link.key)}
              </DirectionalLink>
            </li>
          ))}
        </ul>
      </Container>
    </nav>
  );
}
