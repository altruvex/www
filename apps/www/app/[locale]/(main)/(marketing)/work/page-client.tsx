"use client";

import { Num } from "@/components/ui/num";
import { Container } from "@/components/shared/container";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Accent } from "@/components/ui/emphasis";
import { bodyMarks } from "@/components/ui/rich-text";
import { WorkRecord } from "@/components/sections/work-record";
import { CASE_STUDIES } from "@/lib/data/case-studies";
import { HeroHeadline, HeroReveal } from "@/components/sections/hero-motion-wrappers";
import { useSectionCardGrid } from "@/lib/motion";
import { useTranslations } from "next-intl";
import { memo, useMemo } from "react";

export default memo(function WorkIndexPage() {
  const t = useTranslations("work");
  const recordsRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-work-record]",
  });

  const projects = useMemo(() => CASE_STUDIES, []);

  return (
    <>
      <section className="accent-world-green min-h-screen pt-(--section-y-top) pb-(--section-y-bottom)">
        <Container>
          <div>
            {/* The homepage hero's stack: eyebrow, h1 at the same scale with
                its accent line, one paragraph - on load, not on scroll. */}
            <div className="mb-16">
              <HeroReveal delay={0.2} className="mb-6">
                <Eyebrow>{t("selectedWork")}</Eyebrow>
              </HeroReveal>
              <HeroHeadline
                as="h1"
                className="mb-7 max-w-176 font-sans text-[clamp(3rem,4.5vw,4.5rem)] leading-[1.05] font-light tracking-[-0.03em] text-foreground select-none md:mb-8 lg:leading-[1.02] rtl:tracking-normal"
              >
                <span className="block">{t("title")}</span>
                <Accent gradient="mint">{t("titleItalic")}</Accent>
              </HeroHeadline>
              <HeroReveal delay={0.5} className="max-w-2xl">
                <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
                  {t.rich("description", bodyMarks)}
                </p>
              </HeroReveal>
            </div>
            <div className="mb-16 max-w-2xl space-y-5 text-base leading-relaxed text-s-mid">
              <p>{t.rich("intro.paragraph1", bodyMarks)}</p>
              <p>{t.rich("intro.paragraph2", bodyMarks)}</p>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <span className="text-sm leading-normal text-s-low tabular-nums">
                <Num value={projects.length} pad={2} /> {t("projectsLabel")}
              </span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>
            <ol ref={recordsRef} className="list-none border-b border-border-subtle">
              {projects.map((cs, index) => (
                <WorkRecord key={cs.slug} slug={cs.slug} index={index} />
              ))}
            </ol>
          </div>
        </Container>
      </section>
      <WorkEndCta nextIndex={projects.length + 1} />
    </>
  );
});

/**
 * The record list continues into the close: the next number is set as an
 * unwritten entry, counted from the records above, so the page's one action
 * reads as the next line of the list. It used to offer "See a Real Build",
 * which linked back to this page.
 */
function WorkEndCta({ nextIndex }: { nextIndex: number }) {
  const t = useTranslations("common.endCta.pages.work");

  return (
    <SectionEndCta
      title={t("title")}
      titleAccent={t("titleAccent")}
      body={t("body")}
      primary="describeTheBuild"
      secondary="projectRange"
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