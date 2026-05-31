"use client";

import { Container } from "@/components/container";
import { ArrowLabel } from "@/components/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { FaqSection } from "@/components/sections/faq-section";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { Link } from "@/i18n/navigation";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { useTranslations } from "next-intl";

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
        style={{ background: "radial-gradient(circle at center, hsl(var(--brand) / 0.9), transparent 70%)" }}
      />
      <div
        className="absolute top-1/4 left-1/4 w-60 h-60 rounded-full blur-[35px]"
        style={{ background: "radial-gradient(circle at center, hsl(var(--tech-accent-prisma) / 0.85), transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 -right-12 w-72 h-72 rounded-full blur-2xl"
        style={{ background: "radial-gradient(circle at center, hsl(var(--tech-accent-nextjs) / 0.9), transparent 70%)" }}
      />
      <div
        className="absolute -bottom-10 right-1/4 w-64 h-64 rounded-full blur-[35px]"
        style={{ background: "radial-gradient(circle at center, hsl(var(--tech-accent-react) / 0.8), transparent 70%)" }}
      />
    </div>
  );
}

export default function PricingPage() {
  const t = useTranslations("pricing");
  const tp = useTranslations("commercial.pricing");

  const heroEyebrowRef = useSectionEyebrow();
  const heroTitleRef = useSectionTitle<HTMLHeadingElement>();
  const heroDescRef = useSectionDescription();
  const tierCardsRef = useSectionCardGrid<HTMLDivElement>({ selector: ".tier-card" });
  const commercialNotesRef = useSectionCardGrid<HTMLDivElement>({ selector: ".commercial-note" });
  const roiEyebrowRef = useSectionEyebrow();
  const roiTitleRef = useSectionTitle<HTMLHeadingElement>();
  const roiBodyRef = useSectionCardGrid<HTMLDivElement>({ selector: ".roi-p" });
  const roiStatsRef = useSectionDescription();

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
              <div className="mb-20 sm:max-w-5xl max-w-full">
                <p
                  ref={heroEyebrowRef}
                  className="font-mono text-xs leading-normal tracking-[0.12em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/80 mb-5 block"
                >
                  {t("label")}
                </p>
                <h1
                  ref={heroTitleRef}
                  className="text-[clamp(3rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em] mb-7 font-sans font-light text-foreground select-none"
                >
                  {t("title")}
                  <br />
                  <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/40">
                    {t("titleItalic")}
                  </span>
                </h1>
                <p
                  ref={heroDescRef}
                  className="text-base text-muted-foreground leading-relaxed max-w-[52ch]"
                >
                  {t("description")}
                </p>
              </div>
              <div className="h-px w-full bg-border mb-14" />
              <div
                ref={tierCardsRef}
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-10 items-start"
              >
                {tiers.map((tier, i) =>
                  tier.highlight ? (
                    <article
                      key={tier.id}
                      className="tier-card group relative rounded-2xl flex flex-col overflow-hidden transition-all duration-500 hover:-translate-y-1"
                    >
                      <div className="absolute inset-0 bg-background/40 z-0" />
                      <HighlightBlobs />
                      <div className="absolute inset-0 z-10 liquid-glass rounded-2xl pointer-events-none" />
                      <div className="relative z-20 p-7 md:p-8 flex flex-col h-full">
                        <div className="mb-5">
                          <span className="inline-flex font-mono text-[9px] tracking-[0.14em] uppercase px-3 py-1.5 rounded-full rtl:font-sans rtl:normal-case rtl:tracking-normal text-foreground bg-s-surface border border-s-border backdrop-blur-md shadow-sm">
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
                          {tier.notIncluded && (
                            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                              {tier.notIncluded}
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                            {tier.nextStep}
                          </p>
                          <MagneticButton
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
                      className="tier-card group relative rounded-2xl p-7 md:p-8 flex flex-col overflow-hidden transition-all duration-500 hover:-translate-y-1 bg-s-surface border border-s-border hover:border-s-border-hover backdrop-blur-md"
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
                          {tier.notIncluded && (
                            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                              {tier.notIncluded}
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {tier.nextStep}
                          </p>
                          <MagneticButton
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
              <div className="mb-14 relative overflow-hidden rounded-2xl px-7 py-8 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center bg-s-surface backdrop-blur-sm border border-s-border shadow-[inset_0_1px_1px_var(--color-s-high-soft)]">
                <div
                  className="absolute inset-0 pointer-events-none mix-blend-multiply dark:mix-blend-screen opacity-50"
                  style={{ background: "linear-gradient(135deg, hsl(var(--brand) / 0.1), transparent 60%)" }}
                />
                <div className="relative z-10 shrink-0">
                  <p className="font-mono text-[10px] tracking-widest leading-normal uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-2">
                    {t("minimumEngagement").includes("٢٢")
                      ? "الحد الأدنى للمشاريع"
                      : "Minimum Engagement"}
                  </p>
                  <p className="text-2xl md:text-3xl font-medium text-foreground tracking-tight">
                    {t("minimumEngagement")}
                  </p>
                </div>
                <div className="hidden md:block w-px h-12 bg-border-mid relative z-10" />
                <div className="relative z-10 flex-1 max-w-2xl">
                  <p className="text-sm md:text-[15px] text-muted-foreground leading-[1.65]">
                    {t("ownershipNote")}
                  </p>
                </div>
              </div>
              <div ref={commercialNotesRef} className="mb-20">
                <div className="grid gap-4 md:grid-cols-2">
                  {commercialNotes
                    .filter((n) => n.key !== "paymentTerms")
                    .map((note) => (
                      <div
                        key={note.key}
                        className="commercial-note relative overflow-hidden rounded-2xl border border-s-border bg-s-surface backdrop-blur-sm p-6 md:p-7 flex flex-col shadow-[inset_0_1px_1px_var(--color-s-high-soft)] transition-colors hover:bg-s-border hover:border-s-border-hover"
                      >
                        <p className="font-mono text-[10px] tracking-widest uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-3 relative z-10">
                          {note.label}
                        </p>
                        <p className="text-[13px] md:text-sm text-muted-foreground leading-relaxed mt-auto relative z-10">
                          {note.value}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
              <div className="h-px w-full bg-border" />
              <section className="pt-16">
                <p
                  ref={roiEyebrowRef}
                  className="font-mono text-xs tracking-[0.12em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-5 block"
                >
                  {t("roi.eyebrow")}
                </p>
                <h2
                  ref={roiTitleRef}
                  className="font-sans font-normal text-foreground leading-[1.05] mb-9"
                  style={{ fontSize: "clamp(26px, 4.5vw, 50px)", letterSpacing: "-0.022em" }}
                >
                  {t("roi.title")}
                </h2>
                <div ref={roiBodyRef} className="grid md:grid-cols-2 gap-8 mb-12 max-w-3xl">
                  <p className="roi-p text-sm text-muted-foreground leading-relaxed">
                    {t("roi.calculation")}
                  </p>
                  <p className="roi-p text-sm text-muted-foreground leading-relaxed">
                    {t("roi.question")}
                  </p>
                </div>
                <div
                  ref={roiStatsRef}
                  className="relative overflow-hidden rounded-2xl border border-s-border bg-s-surface backdrop-blur-md shadow-[inset_0_1px_1px_var(--color-s-high-soft)]"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-px pointer-events-none opacity-50"
                    style={{
                      background: "linear-gradient(90deg, transparent, hsl(var(--brand)), transparent)",
                    }}
                  />
                  <div className="py-8 px-8 md:px-10 relative z-10">
                    <div className="grid md:grid-cols-3 gap-8">
                      {roiStats.map((stat, i) => (
                        <div
                          key={stat.key}
                          className={
                            i > 0
                              ? "md:border-s rtl:md:border-s-0 rtl:md:border-e border-s-border md:ps-8 rtl:md:ps-0 rtl:md:pe-8"
                              : ""
                          }
                        >
                          <p className="font-mono text-[10px] tracking-widest uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-3">
                            {stat.label}
                          </p>
                          <p
                            className="font-sans font-light text-foreground mb-1.5"
                            style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-0.02em" }}
                          >
                            {stat.value}
                          </p>
                          <p className="text-xs text-muted-foreground/80">{stat.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </Container>
      </section>
      <FaqSection
        namespace="pricing"
        className="pt-12 pb-32 border-t border-border"
      />
      <SectionEndCta variant="transparency" />
    </>
  );
}