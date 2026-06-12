"use client";

import { Container } from "@/components/container";
import { ArrowLabel } from "@/components/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { WorkItem } from "@/components/work-item";
import { Link } from "@/i18n/navigation";
import {
  HOMEPAGE_SUPPORTING_CASE_STUDIES,
  getCommercialCta,
} from "@/lib/commercial";
import { useSectionCardGrid, useSectionDescription, useSectionElement, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { splitHeadline } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { memo } from "react";

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
    <section id="work" className="pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 md:gap-12 mb-16">
          <WorkSectionHeader
            eyebrowRef={eyebrowRef}
            titleRef={titleRef}
            eyebrow={tW("eyebrow")}
            firstTitle={firstTitle}
            secondTitle={secondTitle}
          />
          <p
            ref={bodyRef}
            className="text-[clamp(0.9375rem,0.98vw,1rem)] text-muted-foreground max-w-sm leading-relaxed md:max-w-xs lg:max-w-[20rem] m-0"
          >
            {tW("description")}
          </p>
        </div>
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
            <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground">
              {tW("labels.liveProof")}
            </p>
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground max-w-xl">
              {tW("labels.liveProofBody")}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <MagneticButton size="lg" variant="primary" className="group">
              <Link href={proofCta.href}>
                <ArrowLabel>{tCTAs("realBuild")}</ArrowLabel>
              </Link>
            </MagneticButton>
            <MagneticButton size="lg" variant="secondary" className="group">
              <Link href={scopeCta.href}>
                <ArrowLabel>{tCTAs("projectRange")}</ArrowLabel>
              </Link>
            </MagneticButton>
          </div>
        </div>
        <FlagshipMetaBlock
          metaRef={metaRef}
          tf={tf}
          stepLabel={stepLabel}
        />
        <div className="flex items-center gap-4 mt-6">
          <div className="flex-1 h-px bg-border" />
          <span className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground">
            {tW("labels.footer")}
          </span>
        </div>
      </Container>
    </section>
  );
});

function WorkSectionHeader({
  eyebrowRef,
  titleRef,
  eyebrow,
  firstTitle,
  secondTitle,
}: {
  eyebrowRef: React.RefObject<HTMLParagraphElement | null>;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  eyebrow: string;
  firstTitle: string;
  secondTitle: string | null;
}) {
  return (
    <div className="space-y-3">
      <p
        ref={eyebrowRef}
        className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground"
      >
        {eyebrow}
      </p>
      <h2
        ref={titleRef}
        className="text-[clamp(2.125rem,4vw,3.25rem)] leading-[1.08] tracking-[-0.02em] font-normal text-foreground m-0"
      >
        {firstTitle}
        {secondTitle ? (
          <>
            <br className="hidden md:block" />
            <span className="block mt-2 md:mt-0 md:inline font-serif italic font-light text-foreground/45 rtl:font-sans rtl:not-italic rtl:font-bold">
              {secondTitle}
            </span>
          </>
        ) : null}
      </h2>
    </div>
  );
}


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
      <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-4">
        {tf("eyebrow")}
      </p>
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
            className="border-e border-b border-border px-6 py-8 group hover:bg-surface transition-colors duration-300 md:last:border-e-0"
          >
            <p className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-4">
              {stepLabel} · {item.label}
            </p>
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
