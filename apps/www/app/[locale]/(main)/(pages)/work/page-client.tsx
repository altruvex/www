"use client";

import { Container } from "@/components/container";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { WorkItem } from "@/components/work-item";
import { CASE_STUDIES } from "@/lib/case-studies";
import { useSectionDescription, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { useTranslations } from "next-intl";
import { memo, useMemo } from "react";

export default memo(function WorkIndexPage() {
  const t = useTranslations("work");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();

  const projects = useMemo(() => CASE_STUDIES, []);

  return (
    <>
      <section className="accent-world-green min-h-screen pt-(--section-y-top) pb-(--section-y-bottom)">
        <Container>
          <div className="py-16 md:py-24">
            <div className="mb-16">
              <p
                ref={eyebrowRef}
                className="eyebrow text-muted-foreground/70 mb-4 block"
              >
                {t("selectedWork")}
              </p>
              <h1
                ref={titleRef}
                className="text-[clamp(3rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em] mb-8 font-sans font-light text-foreground select-none"
              >
                {t("title")}
                <br />
                <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
                  {t("titleItalic")}
                </span>
              </h1>
              <p
                ref={descRef}
                className="text-base text-primary/60 leading-relaxed max-w-[44ch]"
              >
                {t("description")}
              </p>
            </div>
            <div className="h-px w-full bg-foreground/8" />
            <div>
              {projects.map((cs, index) => (
                <WorkItem key={cs.slug} slug={cs.slug} index={index} />
              ))}
            </div>
            <div className="mt-6 flex items-center gap-4">
              <span className="font-mono text-sm leading-normal tracking-wider uppercase text-primary/20">
                {String(projects.length).padStart(2, "0")} {t("projectsLabel")}
              </span>
              <div className="flex-1 h-px bg-foreground/5" />
            </div>
          </div>
        </Container>
      </section>
      <SectionEndCta variant="work" />
    </>
  );
});