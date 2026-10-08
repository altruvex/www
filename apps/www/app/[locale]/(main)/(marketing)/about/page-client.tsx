"use client";

import { SectionEndCta } from "@/components/sections/section-end-cta";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { bodyMarks } from "@/components/ui/rich-text";
import {
  useMediaSettle,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { memo } from "react";
import { FitRegisterSection } from "./fit-register";
import { PrincipleIndexSection } from "./principle-index";
import { StudioFactsSection } from "./studio-facts";

export default memo(function AboutPageClient() {
  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <AboutHero />
      <PhotoStage />
      <ErrorBoundary>
        <StudioFactsSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <PrincipleIndexSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <FitRegisterSection />
      </ErrorBoundary>
      <AboutEndCta />
    </div>
  );
});

function AboutEndCta() {
  const t = useTranslations("common.endCta.pages.about");

  return (
    <SectionEndCta
      title={t("title")}
      titleAccent={t("titleAccent")}
      body={t("body")}
      primary="describeTheBuild"
      secondary="realBuild"
    />
  );
}

function AboutHero() {
  const t = useTranslations("about");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();

  return (
    <section
      aria-labelledby="about-hero-heading"
      className="accent-world-blue pt-(--section-y-top)"
    >
      <Container>
        <SectionHeading
          titleAs="h1"
          titleId="about-hero-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          description={t.rich("description", bodyMarks)}
          classes={{
            container: "lg:flex-col lg:items-start lg:gap-8",
            titleWrapper: "space-y-6",
            title:
              "max-w-6xl text-balance text-[clamp(2.75rem,6vw,6.25rem)] font-light leading-[1] tracking-[-0.035em] rtl:leading-[1.3] rtl:tracking-normal",
            description:
              "max-w-[46ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] lg:max-w-[46ch]",
          }}
        />
      </Container>
    </section>
  );
}

function PhotoStage() {
  const mediaRef = useMediaSettle<HTMLElement>();

  return (
    <Container className="mt-(--section-y-bottom)">
      <figure
        ref={mediaRef}
        className="relative m-0 aspect-[4/5] overflow-hidden rounded-panel-lg sm:aspect-[16/10] lg:aspect-[21/9]"
      >
        <div data-settle-img className="absolute inset-0 will-change-transform">
          <Image
            src="/brand/mood/blue-wall-light-bands.webp"
            alt=""
            fill
            sizes="(min-width: 1408px) 1280px, 100vw"
            quality={75}
            draggable={false}
            className="select-none object-cover"
          />
        </div>
      </figure>
    </Container>
  );
}
