"use client";
import { MOTION, useSectionCardGrid, useSectionDescription, useSectionElement, useSectionEyebrow, useSectionTitle } from "@/lib/motion";

import { Container } from "@/components/container";
import { MagneticButton } from "@/components/magnetic-button";
import { SectionWatermark } from "@/components/section-watermark";
import { HeroReveal } from "@/components/sections/hero-motion-wrappers";
import { Link } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/commercial";
import { monoCaps } from "@/lib/mono-caps";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";

export default function InterfacePage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <HeroSection />
      {/* <DesignCompareSection /> */}
      {/* <ShowcaseSection /> */}
      <FeaturesSection />
      <CtaSection />
    </div>
  );
}

function HeroSection() {
  const t = useTranslations("serviceDetails.webDesign");
  const tCTAs = useTranslations("commercial.ctas");
  const tHero = useTranslations("hero");
  const projectRangeCta = getCommercialCta("projectRange");
  const realBuildCta = getCommercialCta("realBuild");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const ctaRef = useSectionElement();

  return (
    <section className="relative flex min-h-[80vh] lg:min-h-screen w-full flex-col justify-end overflow-hidden pt-(--section-y-top) pb-(--section-y-bottom)">
      <SectionWatermark>01</SectionWatermark>
      <div className="pointer-events-none absolute inset-0 overflow-hidden block">
        <div className="absolute top-0 ltr:left-1/4 rtl:right-1/4 h-full w-px bg-foreground/6" />
        <div className="absolute top-0 ltr:right-1/4 rtl:left-1/4 h-full w-px bg-foreground/6" />
        <div className="absolute top-1/3 left-0 right-0 h-px bg-foreground/5" />
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
                    aria-hidden="true"
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
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto text-center"
            >
              <Link href={realBuildCta.href}>{tCTAs("realBuild")}</Link>
            </MagneticButton>
          </div>
        </div>
      </Container>
      <HeroReveal
        delay={1.1}
        className="pointer-events-none absolute bottom-8 inset-s-1/2 -translate-x-1/2 rtl:translate-x-1/2 hidden md:flex flex-col items-center gap-3 opacity-60 mix-blend-difference"
      >
        <p
          className="font-mono text-[9px] leading-none tracking-[0.3em] uppercase text-foreground rtl:font-sans rtl:normal-case rtl:tracking-normal"
          aria-hidden
        >
          {tHero("scrollHint")}
        </p>
        <div className="relative flex h-12 w-px justify-center overflow-hidden bg-foreground/10" aria-hidden>
          <div className="absolute top-0 h-1/2 w-full bg-foreground animate-[slide-down_1.5s_cubic-bezier(0.65,0,0.35,1)_infinite]" />
        </div>
      </HeroReveal>
    </section>
  );
}

