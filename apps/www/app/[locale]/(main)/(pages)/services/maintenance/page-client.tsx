"use client";
import { Container } from "@/components/container";
import { MagneticButton } from "@/components/magnetic-button";
import { ServiceHero } from "@/components/sections/service-hero";
import { Link } from "@/i18n/navigation";
import { accentWorldClass } from "@/lib/accent-world";
import { getCommercialCta } from "@/lib/commercial";
import { monoCaps } from "@/lib/mono-caps";
import { MOTION, useSectionCardGrid, useSectionDescription, useSectionElement, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function MaintenancePage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <PricingSection />
      <CtaSection />
    </div>
  );
}

function HeroSection() {
  const t = useTranslations("serviceDetails.maintenance");
  const tCTAs = useTranslations("commercial.ctas");
  const projectRangeCta = getCommercialCta("projectRange");

  return (
    <ServiceHero
      watermark="04"
      subtitle={t("subtitle")}
      title={t("title")}
      titleItalic={t("titleItalic")}
      description={t("description")}
      gridVisibility="md-up"
      primaryCta={{ href: projectRangeCta.href, label: tCTAs("projectRange") }}
      secondaryCta={{ href: "#pricing", label: tCTAs("maintenancePlans") }}
    />
  );
}

function StatsSection() {
  const t = useTranslations("serviceDetails.maintenance");
  const leftRef = useSectionDescription<HTMLDivElement>();
  const rightRef = useSectionElement<HTMLDivElement>();

  const stats = [
    { value: "99.9%", labelKey: "stats.uptime" },
    { value: "< 1hr", labelKey: "stats.response" },
    { value: "24/7", labelKey: "stats.monitoring" },
    { value: "100%", labelKey: "stats.satisfaction" },
  ];

  return (
    <section
      className={cn("pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8", accentWorldClass("green"))}
    >
      <Container>
        <div className="grid md:grid-cols-12 gap-4">
          <div
            ref={leftRef}
            className="md:col-span-7 border border-foreground/8 rounded-lg bg-foreground/2 p-8 md:p-12"
          >
            <p className={cn(monoCaps, "text-local-accent mb-4 block")}>
              {t("stats.eyebrow")}
            </p>
            <h2
              className="font-sans font-normal text-primary leading-[1.05] mb-8"
              style={{
                fontSize: "clamp(28px, 4.5vw, 52px)",
                letterSpacing: "-0.02em",
              }}
            >
              {t("stats.title")}
            </h2>
            <div className="space-y-5">
              <p className="text-base text-primary/60 leading-relaxed">
                {t("stats.body1")}
              </p>
              <p className="text-base text-primary/60 leading-relaxed">
                {t("stats.body2")}
              </p>
            </div>
          </div>
          <div ref={rightRef} className="md:col-span-5 grid grid-cols-2 gap-3">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="border border-foreground/8 rounded-lg bg-foreground/2 p-5 md:p-6 flex flex-col justify-between group hover:bg-foreground/4 transition-colors duration-300"
              >
                <p className={cn(monoCaps, "text-foreground/35 mb-4")}>
                  {t(stat.labelKey)}
                </p>
                <span
                  className="font-sans font-light text-local-accent leading-none"
                  style={{
                    fontSize: "clamp(26px, 3.5vw, 36px)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function FeaturesSection() {
  const t = useTranslations("serviceDetails.maintenance");
  const tCommon = useTranslations("serviceDetails");
  const sectionRef = useSectionCardGrid<HTMLElement>({ selector: "[data-feature-card]",
    stagger: MOTION.stagger.tight,
    distance: MOTION.distance.sm,
  });
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();

  const features = ["01", "02", "03", "04", "05", "06"].map((num, i) => ({
    num,
    title: t(`features.${num}.title`),
    description: t(`features.${num}.description`),
    wide: i === 0 || i === 5,
  }));

  return (
    <section
      ref={sectionRef}
      className="accent-world-orange pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8"
    >
      <Container>
        <div className="mb-16">
          <p
            ref={eyebrowRef}
            className={cn(monoCaps, "text-muted-foreground/70 mb-4 block")}
          >
            {tCommon("whatWeOfferEyebrow")}
          </p>
          <div className="flex items-end justify-between gap-8 flex-wrap">
            <h2
              ref={titleRef}
              className="font-sans font-normal text-primary leading-[1.05]"
              style={{
                fontSize: "clamp(28px, 4.5vw, 52px)",
                letterSpacing: "-0.02em",
              }}
            >
              {tCommon("whatWeOffer")}
              <br />
              <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
                {tCommon("whatWeOfferItalic")}
              </span>
            </h2>
            <p
              className={cn(
                monoCaps,
                "text-primary/35 max-w-[28ch] hidden md:block",
              )}
            >
              {tCommon("whatWeOfferSubtitle")}
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-6 gap-4">
          {features.map((feature, i) => (
            <div
              key={i}
              data-feature-card
              className={[
                "group relative border border-foreground/8 rounded-lg bg-foreground/2 p-6 md:p-8 overflow-hidden hover:bg-foreground/4 transition-colors duration-300",
                feature.wide ? "md:col-span-3" : "md:col-span-2",
              ].join(" ")}
            >
              <div className="flex items-start justify-between mb-6">
                <span className={cn(monoCaps, "text-foreground/20")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <svg
                  className="w-4 h-4 text-primary/0 group-hover:text-primary/35 transition-all duration-300 ltr:-translate-x-2 group-hover:translate-x-0 rtl:-rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </div>
              <h3
                className="font-sans font-medium text-primary mb-3 group-hover:text-primary/80 transition-colors duration-300"
                style={{
                  fontSize: "clamp(15px, 1.6vw, 18px)",
                  letterSpacing: "-0.01em",
                }}
              >
                {feature.title}
              </h3>
              <p className="text-sm text-primary/60 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function PricingSection() {
  const t = useTranslations("serviceDetails.maintenance");
  const sectionRef = useSectionCardGrid<HTMLElement>({ selector: "[data-pricing-card]" });
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();

  const plans = [
    {
      key: "essential",
      price: t("pricing.plans.essential.price"),
      featured: false,
      index: "01",
    },
    {
      key: "professional",
      price: t("pricing.plans.professional.price"),
      featured: true,
      index: "02",
    },
    {
      key: "enterprise",
      price: t("pricing.plans.enterprise.price"),
      featured: false,
      index: "03",
    },
  ];
  const commercialNotes = ["infra", "scope", "addons"].map((key) => ({
    key,
    label: t(`pricing.notes.${key}.label`),
    value: t(`pricing.notes.${key}.value`),
  }));

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="accent-world-orange pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8"
    >
      <Container>
        <div className="mb-16">
          <p
            ref={eyebrowRef}
            className={cn(monoCaps, "text-muted-foreground/70 mb-4 block")}
          >
            {t("pricing.eyebrow")}
          </p>
          <div className="flex items-end justify-between gap-8 flex-wrap">
            <h2
              ref={titleRef}
              className="font-sans font-normal text-primary leading-[1.05]"
              style={{
                fontSize: "clamp(28px, 4.5vw, 52px)",
                letterSpacing: "-0.02em",
              }}
            >
              {t("pricing.title")}
              <br />
              <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
                {t("pricing.titleItalic")}
              </span>
            </h2>
            <p
              className={cn(
                monoCaps,
                "text-primary/35 max-w-[36ch] hidden lg:block leading-relaxed",
              )}
            >
              {t("pricing.subtitle")}
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map(({ key, price, featured, index }) => (
            <div
              key={key}
              data-pricing-card
              className={cn(
                "group relative border rounded-lg bg-foreground/2 p-7 md:p-8 overflow-hidden flex flex-col transition-colors duration-300",
                featured
                  ? "border-foreground/20"
                  : "border-foreground/8 hover:bg-foreground/4",
              )}
            >
              {featured && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-foreground/60" />
              )}
              <div
                aria-hidden
                className={cn(monoCaps, "text-foreground/20 mb-6")}
              >
                {index}
              </div>
              <div className="mb-1 flex items-center justify-between">
                <h3
                  className="font-sans font-medium text-primary"
                  style={{
                    fontSize: "clamp(16px, 1.8vw, 20px)",
                    letterSpacing: "-0.015em",
                  }}
                >
                  {t(`pricing.plans.${key}.name`)}
                </h3>
                {featured && (
                  <span
                    className={cn(
                      monoCaps,
                      "text-primary/75 border border-foreground/15 px-2 py-0.5 rounded-full text-xs",
                    )}
                  >
                    {t("pricing.recommended")}
                  </span>
                )}
              </div>
              <div className="mt-6 mb-6 pb-6 border-b border-foreground/8">
                <span
                  className="font-sans font-light text-primary leading-none"
                  style={{
                    fontSize: "clamp(26px, 3.2vw, 36px)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {price ?? t("pricing.customPrice")}
                </span>
                {price && (
                  <span className={cn(monoCaps, "text-primary/35 ml-2")}>
                    {t("pricing.perMonth")}
                  </span>
                )}
              </div>
              <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                {([0, 1, 2, 3, 4] as const).map((i) => {
                  const features = t.raw(
                    `pricing.plans.${key}.features`,
                  ) as string[];
                  const feature = features[i];
                  if (!feature) return null;
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-primary/55 leading-relaxed"
                    >
                      <span
                        className={cn(
                          monoCaps,
                          "text-primary/30 mt-0.5 shrink-0 select-none",
                        )}
                      >
                        -
                      </span>
                      {feature}
                    </li>
                  );
                })}
              </ul>
              <MagneticButton
                asChild
                size="lg"
                variant={featured ? "primary" : "secondary"}
                className="mt-auto w-full justify-center group"
              >
                <Link href="/contact">
                  <span className="flex items-center gap-2">
                    {t("pricing.getStarted")}
                    <svg
                      className="w-4 h-4 transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:-rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </span>
                </Link>
              </MagneticButton>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {commercialNotes.map((note) => (
            <div
              key={note.key}
              className="rounded-lg border border-foreground/8 bg-foreground/2 p-5 md:p-6"
            >
              <p className={cn(monoCaps, "text-primary/70 mb-3")}>
                {note.label}
              </p>
              <p className="text-sm text-primary/60 leading-relaxed">
                {note.value}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function CtaSection() {
  const t = useTranslations("serviceDetails.maintenance");
  const tCommon = useTranslations("serviceDetails");
  const leftRef = useSectionDescription<HTMLDivElement>();
  const rightRef = useSectionElement<HTMLDivElement>();

  const checks = [
    { label: t("cta.checks.uptime") },
    { label: t("cta.checks.security") },
    { label: t("cta.checks.backups") },
    { label: t("cta.checks.monitoring") },
  ];

  return (
    <section
      className={cn("pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8", accentWorldClass("orange"))}
    >
      <Container>
        <div className="grid md:grid-cols-12 gap-4">
          <div
            ref={leftRef}
            className="md:col-span-5 border border-foreground/8 rounded-lg bg-foreground/2 p-7 md:p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <p className={cn(monoCaps, "text-muted-foreground/70")}>
                {t("cta.statusTitle")}
              </p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span className={cn(monoCaps, "text-primary/70")}>
                  {t("cta.status")}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {checks.map((check, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border border-foreground/8 rounded-lg bg-foreground/2 px-4 py-3"
                >
                  <span className="text-sm text-primary/60">{check.label}</span>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-success/70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className={cn(monoCaps, "text-primary/30")}>
                      {t("cta.active")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            ref={rightRef}
            className="md:col-span-7 border border-foreground/8 rounded-lg bg-foreground/2 p-8 md:p-10 flex flex-col justify-between gap-8"
          >
            <div>
              <p
                className={cn(monoCaps, "text-local-accent mb-6 block")}
              >
                {t("cta.eyebrow")}
              </p>
              <h2
                className="font-sans font-normal text-primary leading-[1.05] mb-5"
                style={{
                  fontSize: "clamp(24px, 4vw, 44px)",
                  letterSpacing: "-0.02em",
                }}
              >
                {t("cta.title")}
              </h2>
              <p className="text-base text-primary/60 leading-relaxed max-w-[44ch]">
                {t("cta.description")}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <MagneticButton
                asChild
                size="lg"
                variant="accent"
                className="group w-full justify-center"
              >
                <Link href="/contact">
                  <span className="flex items-center gap-2">
                    {tCommon("ctaPrimary")}
                    <svg
                      className="w-4 h-4 transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:-rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </span>
                </Link>
              </MagneticButton>
              <MagneticButton
                asChild
                size="lg"
                variant="secondary"
                className="w-full justify-center"
              >
                <Link href="/services">{t("cta.back")}</Link>
              </MagneticButton>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
