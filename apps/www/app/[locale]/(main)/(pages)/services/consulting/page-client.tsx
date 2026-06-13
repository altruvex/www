"use client"

import { ConsultingBriefSection } from "@/components/consulting-brief-section";
import { Container } from "@/components/container";
import { MagneticButton } from "@/components/magnetic-button";
import { SectionWatermark } from "@/components/section-watermark";
import { HeroReveal } from "@/components/sections/hero-motion-wrappers";
import { Link } from "@/i18n/navigation";
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
  const tHero = useTranslations("hero");
  const auditCta = getCommercialCta("technicalAudit");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const ctaRef = useSectionElement();

  return (
    <section className="flex min-h-screen items-center pt-(--section-y-top) pb-(--section-y-bottom)">
      <SectionWatermark>03</SectionWatermark>
      <div className="pointer-events-none absolute inset-0 overflow-hidden block">
        <div className="absolute top-0 ltr:left-1/4 rtl:right-1/4 h-full w-px bg-foreground/6" />
        <div className="absolute top-0 ltr:right-1/4 rtl:left-1/4 h-full w-px bg-foreground/6" />
        <div className="absolute top-1/3 left-0 right-0 h-px bg-foreground/5" />
      </div>
      <div
        ref={eyebrowRef}
        className="absolute top-24 ltr:right-8 rtl:left-8 hidden lg:flex flex-col ltr:items-end rtl:items-start gap-2"
      >
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <span className={cn(monoCaps, "text-foreground/50")}>
            {t("subtitle")}
          </span>
        </div>
      </div>

      <Container>
        <div className="sm:max-w-5xl max-w-full">
          <h1
            ref={titleRef}
            className="mb-10 font-sans font-normal text-primary leading-[1.03] rtl:leading-[1.2] select-none"
            style={{
              fontSize: "clamp(44px, 7vw, 96px)",
              letterSpacing: "-0.025em",
            }}
          >
            {t("title")}
            <br className="hidden sm:block" />
            <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45 block mt-2 sm:mt-0">
              {t("titleItalic")}
            </span>
          </h1>

          <div
            ref={descRef}
            className="mb-12 grid md:grid-cols-[80px_1fr] gap-8 items-start"
          >
            <div
              className="h-px w-full bg-foreground/8 mt-3 hidden md:block"
              aria-hidden="true"
            />
            <p className="text-base text-primary/60 leading-relaxed max-w-[52ch]">
              {t("description")}
            </p>
          </div>

          <div
            ref={ctaRef}
            className="flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <MagneticButton
              size="lg"
              variant="primary"
              className="group w-full sm:w-auto"
            >
              <Link href={auditCta.href}>
                <span className="flex items-center justify-center gap-2">
                  {tCTAs("technicalAudit")}
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:-rotate-180"
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
              className="w-full sm:w-auto text-center"
            >
              <Link href="#audit-offer">{t("hero.ctaSecondary")}</Link>
            </MagneticButton>
          </div>
        </div>
      </Container>

      <HeroReveal
        delay={1.1}
        className="pointer-events-none absolute bottom-8 inset-s-1/2 -translate-x-1/2 rtl:translate-x-1/2 hidden md:flex flex-col items-center gap-3 opacity-60 mix-blend-difference"
      >
        <p
          className="font-mono text-xs leading-none tracking-[0.3em] uppercase text-foreground rtl:font-sans rtl:normal-case rtl:tracking-normal"
          aria-hidden
        >
          {tHero("scrollHint")}
        </p>
        <div className="relative flex h-12 w-1 justify-center overflow-hidden bg-foreground/10" aria-hidden>
          <div className="absolute top-0 h-1/2 w-full bg-foreground motion-safe:animate-[slide-down_1.5s_cubic-bezier(0.65,0,0.35,1)_infinite] motion-reduce:animate-none" />
        </div>
      </HeroReveal>
    </section>
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
      className="pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8"
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
      className="pt-(--section-y-top) pb-(--section-y-bottom) border-t border-foreground/8"
    >
      <Container>
        <div className="grid md:grid-cols-[1fr_360px] gap-12 items-start">
          <div>
            <p className={cn(monoCaps, "text-muted-foreground/70 mb-6 block")}>
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
              <MagneticButton
                size="lg"
                variant="primary"
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
              <MagneticButton
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
