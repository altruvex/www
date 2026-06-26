"use client";

import { Container } from "@/components/shared/container";
import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { Eyebrow } from "@/components/ui/eyebrow";
import { WorkItem } from "@/components/work-item";
import {
  HOMEPAGE_SUPPORTING_CASE_STUDIES,
  getCommercialCta,
} from "@/lib/config/commercial";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { bodyMarks } from "@/components/ui/rich-text";
import { splitHeadline } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { SectionHeading } from "./section-heading";

export const WorkSection = memo(function WorkSection() {
  const tW = useTranslations("work");
  const tf = useTranslations("commercial.flagship");
  const tCTAs = useTranslations("commercial.ctas");
  const tCommon = useTranslations("common");
  const stepLabel = tCommon("step");

  const proofCta = getCommercialCta("realBuild");
  const scopeCta = getCommercialCta("projectRange");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const bodyRef = useSectionDescription();
  const gridRef = useSectionCardGrid({ selector: ".work-card" });
  const metaRef = useSectionElement();

  const { first: firstTitle, second: secondTitle } = splitHeadline(
    `${tW("title")} ${tW("titleItalic")}`,
  );

  return (
    <section id="work" className="accent-world-green pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <SectionHeading
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={bodyRef}
          eyebrow={tW("eyebrow")}
          firstTitle={firstTitle}
          secondTitle={secondTitle}
          accent="mint"
          description={tW.rich("description", bodyMarks)}
          className="mb-16"
        />
        <div ref={gridRef}>
          <div className="h-px w-full bg-foreground/8" />
          {HOMEPAGE_SUPPORTING_CASE_STUDIES.map((slug, index) => (
            <WorkItem
              key={slug}
              slug={slug}
              index={index}
            />
          ))}
        </div>
        <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:items-start">
          <div className="space-y-3">
            <Eyebrow>{tW("labels.liveProof")}</Eyebrow>
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground max-w-xl">
              {tW("labels.liveProofBody")}
            </p>
          </div>
          <CtaButtonGroup
            primary={{ href: proofCta.href, label: tCTAs("realBuild") }}
            secondary={{ href: scopeCta.href, label: tCTAs("projectRange") }}
            secondaryArrow
            className="flex-col gap-3 sm:flex-col sm:items-stretch"
          />
        </div>
        <FlagshipMetaBlock
          metaRef={metaRef}
          tf={tf}
          stepLabel={stepLabel}
        />
        <div className="flex items-center gap-4 mt-6">
          <div className="flex-1 h-px bg-border" />
          <Eyebrow>{tW("labels.footer")}</Eyebrow>
        </div>
      </Container>
    </section>
  );
});



function FlagshipMetaBlock({
  metaRef,
  tf,
  stepLabel,
}: {
  metaRef: React.RefObject<HTMLDivElement | null>;
  tf: ReturnType<typeof useTranslations<"commercial.flagship">>;
  stepLabel: string;
}) {
  return (
    <div ref={metaRef} className="mt-16 border-t border-border pt-12">
      <Eyebrow className="mb-4">{tf("eyebrow")}</Eyebrow>
      <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-normal text-foreground mb-4 max-w-3xl">
        {tf("title")}
      </h3>
      <p className="text-[clamp(0.9375rem,0.98vw,1rem)] text-muted-foreground max-w-2xl leading-relaxed mb-8">
        {tf("summary")}
      </p>
      <div className="grid gap-0 border border-border md:grid-cols-3">
        {[
          { label: tf("labels.problem"), body: tf("problem") },
          { label: tf("labels.solution"), body: tf("solution") },
          { label: tf("labels.outcome"), body: tf("outcome") },
        ].map((item) => (
          <div
            key={item.label}
            className="border-b border-border px-6 py-8 group hover:bg-surface transition-colors duration-300 md:border-e md:last:border-e-0"
          >
            <Eyebrow className="mb-4">{stepLabel} · {item.label}</Eyebrow>
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}