"use client";
import { useSectionTitle, useSectionEyebrow, useSectionDescription } from "@/lib/motion";

import { Container } from "@/components/container";
import { ArrowIcon } from "@/components/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { SectionWatermark } from "@/components/section-watermark";
import { CtaSection } from "@/components/sections/cta-section";
import { Link } from "@/i18n/navigation";
import { HOMEPAGE_OFFERS, getCommercialCta } from "@/lib/commercial";
import { monoCaps } from "@/lib/mono-caps";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { memo, useMemo } from "react";

const designTokens = {
  cardBase:
    "group relative flex flex-col justify-between overflow-hidden rounded-lg border border-border bg-surface/40 transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1)",
  cardHover: "hover:border-border-mid hover:shadow-xl hover:-translate-y-1.5",
  capsLabel:
    "text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground",
};

export default memo(function ServicesPage() {
  const locale = useLocale();
  const t = useTranslations("servicesPage");
  const tc = useTranslations("commercial.offers");
  const tCTAs = useTranslations("commercial.ctas");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();

  const capabilityLinks = useMemo(
    () => [
      {
        href: "/services/interface-design",
        title: t("capabilities.interfaceDesign"),
      },
      { href: "/services/development", title: t("capabilities.development") },
      { href: "/services/consulting", title: t("capabilities.consulting") },
      { href: "/services/maintenance", title: t("capabilities.maintenance") },
    ],
    [t],
  );

  const comparisonCards = useMemo(() => {
    const items = t.raw("comparison.items") as Array<{
      description: string;
      title: string;
    }>;
    return items.map((item, index) => ({
      ...item,
      href: capabilityLinks[index]?.href ?? "/services",
      label: capabilityLinks[index]?.title ?? t("detailLabel"),
    }));
  }, [capabilityLinks, t]);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background text-foreground font-sans">
      <section className="relative overflow-hidden pt-(--section-y-top) pb-16">
        <SectionWatermark>00</SectionWatermark>
        <Container>
          <div className="max-w-4xl relative z-10">
            <div className="flex items-center gap-2.5 mb-8">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand" />
              <p
                ref={eyebrowRef}
                className={cn(monoCaps, "text-muted-foreground")}
              >
                {t("eyebrow")}
              </p>
            </div>
            <h1
              ref={titleRef}
              className="text-[clamp(2.75rem,5vw,4.5rem)] leading-[1.05] tracking-[-0.03em] font-normal text-foreground mb-6"
            >
              {t("title")}
            </h1>
            <p
              ref={descRef}
              className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] max-w-2xl text-muted-foreground"
            >
              {t("description")}
            </p>
          </div>
        </Container>
      </section>
      <section className="pb-24 pt-8">
        <Container>
          <div className="mb-24 grid gap-10 border-t border-border pt-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
            <div>
              <p className={cn(designTokens.capsLabel, "mb-4")}>
                {t("comparison.eyebrow")}
              </p>
              <h2 className="text-4xl md:text-5xl tracking-tight font-normal text-foreground leading-[1.1]">
                {t("comparison.title")}
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {comparisonCards.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    designTokens.cardBase,
                    designTokens.cardHover,
                    "p-6 min-h-[280px]",
                  )}
                >
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <p className={designTokens.capsLabel}>
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-6 text-2xl font-medium tracking-tight text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground font-light">
                        {item.description}
                      </p>
                    </div>
                    <div className="mt-8 flex items-center justify-between">
                      <p className={cn(monoCaps, "text-foreground")}>
                        {item.label}
                      </p>
                      <div className="size-11 flex items-center justify-center rounded-full border border-border bg-background transition-all duration-500 group-hover:bg-foreground group-hover:text-background">
                        <ArrowIcon className="size-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-xl">
              <h3 className="text-2xl font-medium tracking-tight text-foreground mb-3">
                {t("comprehensiveSolutions.title")}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("comprehensiveSolutions.description")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {capabilityLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full border border-border px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider bg-background text-muted-foreground hover:border-foreground hover:text-foreground transition-all",
                    monoCaps,
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
            {HOMEPAGE_OFFERS.map((offer, index) => {
              const cta = getCommercialCta(offer.ctaKey);
              const featured =
                index === 0 || index === HOMEPAGE_OFFERS.length - 1;
              return (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  index={index}
                  cta={{ ...cta, label: tCTAs(offer.ctaKey) }}
                  featured={featured}
                  t={t}
                  tc={tc}
                />
              );
            })}
          </div>
        </Container>
      </section>
      <CtaSection />
    </div>
  );
});

