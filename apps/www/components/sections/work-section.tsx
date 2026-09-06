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
      <ol className="mt-10 grid list-none gap-4 md:mt-16 md:grid-cols-3 md:gap-px md:overflow-hidden md:rounded-[1.5rem] md:border md:border-border/70 md:bg-border/70">
        {movements.map((movement, index) => (
          <li
            key={movement.label}
            className="relative bg-card px-6 py-7 md:px-7 md:py-8"
          >
            <div className="flex items-start justify-between gap-6">
              <span
                aria-hidden
                className="text-[clamp(2.75rem,5vw,4rem)] font-medium leading-none tracking-[-0.06em] text-foreground/20 tabular-nums"
              >
                <Num value={index + 1} pad={2} />
              </span>

              <span
                aria-hidden
                className="mt-2 size-2 shrink-0 rounded-full bg-local-accent"
              />
            </div>

            <div className="mt-10">
              <Eyebrow tone="accent">
                {stepLabel} · {movement.label}
              </Eyebrow>

              <p className="mt-4 max-w-[34ch] text-[clamp(1rem,1.05vw,1.125rem)] leading-[1.75] text-foreground/85">
                {movement.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}