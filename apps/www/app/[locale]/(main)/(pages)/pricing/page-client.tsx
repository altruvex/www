"use client";

import { Container } from "@/components/shared/container";
import { ArrowLabel } from "@/components/shared/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { FaqSection } from "@/components/sections/faq-section";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { Highlight } from "@/components/ui/emphasis";
import { Link } from "@/i18n/navigation";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { useTranslations } from "next-intl";
import { bodyMarks } from "@/components/ui/rich-text";

const TIER_DESTINATION = {
  essential: "/transparency?tier=essential",
  professional: "/transparency?tier=professional",
  ecommerce: "/transparency?tier=commerce&projectType=ecommerce",
  flagship: "/transparency?tier=flagship",
} as const;

function HighlightBlobs() {
  return (
    <div
      className="absolute inset-0 overflow-hidden z-0 pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-opacity duration-700"
      aria-hidden="true"
    >
      <div
        className="absolute -top-10 -left-10 w-72 h-72 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--brand) / 0.40), transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/4 left-1/4 w-60 h-60 rounded-full blur-[35px]"
        style={{
          background:
            "radial-gradient(circle at center, hsl(214 89% 66% / 0.34), transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/3 -right-12 w-72 h-72 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle at center, hsl(224 70% 58% / 0.32), transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-10 right-1/4 w-64 h-64 rounded-full blur-[35px]"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--brand) / 0.30), transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle at center, hsl(204 85% 60% / 0.28), transparent 70%)",
        }}
      />
    </div>
  );
}

