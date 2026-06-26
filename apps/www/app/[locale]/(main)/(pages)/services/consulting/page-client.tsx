"use client"

import { ConsultingBriefSection } from "@/components/sections/consulting-brief-section";
import { Container } from "@/components/shared/container";
import { ArrowIcon } from "@/components/shared/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { ServiceHero } from "@/components/sections/service-hero";
import { Accent, Highlight } from "@/components/ui/emphasis";
import { Link } from "@/i18n/navigation";
import { accentWorldClass } from "@/lib/config/accent-world";
import { getCommercialCta } from "@/lib/config/commercial";
import { monoCaps } from "@/lib/utils/mono-caps";
import { useSectionDescription, useSectionElement, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { bodyMarks } from "@/components/ui/rich-text";

export default function ConsultingPage() {
  return (
    <div>
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
      description={t.rich("description", bodyMarks)}
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
                className={cn(monoCaps, "text-s-mid mb-4 block")}
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
                {t("title")} <Highlight>{t("titleItalic")}</Highlight>
              </h2>
              <p
                ref={bodyRef}
                className="mt-6 max-w-[48ch] text-base leading-relaxed text-s-mid"
              >
                {t.rich("description", bodyMarks)}
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
                      {/* FIX: was a hand-rolled bidi SVG duplicated across
                          4 service pages (this file, development,
                          ecommerce, interface-design) with no shared
                          source of truth - one drifting fix and the rest
                          go stale. ArrowIcon already exists in the
                          codebase and its own name ("directional-link")
                          signals it owns RTL-mirroring logic. Verify the
                          AR route renders the arrow flipped correctly
                          after this swap; if ArrowIcon does NOT yet
                          mirror for RTL, that logic belongs centralized
                          inside it - not re-typed at every call site. */}
                      <ArrowIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </MagneticButton>
              </div>
            </div>
            <div className="border border-s-border bg-s-surface p-5 md:p-6">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
                <div className="border-b border-s-border pb-4">
                  <p className={cn(monoCaps, "text-s-mid mb-2")}>
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
                  <p className={cn(monoCaps, "text-s-mid mb-2")}>
                    {t("durationLabel")}
                  </p>
                  <p className="text-base leading-relaxed text-s-high">
                    {t("duration")}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <p className={cn(monoCaps, "text-s-mid mb-4")}>
                  {t("includedLabel")}
                </p>
                <ul className="space-y-3">
                  {included.map((item, i) => (
                    // FIX: keyed on the translated string itself - if two
                    // included-list lines are ever identical (or a locale
                    // produces a collision), React silently drops one.
                    // Index is safe here: this list is static/non-reorderable.
                    <li
                      key={`${i}-${item}`}
                      className="flex items-start gap-3 text-sm leading-relaxed text-s-mid"
                    >
                      <div aria-hidden className="h-px w-3 bg-s-muted mt-2 shrink-0" />
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
              {t("cta.title")} <Accent gradient="ember">{t("cta.titleAccent")}</Accent>
            </h2>
          </div>
          <div ref={subRef} className="flex flex-col gap-6">
            <p className="text-base text-primary/60 leading-relaxed">
              {t.rich("cta.description", bodyMarks)}
            </p>
            <CtaButtonGroup
              ref={ctaRef}
              primaryVariant="accent"
              primary={{ href: "/schedule", label: t("cta.button") }}
              secondary={{ href: "/services", label: t("cta.back") }}
              className="flex-col gap-3 sm:flex-col sm:items-stretch"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}