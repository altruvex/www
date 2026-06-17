"use client"

import { ConsultingBriefSection } from "@/components/consulting-brief-section";
import { Container } from "@/components/container";
import { MagneticButton } from "@/components/magnetic-button";
import { ServiceHero } from "@/components/sections/service-hero";
import { Link } from "@/i18n/navigation";
import { accentWorldClass } from "@/lib/accent-world";
import { getCommercialCta } from "@/lib/commercial";
import { monoCaps } from "@/lib/mono-caps";
import { useSectionDescription, useSectionElement, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function ConsultingPage() {
  return (
    <div className="relative min-h-screen w-full">
      <HeroSection />
      <div className="pb-48">
        <ConsultingBriefSection />
      </div>
      <AuditOfferSection />
      <CtaSection />
    </div>
  );
}

function HeroSection() {
  const t = useTranslations("serviceDetails.consulting");
  const tCTAs = useTranslations("commercial.ctas");
  const auditCta = getCommercialCta("technicalAudit");

  return (
    <ServiceHero
      watermark="03"
      subtitle={t("subtitle")}
      title={t("title")}
      titleItalic={t("titleItalic")}
      description={t("description")}
      titleSize="large"
      showMobileSubtitle={false}
      primaryCta={{ href: auditCta.href, label: tCTAs("technicalAudit") }}
      secondaryCta={{ href: "#audit-offer", label: t("hero.ctaSecondary") }}
    />
  );
}

function AuditOfferSection() {
  const t = useTranslations("serviceDetails.consulting.auditOffer");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const bodyRef = useSectionDescription();
  const panelRef = useSectionElement();

  const included = t.raw("included") as string[];

  return (
    <section
      id="audit-offer"
      className="accent-world-orange pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8"
    >
      <Container>
        <div
          ref={panelRef}
          data-scene="inverted"
          className="overflow-hidden rounded-section border border-s-border bg-inverted-bg"
        >
          <div className="h-px w-full bg-brand/60" />
          <div className="grid gap-10 p-6 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,360px)] md:p-10">
            <div>
              <p
                ref={eyebrowRef}
                className={cn(monoCaps, "text-s-muted mb-4 block")}
              >
                {t("eyebrow")}
              </p>
              <h2
                ref={titleRef}
                className="font-sans font-normal leading-[1.05] text-s-high"
                style={{
                  fontSize: "clamp(28px, 4.5vw, 52px)",
                  letterSpacing: "-0.02em",
                }}
              >
                {t("title")}
              </h2>
              <p
                ref={bodyRef}
                className="mt-6 max-w-[48ch] text-base leading-relaxed text-s-mid"
              >
                {t("description")}
              </p>
              <div className="mt-8">
                <MagneticButton
                  asChild
                  size="lg"
                  variant="primary"
                  className="group"
                >
                  <Link href="/contact?service=consulting&package=audit">
                    <span className="flex items-center gap-2">
                      {t("cta")}
                      <svg
                        className="h-4 w-4 transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:-rotate-180"
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
            </div>
            <div className="border border-s-border bg-s-surface p-5 md:p-6">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
                <div className="border-b border-s-border pb-4">
                  <p className={cn(monoCaps, "text-s-muted mb-2")}>
                    {t("priceLabel")}
                  </p>
                  <p
                    className="font-sans font-light leading-none text-s-high"
                    style={{
                      fontSize: "clamp(28px, 4vw, 40px)",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {t("price")}
                  </p>
                </div>
                <div className="border-b border-s-border pb-4">
                  <p className={cn(monoCaps, "text-s-muted mb-2")}>
                    {t("durationLabel")}
                  </p>
                  <p className="text-base leading-relaxed text-s-high">
                    {t("duration")}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <p className={cn(monoCaps, "text-s-muted mb-4")}>
                  {t("includedLabel")}
                </p>
                <ul className="space-y-3">
                  {included.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm leading-relaxed text-s-mid"
                    >
                      <div className="h-px w-3 bg-s-muted mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function CtaSection() {
  const t = useTranslations("serviceDetails.consulting");
  const sectionRef = useSectionDescription<HTMLElement>();
  const headlineRef = useSectionTitle<HTMLHeadingElement>();
  const subRef = useSectionDescription<HTMLDivElement>();
  const ctaRef = useSectionElement<HTMLDivElement>();

  return (
    <section
      ref={sectionRef}
      className={cn("pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8", accentWorldClass("orange"))}
    >
      <Container>
        <div className="grid md:grid-cols-[1fr_360px] gap-12 items-start">
          <div>
            <p className={cn(monoCaps, "text-local-accent mb-6 block")}>
              {t("cta.eyebrow")}
            </p>
            <h2
              ref={headlineRef}
              className="font-sans font-normal text-primary leading-[1.05]"
              style={{
                fontSize: "clamp(30px, 5.5vw, 68px)",
                letterSpacing: "-0.025em",
              }}
            >
              {t("cta.title")}
            </h2>
          </div>
          <div ref={subRef} className="flex flex-col gap-6">
            <p className="text-base text-primary/60 leading-relaxed">
              {t("cta.description")}
            </p>
            <div ref={ctaRef} className="flex flex-col gap-3">
              <MagneticButton asChild
                size="lg"
                variant="accent"
                className="group w-full justify-center"
              >
                <Link href="/schedule">
                  <span className="flex items-center gap-2">
                    {t("cta.button")}
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
              <MagneticButton asChild
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