interface ServiceRowProps {
  index: number;
  href: string;
  title: string;
  description: string;
  detailLabel: string;
}

interface OfferCardProps {
  offer: (typeof HOMEPAGE_OFFERS)[number];
  index: number;
  featured: boolean;
  cta: { href: string; label: string };
  t: ReturnType<typeof useTranslations<"servicesPage">>;
  tc: ReturnType<typeof useTranslations<"commercial.offers">>;
}

const OfferCard = memo(function OfferCard({
  offer,
  index,
  cta,
  featured,
  t,
  tc,
}: OfferCardProps) {
  return (
    <div
      className={cn(
        designTokens.cardBase,
        designTokens.cardHover,
        "p-6 md:p-8 group",
        featured ? "md:col-span-2 min-h-[380px]" : "min-h-[320px]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 select-none",
          "font-sans font-black leading-none text-transparent",
          "text-[clamp(120px,18vw,220px)]",
          "opacity-40 [-webkit-text-stroke-width:1px] [-webkit-text-stroke-color:var(--color-border)]",
          "transition-all duration-1000 ease-out",
          "group-hover:scale-110 group-hover:[-webkit-text-stroke-color:var(--color-foreground)] group-hover:opacity-10",
        )}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative z-10 flex flex-col gap-8 h-full">
        <div className="flex items-center justify-between border-b border-border pb-6">
          <span className={designTokens.capsLabel}>
            STEP {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className={cn(
              monoCaps,
              "text-muted-foreground group-hover:text-foreground transition-colors",
            )}
          >
            {t("detailLabel")}
          </span>
        </div>

        <div className="flex-1">
          <h2 className="text-3xl font-medium tracking-tight text-foreground mb-4">
            {tc(`${offer.id}.title`)}
          </h2>
          <p
            className={cn(
              "text-lg leading-relaxed text-muted-foreground font-light",
              featured ? "max-w-2xl" : "max-w-full",
            )}
          >
            {tc(`${offer.id}.audience`)}
          </p>
          {"tags" in offer && (offer.tags as string[]).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {(offer.tags as string[]).map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "rounded-md border border-border bg-surface px-4 py-1.5 text-[10px] text-muted-foreground",
                    "group-hover:border-border-mid group-hover:text-foreground transition-colors",
                    monoCaps,
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-8 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-8">
          <div className="flex-1 max-w-lg">
            <p className={cn(designTokens.capsLabel, "mb-2")}>
              {t("expectedOutcome")}
            </p>
            <p className="text-sm font-medium text-foreground italic">
              &ldquo;{tc(`${offer.id}.outcome`)}&rdquo;
            </p>
          </div>
          <div className="flex items-center gap-4">
            {featured && (
              <MagneticButton
                asChild
                size="lg"
                variant="primary"
                className="relative z-10 rounded-full bg-foreground text-background hover:opacity-90 px-8 py-3 text-sm font-semibold transition-all"
              >
                <Link href={cta.href}>{cta.label}</Link>
              </MagneticButton>
            )}
            <Link
              href={offer.detailHref}
              className="relative z-10 size-12 flex items-center justify-center rounded-full bg-background border border-border transition-all duration-500 group-hover:bg-foreground group-hover:text-background group-hover:border-foreground after:absolute after:inset-0"
            >
              <ArrowIcon className="size-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
});
