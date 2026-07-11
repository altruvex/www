"use client";
import { MagneticButton } from "@/components/magnetic-button";
import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { SectionWatermark } from "@/components/section-watermark";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { Container } from "@/components/shared/container";
import { ExternalDirectionalLink } from "@/components/shared/directional-link";
import { Highlight } from "@/components/ui/emphasis";
import { bodyMarks } from "@/components/ui/rich-text";
import { Link } from "@/i18n/navigation";
import { FOUNDER_LINK, getCommercialCta } from "@/lib/config/commercial";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { monoCaps } from "@/lib/utils/mono-caps";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
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
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background">
      <HeroSection />
      <PrinciplesSection />
      <OperatingModelSection />
      <PathwaysSection routeCards={routeCards} />
      <SectionEndCta variant="contact" />
    </div>
  );
});

function HeroSection() {
  const t = useTranslations("about");
  const tCTAs = useTranslations("commercial.ctas");
  const projectRangeCta = getCommercialCta("projectRange");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const ctaRef = useSectionElement();

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
    <section className="accent-world-orange relative flex min-h-[90vh] flex-col justify-between overflow-hidden pt-(--section-y-top)">
      <SectionWatermark>06</SectionWatermark>
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50">
        <div className="absolute top-0 inset-s-1/3 h-full w-px bg-foreground/5" />
        <div className="absolute top-0 inset-e-1/3 h-full w-px bg-foreground/5" />
      </div>
      <Container className="relative z-10 flex flex-1 flex-col justify-center pb-20">
        <div className="max-w-5xl">
          <p
            ref={eyebrowRef}
            className={cn(
              monoCaps,
              "mb-8 text-muted-foreground rtl:font-sans rtl:normal-case rtl:tracking-normal",
            )}
          >
            {t("eyebrow")}
          </p>
          <h1
            ref={titleRef}
            className="mb-10 text-[clamp(3rem,5vw,4.5rem)] font-normal leading-[0.95] tracking-[-0.03em] text-foreground"
          >
            {t("title")}
            <br />
            {t("title2")} <Highlight>{t("title3")}</Highlight>
          </h1>
          <div
            ref={descRef}
            className="flex flex-col gap-6 md:flex-row md:items-start md:gap-12"
          >
            <div className="mt-3 hidden h-px w-20 bg-border md:block shrink-0" />
            <div className="space-y-6 max-w-2xl">
              <p className="text-[clamp(1.125rem,1.2vw,1.25rem)] leading-[1.6] text-muted-foreground">
                {t.rich("description1", bodyMarks)}
              </p>
              <p className="text-[clamp(1.125rem,1.2vw,1.25rem)] leading-[1.6] text-muted-foreground">
                {t.rich("description2", bodyMarks)}
              </p>
              <CtaButtonGroup
                ref={ctaRef}
                primary={{ href: projectRangeCta.href, label: tCTAs("projectRange") }}
                secondary={{ href: "/work", label: t("ctaSecondary") }}
                className="mt-12"
              />
            </div>
          </div>
        </div>
      </Container>
      <div className="border-t border-border bg-surface/10 backdrop-blur-xs">
        <Container>
          <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-y-0 md:divide-x rtl:divide-x-reverse">
            {stats.map((stat) => (
              <div key={stat.label} className="py-8 px-4 md:px-8">
                <p className="text-[clamp(2rem,3vw,2.75rem)] font-light leading-none tracking-[-0.03em] text-foreground">
                  {stat.value}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {stat.label}
                  </p>
                  <p className={cn(monoCaps, "text-xs text-muted-foreground rtl:font-sans rtl:normal-case rtl:tracking-normal")}>
                    {stat.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>
    </section>
  );
}

function PrinciplesSection() {
  const t = useTranslations("about");
  const titleRef = useSectionTitle();
  const bodyRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-principle-card]" });

  const values = [
    { label: t("values.multilingual.label"), sub: t("values.multilingual.sublabel") },
    { label: t("values.noTemplate.label"), sub: t("values.noTemplate.sublabel") },
    { label: t("values.outcome.label"), sub: t("values.outcome.sublabel") },
  ];

  return (
    <section className="accent-world-orange border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        {/* Editorial Layout: Sticky Left, Scrolling Right */}
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-24">

          {/* Founder Context (Left) */}
          <div className="lg:sticky lg:top-32 lg:h-fit">
            <p className={cn(monoCaps, "mb-6 text-muted-foreground rtl:font-sans rtl:normal-case rtl:tracking-normal")}>
              {t("founder.eyebrow")}
            </p>
            <h2 ref={titleRef} className="text-[clamp(2.25rem,4vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.02em] text-foreground">
              {t("founder.name")}
            </h2>
            <p className={cn(monoCaps, "mt-4 text-muted-foreground rtl:font-sans rtl:normal-case rtl:tracking-normal")}>
              {t("founder.role")}
            </p>
            <div className="mt-8 max-w-md space-y-5">
              <p className="text-base leading-[1.75] text-muted-foreground">
                {t.rich("founder.philosophy1", bodyMarks)}
              </p>
              <p className="text-base leading-[1.75] text-muted-foreground">
                {t.rich("founder.philosophy2", bodyMarks)}
              </p>
            </div>
            <div className="mt-10">
              <ExternalDirectionalLink href={FOUNDER_LINK} className={cn(monoCaps, "text-foreground rtl:font-sans rtl:normal-case rtl:tracking-normal")}>
                {t("founder.linkedInLabel")}
              </ExternalDirectionalLink>
            </div>
          </div>
          <div ref={bodyRef} className="flex flex-col">
            {values.map((value, index) => (
              <article
                key={value.label}
                data-principle-card
                className="group border-t border-border py-10 first:border-t-0 first:pt-0 lg:py-14"
              >
                <div className="mb-6 flex items-center gap-4">
                  <span className="flex size-12 items-center justify-center rounded-full border border-border bg-surface text-sm text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-[clamp(1.5rem,2.5vw,2rem)] font-medium leading-[1.2] tracking-[-0.015em] text-foreground transition-all group-hover:text-foreground/80">
                  {value.label}
                </h3>
                <p className="mt-4 max-w-[48ch] text-[1.0625rem] leading-[1.8] text-muted-foreground">
                  {value.sub}
                </p>
              </article>
            ))}
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
  const listRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-process-card]" });

  const steps = ["step1", "step2", "step3", "step4"].map((key, index) => ({
    index: String(index + 1).padStart(2, "0"),
    tag: t(`steps.${key}.tag`),
    title: t(`steps.${key}.title`),
    description: t(`steps.${key}.description`),
    deliverables: t(`steps.${key}.deliverables`),
    timeline: t(`steps.${key}.timeline`),
  }));

  return (
    <section className="accent-world-green bg-surface/30 border-y border-border pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="mb-16 md:mb-24 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className={cn(monoCaps, "mb-5 text-muted-foreground rtl:font-sans rtl:normal-case rtl:tracking-normal")}>
              {t("eyebrow")}
            </p>
            <h2 ref={titleRef} className="text-[clamp(2.5rem,4vw,3.75rem)] font-normal leading-[1.05] tracking-[-0.02em] text-foreground">
              {t("title")}
            </h2>
          </div>
          <p className="max-w-[34ch] text-base leading-[1.75] text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div ref={listRef} className="grid gap-0 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <article
              key={step.index}
              data-process-card
              className={cn(
                "group relative border-t border-border pt-8 pb-12 transition-all hover:bg-surface/50 sm:px-6 md:border-t-0 md:border-s md:pt-10 md:pb-16 rtl:border-s-0 rtl:border-e",
                i === 0 && "md:border-s-0 md:ps-0 rtl:md:border-e-0 rtl:md:pe-0"
              )}
            >
              <div className="absolute top-4 right-4 text-[6rem] font-bold leading-none text-foreground/2 transition-all duration-500 group-hover:text-foreground/5 rtl:left-4 rtl:right-auto pointer-events-none select-none">
                {step.index}
              </div>
              <div className="relative z-10">
                <p className={cn(monoCaps, "inline-block rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground rtl:font-sans rtl:normal-case rtl:tracking-normal")}>
                  {step.tag}
                </p>
                <h3 className="mt-8 text-xl font-medium leading-[1.2] tracking-[-0.015em] text-foreground">
                  {step.title}
                </h3>
                <p className="mt-4 text-[0.98rem] leading-[1.75] text-muted-foreground">
                  {step.description}
                </p>
                <div className="mt-8 space-y-4">
                  <div>
                    <p className={cn(monoCaps, "mb-1 text-xs text-foreground/80 rtl:font-sans rtl:normal-case rtl:tracking-normal")}>{t("meta.deliverables")}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.deliverables}</p>
                  </div>
                  <div>
                    <p className={cn(monoCaps, "mb-1 text-xs text-foreground/80 rtl:font-sans rtl:normal-case rtl:tracking-normal")}>{t("meta.timeline")}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.timeline}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-4 justify-center lg:justify-start">
          <MagneticButton asChild size="lg" variant="secondary">
            <Link href="/process">{navT("process")}</Link>
          </MagneticButton>
          <MagneticButton asChild size="lg" variant="secondary">
            <Link href="/how-we-work">{navT("how-we-work")}</Link>
          </MagneticButton>
        </div>
      </Container>
    </section>
  );
}

