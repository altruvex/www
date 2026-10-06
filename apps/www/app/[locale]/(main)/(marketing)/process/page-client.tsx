"use client";

import { SectionEndCta } from "@/components/sections/section-end-cta";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Eyebrow } from "@repo/ui/www";
import { bodyMarks } from "@/components/ui/rich-text";
import {
  useMediaSettle,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { phaseName } from "@/lib/process-phases";
import { usePhaseLength, useProcessPhases } from "@/lib/use-process-phases";
import { PhaseChapters } from "./phase-chapters";
import { ScopeSection } from "./scope-bars";

export default function ProcessPage() {
  return (
    <div className="accent-world-green relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <OpeningSection />
      <PhotoBand />
      <ErrorBoundary>
        <PhasesSection />
        <ScopeSection />
      </ErrorBoundary>
      <ClosingSection />
    </div>
  );
}

function OpeningSection() {
  const t = useTranslations("process.hero");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();

  return (
    <section aria-labelledby="process-hero-heading" className="pt-(--section-y-top)">
      <Container>
        <SectionHeading
          titleAs="h1"
          titleId="process-hero-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          description={t("description")}
          classes={{
            container: "lg:flex-col lg:items-start lg:gap-8",
            titleWrapper: "space-y-6",
            title:
              "max-w-6xl text-balance text-[clamp(2.75rem,6vw,6.25rem)] font-light leading-[0.98] tracking-[-0.045em] rtl:leading-[1.3] rtl:tracking-normal",
            description:
              "max-w-[46ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] lg:max-w-[46ch]",
          }}
        />
      </Container>
    </section>
  );
}

function PhotoBand() {
  const t = useTranslations("process.page.photo");
  const mediaRef = useMediaSettle<HTMLElement>();

  return (
    <Container className="mt-(--section-y-bottom)">
      <figure
        ref={mediaRef}
        className="relative m-0 aspect-[4/5] overflow-hidden rounded-panel-lg sm:aspect-[16/9] lg:aspect-[21/8]"
      >
        <div data-settle-img className="absolute inset-0 will-change-transform">
          <Image
            src="/brand/mood/green-folds.webp"
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

function PhasesSection() {
  const t = useTranslations("process.page.register");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();

  return (
    <section
      aria-labelledby="process-phases-heading"
      className="pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="process-phases-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          classes={{ title: "max-w-[20ch]" }}
        />
        <PhaseChapters />
      </Container>
    </section>
  );
}

function ClosingSection() {
  const t = useTranslations("process");
  const length = usePhaseLength();
  const first = useProcessPhases()[0];

  return (
    <SectionEndCta
      title={t("flexibility.title")}
      titleAccent={t("flexibility.titleItalic")}
      body={t.rich("flexibility.description", bodyMarks)}
      primary="describeTheBuild"
      secondary="projectRange"
      aside={
        <div className="max-w-xl">
          <Eyebrow tone="accent" className="mb-4 block">
            {t("closing.startsHere")}
          </Eyebrow>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="text-[clamp(1.375rem,2.2vw,1.875rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground rtl:tracking-normal">
              {phaseName(t(`phases.${first.key}.title`))}
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {length(first)}
            </p>
          </div>
          <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
            {t(`phases.${first.key}.description`)}
          </p>
        </div>
      }
    />
  );
}
