"use client";

import { Container } from "@/components/container";
import { ArrowIcon } from "@/components/directional-link";
import { Accent } from "@/components/ui/emphasis";
import { MagneticButton } from "@/components/magnetic-button";
import { ServiceHero } from "@/components/sections/service-hero";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Link } from "@/i18n/navigation";
import { accentWorldClass } from "@/lib/accent-world";
import { getCommercialCta } from "@/lib/commercial";
import { monoCaps } from "@/lib/mono-caps";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function EcommerceServicePage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <HeroSection />
      <CapabilitiesSection />
      <ProofSection />
      <ClosingCtaSection />
    </div>
  );
}

function HeroSection() {
  const t = useTranslations("serviceDetails.ecommerce");
  const tCTAs = useTranslations("commercial.ctas");
  const projectRangeCta = getCommercialCta("projectRange");
  const realBuildCta = getCommercialCta("realBuild");

  return (
    <ServiceHero
      watermark="05"
      subtitle={t("subtitle")}
      title={t("title")}
      titleItalic={t("titleItalic")}
      description={t("description")}
      gridVisibility="md-up"
      showHorizontalGridLine={false}
      showScrollHint={false}
      primaryCta={{ href: projectRangeCta.href, label: tCTAs("projectRange") }}
      secondaryCta={{ href: realBuildCta.href, label: tCTAs("realBuild") }}
    />
  );
}

function CapabilitiesSection() {
  const t = useTranslations("serviceDetails.ecommerce.capabilities");
  const items = t.raw("items") as Array<{ title: string; description: string }>;
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const gridRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-capability-card]",
  });

  return (
    <section className="accent-world-green border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <p
          ref={eyebrowRef}
          className={cn(monoCaps, "text-muted-foreground/70 mb-4 block")}
        >
          {t("eyebrow")}
        </p>
        <h2
          ref={titleRef}
          className="font-sans font-normal text-primary leading-[1.05] mb-12 max-w-2xl"
          style={{
            fontSize: "clamp(28px, 4.5vw, 52px)",
            letterSpacing: "-0.02em",
          }}
        >
          {t("title")}
        </h2>
        <div
          ref={gridRef}
          className="grid gap-px overflow-hidden rounded-lg border border-border bg-s-border md:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => (
            <SurfaceCard
              key={item.title}
              data-capability-card
              interactive
              className="border-0 rounded-none bg-surface/40 p-6 md:p-8"
            >
              <h3 className="text-lg font-medium text-foreground mb-3">
                {item.title}
              </h3>
              <p className="text-sm text-primary/60 leading-relaxed">
                {item.description}
              </p>
            </SurfaceCard>
          ))}
        </div>
      </Container>
    </section>
  );
}

function ProofSection() {
  const t = useTranslations("serviceDetails.ecommerce.proof");
  const descRef = useSectionDescription();

  return (
    <section
      className={cn("border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)", accentWorldClass("green"))}
    >
      <Container>
        <p className={cn(monoCaps, "text-local-accent mb-4 block")}>
          {t("eyebrow")}
        </p>
        <h2
          className="font-sans font-normal text-primary leading-[1.05] mb-4 max-w-2xl"
          style={{
            fontSize: "clamp(24px, 3.5vw, 40px)",
            letterSpacing: "-0.02em",
          }}
        >
          {t("title")} <Accent gradient="forest">{t("titleAccent")}</Accent>
        </h2>
        <p
          ref={descRef}
          className="text-base text-primary/60 leading-relaxed max-w-xl mb-8"
        >
          {t("body")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {/*
            FIX: hardcoded "→" unicode character. Brand names staying
            untranslated is correct (proper nouns), but the arrow glyph
            itself was a raw character, not the bidi-aware ArrowIcon used
            elsewhere in the system — it would sit visually backwards
            on the Arabic route instead of mirroring like every other
            directional affordance on the site. Also added a hover-shift
            on the icon so this matches the micro-interaction language
            used by every other link-with-arrow pattern across these
            pages instead of being a static, dead character.
          */}
          <Link
            href="/work/art-lighting-store"
            className="group eyebrow text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            Art Lighting
            <ArrowIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/work/newlight-lighting-store"
            className="group eyebrow text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            NewLight
            <ArrowIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Container>
    </section>
  );
}

function ClosingCtaSection() {
  const t = useTranslations("serviceDetails.ecommerce.cta");
  const tCTAs = useTranslations("commercial.ctas");
  const technicalCallCta = getCommercialCta("technicalCall");

  return (
    <section
      className={cn("border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)", accentWorldClass("orange"))}
    >
      <Container>
        <div className="max-w-2xl">
          <p className={cn(monoCaps, "text-local-accent mb-4 block")}>
            {t("eyebrow")}
          </p>
          <h2
            className="font-sans font-normal text-primary leading-[1.05] mb-4"
            style={{
              fontSize: "clamp(28px, 4.5vw, 52px)",
              letterSpacing: "-0.02em",
            }}
          >
            {t("title")} <Accent gradient="ember">{t("titleAccent")}</Accent>
          </h2>
          <p className="text-base text-primary/60 leading-relaxed mb-8 max-w-[48ch]">
            {t("description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <MagneticButton asChild size="lg" variant="accent" className="w-full sm:w-auto">
              <Link href={technicalCallCta.href}>{tCTAs("technicalCall")}</Link>
            </MagneticButton>
            <MagneticButton asChild
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <Link href="/services">{t("back")}</Link>
            </MagneticButton>
          </div>
        </div>
      </Container>
    </section>
  );
}