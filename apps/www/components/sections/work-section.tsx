"use client";

import { Num } from "@/components/ui/num";
import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
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
import { splitHeadline } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { SectionHeading } from "./section-heading";
import { WorkRecord } from "./work-record";

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
  const recordsRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-work-record]",
  });
  const metaRef = useSectionElement();

  const { first: firstTitle, second: secondTitle } = splitHeadline(
    `${tW("title")} ${tW("titleItalic")}`,
  );

  return (
    <section
      id="work"
      aria-labelledby="work-heading"
      className="accent-world-green pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="work-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={bodyRef}
          eyebrow={tW("eyebrow")}
          firstTitle={firstTitle}
          secondTitle={secondTitle}
          accent="mint"
          description={tW.rich("description", bodyMarks)}
          className="mb-12 md:mb-16"
        />
        <ol ref={recordsRef} className="list-none border-b border-border">
          {HOMEPAGE_SUPPORTING_CASE_STUDIES.map((slug, index) => (
            <WorkRecord
              key={slug}
              slug={slug}
              index={index}
              reverse={index % 2 === 1}
            />
          ))}
        </ol>
        
        {/* REFINED: Stacked on mobile, side-by-side on desktop */}
        <div className="mt-10 flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="space-y-3">
            <Eyebrow>{tW("labels.liveProof")}</Eyebrow>
            <p className="max-w-xl text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {tW("labels.liveProofBody")}
            </p>
          </div>
          <CtaButtonGroup
            primary={{ href: proofCta.href, label: tCTAs("realBuild") }}
            secondary={{ href: scopeCta.href, label: tCTAs("projectRange") }}
            secondaryArrow
            className="w-full flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col lg:items-stretch"
          />
        </div>
        
        <FlagshipBlock metaRef={metaRef} tf={tf} stepLabel={stepLabel} />
        
        <div className="mt-8 flex items-center gap-4 md:mt-6">
          <div className="h-px flex-1 bg-border" />
          <Eyebrow>{tW("labels.footer")}</Eyebrow>
        </div>
      </Container>
    </section>
  );
});

function FlagshipBlock({
  metaRef,
  tf,
  stepLabel,
}: {
  metaRef: React.RefObject<HTMLDivElement | null>;
  tf: ReturnType<typeof useTranslations<"commercial.flagship">>;
  stepLabel: string;
}) {
  const movements = [
    { label: tf("labels.problem"), body: tf("problem") },
    { label: tf("labels.solution"), body: tf("solution") },
    { label: tf("labels.outcome"), body: tf("outcome") },
  ];

  return (
    <div
      ref={metaRef}
      className="mt-16 border-t border-border pt-10 md:mt-24 md:pt-16"
    >
      <SectionHeading
        titleAs="h3"
        eyebrow={tf("eyebrow")}
        firstTitle={tf("title")}
        description={tf("summary")}
        className="gap-6 md:gap-8"
        classes={{
          title:
            "max-w-3xl text-[clamp(1.5rem,3vw,2.5rem)] font-medium leading-[1.1] tracking-tight",
          description:
            "max-w-sm text-[clamp(1rem,1.05vw,1.125rem)] leading-[1.75]",
        }}
      />
      <ol className="mt-10 list-none border-t border-border md:mt-16">
        {movements.map((movement, index) => (
          /* REFINED: flex-col on mobile, flex-row aligned to start on md+ */
          <li
            key={movement.label}
            className="flex flex-col gap-3 border-b border-border py-6 md:flex-row md:items-start md:justify-between md:gap-x-10 md:py-8"
          >
            {/* REFINED: Added explicit width to the label column on desktop for a clean editorial grid */}
            <div className="flex shrink-0 items-baseline gap-4 md:w-[280px] md:pt-1">
              <span
                aria-hidden
                className="shrink-0 text-sm tabular-nums text-muted-foreground ltr:font-mono"
              >
                <Num value={index + 1} pad={2} />
              </span>
              <Eyebrow tone="accent">
                {stepLabel} · {movement.label}
              </Eyebrow>
            </div>
            <p className="max-w-[78ch] flex-1 text-[clamp(1rem,1.02vw,1.125rem)] leading-[1.7] text-foreground/85">
              {movement.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}