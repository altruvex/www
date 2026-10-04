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
import { FounderRouteSection } from "./founder-route";
import { PrincipleIndexSection } from "./principle-index";

export default memo(function AboutPageClient() {
  return (
    <main className="relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <AboutHero />
      <PhotoStage />
      <ErrorBoundary>
        <PrincipleIndexSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <FitRegisterSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <FounderRouteSection />
      </ErrorBoundary>
      <AboutEndCta />
    </main>
  );
});

function AboutEndCta() {
  const t = useTranslations("common.endCta.pages.about");

  return (
    <SectionEndCta
      title={t("title")}
      titleAccent={t("titleAccent")}
      body={t("body")}
      primary="technicalCall"
      secondary="describeTheBuild"
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
            container: "lg:gap-12",
            titleWrapper: "space-y-6 lg:basis-7/12",
            title:
              "max-w-6xl text-balance text-[clamp(2.875rem,7.2vw,7.5rem)] font-light leading-[1] tracking-[-0.035em] rtl:leading-[1.3] rtl:tracking-normal",
            description:
              "max-w-[36ch] text-[clamp(1rem,1.1vw,1.0625rem)] md:max-w-[36ch] lg:max-w-[36ch] lg:basis-5/12 lg:pb-3",
          }}
        />
      </Container>
    </section>
  );
}

function PhotoStage() {
  const t = useTranslations("about.stage");
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
        <div aria-hidden className="photo-caption-scrim" />
        <figcaption className="absolute end-5 bottom-5 max-w-[22ch] text-end text-[clamp(1.25rem,2vw,1.75rem)] font-light leading-[1.25] tracking-[-0.02em] text-white sm:end-6 sm:bottom-6 rtl:max-w-[26ch] rtl:leading-[1.6] rtl:tracking-normal">
          {t("caption")}
        </figcaption>
      </figure>
    </Container>
  );
}