export default function PricingPage() {
  const t = useTranslations("pricing");
  const tp = useTranslations("commercial.pricing");
  const tCTAs = useTranslations("commercial.ctas");

  const heroEyebrowRef = useSectionEyebrow();
  const heroTitleRef = useSectionTitle<HTMLHeadingElement>();
  const heroDescRef = useSectionDescription();
  const tierCardsRef = useSectionCardGrid<HTMLDivElement>({ selector: ".tier-card" });
  const commercialNotesRef = useSectionCardGrid<HTMLDivElement>({ selector: ".commercial-note" });
  const roiEyebrowRef = useSectionEyebrow();
  const roiTitleRef = useSectionTitle<HTMLHeadingElement>();
  const roiBodyRef = useSectionCardGrid<HTMLDivElement>({ selector: ".roi-p" });
  const roiStatsRef = useSectionDescription();

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
      features: Array.from({ length: 5 }, (_, i) => t(`tiers.essential.features.${i}`)),
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
      features: Array.from({ length: 5 }, (_, i) => t(`tiers.professional.features.${i}`)),
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
      features: Array.from({ length: 5 }, (_, i) => t(`tiers.ecommerce.features.${i}`)),
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
      features: Array.from({ length: 5 }, (_, i) => t(`tiers.flagship.features.${i}`)),
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
      value: t.rich("commercial.items.paymentTerms.value", bodyMarks),
    },
  ];

  return (
    <>
      <section
        className="accent-world-orange relative z-10 flex lg:min-h-screen w-full flex-col justify-end overflow-hidden pt-(--section-y-top) pb-12"
        aria-label="Pricing section"
      >
        <Container>
          <div className="mb-16">
            <div className="py-12 md:py-24">
              
              {/* ORIGINAL HERO SECTION */}
              <div className="mb-20 sm:max-w-5xl max-w-full">
                <p
                  ref={heroEyebrowRef}
                  className="font-mono text-xs leading-normal tracking-[0.12em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-5 block"
                >
                  {t("label")}
                </p>
                <h1
                  ref={heroTitleRef}
                  className="text-[clamp(3rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em] mb-7 font-sans font-light text-foreground select-none"
                >
                  {t("title")}
                  <br />
                  <Highlight className="text-foreground/40">{t("titleItalic")}</Highlight>
                </h1>
                <p
                  ref={heroDescRef}
                  className="text-base text-muted-foreground leading-relaxed max-w-[52ch]"
                >
                  {t("description")}
                </p>
              </div>
              <div className="h-px w-full bg-border mb-14" />
              
              {/* ORIGINAL PRICING CARDS */}
              <div
                ref={tierCardsRef}
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-24 items-start"
              >
                {tiers.map((tier, i) =>
                  tier.highlight ? (
                    <article
                      key={tier.id}
                      className="tier-card group relative rounded-2xl flex flex-col transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/10"
                    >
                      <div className="absolute inset-0 overflow-hidden rounded-2xl z-0">
                        <div className="absolute inset-0 bg-background/40 z-0" />
                        <HighlightBlobs />
                      </div>
                      <div className="absolute inset-0 z-10 liquid-glass rounded-2xl pointer-events-none" />
                      <div className="relative z-20 p-7 md:p-8 flex flex-col h-full">
                        <div className="mb-5">
                          <span className="inline-flex font-mono text-[9px] tracking-[0.14em] uppercase px-3 py-1.5 rounded-full rtl:font-sans rtl:normal-case rtl:tracking-normal text-foreground bg-s-surface border border-s-border shadow-sm">
                            {t("recommended")}
                          </span>
                        </div>
                        <span
                          className="absolute top-5 inset-e-6 font-mono font-bold select-none pointer-events-none leading-none text-foreground/4"
                          style={{ fontSize: "clamp(64px, 7vw, 80px)", letterSpacing: "-0.04em" }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <p className="font-mono text-[10px] tracking-widest uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-1">
                          {tier.internalLabel}
                        </p>
                        <h2
                          className="font-sans font-semibold text-foreground mb-4"
                          style={{ fontSize: "clamp(16px, 1.6vw, 19px)", letterSpacing: "-0.018em" }}
                        >
                          {tier.buyerLabel}
                        </h2>
                        {tier.originalPrice && (
                          <span className="font-mono text-[11px] line-through text-muted-foreground mb-0.5">
                            {tier.originalPrice}
                          </span>
                        )}
                        <p className="font-mono text-xs tracking-wider uppercase text-foreground mb-5">
                          {tier.priceRange}
                        </p>
                        <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 font-medium">
                          {tier.idealFor}
                        </p>
                        <ul className="space-y-2 mb-8 relative z-20">
                          {tier.features.map((feature, j) => (
                            <li
                              key={j}
                              className="flex items-start gap-2.5 text-[12px] text-foreground font-medium"
                            >
                              <div
                                className="w-[6px] h-[6px] rounded-full shrink-0 mt-[4px] bg-brand shadow-[0_0_8px_hsl(var(--brand))]"
                              />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-auto pt-5 border-t border-s-border flex flex-col gap-3.5 relative z-20">
                          <MagneticButton asChild
                            variant="primary"
                            className="group w-full justify-center mt-1 shadow-md shadow-brand/20"
                          >
                            <Link
                              href={TIER_DESTINATION[tier.id]}
                              className="w-full justify-center"
                              aria-label={`${tier.ctaLabel} - ${tier.buyerLabel}`}
                            >
                              <ArrowLabel className="text-xs">{tier.ctaLabel}</ArrowLabel>
                            </Link>
                          </MagneticButton>
                        </div>
                      </div>
                    </article>
                  ) : (
                    <article
                      key={tier.id}
                      className="tier-card group relative rounded-2xl p-7 md:p-8 flex flex-col overflow-hidden transition-all duration-500 hover:-translate-y-1 bg-s-surface border border-s-border hover:border-s-border-hover"
                    >
                      <div className="relative z-20 flex flex-col h-full">
                        <span
                          className="absolute bottom-4 inset-e-1 font-mono font-bold select-none pointer-events-none leading-none text-foreground/3"
                          style={{ fontSize: "clamp(64px, 7vw, 80px)", letterSpacing: "-0.04em" }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <p className="font-mono text-[10px] tracking-widest uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-1">
                          {tier.internalLabel}
                        </p>
                        <h2
                          className="font-sans font-semibold text-foreground mb-4"
                          style={{ fontSize: "clamp(15px, 1.5vw, 18px)", letterSpacing: "-0.016em" }}
                        >
                          {tier.buyerLabel}
                        </h2>
                        <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase mb-5">
                          {tier.priceRange}
                        </p>
                        <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">
                          {tier.idealFor}
                        </p>
                        <ul className="space-y-2 mb-8">
                          {tier.features.map((feature, j) => (
                            <li
                              key={j}
                              className="flex items-start gap-2.5 text-[12px] text-muted-foreground"
                            >
                              <div className="w-[5px] h-[5px] rounded-full shrink-0 mt-[5px] bg-border-mid transition-colors group-hover:bg-muted-foreground/50" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-auto pt-5 border-t border-s-border flex flex-col gap-3 relative z-20">
                          <MagneticButton asChild
                            variant="secondary"
                            className="group w-full justify-center mt-1 bg-s-high-soft border border-s-border hover:bg-s-surface transition-colors"
                          >
                            <Link
                              href={TIER_DESTINATION[tier.id]}
                              className="w-full justify-center"
                              aria-label={`${tier.ctaLabel} - ${tier.buyerLabel}`}
                            >
                              <ArrowLabel className="text-xs">{tier.ctaLabel}</ArrowLabel>
                            </Link>
                          </MagneticButton>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>

              {/* REDESIGNED LOGISTICS & COMMERCIAL TERMS */}
              <div className="mb-32 grid grid-cols-1 gap-12 border-t border-border pt-16 md:grid-cols-3">
                <div className="md:col-span-1">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {t("minimumEngagement").includes("٢٢") ? "الحد الأدنى للمشاريع" : "Minimum Engagement"}
                  </p>
                  <p className="text-2xl font-medium tracking-tight text-foreground mb-4">
                    {t("minimumEngagement")}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t.rich("ownershipNote", bodyMarks)}
                  </p>
                </div>
                
                <div ref={commercialNotesRef} className="grid grid-cols-1 gap-12 md:col-span-2 md:grid-cols-2">
                  {commercialNotes.map((note) => (
                    <div key={note.key} className="commercial-note">
                      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {note.label}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {note.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* REDESIGNED ROI SECTION */}
              <section className="accent-world-orange border-t border-border pt-24 pb-12">
                <div className="mb-16 max-w-3xl">
                  <p ref={roiEyebrowRef} className="mb-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {t("roi.eyebrow")}
                  </p>
                  <h2 ref={roiTitleRef} className="mb-8 text-[clamp(2rem,3vw,3rem)] font-normal leading-[1.1] tracking-[-0.02em] text-foreground">
                    {t("roi.title")} <Highlight>{t("roi.titleItalic")}</Highlight>
                  </h2>
                  <div ref={roiBodyRef} className="grid gap-6 md:grid-cols-2">
                    <p className="roi-p text-[1.0625rem] leading-[1.7] text-muted-foreground">
                      {t.rich("roi.calculation", bodyMarks)}
                    </p>
                    <p className="roi-p text-[1.0625rem] leading-[1.7] text-muted-foreground">
                      {t.rich("roi.question", bodyMarks)}
                    </p>
                  </div>
                </div>

                <div ref={roiStatsRef} className="grid grid-cols-1 gap-8 border-t border-border pt-12 md:grid-cols-3 md:gap-12">
                  {roiStats.map((stat) => (
                    <div key={stat.key}>
                      <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="mb-2 text-4xl font-light tracking-tight text-foreground md:text-5xl">
                        {stat.value}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {stat.sub}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          </div>
        </Container>
      </section>
      
      <FaqSection namespace="pricing.faq" className="border-t border-border pt-12 pb-32" />
      <SectionEndCta variant="transparency" />
    </>
  );
}