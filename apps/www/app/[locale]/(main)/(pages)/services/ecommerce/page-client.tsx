"use client";

import { Container } from "@/components/container";
import { MagneticButton } from "@/components/magnetic-button";
import { SectionWatermark } from "@/components/section-watermark";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Link } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/commercial";
import { monoCaps } from "@/lib/mono-caps";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
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

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const ctaRef = useSectionElement();

  return (
    <section className="relative flex min-h-[80vh] lg:min-h-screen w-full flex-col justify-end overflow-hidden pt-(--section-y-top) pb-(--section-y-bottom)">
      <SectionWatermark>05</SectionWatermark>
      <div className="pointer-events-none absolute inset-0 overflow-hidden hidden md:block">
        <div className="absolute top-0 ltr:left-1/4 rtl:right-1/4 h-full w-px bg-foreground/6" />
        <div className="absolute top-0 ltr:right-1/4 rtl:left-1/4 h-full w-px bg-foreground/6" />
      </div>
      <div
        ref={eyebrowRef}
        className="absolute top-24 ltr:right-8 rtl:left-8 hidden lg:flex items-center gap-2"
      >
        <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
        <span className={cn(monoCaps, "text-foreground/50")}>
          {t("subtitle")}
        </span>
      </div>
      <Container>
        <div className="sm:max-w-5xl max-w-full">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span className={cn(monoCaps, "text-foreground/50")}>
              {t("subtitle")}
            </span>
          </div>
          <h1
            ref={titleRef}
            className="text-[clamp(3rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em] mb-8 font-sans font-light text-foreground select-none"
          >
            {t("title")}
            <br className="hidden sm:block" />
            <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
              {t("titleItalic")}
            </span>
          </h1>
          <div
            ref={descRef}
            className="mb-12 grid md:grid-cols-[80px_1fr] gap-8 items-start"
          >
            <div className="h-px w-full bg-foreground/8 mt-3 hidden md:block" />
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
              <Link href={projectRangeCta.href}>
                <span className="flex items-center justify-center gap-2">
                  {tCTAs("projectRange")}
                  <svg
                    aria-hidden
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
            <MagneticButton
              asChild
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <Link href={realBuildCta.href}>{tCTAs("realBuild")}</Link>
            </MagneticButton>
          </div>
        </div>
      </Container>
    </section>
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
    <section className="border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)">
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
    <section className="border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <p className={cn(monoCaps, "text-muted-foreground/70 mb-4 block")}>
          {t("eyebrow")}
        </p>
        <h2
          className="font-sans font-normal text-primary leading-[1.05] mb-4 max-w-2xl"
          style={{
            fontSize: "clamp(24px, 3.5vw, 40px)",
            letterSpacing: "-0.02em",
          }}
        >
          {t("title")}
        </h2>
        <p
          ref={descRef}
          className="text-base text-primary/60 leading-relaxed max-w-xl mb-8"
        >
          {t("body")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/work/art-lighting-store"
            className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground hover:text-foreground transition-colors"
          >
            Art Lighting →
          </Link>
          <Link
            href="/work/newlight-lighting-store"
            className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground hover:text-foreground transition-colors"
          >
            NewLight →
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
    <section className="border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="max-w-2xl">
          <p className={cn(monoCaps, "text-muted-foreground/70 mb-4 block")}>
            {t("eyebrow")}
          </p>
          <h2
            className="font-sans font-normal text-primary leading-[1.05] mb-4"
            style={{
              fontSize: "clamp(28px, 4.5vw, 52px)",
              letterSpacing: "-0.02em",
            }}
          >
            {t("title")}
          </h2>
          <p className="text-base text-primary/60 leading-relaxed mb-8 max-w-[48ch]">
            {t("description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <MagneticButton size="lg" variant="primary" className="w-full sm:w-auto">
              <Link href={technicalCallCta.href}>{tCTAs("technicalCall")}</Link>
            </MagneticButton>
            <MagneticButton
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