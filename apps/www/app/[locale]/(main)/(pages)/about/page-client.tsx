"use client";
import { useSectionTitle, useSectionEyebrow, useSectionDescription, useSectionElement, useSectionCardGrid } from "@/lib/motion";

import { Container } from "@/components/container";
import {
  ArrowLabel,
  ExternalDirectionalLink,
} from "@/components/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { SectionWatermark } from "@/components/section-watermark";
import { Link } from "@/i18n/navigation";
import { FOUNDER_LINK, getCommercialCta } from "@/lib/commercial";
import { monoCaps } from "@/lib/mono-caps";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { memo } from "react";

export type RouteCard = {
  description: string;
  href: string;
  label: string;
  title: string;
};

type PageClientProps = {
  routeCards: RouteCard[];
};

export default memo(function AboutPageClient({ routeCards }: PageClientProps) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <HeroSection />
      <PrinciplesSection />
      <OperatingModelSection />
      <PathwaysSection routeCards={routeCards} />
    </div>
  );
});

function HeroSection() {
  const t = useTranslations("about");
  const heroT = useTranslations("hero");
  const tCTAs = useTranslations("commercial.ctas");
  const projectRangeCta = getCommercialCta("projectRange");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const ctaRef = useSectionElement();
  const railRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-about-rail]",
  });

  const stats = [
    {
      sub: t("stat1.sublabel"),
      value: t("stat1.value"),
      label: t("stat1.label"),
    },
    {
      sub: t("stat2.sublabel"),
      value: t("stat2.value"),
      label: t("stat2.label"),
    },
    {
      sub: t("stat3.sublabel"),
      value: t("stat3.value"),
      label: t("stat3.label"),
    },
  ];

  return (
    <section className="relative overflow-hidden pt-(--section-y-top) pb-(--section-y-bottom)">
      <SectionWatermark>06</SectionWatermark>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 ltr:left-1/4 rtl:right-1/4 h-full w-px bg-foreground/6" />
        <div className="absolute top-0 ltr:right-1/4 rtl:left-1/4 h-full w-px bg-foreground/6" />
        <div className="absolute top-[32%] left-0 right-0 h-px bg-foreground/5" />
      </div>
      <Container>
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div className="sm:max-w-5xl max-w-full">
            <p
              ref={eyebrowRef}
              className={cn(monoCaps, "mb-6 text-muted-foreground/70")}
            >
              {t("eyebrow")}
            </p>
            <h1
              ref={titleRef}
              className="mb-8 text-[clamp(2.875rem,6vw,5.5rem)] leading-[1.02] tracking-[-0.03em] font-normal text-foreground"
            >
              {t("title")}
              <br />
              {t("title2")}
              <br />
              <span className="font-serif italic font-light text-foreground/45 rtl:font-sans rtl:not-italic rtl:font-bold">
                {t("title3")}
              </span>
            </h1>
            <div
              ref={descRef}
              className="grid gap-5 md:grid-cols-[72px_minmax(0,1fr)] md:gap-8"
            >
              <div className="hidden h-px w-full bg-border md:block mt-3" />
              <div className="space-y-4 max-w-3xl">
                <p
                  data-about-body
                  className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground max-w-[44ch]"
                >
                  {t("description1")}
                </p>
                <p
                  data-about-body
                  className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground max-w-[46ch]"
                >
                  {t("description2")}
                </p>
              </div>
            </div>
            <div
              ref={ctaRef}
              className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"
            >
              <MagneticButton size="lg" variant="primary" className="group">
                <Link href={projectRangeCta.href}>
                  <ArrowLabel>{tCTAs("projectRange")}</ArrowLabel>
                </Link>
              </MagneticButton>
              <MagneticButton size="lg" variant="secondary">
                <Link href="/work">{t("ctaSecondary")}</Link>
              </MagneticButton>
            </div>
          </div>
          <div ref={railRef} className="flex flex-col gap-5">
            <div
              data-about-rail
              className="rounded-lg border border-border bg-surface px-6 py-5"
            >
              <p className={cn(monoCaps, "mb-4 text-muted-foreground/70")}>
                {t("founder.eyebrow")}
              </p>
              <h2 className="text-[clamp(1.35rem,2.2vw,1.85rem)] leading-[1.15] tracking-[-0.018em] font-medium text-foreground">
                {t("founder.name")}
              </h2>
              <p className={cn(monoCaps, "mt-2 text-muted-foreground/70")}>
                {t("founder.role")}
              </p>
              <p className="mt-5 text-[0.98rem] leading-[1.8] text-muted-foreground">
                {t("founderNote")}
              </p>
              <div className="mt-5">
                <ExternalDirectionalLink
                  href={FOUNDER_LINK}
                  className={cn(monoCaps, "text-foreground")}
                >
                  {t("founder.linkedInLabel")}
                </ExternalDirectionalLink>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface px-6 py-5">
              <p className={cn(monoCaps, "mb-4 text-muted-foreground/70")}>
                {heroT("scrollHint")}
              </p>
              <div className="space-y-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    data-about-rail
                    className="border-t border-border pt-4 first:border-t-0 first:pt-0"
                  >
                    <p className="text-[clamp(1.75rem,2.6vw,2.25rem)] tracking-[-0.03em] font-light text-foreground leading-none">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {stat.label}
                    </p>
                    <p
                      className={cn(monoCaps, "mt-2 text-muted-foreground/70")}
                    >
                      {stat.sub}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function PrinciplesSection() {
  const t = useTranslations("about");
  const titleRef = useSectionTitle();
  const bodyRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-principle-card]",
  });

  const values = [
    {
      label: t("values.bilingual.label"),
      sub: t("values.bilingual.sublabel"),
    },
    {
      label: t("values.noTemplate.label"),
      sub: t("values.noTemplate.sublabel"),
    },
    {
      label: t("values.outcome.label"),
      sub: t("values.outcome.sublabel"),
    },
  ];

  return (
    <section className="border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div>
            <p className={cn(monoCaps, "mb-5 text-muted-foreground/70")}>
              {t("founder.eyebrow")}
            </p>
            <h2
              ref={titleRef}
              className="text-[clamp(2.125rem,4vw,3.25rem)] tracking-[-0.02em] font-normal text-foreground leading-[1.08]"
            >
              {t("founder.name")}
            </h2>
            <div className="mt-6 max-w-[42ch] space-y-4">
              <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
                {t("founder.philosophy1")}
              </p>
              <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
                {t("founder.philosophy2")}
              </p>
            </div>
          </div>
          <div ref={bodyRef} className="grid gap-4 md:grid-cols-2">
            {values.map((value, index) => (
              <article
                key={value.label}
                data-principle-card
                className={cn(
                  "rounded-lg border border-border bg-surface p-6 md:p-7",
                  index === 0 && "md:col-span-2",
                )}
              >
                <p className={cn(monoCaps, "mb-5 text-muted-foreground/70")}>
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="text-[clamp(1.35rem,2vw,1.75rem)] leading-[1.2] tracking-[-0.015em] font-medium text-foreground">
                  {value.label}
                </h3>
                <p className="mt-3 text-[0.98rem] leading-[1.8] text-muted-foreground">
                  {value.sub}
                </p>
              </article>
            ))}
            <article
              data-principle-card
              className="rounded-lg border border-border bg-surface p-6 md:col-span-2 md:p-8"
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className={cn(monoCaps, "mb-4 text-muted-foreground/70")}>
                    {t("founder.eyebrow")}
                  </p>
                  <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-medium text-foreground">
                    {t("founder.name")}
                  </h3>
                </div>
                <ExternalDirectionalLink
                  href={FOUNDER_LINK}
                  className={cn(monoCaps, "text-foreground")}
                >
                  {t("founder.linkedInLabel")}
                </ExternalDirectionalLink>
              </div>
            </article>
          </div>
        </div>
      </Container>
    </section>
  );
}