function ShowcaseSection() {
  const t = useTranslations("serviceDetails.webDesign");
  const sectionRef = useSectionCardGrid<HTMLElement>({ selector: "[data-showcase-item]",
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
      className="border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="mb-16">
          <p
            ref={eyebrowRef}
            className={cn(monoCaps, "mb-4 block text-muted-foreground/70")}
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
              <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
                {t("showcaseTitleItalic")}
              </span>
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
                <span className={cn(monoCaps, "text-muted-foreground/70")}>
                  {item.number}
                </span>
                <span className="font-mono text-sm text-muted-foreground/70 opacity-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100">
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

const FEATURE_PALETTE: { r: number; g: number; b: number }[] = [
  { r: 37, g: 99, b: 235 },
  { r: 16, g: 185, b: 129 },
  { r: 234, g: 88, b: 12 },
  { r: 139, g: 92, b: 246 },
  { r: 236, g: 72, b: 153 },
  { r: 6, g: 182, b: 212 },
];

const FeatureCard = ({
  feature,
  index,
  palette,
}: {
  feature: {
    num: string;
    title: string;
    description: string;
    featured: boolean;
  };
  index: number;
  palette: { r: number; g: number; b: number };
}) => {
  const t = useTranslations("serviceDetails.webDesign");
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const rectRef = useRef<DOMRect | null>(null);

  const isHero = feature.featured;
  const rgba = useCallback(
    (a: number) => `rgba(${palette.r},${palette.g},${palette.b},${a})`,
    [palette],
  );

  useEffect(() => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    card.style.setProperty("--gc", rgba(index === 0 ? 0.09 : 0.065));
    card.style.setProperty("--nc", rgba(0.2));
    card.style.setProperty("--lc", rgba(0.45));
    card.style.setProperty("--tc", rgba(0.65));
    card.style.setProperty("--tbc", rgba(0.22));
    card.style.setProperty("--tbg", rgba(0.05));
  }, [index, rgba]);

  const updateRect = useCallback(() => {
    if (!cardRef.current) return;
    rectRef.current = cardRef.current.getBoundingClientRect();
  }, []);

  useEffect(() => {
    if (!cardRef.current) return;
    updateRect();
    const ro = new ResizeObserver(updateRect);
    ro.observe(cardRef.current);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [updateRect]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const r = rectRef.current ?? cardRef.current!.getBoundingClientRect();
      rectRef.current = r;
      cardRef.current!.style.setProperty("--gx", `${e.clientX - r.left}px`);
      cardRef.current!.style.setProperty("--gy", `${e.clientY - r.top}px`);
      cardRef.current!.style.setProperty("--go", "1");

      if (innerRef.current) {
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        innerRef.current.style.setProperty("--tx", `${dx * 1.8}px`);
        innerRef.current.style.setProperty("--ty", `${dy * 1.2}px`);
      }
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!cardRef.current) return;

    cardRef.current.style.setProperty("--go", "0");
    if (innerRef.current) {
      innerRef.current.style.setProperty("--tx", "0px");
      innerRef.current.style.setProperty("--ty", "0px");
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={updateRect}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "feature-card-anim group relative overflow-hidden border-b border-foreground/8 p-6 transition-all duration-500 will-change-transform",
        isHero ? "border-t py-14 md:py-20" : "py-8 hover:py-12",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
        style={{
          opacity: "var(--go, 0)",
          background: isHero
            ? "radial-gradient(600px circle at var(--gx, 50%) var(--gy, 50%), var(--gc), transparent 60%)"
            : "radial-gradient(420px circle at var(--gx, 50%) var(--gy, 50%), var(--gc), transparent 68%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-s-0 bottom-0 z-10 h-px w-0 bg-linear-to-r from-(--lc) to-transparent transition-[width] duration-500 ease-in-out group-hover:w-full"
      />
      {isHero ? (
        <div
          ref={innerRef}
          className="relative z-10 transition-transform duration-100 ease-out translate-x-(--tx,0px) translate-y-(--ty,0px)"
        >
          <div className="mb-8 flex items-center gap-3">
            <span
              className="inline-flex shrink-0 whitespace-nowrap rounded-lg border px-[7px] py-[2.5px] font-mono text-[8.5px] font-medium uppercase tracking-[0.22em] transition-colors duration-300"
              style={{
                color: rgba(0.55),
                borderColor: rgba(0.2),
                background: rgba(0.05),
              }}
            >
              {t("cta.tokens.featured")}_{feature.num}
            </span>
            <span className="font-mono text-[9px] uppercase leading-normal tracking-[0.22em] text-foreground/30">
              {t("cta.tokens.featured")}
            </span>
          </div>
          <h3 className="font-sans font-normal text-primary mb-5 leading-[1.08] text-[clamp(26px,3.8vw,48px)] tracking-[-0.028em]">
            {feature.title}
          </h3>
          <p className="text-[14.5px] text-foreground/60 leading-[1.75] max-w-[46ch]">
            {feature.description}
          </p>
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 select-none font-mono font-black leading-[0.82] text-[clamp(100px,17vw,200px)] tracking-[-0.05em] rtl:left-0 rtl:right-auto"
            style={{ color: rgba(0.04) }}
          >
            {feature.num}
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <span className="hidden w-[72px] shrink-0 select-none font-mono text-[clamp(52px,7vw,80px)] font-extrabold leading-none tracking-[-0.04em] text-foreground/10 tabular-nums transition-colors duration-300 group-hover:text-(--nc) md:block">
            {feature.num}
          </span>
          <div
            ref={innerRef}
            className="min-w-0 flex-1 transition-transform duration-100 ease-out translate-x-(--tx,0px) translate-y-(--ty,0px)"
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-3">
              <span className="hidden shrink-0 whitespace-nowrap rounded-lg border border-foreground/10 px-[7px] py-[2.5px] font-mono text-[8.5px] font-medium uppercase tracking-[0.22em] text-foreground/40 transition-colors duration-300 group-hover:border-(--tbc) group-hover:bg-(--tbg) group-hover:text-(--tc) sm:inline-flex">
                {t("cta.tokens.featured")}_{feature.num}
              </span>
              <h3 className="font-sans font-normal text-primary text-[clamp(17px,2.2vw,24px)] tracking-[-0.02em] leading-[1.2]">
                {feature.title}
              </h3>
            </div>
            <div className="grid grid-rows-[1fr] md:grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-in-out">
              <div className="overflow-hidden">
                <p className="mt-2.5 max-w-[54ch] text-[13.5px] leading-[1.75] text-foreground/60 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function FeaturesSection() {
  const t = useTranslations("serviceDetails.webDesign");
  const tCommon = useTranslations("serviceDetails.webDesign");
  const sectionRef = useSectionCardGrid<HTMLElement>({ selector: ".feature-card-anim",
    stagger: 0.15,
    distance: 30,
  });

  const features = ["01", "02", "03", "04", "05", "06"].map((num, i) => ({
    num,
    title: t(`features.${num}.title`),
    description: t(`features.${num}.description`),
    featured: i === 0,
  }));

  return (
    <section
      ref={sectionRef}
      className="relative border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom) overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.04),transparent_60%)]" />
      <Container>
        <div className="mb-16">
          <p className={cn(monoCaps, "mb-4 block text-muted-foreground/70")}>
            {tCommon("whatWeOfferEyebrow")}
          </p>
          <h2 className="font-sans font-normal text-primary leading-[1.05] text-[clamp(28px,4.5vw,52px)] tracking-[-0.025em]">
            {tCommon("whatWeOffer")}
            <br />
            <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
              {tCommon("whatWeOfferItalic")}
            </span>
          </h2>
        </div>

        <div className="flex flex-col">
          {features.map((feature, i) => (
            <FeatureCard
              key={feature.num}
              index={i}
              feature={feature}
              palette={FEATURE_PALETTE[i] ?? FEATURE_PALETTE[0]}
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
  const cardsRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-token-card]",
    distance: MOTION.distance.sm,
  });

  return (
    <section className="border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="mb-16 flex items-end justify-between gap-8 flex-wrap">
          <div className="max-w-xl">
            <p
              ref={eyebrowRef}
              className={cn(monoCaps, "mb-4 block text-muted-foreground/70")}
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
              {t("cta.title")}
            </h2>
            <p className="text-base text-primary/60 leading-relaxed max-w-[44ch]">
              {t("cta.description")}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <MagneticButton size="lg" variant="primary" className="group">
              <Link href={projectRangeCta.href}>
                <span className="flex items-center gap-2">
                  {tCTAs("projectRange")}
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
            <MagneticButton size="lg" variant="secondary">
              <Link href="/services">{t("cta.back")}</Link>
            </MagneticButton>
          </div>
        </div>
        <div ref={cardsRef} className="grid md:grid-cols-3 gap-4">
          <div
            data-token-card
            className="border border-foreground/8 rounded-lg bg-foreground/2 p-6 space-y-4"
          >
            <span className={cn(monoCaps, "block text-muted-foreground/70")}>
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
            <span className={cn(monoCaps, "block text-muted-foreground/70")}>
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
            <span className={cn(monoCaps, "block text-muted-foreground/70")}>
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