function PathwaysSection({ routeCards }: PageClientProps) {
  const t = useTranslations("commercial.cta");
  const cardsRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-route-card]" });

  return (
    <section className="accent-world-orange pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="mx-auto max-w-3xl text-center mb-16">
          <p className={cn(monoCaps, "mb-5 text-muted-foreground rtl:font-sans rtl:normal-case rtl:tracking-normal")}>
            {t("eyebrow")}
          </p>
          <h2 className="text-[clamp(2.25rem,4vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.02em] text-foreground">
            {t("title")} <Highlight>{t("titleAccent")}</Highlight>
          </h2>
          <p className="mt-6 mx-auto max-w-[48ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
            {t("body")}
          </p>
        </div>
        <div ref={cardsRef} className="grid gap-6 md:grid-cols-2 lg:gap-8 max-w-5xl mx-auto">
          {routeCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              data-route-card
              className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-8 md:p-10 transition-all duration-300 ease-strong motion-safe:hover:-translate-y-1 hover:border-foreground/30 hover:bg-background hover:shadow-2xl hover:shadow-foreground/5"
            >
              <div>
                <p className={cn(monoCaps, "text-muted-foreground rtl:font-sans rtl:normal-case rtl:tracking-normal")}>
                  {card.label}
                </p>
                <h3 className="mt-5 text-[clamp(1.5rem,2vw,1.85rem)] font-medium leading-[1.2] tracking-[-0.015em] text-foreground">
                  {card.title}
                </h3>
                <p className="mt-4 text-[1rem] leading-[1.8] text-muted-foreground">
                  {card.description}
                </p>
              </div>
              <div className="mt-10 flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-background/60 transition-all duration-300 ease-out group-hover:border-foreground group-hover:bg-foreground group-hover:text-background">
                <svg width="18" height="18" viewBox="0 0 14 14" fill="none" aria-hidden className="text-current transition-all duration-300 ltr:group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1">
                  <path d="M2 7H12M8 3L12 7L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