function OperatingModelSection() {
  const t = useTranslations("process");
  const navT = useTranslations("nav");
  const titleRef = useSectionTitle();
  const listRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-process-card]",
  });

  const steps = ["step1", "step2", "step3", "step4"].map((key, index) => ({
    index: String(index + 1).padStart(2, "0"),
    tag: t(`steps.${key}.tag`),
    title: t(`steps.${key}.title`),
    description: t(`steps.${key}.description`),
    deliverables: t(`steps.${key}.deliverables`),
    timeline: t(`steps.${key}.timeline`),
  }));

  return (
    <section className="border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className={cn(monoCaps, "mb-4 text-muted-foreground/70")}>
              {t("eyebrow")}
            </p>
            <h2
              ref={titleRef}
              className="text-[clamp(2.125rem,4vw,3.25rem)] tracking-[-0.02em] font-normal text-foreground leading-[1.08]"
            >
              {t("title")}
            </h2>
          </div>
          <p className="max-w-[34ch] text-[0.98rem] leading-[1.8] text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div ref={listRef} className="grid gap-4 lg:grid-cols-2">
          {steps.map((step) => (
            <article
              key={step.index}
              data-process-card
              className="rounded-lg border border-border bg-surface p-6 md:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <p className={cn(monoCaps, "text-muted-foreground/70")}>
                  {step.index}
                </p>
                <p className={cn(monoCaps, "text-muted-foreground/70")}>
                  {step.tag}
                </p>
              </div>
              <h3 className="mt-6 text-[clamp(1.35rem,2vw,1.75rem)] leading-[1.2] tracking-[-0.015em] font-medium text-foreground">
                {step.title}
              </h3>
              <p className="mt-3 text-[0.98rem] leading-[1.8] text-muted-foreground">
                {step.description}
              </p>
              <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
                <div>
                  <p className={cn(monoCaps, "mb-2 text-muted-foreground/70")}>
                    {t("meta.deliverables")}
                  </p>
                  <p className="text-sm leading-[1.75] text-muted-foreground">
                    {step.deliverables}
                  </p>
                </div>
                <div>
                  <p className={cn(monoCaps, "mb-2 text-muted-foreground/70")}>
                    {t("meta.timeline")}
                  </p>
                  <p className="text-sm leading-[1.75] text-muted-foreground">
                    {step.timeline}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-4">
          <MagneticButton size="lg" variant="secondary">
            <Link href="/process">{navT("process")}</Link>
          </MagneticButton>
          <MagneticButton size="lg" variant="secondary">
            <Link href="/how-we-work">{navT("how-we-work")}</Link>
          </MagneticButton>
        </div>
      </Container>
    </section>
  );
}

function PathwaysSection({ routeCards }: PageClientProps) {
  const t = useTranslations("commercial.cta");
  const cardsRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-route-card]",
  });

  return (
    <section className="border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
          <div className="max-w-xl">
            <p className={cn(monoCaps, "mb-4 text-muted-foreground/70")}>
              {t("eyebrow")}
            </p>
            <h2 className="text-[clamp(2.125rem,4vw,3.25rem)] tracking-[-0.02em] font-normal text-foreground leading-[1.08]">
              {t("title")}
            </h2>
            <p className="mt-6 text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground max-w-[38ch]">
              {t("body")}
            </p>
          </div>
          <div ref={cardsRef} className="grid gap-4">
            {routeCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                data-route-card
                className="group rounded-lg border border-border bg-surface p-6 transition-colors duration-300 hover:bg-background/80"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={cn(monoCaps, "text-muted-foreground/70")}>
                      {card.label}
                    </p>
                    <h3 className="mt-4 text-[clamp(1.35rem,2vw,1.75rem)] leading-[1.2] tracking-[-0.015em] font-medium text-foreground">
                      {card.title}
                    </h3>
                    <p className="mt-3 max-w-[50ch] text-[0.98rem] leading-[1.8] text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                  <div className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background/60 transition-all duration-300 group-hover:border-foreground group-hover:bg-foreground group-hover:text-background">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden
                      className="text-current transition-transform duration-300 ltr:group-hover:translate-x-0.5 ltr:group-hover:-translate-y-0.5 rtl:scale-x-[-1] rtl:group-hover:-translate-x-0.5 rtl:group-hover:translate-y-0.5"
                    >
                      <path
                        d="M2 7H12M8 3L12 7L8 11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
