"use client";

import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import {
  useSectionCardGrid,
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
  readonly title: string;
  readonly body: string;
  readonly signal: string;
}

/**
 * One ledger entry: index column · statement · evidence.
 *
 * The evidence ("signal") sits in a trailing margin column on lg+ — a technical
 * report's margin note — and folds under the statement below that. It is a
 * single DOM node at every breakpoint (no duplicated copy for screen readers).
 */
function ProblemRow({ item }: { item: ProblemItem }) {
  return (
    <li
      data-problem-row
      className="group grid grid-cols-1 gap-y-4 border-t border-border py-9 sm:py-10 md:grid-cols-[5.5rem_minmax(0,1fr)] md:gap-x-8 lg:grid-cols-[7rem_minmax(0,1fr)_16.5rem] lg:gap-x-12 xl:gap-x-16"
    >
      <div
        aria-hidden="true"
        className="flex items-center gap-3 md:flex-col md:items-start md:gap-3"
      >
        {/* World tick — the only place the orange world shows as fill. */}
        <span className="h-[3px] w-6 shrink-0 origin-left rounded-full bg-local-accent/60 transition-transform duration-300 ease-smooth group-hover:scale-x-125 rtl:origin-right md:w-7" />
        {/* Ghost index numeral: decorative (the <ol> carries the enumeration),
            so it may sit below the reading floor (principles C14). Latin gets
            Geist Mono; Arabic-Indic numerals stay in Vazirmatn. */}
        <span className="text-[clamp(2rem,3.6vw,2.75rem)] font-medium leading-none tracking-[-0.02em] text-foreground/25 transition-colors duration-300 ease-smooth tabular-nums group-hover:text-local-accent-text ltr:font-mono rtl:text-foreground/35 dark:text-foreground/30 dark:rtl:text-foreground/40">
          {item.number}
        </span>
      </div>

      <div className="md:col-start-2">
        <h3 className="text-[clamp(1.375rem,2.2vw,1.75rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
          {item.title}
        </h3>
        <p className="mt-3 max-w-[58ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
          {item.body}
        </p>
      </div>

      {/* Evidence line. Mono + tabular figures read as a measurement, not a
          slogan; no uppercase (these run past the 3-4 word caps ceiling, T8). */}
      <p className="self-start border-s-2 border-local-accent/35 ps-4 text-[0.8125rem] leading-[1.7] text-s-mid transition-colors duration-300 ease-smooth tabular-nums group-hover:border-local-accent/70 ltr:font-mono rtl:text-sm md:col-start-2 lg:col-start-3 lg:row-start-1 lg:mt-2.5">
        {item.signal}
      </p>
    </li>
  );
}

export const ProblemSection = memo(function ProblemSection() {
  const t = useTranslations("problem");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const bodyRef = useSectionDescription();
  const gridRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-problem-row]",
  });
  const closingRef = useSectionElement();

  const items = t.raw("items") as ProblemItem[];

  return (
    <section
      aria-labelledby="problem-section-heading"
      className="accent-world-orange border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        {/* No `accent` prop: the second clause is loss-framed, so the heading's
            second line renders as a serif-italic <Highlight> rather than a
            gradient <Accent> (design.md §5 - coloring a warning is tonally
            wrong). Pass accent="ember" to restore the gradient. */}
        <SectionHeading
          titleId="problem-section-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={bodyRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleAccent")}
          description={t("subtitle")}
          className="mb-16 lg:mb-20"
        />

        <ol
          ref={gridRef}
          aria-label={t("eyebrow")}
          className="list-none border-b border-border"
        >
          {items.map((item) => (
            <ProblemRow key={item.number} item={item} />
          ))}
        </ol>

        <div ref={closingRef} className="mt-14 flex items-start gap-4 lg:mt-16">
          <span
            aria-hidden="true"
            className="mt-[0.65em] h-[3px] w-6 shrink-0 rounded-full bg-local-accent"
          />
          <p className="max-w-[46ch] text-[clamp(1.25rem,1.9vw,1.5rem)] leading-[1.35] text-foreground">
            {t("closingPre")} <Highlight>{t("closingHighlight")}</Highlight>
          </p>
          <span
            aria-hidden="true"
            className="mt-[1.1em] hidden h-px flex-1 bg-border sm:block"
          />
        </div>
      </Container>
    </section>
  );
});
