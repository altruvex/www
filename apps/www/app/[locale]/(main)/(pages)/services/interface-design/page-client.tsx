"use client";

import type { ReactNode } from "react";

import { Container } from "@/components/shared/container";
import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { ServiceHero } from "@/components/sections/service-hero";
import { Accent, Highlight } from "@/components/ui/emphasis";
import { accentWorldClass } from "@/lib/config/accent-world";
import { getCommercialCta } from "@/lib/config/commercial";
import { monoCaps } from "@/lib/utils/mono-caps";
import { MOTION, useSectionCardGrid, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { bodyMarks } from "@/components/ui/rich-text";

export default function InterfacePage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden selection:bg-foreground selection:text-background">
      <HeroSection />
      <FeaturesSection />
      <CtaSection />
    </div>
  );
}

function HeroSection() {
  const t = useTranslations("serviceDetails.webDesign");
  const tCTAs = useTranslations("commercial.ctas");
  const projectRangeCta = getCommercialCta("projectRange");
  const realBuildCta = getCommercialCta("realBuild");

  return (
    <ServiceHero
      watermark="01"
      subtitle={t("subtitle")}
      title={t("title")}
      titleItalic={t("titleItalic")}
      description={t.rich("description", bodyMarks)}
      primaryCta={{ href: projectRangeCta.href, label: tCTAs("projectRange") }}
      secondaryCta={{ href: realBuildCta.href, label: tCTAs("realBuild") }}
    />
  );
}

