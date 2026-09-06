"use client";

import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  useBatch,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { SectionHeading } from "./section-heading";

interface ProblemItem {
  readonly number: string;
  readonly pitch: string;
  readonly delivery: string;
  readonly evidence: string;
}

function ProblemRow({ item }: { item: ProblemItem }) {
  const t = useTranslations("problem");

  return (
    <li className="group grid grid-cols-1 gap-y-8 not-first:border-t border-border py-8 md:grid-cols-[3rem_minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-start md:gap-x-8 md:gap-y-0 md:py-10 lg:gap-x-12">
      <div
        aria-hidden="true"
        className="pt-1 text-sm text-foreground/40 ltr:font-mono tabular-nums"
      >
        {item.number}
      </div>
      <div data-problem-reveal>
        <Eyebrow className="mb-3 md:hidden">{t("trackPitch")}</Eyebrow>
        <p className="text-[clamp(1.05rem,1.25vw,1.2rem)] leading-[1.6] text-foreground/55">
          <Highlight>{item.pitch}</Highlight>
        </p>
      </div>
      <div data-problem-reveal>
        <Eyebrow tone="accent" className="mb-3 md:hidden">
          {t("trackDelivery")}
        </Eyebrow>
        <h3 className="text-[clamp(1.3rem,2vw,1.7rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
          {item.delivery}
        </h3>
        <p className="mt-4 border-s border-local-accent/50 ps-3 text-[0.8125rem] leading-[1.6] text-muted-foreground tabular-nums ltr:font-mono md:text-[0.875rem] rtl:text-sm transition-colors duration-300 group-hover:border-local-accent/80">
          {item.evidence}
        </p>
      </div>
    </li>
  );
}

export const ProblemSection = memo(function ProblemSection() {
  const t = useTranslations("problem");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const bodyRef = useSectionDescription();
  const closingRef = useSectionElement();

  const listRef = useBatch<HTMLOListElement>({
    selector: "[data-problem-reveal]",
    distance: 20,
    stagger: 0.08,
  });

  const items = t.raw("items") as ProblemItem[];

  return (
    <section
      aria-labelledby="problem-section-heading"
      className="accent-world-orange border-t border-border pb-(--section-y-bottom) pt-(--section-y-top)"
    >
      <Container>
        <SectionHeading
          titleId="problem-section-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={bodyRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          description={t("subtitle")}
          className="mb-16 lg:mb-20"
        />
        <div>
          <div
            aria-hidden="true"
            className="hidden pb-6 md:grid md:grid-cols-[3rem_minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-end md:gap-x-8 lg:gap-x-12"
          >
            <span />
            <Eyebrow>{t("trackPitch")}</Eyebrow>
            <Eyebrow tone="accent">{t("trackDelivery")}</Eyebrow>
          </div>
          <ol
            ref={listRef}
            aria-label={t("eyebrow")}
            className="list-none border border-border p-4 rounded-xl"
          >
            {items.map((item) => (
              <ProblemRow key={item.number} item={item} />
            ))}
          </ol>
        </div>
        <div
          ref={closingRef}
          className="mt-16 border-t border-border pt-10 md:mt-20 md:pt-12"
        >
          <div className="flex items-start gap-5">
            <span
              aria-hidden="true"
              className="mt-[0.65em] h-0.5 w-8 shrink-0 bg-local-accent"
            />
            <p className="max-w-[42ch] text-[clamp(1.4rem,2.2vw,1.75rem)] leading-[1.3] tracking-[-0.015em] text-foreground">
              {t("closingPre")}{" "}
              <Highlight>{t("closingHighlight")}</Highlight>
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
});