"use client";

import { Num } from "@/components/ui/num";
import { ArrowIcon } from "@repo/ui";
import { Container } from "@/components/shared/container";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { SectionHeading } from "@/components/sections/section-heading";
import { Accent, Eyebrow } from "@repo/ui/www";
import { bodyMarks } from "@/components/ui/rich-text";
import { Link } from "@/i18n/navigation";
import { HOMEPAGE_SUPPORTING_CASE_STUDIES } from "@/lib/config/commercial";
import { getCaseStudyBySlug, type CaseStudyRecord } from "@/lib/data/case-studies";
import { HeroHeadline, HeroReveal } from "@/components/sections/hero-motion-wrappers";
import {
  useMediaSettle,
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { getDomainName } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { memo } from "react";

const STAGE_PHOTOS: Record<CaseStudyRecord["slug"], string> = {
  "newlight-lighting-store": "/brand/mood/single-lamp-dark-wall.webp",
  "art-lighting-store": "/brand/mood/blue-light-streaks.webp",
  "altruvex-site": "/brand/mood/green-folds.webp",
};

const OWN_SITE: CaseStudyRecord["slug"] = "altruvex-site";

const STAGES = [...HOMEPAGE_SUPPORTING_CASE_STUDIES, OWN_SITE]
  .map(getCaseStudyBySlug)
  .filter((cs): cs is CaseStudyRecord => cs !== null);

const LINK =
  "inline-flex min-h-6 items-center gap-2 rounded-ctl-sm text-base outline-none transition-colors duration-(--motion-drawer) ease-smooth focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background pointer-coarse:min-h-11";

export default memo(function WorkIndexPage() {
  const t = useTranslations("work");

  return (
    <>
      <section className="accent-world-green min-h-screen pt-(--section-y-top) pb-(--section-y-bottom)">
        <Container>
          <div className="mb-16">
            <HeroReveal delay={0.2} className="mb-6">
              <Eyebrow>{t("selectedWork")}</Eyebrow>
            </HeroReveal>
            <HeroHeadline
              as="h1"
              className="mb-7 max-w-6xl text-balance font-sans text-[clamp(2.75rem,6vw,6.25rem)] leading-[1.05] font-light tracking-[-0.03em] text-foreground select-none md:mb-8 lg:leading-[1.02] rtl:tracking-normal"
            >
              <span className="block">{t("title")}</span>
              <Accent gradient="world">{t("titleItalic")}</Accent>
            </HeroHeadline>
            <HeroReveal delay={0.5} className="max-w-[46ch]">
              <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
                {t.rich("description", bodyMarks)}
              </p>
            </HeroReveal>
          </div>
          <ol className="list-none space-y-20 md:space-y-28">
            {STAGES.map((cs, index) => (
              <WorkStage key={cs.slug} build={cs} first={index === 0} />
            ))}
          </ol>
        </Container>
      </section>
      <CheckSection />
      <WorkEndCta nextIndex={STAGES.length + 1} />
    </>
  );
});

function WorkStage({ build, first }: { build: CaseStudyRecord; first: boolean }) {
  const { slug, externalUrl } = build;
  const t = useTranslations("work");
  const tCase = useTranslations("caseStudies");
  const stageRef = useMediaSettle<HTMLDivElement>({ open: first, delay: 0.6 });

  return (
    <li>
      <div
        ref={stageRef}
        className="relative aspect-[4/5] overflow-hidden rounded-panel-lg sm:aspect-[16/10] lg:aspect-[21/9]"
      >
        <div data-settle-img className="absolute inset-0 will-change-transform">
          <Image
            src={STAGE_PHOTOS[slug]}
            alt=""
            fill
            priority={first}
            sizes="(min-width: 1408px) 1280px, 100vw"
            quality={75}
            draggable={false}
            className="select-none object-cover"
          />
        </div>
        <div aria-hidden className="photo-title-scrim" />
        <div className="absolute inset-x-5 bottom-5 sm:inset-x-8 sm:bottom-8">
          <p className="eyebrow text-white/80">
            {tCase(`${slug}.client`)} · {tCase(`${slug}.industry`)}
          </p>
          <h2 className="mt-3 max-w-[20ch] text-[clamp(1.75rem,4vw,3.5rem)] leading-[1.08] font-light tracking-[-0.03em] text-white rtl:leading-[1.4] rtl:tracking-normal">
            {t(`stages.${slug}.title`)}
          </h2>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-12">
        <div className="max-w-[58ch]">
          <p className="text-[clamp(1rem,1.02vw,1.0625rem)] leading-relaxed text-muted-foreground">
            {tCase(`${slug}.summary`)}
          </p>
          <p className="mt-3 text-sm text-foreground">{tCase(`${slug}.scope`)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-8 gap-y-3">
          <Link
            href={`/work/${slug}`}
            aria-label={t("labels.readCaseStudyWith", { name: t(`stages.${slug}.title`) })}
            className={`group ${LINK} text-foreground hover:text-local-accent-text`}
          >
            {t("labels.viewCaseStudy")}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${LINK} text-muted-foreground hover:text-foreground`}
            >
              {t.rich("labels.visitSite", {
                domain: () => (
                  <span dir="ltr" className="ltr:font-mono">
                    {getDomainName(externalUrl)}
                  </span>
                ),
              })}
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

/** Portfolio claims are only as good as what a visitor can verify: the checks anyone can run on the live builds. */
function CheckSection() {
  const t = useTranslations("work.check");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descriptionRef = useSectionDescription();
  const listRef = useSectionCardGrid<HTMLOListElement>();
  const items = t.raw("items") as string[];

  return (
    <section
      aria-labelledby="work-check-heading"
      className="accent-world-green border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="work-check-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descriptionRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleAccent")}
          description={t("description")}
          className="mb-(--heading-gap)"
        />
        <ol ref={listRef}>
          {items.map((item, index) => (
            <li
              key={item}
              className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-t border-border-subtle py-5 md:grid-cols-[4rem_minmax(0,1fr)]"
            >
              <span className="pt-2 text-md text-muted-foreground tabular-nums">
                <Num value={index + 1} pad={2} />
              </span>
              <p className="max-w-[48ch] text-[clamp(1.1875rem,1.8vw,1.625rem)] leading-snug tracking-[-0.015em] text-foreground rtl:tracking-normal">
                {item}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

function WorkEndCta({ nextIndex }: { nextIndex: number }) {
  const t = useTranslations("common.endCta.pages.work");

  return (
    <SectionEndCta
      title={t("title")}
      titleAccent={t("titleAccent")}
      body={t("body")}
      primary="describeTheBuild"
      secondary="projectRange"
      world="green"
      aside={
        <div className="flex max-w-xl items-baseline gap-4 border-t border-dashed border-foreground/25 pt-6">
          <span
            aria-hidden
            className="shrink-0 text-sm tabular-nums text-local-accent-text ltr:font-mono"
          >
            <Num value={nextIndex} pad={2} />
          </span>
          <div>
            <p className="text-[clamp(1.375rem,2.2vw,1.875rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground rtl:tracking-normal">
              {t("nextLabel")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("nextStatus")}
            </p>
          </div>
        </div>
      }
    />
  );
}