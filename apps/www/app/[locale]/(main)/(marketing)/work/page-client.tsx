"use client";

import { Num } from "@/components/ui/num";
import { Container } from "@/components/shared/container";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Accent } from "@/components/ui/emphasis";
import { bodyMarks } from "@/components/ui/rich-text";
import { WorkRecord } from "@/components/sections/work-record";
import { CASE_STUDIES } from "@/lib/data/case-studies";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { useTranslations } from "next-intl";
import { memo, useMemo } from "react";

export default memo(function WorkIndexPage() {
  const t = useTranslations("work");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const recordsRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-work-record]",
  });

  const projects = useMemo(() => CASE_STUDIES, []);

  return (
    <>
      <section className="accent-world-green min-h-screen pt-(--section-y-top) pb-(--section-y-bottom)">
        <Container>
          <div>
            <div className="mb-16">
              <Eyebrow ref={eyebrowRef} className="mb-4 block">
                {t("selectedWork")}
              </Eyebrow>
              <h1
                ref={titleRef}
                className="text-[clamp(3rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em] mb-8 font-sans font-light text-foreground select-none"
              >
                {t("title")}
                <br />
                <Accent gradient="mint">{t("titleItalic")}</Accent>
              </h1>
              <p
                ref={descRef}
                className="text-base text-s-mid leading-relaxed"
              >
                {t.rich("description", bodyMarks)}
              </p>
            </div>
            <div className="space-y-5 text-base text-s-mid leading-relaxed mb-16">
              <p>{t.rich("intro.paragraph1", bodyMarks)}</p>
              <p>{t.rich("intro.paragraph2", bodyMarks)}</p>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <span className="text-sm leading-normal text-s-low tabular-nums">
                <Num value={projects.length} pad={2} /> {t("projectsLabel")}
              </span>
              <div className="flex-1 h-px bg-s-border" />
            </div>
            <ol ref={recordsRef} className="list-none border-b border-border">
              {projects.map((cs, index) => (
                <WorkRecord key={cs.slug} slug={cs.slug} index={index} />
              ))}
            </ol>
          </div>
        </Container>
      </section>
      <SectionEndCta variant="work" />
    </>
  );
});