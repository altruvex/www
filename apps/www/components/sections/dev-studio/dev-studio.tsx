"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { Container } from "@/components/shared/container";
import { Eyebrow, Highlight } from "@repo/ui/www";
import { bodyMarks } from "@/components/ui/rich-text";
import { getCommercialCta } from "@/lib/config/commercial";
import {
  splitWords,
  useMediaSettle,
  useSectionCardGrid,
  useSectionTitle,
  useWordRead,
} from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { ReactNode } from "react";
import { HeroHeadline, HeroReveal } from "../hero-motion-wrappers";
import {
  ServiceFit,
  ServiceSteps,
  ServiceTerms,
} from "../services-index/service-brief";

const BRIEF = "serviceDetails.development.brief";

function StudioHero() {
  const t = useTranslations("serviceDetails.development");
  const s = useTranslations("serviceDetails.development.studio");
  const tCTAs = useTranslations("commercial.ctas");
  const primary = getCommercialCta("describeTheBuild");
  const secondary = getCommercialCta("projectRange", { projectType: "webapp" });
  const mediaRef = useMediaSettle<HTMLDivElement>();

  return (
    <section aria-labelledby="dev-hero-heading" className="bg-background pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <HeroReveal delay={0.1}>
          <Eyebrow tone="accent">{s("hero.cardLabel")}</Eyebrow>
        </HeroReveal>
        <HeroHeadline
          as="h1"
          id="dev-hero-heading"
          className="mt-7 max-w-6xl text-balance text-[clamp(2.75rem,6vw,6.25rem)] leading-[0.98] font-light tracking-[-0.045em] text-foreground rtl:leading-[1.25] rtl:tracking-normal"
        >
          {s("title")}{" "}
          <Highlight tone="world">
            {s("titleAccent")}
          </Highlight>
        </HeroHeadline>
        <div className="mt-11 grid gap-8 lg:grid-cols-2 lg:items-end lg:gap-10">
          <HeroReveal delay={0.45}>
            <p className="max-w-[46ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {t.rich("description", bodyMarks)}
            </p>
          </HeroReveal>
          <HeroReveal delay={0.6} className="lg:justify-self-end">
            <CtaButtonGroup
              primaryVariant="accent"
              primary={{ href: primary.href, label: tCTAs("describeTheBuild") }}
              secondary={{
                href: secondary.href,
                label: tCTAs("projectRange"),
                cta: "projectRange",
                context: { projectType: "webapp" },
              }}
              secondaryArrow
            />
          </HeroReveal>
        </div>

        <div
          ref={mediaRef}
          className="relative mt-14 aspect-[4/5] overflow-hidden rounded-panel-lg sm:aspect-[16/10] lg:mt-20 lg:aspect-[21/9]"
        >
          <div data-settle-img className="absolute inset-0 will-change-transform">
            <Image
              src="/images/services/image-5.png"
              alt=""
              fill
              priority
              sizes="(min-width: 1408px) 1280px, 100vw"
              className="object-cover"
            />
          </div>
          <div aria-hidden className="photo-caption-scrim" />
          <HeroReveal
            delay={0.9}
            className="absolute end-5 bottom-5 max-w-[30ch] sm:end-6 sm:bottom-6 rtl:max-w-[34ch]"
          >
            <p className="text-end text-[clamp(1.125rem,1.7vw,1.5rem)] font-light leading-[1.25] tracking-[-0.02em] text-white rtl:leading-[1.6] rtl:tracking-normal">
              {s("hero.cardText")}
            </p>
          </HeroReveal>
        </div>
      </Container>
    </section>
  );
}

function StudioStatement() {
  const s = useTranslations("serviceDetails.development.studio.statement");
  const textRef = useWordRead<HTMLParagraphElement>();

  return (
    <section className="bg-surface pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container className="grid gap-6 lg:grid-cols-12">
        <Eyebrow className="lg:col-span-3">{s("eyebrow")}</Eyebrow>
        <p
          ref={textRef}
          className="max-w-[22ch] text-[clamp(2rem,4.4vw,4.5rem)] leading-[1.06] font-light tracking-[-0.03em] text-foreground lg:col-span-9 rtl:leading-[1.4] rtl:tracking-normal"
        >
          {splitWords(s("text")).map(({ key, word }) => (
            <span key={key} data-word>
              {word}
            </span>
          ))}
        </p>
      </Container>
    </section>
  );
}

function Tick() {
  return <span aria-hidden className="block h-[3px] w-5 rounded-full bg-local-accent" />;
}

function StudioFacts() {
  const s = useTranslations("serviceDetails.development.studio.facts");
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const gridRef = useSectionCardGrid<HTMLDivElement>();

  const card = "flex flex-col overflow-hidden rounded-panel-sm border border-border-subtle bg-card";
  const figure = "text-6xl leading-none font-light tracking-[-0.04em] text-foreground ltr:font-mono ltr:tracking-[-0.06em] tabular-nums";

  return (
    <section aria-labelledby="dev-facts-heading" className="bg-background pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="text-center">
          <h2
            ref={titleRef}
            id="dev-facts-heading"
            className="text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.05] font-light tracking-[-0.03em] text-foreground rtl:tracking-normal"
          >
            {s("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{s("description")}</p>
        </div>

        <div ref={gridRef} className="mx-auto mt-(--heading-gap) grid max-w-6xl gap-4 md:grid-cols-3">
          <article className={card}>
            <div className="relative aspect-[4/3]">
              <Image src="/images/services/image-3.png" alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col gap-4 p-6">
              <Tick />
              <p className="text-xs font-medium text-muted-foreground">{s("speed.label")}</p>
              <p dir="ltr" className={cn(figure, "rtl:text-end")}>{s("speed.value")}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{s("speed.text")}</p>
            </div>
          </article>

          <article className={cn(card, "relative min-h-96 justify-end p-4")}>
            <Image src="/brand/branding/image5.png" alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
            <div className="liquid-glass-panel relative flex flex-col gap-4 rounded-panel-inset p-5">
              <Tick />
              <p className="text-xs font-medium text-muted-foreground">{s("ownership.label")}</p>
              <p dir="ltr" className={cn(figure, "rtl:text-end")}>{s("ownership.value")}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{s("ownership.text")}</p>
            </div>
          </article>

          <article className={card}>
            <div className="relative aspect-[4/3]">
              <Image src="/brand/branding/image2.png" alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col gap-4 p-6">
              <Tick />
              <p className="text-xs font-medium text-muted-foreground">{s("languages.label")}</p>
              <p dir="ltr" className={cn(figure, "rtl:text-end")}>{s("languages.value")}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{s("languages.text")}</p>
            </div>
          </article>
        </div>
      </Container>
    </section>
  );
}

export function DevStudio({ investment }: { investment?: ReactNode }) {
  return (
    <>
      <StudioHero />
      <ServiceTerms namespace={BRIEF} id="what-we-build" section="builds" />
      <ServiceFit namespace={BRIEF} id="fit" italicWorld={false} />
      {investment}
      <ServiceSteps namespace={BRIEF} id="how-it-runs" />
      <ServiceTerms namespace={BRIEF} id="what-you-receive" />
      <StudioStatement />
      <StudioFacts />
    </>
  );
}
