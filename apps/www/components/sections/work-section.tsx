"use client";

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

/**
 * Selected Work — verification record.
 *
 * Claim: these builds are in production and you can check them yourself.
 * Proof shape: measurement — each project ships figures, and a live URL beside
 * them is the invitation to verify.
 * Device: a record of measured entries, figures leading at display size.
 * Deliberately NOT a card grid — that device is over-subscribed on this site,
 * and the flagship block below used to add a third 3-up grid to the same page.
 *
 * The homepage uses `WorkRecord`; `/work` still renders the older `WorkItem`,
 * which remains untouched so this rebuild does not silently redesign that page.
 */
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
          className="mb-16"
        />

        <ol ref={recordsRef} className="list-none border-b border-border">
          {HOMEPAGE_SUPPORTING_CASE_STUDIES.map((slug, index) => (
            <WorkRecord key={slug} slug={slug} index={index} />
          ))}
        </ol>

        <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:items-start">
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
            className="flex-col gap-3 sm:flex-col sm:items-stretch"
          />
        </div>

        <FlagshipBlock metaRef={metaRef} tf={tf} stepLabel={stepLabel} />

        <div className="mt-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <Eyebrow>{tW("labels.footer")}</Eyebrow>
        </div>
      </Container>
    </section>
  );
});

/**
 * The flagship engagement, told as one entry rather than three cards.
 *
 * It previously rendered problem / solution / outcome as a 3-up bordered grid —
 * a second card row inside a section that had just shown a list, and the third
 * on the page. As labelled lines in a single block it reads as one narrative,
 * which is what problem → solution → outcome actually is.
 */
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
    <div ref={metaRef} className="mt-16 border-t border-border pt-12">
      <Eyebrow className="mb-4">{tf("eyebrow")}</Eyebrow>
      <h3 className="mb-4 max-w-3xl text-[clamp(1.5rem,2.4vw,2rem)] font-normal leading-[1.15] tracking-[-0.018em] text-foreground">
        {tf("title")}
      </h3>
      <p className="mb-10 max-w-2xl text-[clamp(0.9375rem,0.98vw,1rem)] leading-relaxed text-muted-foreground">
        {tf("summary")}
      </p>

      <ol className="list-none">
        {movements.map((movement) => (
          <li
            key={movement.label}
            className="grid gap-x-10 gap-y-3 border-t border-border py-7 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]"
          >
            <Eyebrow tone="accent" className="md:pt-1">
              {stepLabel} · {movement.label}
            </Eyebrow>
            <p className="max-w-[62ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {movement.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
