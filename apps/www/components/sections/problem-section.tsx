"use client";

import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { SectionHeading } from "./section-heading";

interface ProblemItem {
  readonly number: string;
  readonly title: string;
  readonly body: string;
  readonly signal: string;
}

function ProblemRow({ item }: { item: ProblemItem }) {
  return (
    <div
      data-problem-row
      role="listitem"
      className="group grid grid-cols-1 gap-4 border-t border-border py-8 sm:gap-6 sm:py-10 md:grid-cols-[120px_1fr] md:gap-12 lg:grid-cols-[160px_1fr] lg:gap-16"
    >
      <div className="flex items-start">
        <span
          className="font-mono text-[clamp(2rem,4vw,3rem)] font-medium leading-none tracking-[-0.02em] text-foreground/60 transition-colors duration-300 group-hover:text-foreground/90"
          aria-hidden="true"
        >
          {item.number}
        </span>
      </div>

      <div className="space-y-4">
        <h3 className="text-[clamp(1.375rem,2.2vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
          {item.title}
        </h3>

        <p className="max-w-[58ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
          {item.body}
        </p>

        <div className="flex items-center gap-2.5 pt-1">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-error"
            aria-hidden="true"
          />
          <span className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-muted-foreground">
            {item.signal}
          </span>
        </div>
      </div>
    </div>
  );
}

export const ProblemSection = memo(function ProblemSection() {
  const t = useTranslations("problem");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const bodyRef = useSectionDescription();
  const gridRef = useSectionCardGrid({ selector: "[data-problem-row]" });

  const items = t.raw("items") as ProblemItem[];

  return (
    <section
      aria-labelledby="problem-section-heading"
      className="border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="problem-section-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={bodyRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleAccent")}
          accent="ember"
          description={t("subtitle")}
          className="mb-16 lg:mb-20"
        />

        <div ref={gridRef} role="list" aria-label={t("eyebrow")}>
          {items.map((item) => (
            <ProblemRow key={item.number} item={item} />
          ))}
          <div className={cn("h-px w-full bg-border")} aria-hidden="true" />
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 text-center sm:flex-row lg:mt-16">
          <span
            className="hidden h-px flex-1 bg-linear-to-r from-border to-transparent sm:block"
            aria-hidden="true"
          />
          <p className="max-w-[36ch] shrink-0 text-sm leading-relaxed text-muted-foreground sm:max-w-none">
            {t("closingPre")} <Highlight>{t("closingHighlight")}</Highlight>
          </p>
          <span
            className="hidden h-px flex-1 bg-linear-to-l from-border to-transparent sm:block"
            aria-hidden="true"
          />
        </div>
      </Container>
    </section>
  );
});