export function ShowcaseSection() {
  const t = useTranslations("serviceDetails.webDesign");
  const sectionRef = useSectionCardGrid<HTMLElement>({
    selector: "[data-showcase-item]",
    stagger: MOTION.stagger.tight,
    distance: MOTION.distance.sm,
  });
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();

  const showcaseItems = [
    { labelKey: "showcaseEcommerce", number: "01" },
    { labelKey: "showcaseCorporate", number: "02" },
    { labelKey: "showcasePortfolio", number: "03" },
    { labelKey: "showcaseLanding", number: "04" },
  ];

  const getSpan = (i: number) =>
    i === 0
      ? "md:col-span-2 md:row-span-2"
      : i === 1
        ? "md:col-span-2 md:row-span-1"
        : "md:col-span-1 md:row-span-1";

  return (
    <section
      id="showcase"
      ref={sectionRef}
      className="accent-world-orange pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="mb-16">
          <p
            ref={eyebrowRef}
            className={cn(monoCaps, "mb-4 block text-muted-foreground")}
          >
            {t("showcaseEyebrow")}
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
              {t("showcaseTitle")}
              <br />
              <Highlight>{t("showcaseTitleItalic")}</Highlight>
            </h2>
            <p className="hidden max-w-[36ch] font-mono text-sm leading-relaxed tracking-wide text-primary/35 lg:block">
              {t("showcaseSubtitle")}
            </p>
          </div>
        </div>
        <div
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
          style={{ gridAutoRows: "clamp(180px, 20vw, 260px)" }}
        >
          {showcaseItems.map((item, i) => (
            <div
              key={i}
              data-showcase-item
              className={[
                "group relative border border-foreground/8 rounded-lg bg-foreground/2 p-6 md:p-8 overflow-hidden flex flex-col justify-between hover:bg-foreground/4 transition-colors duration-300 cursor-pointer",
                getSpan(i),
              ].join(" ")}
            >
              <div
                aria-hidden
                className="absolute inset-0 bg-foreground/2 pointer-events-none origin-left rtl:origin-right scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"
              />
              <div className="relative z-10 flex items-start justify-between">
                <span className={cn(monoCaps, "text-muted-foreground")}>
                  {item.number}
                </span>
                <span className="font-mono text-sm text-muted-foreground opacity-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100">
                  ↗
                </span>
              </div>
              <div className="relative z-10 mt-auto">
                <h3
                  className="font-sans font-medium text-primary group-hover:text-primary/80 transition-colors duration-300"
                  style={{
                    fontSize:
                      i === 0
                        ? "clamp(18px, 2.4vw, 26px)"
                        : "clamp(16px, 1.8vw, 20px)",
                    letterSpacing: "-0.015em",
                    lineHeight: 1.25,
                  }}
                >
                  {t(item.labelKey)}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

const FeatureCard = ({
  feature,
}: {
  feature: { num: string; title: string; description: ReactNode; featured: boolean };
  index: number;
}) => {
  const isHero = feature.featured;

  return (
    <div
      className={cn(
        "feature-card-anim group relative border-b border-foreground/10 transition-colors duration-500 hover:bg-foreground/2",
        isHero ? "border-t" : ""
      )}
    >
      <div
        className={cn(
          "flex flex-col md:flex-row gap-6 md:gap-16 items-start px-4 md:px-8",
          isHero ? "py-16 md:py-24" : "py-10 md:py-14"
        )}
      >
        <div className="flex items-center gap-4 shrink-0 w-32">
          <div className="w-1.5 h-1.5 rounded-full bg-foreground/20 group-hover:bg-foreground/60 transition-colors duration-500" />
          <span className="font-mono text-[13px] tracking-[0.25em] uppercase text-foreground/40 group-hover:text-foreground/70 transition-colors duration-500">
            SYS // {feature.num}
          </span>
        </div>

        <div className="flex-1 max-w-4xl">
          <h3
            className={cn(
              "font-sans font-normal text-foreground tracking-[-0.02em] group-hover:translate-x-2 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              isHero ? "text-[clamp(1.8rem,2.5vw,2.8rem)] leading-[1.05] mb-6" : "text-[clamp(1rem,2vw,2rem)] leading-[1.1] mb-4"
            )}
          >
            {feature.title}
          </h3>
          <p
            className={cn(
              "text-foreground/50 leading-relaxed font-light group-hover:text-foreground/70 transition-colors duration-500",
              isHero ? "text-[clamp(1rem,1vw,1.25rem)] max-w-3xl" : "md:text-base text-sm max-w-2xl"
            )}
          >
            {feature.description}
          </p>
        </div>
      </div>
    </div>
  );
};

function FeaturesSection() {
  const t = useTranslations("serviceDetails.webDesign");
  const tCommon = useTranslations("serviceDetails");
  const sectionRef = useSectionCardGrid<HTMLElement>({
    selector: ".feature-card-anim",
    stagger: 0.1,
    distance: 20,
  });

  const features = ["01", "02", "03", "04", "05", "06"].map((num, i) => ({
    num,
    title: t(`features.${num}.title`),
    description: t.rich(`features.${num}.description`, bodyMarks),
    featured: i === 0,
  }));

  return (
    <section
      ref={sectionRef}
      className="accent-world-orange relative pt-(--section-y-top) pb-(--section-y-bottom) overflow-hidden"
    >
      <Container>
        <div className="mb-20 md:mb-28">
          <div className="flex items-center gap-3 mb-8">
            <span className="w-8 h-px bg-foreground/20" />
            <p className={cn(monoCaps, "mb-4 block text-muted-foreground")}>
              {tCommon("whatWeOfferEyebrow")}
            </p>
          </div>
          <h2 className="font-sans font-normal text-primary leading-[1.05] text-[clamp(28px,4.5vw,52px)] tracking-tight">
            {tCommon("whatWeOffer")}
            <br />
            <Highlight>{tCommon("whatWeOfferItalic")}</Highlight>
          </h2>
        </div>

        <div className="flex flex-col relative before:absolute before:-left-4 before:top-0 before:bottom-0 before:w-px before:bg-foreground/5">
          {features.map((feature, i) => (
            <FeatureCard
              key={feature.num}
              index={i}
              feature={feature}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}


function CtaSection() {
  const t = useTranslations("serviceDetails.webDesign");
  const tCTAs = useTranslations("commercial.ctas");
  const projectRangeCta = getCommercialCta("projectRange");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const cardsRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-token-card]",
    distance: MOTION.distance.sm,
  });

  return (
    <section
      className={cn("border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)", accentWorldClass("orange"))}
    >
      <Container>
        <div className="mb-16 flex items-end justify-between gap-8 flex-wrap">
          <div className="max-w-xl">
            <p
              ref={eyebrowRef}
              className={cn(monoCaps, "mb-4 block text-local-accent")}
            >
              {t("cta.eyebrow")}
            </p>
            <h2
              ref={titleRef}
              className="font-sans font-normal text-primary leading-[1.05] mb-4"
              style={{
                fontSize: "clamp(28px, 4.5vw, 52px)",
                letterSpacing: "-0.02em",
              }}
            >
              {t("cta.title")} <Accent gradient="ember">{t("cta.titleAccent")}</Accent>
            </h2>
            <p className="text-base text-primary/60 leading-relaxed max-w-[44ch]">
              {t.rich("cta.description", bodyMarks)}
            </p>
          </div>
          <CtaButtonGroup
            primaryVariant="accent"
            primary={{ href: projectRangeCta.href, label: tCTAs("projectRange") }}
            secondary={{ href: "/services", label: t("cta.back") }}
            className="flex-col gap-3 sm:flex-col sm:items-stretch"
          />
        </div>
        <div ref={cardsRef} className="grid md:grid-cols-3 gap-4">
          <div
            data-token-card
            className="border border-foreground/8 rounded-lg bg-foreground/2 p-6 space-y-4"
          >
            <span className={cn(monoCaps, "block text-muted-foreground")}>
              {t("cta.tokens.colors")}
            </span>
            <div className="flex gap-2">
              {[
                "bg-foreground/80",
                "bg-foreground/50",
                "bg-foreground/25",
                "bg-foreground/10",
                "bg-foreground/4",
              ].map((c, i) => (
                <div key={i} className={`flex-1 h-10 rounded-lg ${c}`} />
              ))}
            </div>
            <p className="font-mono text-xs uppercase tracking-widest text-foreground/20 rtl:font-sans rtl:normal-case">
              {t("cta.tokens.colorsSub")}
            </p>
          </div>
          <div
            data-token-card
            className="border border-foreground/8 rounded-lg bg-foreground/2 p-6 space-y-3"
          >
            <span className={cn(monoCaps, "block text-muted-foreground")}>
              {t("cta.tokens.typography")}
            </span>
            <div className="space-y-1">
              <div
                className="font-sans font-normal text-primary leading-none"
                style={{
                  fontSize: "clamp(28px, 5vw, 44px)",
                  letterSpacing: "-0.025em",
                }}
              >
                Aa
              </div>
              <div className="text-sm text-primary/70 font-sans">
                {t("cta.tokens.typographySub")}
              </div>
              <div className="font-mono text-xs uppercase tracking-[0.22em] text-foreground/20 rtl:font-sans rtl:normal-case">
                {t("cta.tokens.monoLabel")}
              </div>
            </div>
          </div>
          <div
            data-token-card
            className="border border-foreground/8 rounded-lg bg-foreground/2 p-6 space-y-4"
          >
            <span className={cn(monoCaps, "block text-muted-foreground")}>
              {t("cta.tokens.layout")}
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-7 rounded-lg ${i % 3 === 0 ? "col-span-2 bg-foreground/12" : "bg-foreground/6"}`}
                />
              ))}
            </div>
            <p className="font-mono text-xs uppercase tracking-widest text-foreground/20 rtl:font-sans rtl:normal-case">
              {t("cta.tokens.layoutSub")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}