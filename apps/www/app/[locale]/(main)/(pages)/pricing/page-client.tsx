"use client";

import { Container } from "@/components/container";
import { ArrowLabel } from "@/components/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { FaqSection } from "@/components/sections/faq-section";
import { Link } from "@/i18n/navigation";
import { DEFAULTS, useBatch, useReveal, useText } from "@/lib/motion";
import { useTranslations } from "next-intl";

const TIER_DESTINATION = {
  essential: "/transparency?tier=essential",
  professional: "/transparency?tier=professional",
  ecommerce: "/transparency?tier=commerce&projectType=ecommerce",
  flagship: "/transparency?tier=flagship",
} as const;

export default function PricingPage() {
  const t = useTranslations("pricing");
  const tp = useTranslations("commercial.pricing");

  const heroEyebrowRef = useReveal({ ...DEFAULTS.body, delay: 0 });
  const heroTitleRef = useText<HTMLHeadingElement>(DEFAULTS.heading);
  const heroDescRef = useReveal({ ...DEFAULTS.body, delay: 0.15 });
  const tierCardsRef = useBatch<HTMLDivElement>({
    ...DEFAULTS.card,
    selector: ".tier-card",
  });
  const commercialNotesRef = useBatch<HTMLDivElement>({
    ...DEFAULTS.card,
    selector: ".commercial-note",
  });
  const roiEyebrowRef = useReveal({ ...DEFAULTS.body, delay: 0 });
  const roiTitleRef = useText<HTMLHeadingElement>(DEFAULTS.heading);
  const roiBodyRef = useBatch<HTMLDivElement>({
    ...DEFAULTS.card,
    selector: ".roi-p",
  });
  const roiStatsRef = useReveal({ ...DEFAULTS.body, delay: 0.15 });

  const tCTAs = useTranslations("commercial.ctas");
  const tiers = [
    {
      id: "essential" as const,
      name: t("tiers.essential.name"),
      buyerLabel: tp("essential.buyerLabel"),
      internalLabel: tp("essential.internalLabel"),
      ctaLabel: tCTAs("pricingEssential"),
      priceRange: t("tiers.essential.priceRange"),
      originalPrice: t("tiers.essential.originalPrice"),
      idealFor: t("tiers.essential.idealFor"),
      notIncluded: t("tiers.essential.notIncluded"),
      highlight: false,
      nextStep: tp("essential.nextStep"),
      features: Array.from({ length: 5 }, (_, i) =>
        t(`tiers.essential.features.${i}`),
      ),
    },
    {
      id: "professional" as const,
      name: t("tiers.professional.name"),
      buyerLabel: tp("professional.buyerLabel"),
      internalLabel: tp("professional.internalLabel"),
      ctaLabel: tCTAs("pricingProfessional"),
      priceRange: t("tiers.professional.priceRange"),
      originalPrice: t("tiers.professional.originalPrice"),
      idealFor: t("tiers.professional.idealFor"),
      notIncluded: t("tiers.professional.notIncluded"),
      highlight: true,
      nextStep: tp("professional.nextStep"),
      features: Array.from({ length: 5 }, (_, i) =>
        t(`tiers.professional.features.${i}`),
      ),
    },
    {
      id: "ecommerce" as const,
      name: t("tiers.ecommerce.name"),
      buyerLabel: tp("ecommerce.buyerLabel"),
      internalLabel: tp("ecommerce.internalLabel"),
      ctaLabel: tCTAs("pricingEcommerce"),
      priceRange: t("tiers.ecommerce.priceRange"),
      originalPrice: t("tiers.ecommerce.originalPrice"),
      idealFor: t("tiers.ecommerce.idealFor"),
      notIncluded: t("tiers.ecommerce.notIncluded"),
      highlight: false,
      nextStep: tp("ecommerce.nextStep"),
      features: Array.from({ length: 5 }, (_, i) =>
        t(`tiers.ecommerce.features.${i}`),
      ),
    },
    {
      id: "flagship" as const,
      name: t("tiers.flagship.name"),
      buyerLabel: tp("flagship.buyerLabel"),
      internalLabel: tp("flagship.internalLabel"),
      ctaLabel: tCTAs("pricingFlagship"),
      priceRange: t("tiers.flagship.priceRange"),
      originalPrice: t("tiers.flagship.originalPrice"),
      idealFor: t("tiers.flagship.idealFor"),
      notIncluded: null,
      highlight: false,
      nextStep: tp("flagship.nextStep"),
      features: Array.from({ length: 5 }, (_, i) =>
        t(`tiers.flagship.features.${i}`),
      ),
    },
  ];

  const roiStats = [
    {
      key: "timeline",
      label: t("roi.stats.timeline.label"),
      value: t("roi.stats.timeline.value"),
      sub: t("roi.stats.timeline.sub"),
    },
    {
      key: "timeSaved",
      label: t("roi.stats.timeSaved.label"),
      value: t("roi.stats.timeSaved.value"),
      sub: t("roi.stats.timeSaved.sub"),
    },
    {
      key: "deliverable",
      label: t("roi.stats.deliverable.label"),
      value: t("roi.stats.deliverable.value"),
      sub: t("roi.stats.deliverable.sub"),
    },
  ];

  const commercialNotes = [
    {
      key: "yearOne",
      label: t("commercial.items.yearOne.label"),
      value: t("commercial.items.yearOne.value"),
    },
    {
      key: "exclusions",
      label: t("commercial.items.exclusions.label"),
      value: t("commercial.items.exclusions.value"),
    },
    {
      key: "paymentTerms",
      label: t("commercial.items.paymentTerms.label"),
      value: t("commercial.items.paymentTerms.value"),
    },
  ];

  return (
    <>
      <section
        className="relative z-10 flex lg:min-h-screen w-full flex-col justify-end overflow-hidden pt-(--section-y-top) pb-12"
        aria-label="Pricing section"
      >
        <Container>
          <div className="mb-16">
            <div className="py-12 md:py-24">
              <div className="mb-16 sm:max-w-5xl max-w-full">
                <p
                  ref={heroEyebrowRef}
                  className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-4 block"
                >
                  {t("label")}
                </p>
                <h1
                  ref={heroTitleRef}
                  className="text-[clamp(3rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em] mb-8 font-sans font-light text-foreground select-none"
                >
                  {t("title")}
                  <br />
                  <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
                    {t("titleItalic")}
                  </span>
                </h1>
                <p
                  ref={heroDescRef}
                  className="text-base text-primary/60 leading-relaxed max-w-[52ch]"
                >
                  {t("description")}
                </p>
              </div>
              <div className="h-px w-full bg-foreground/8 mb-12" />
              <div
                ref={tierCardsRef}
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8"
              >
                {tiers.map((tier, i) => (
                  <article
                    key={tier.id}
                    className={[
                      "tier-card relative border rounded-sm p-6 md:p-8 flex flex-col",
                      tier.highlight
                        ? "border-foreground/40 bg-foreground/4"
                        : "border-foreground/8 bg-foreground/2",
                    ].join(" ")}
                  >
                    {tier.highlight && (
                      <>
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-foreground/60 rounded-t-sm" />
                        <div className="mb-3">
                          <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70">
                            {t("recommended")}
                          </p>
                        </div>
                      </>
                    )}
                    <span
                      className="absolute top-6 end-6 font-mono font-light text-primary/5 select-none pointer-events-none"
                      style={{
                        fontSize: "clamp(48px, 6vw, 64px)",
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2
                      className="font-sans font-medium text-primary mb-1"
                      style={{
                        fontSize: "clamp(15px, 1.6vw, 18px)",
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {tier.buyerLabel}
                    </h2>
                    <p className="font-mono text-[10px] leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-primary/35 mb-2">
                      {tier.internalLabel}
                    </p>
                    {tier.highlight && tier.originalPrice && (
                      <div className="text-[10px] text-primary/35 line-through mb-1">
                        {tier.originalPrice}
                      </div>
                    )}
                    <p className="font-mono text-xs leading-normal tracking-wider text-primary/70 uppercase mb-4">
                      {tier.priceRange}
                    </p>
                    <p className="text-[13px] text-primary/60 leading-relaxed mb-6">
                      {tier.idealFor}
                    </p>
                    <ul className="space-y-1.5 mb-8">
                      {tier.features.map((feature, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-2 text-[12px] text-primary/60"
                        >
                          <div className="h-px w-2 bg-foreground/8 mt-2 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-6 border-t border-foreground/8 flex flex-col gap-4">
                      {tier.notIncluded && (
                        <p className="text-[10px] text-primary/35 leading-relaxed">
                          {tier.notIncluded}
                        </p>
                      )}
                      <p className="text-[10px] text-primary/75 leading-relaxed">
                        {tier.nextStep}
                      </p>
                      <MagneticButton
                        variant={tier.highlight ? "primary" : "secondary"}
                        className="group w-full justify-center mt-2"
                      >
                        <Link
                          href={TIER_DESTINATION[tier.id]}
                          className="w-full justify-center"
                          aria-label={`${tier.ctaLabel} - ${tier.buyerLabel}`}
                        >
                          <ArrowLabel className="text-xs">
                            {tier.ctaLabel}
                          </ArrowLabel>
                        </Link>
                      </MagneticButton>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mb-12 relative overflow-hidden rounded-sm border border-foreground/10 px-6 py-8 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent pointer-events-none" />
                <div className="relative z-10 shrink-0">
                  <p className="font-mono text-xs leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-2">
                    {t("minimumEngagement").includes("٢٢") ? "الحد الأدنى للمشاريع" : "Minimum Engagement"}
                  </p>
                  <p className="text-2xl md:text-3xl font-medium text-foreground">
                    {t("minimumEngagement")}
                  </p>
                </div>
                <div className="hidden md:block w-px h-16 bg-foreground/10 relative z-10" />
                <div className="relative z-10 flex-1 max-w-2xl">
                  <p className="text-[15px] md:text-base text-primary/70 leading-[1.6]">
                    {t("ownershipNote")}
                  </p>
                </div>
              </div>
              <div ref={commercialNotesRef} className="space-y-4 mb-16">
                <div className="grid gap-4 md:grid-cols-2">
                  {commercialNotes.filter(n => n.key !== "paymentTerms").map((note) => (
                    <div
                      key={note.key}
                      className="commercial-note rounded-sm border border-foreground/8 bg-foreground/2 p-5 md:p-6 flex flex-col"
                    >
                      <p className="font-mono text-sm leading-normal tracking-wider text-[10px] uppercase text-primary/70 mb-3">
                        {note.label}
                      </p>
                      <p className="text-[13px] md:text-sm text-primary/60 leading-relaxed mt-auto">
                        {note.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-px w-full bg-foreground/8" />
              <section className="pt-16">
                <p
                  ref={roiEyebrowRef}
                  className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-4 block"
                >
                  {t("roi.eyebrow")}
                </p>
                <h2
                  ref={roiTitleRef}
                  className="font-sans font-normal text-primary leading-[1.05] mb-8"
                  style={{
                    fontSize: "clamp(28px, 4.5vw, 52px)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {t("roi.title")}
                </h2>
                <div
                  ref={roiBodyRef}
                  className="grid md:grid-cols-2 gap-8 mb-10 max-w-3xl"
                >
                  <p className="roi-p text-base text-primary/60 leading-relaxed">
                    {t("roi.calculation")}
                  </p>
                  <p className="roi-p text-base text-primary/60 leading-relaxed">
                    {t("roi.question")}
                  </p>
                </div>
                <div
                  ref={roiStatsRef}
                  className="mt-12 py-6 px-6 md:px-8 rounded-sm bg-foreground/3 border border-foreground/8"
                >
                  <div className="grid md:grid-cols-3 gap-6">
                    {roiStats.map((stat, i) => (
                      <div
                        key={stat.key}
                        className={
                          i > 0
                            ? "md:border-l rtl:md:border-l-0 rtl:md:border-r border-foreground/8 md:pl-6 rtl:md:pl-0 rtl:md:pr-6"
                            : ""
                        }
                      >
                        <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-2">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-light text-primary mb-1">
                          {stat.value}
                        </p>
                        <p className="text-xs text-primary/70">{stat.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </Container>
      </section>
      <FaqSection namespace="pricing" className="pt-12 pb-32 border-t border-foreground/8" />
    </>
  );
}
