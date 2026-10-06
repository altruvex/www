"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import {
  DISPLAY,
  FIGURE,
  LABEL,
} from "@/components/sections/pricing-model/type";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { Num } from "@/components/ui/num";
import { getCommercialCta } from "@/lib/config/commercial";
import {
  scrollToY,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { useTranslations } from "next-intl";
import type { MouseEvent } from "react";

function goToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  scrollToY(
    target.getBoundingClientRect().top +
      window.scrollY -
      parseFloat(getComputedStyle(target).scrollMarginTop),
  );
}

export default function PricingHero({ floorLabel }: { floorLabel: string }) {
  const t = useTranslations("pricingModel");
  const tFaq = useTranslations("pricing.faq");
  const tCta = useTranslations("commercial.ctas");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();
  const ctaRef = useSectionElement<HTMLDivElement>();
  const footRef = useSectionElement<HTMLDivElement>();

  const index = [
    { id: "investment", label: t("sections.invest.title") },
    { id: "includes", label: t("sections.includes.title") },
    { id: "terms", label: t("sections.terms.title") },
    { id: "how", label: t("sections.how.title") },
    { id: "cost", label: t("sections.cost.title") },
    { id: "faq", label: tFaq("title") },
  ];

  return (
    <section
      aria-labelledby="pricing-heading"
      className="accent-world-blue flex min-h-svh flex-col pt-[calc(4rem+var(--section-y-top)*0.2)] pb-6"
    >
      <Container className="flex flex-1 flex-col">
        <SectionHeading
          titleAs="h1"
          titleId="pricing-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("hero.eyebrow")}
          firstTitle={t("hero.titleLead")}
          secondTitle={t("hero.titleAccent")}
          accent="world"
          className="gap-6 md:gap-6 lg:flex-col lg:items-start"
          classes={{
            titleWrapper: "space-y-7",
            title: DISPLAY,
          }}
        />
        <div className="mt-11 mb-5 grid gap-8 lg:grid-cols-2 lg:items-end lg:gap-10">
          <p ref={descRef} className="max-w-[46ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] font-normal text-muted-foreground">
            {t("hero.lead")}
          </p>
          <div className="lg:justify-self-end">
          <CtaButtonGroup
            ref={ctaRef}
            primaryVariant="accent"
            primary={{
              href: getCommercialCta("projectRange").href,
              label: tCta("projectRange"),
            }}
            secondary={{
              href: getCommercialCta("technicalCall").href,
              label: tCta("technicalCall"),
            }}
          />
          </div>
        </div>
        <div
          ref={footRef}
          className="mt-auto grid gap-10 border-t pt-6 border-border-subtle md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
        >
          <p className="m-0 flex flex-col gap-2 md:order-last md:items-end md:text-end">
            <span className={LABEL}>{t("columns.moves.floorNote")}</span>
            <span className={FIGURE}>{floorLabel}</span>
          </p>
          <ol className="m-0 grid list-none gap-x-5 gap-y-3 p-0 sm:grid-cols-2 lg:flex lg:flex-wrap">
            {index.map((entry, i) => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  onClick={(event) => goToSection(event, entry.id)}
                  className="group inline-flex items-baseline gap-2 rounded-ctl-xs text-foreground no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                >
                  <span className={`${LABEL} tabular-nums`}>
                    <Num value={i + 1} pad={2} />
                  </span>
                  <span className="whitespace-nowrap text-(length:--text-body-base) font-medium underline-offset-4 group-hover:underline">
                    {entry.label}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
