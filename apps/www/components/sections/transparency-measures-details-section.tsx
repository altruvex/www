"use client";

import { Container } from "@/components/shared/container";
import { TransparencyChapter } from "@/components/sections/transparency-chapter";
import { useSectionCardGrid } from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { useLocale, useTranslations } from "next-intl";

type MeasureSection = {
  body: string;
  points: string[];
  title: string;
};

/**
 * The closing chapter: what the estimator reads, and what it does not.
 *
 * This used to be a two-column row — title parked on the start edge, body and
 * bullets on the end edge — which is the shape a reader has already met twice
 * further up the page. Framing it changed nothing; the eye still made the same
 * left-to-right trip three times.
 *
 * So the measure is read top to bottom instead: the index sits on the title's
 * own baseline (one headline, not a number floating above a heading), a rule
 * closes the header, the argument runs at lede scale across a full measure,
 * and the supporting points land as a celled spec strip — evidence presented
 * as data rather than as a bulleted afterthought. Nothing is left beside the
 * text, so the whitespace is the panel's, not a dead column's.
 *
 * Copy is entirely `transparency.seo` in `messages/{en,ar}.json`; the component
 * owns presentation only. Blue is the page's world throughout (C10: trust,
 * ownership, disclosure) — the chapters share one accent so the numbering reads
 * as one document.
 */
export function TransparencyMeasuresDetailsSection() {
  const t = useTranslations("transparency.seo");
  const locale = useLocale();
  const sections = t.raw("sections") as MeasureSection[];

  // Zero-padding is a Latin typographic convention. Arabic-Indic ٠ is a dot,
  // and at the display size the measure index is set at it reads as a stray
  // mark beside the digit rather than as a leading zero - so `ar` gets the
  // bare numeral. The small mono ordinals keep the pad; the artefact only
  // shows up once the glyph is this large.
  const isAr = locale.startsWith("ar");

  const measuresRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-measure]",
  });

  return (
    <section
      aria-labelledby="transparency-measures-heading"
      className="accent-world-blue border-t border-border bg-surface/50 pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <TransparencyChapter
          index={3}
          titleId="transparency-measures-heading"
          eyebrow={t("eyebrow")}
          title={t("title")}
          lede={t("body")}
        />

        <ol
          ref={measuresRef}
          className="mt-14 flex list-none flex-col gap-5 lg:mt-20 lg:gap-6"
        >
          {sections.map((section, index) => (
            <li
              key={section.title}
              data-measure
              className="rounded-lg border border-border bg-background p-7 sm:p-9 md:p-11 lg:p-14 xl:p-16"
            >
              {/* Header. The index sits on the title's baseline: it is part of
                  the headline, not a label stacked above one. aria-hidden -
                  the <ol> already carries the order. */}
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 lg:gap-x-8">
                <span
                  aria-hidden
                  className="font-sans text-[clamp(2.75rem,5.5vw,5rem)] font-medium leading-none tracking-[-0.06em] tabular-nums text-foreground/15 select-none"
                >
                  {localizeNumbers(
                    isAr
                      ? String(index + 1)
                      : String(index + 1).padStart(2, "0"),
                    locale,
                  )}
                </span>
                <h3 className="max-w-[22ch] text-[clamp(1.5rem,2.6vw,2.25rem)] font-medium leading-[1.1] tracking-[-0.025em] text-balance text-foreground">
                  {section.title}
                </h3>
              </div>

              {/* The rule closes the header across the whole panel, so the
                  header and the spec strip share one edge; the argument keeps
                  its own reading measure inside it. */}
              <hr className="mt-8 border-0 border-t border-border lg:mt-10" />

              {/* Argument, at lede scale. */}
              <p className="mt-8 max-w-[66ch] text-[clamp(1.0625rem,1.2vw,1.1875rem)] leading-[1.7] text-muted-foreground lg:mt-10">
                {section.body}
              </p>

              {/* Evidence, as a spec strip. Hairlines are drawn by gap-px over
                  a border-coloured ground, so the strip stays one object as it
                  reflows from four columns to two to one. */}
              <ul className="mt-9 grid list-none gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
                {section.points.map((point, pointIndex) => (
                  <li
                    key={point}
                    className="bg-background px-5 py-5 lg:px-6 lg:py-7"
                  >
                    <span
                      aria-hidden
                      className="eyebrow block text-[10px] leading-none tabular-nums text-local-accent-text ltr:font-mono"
                    >
                      {localizeNumbers(
                        String(pointIndex + 1).padStart(2, "0"),
                        locale,
                      )}
                    </span>
                    <span className="mt-3.5 block text-[0.9375rem] leading-snug text-foreground">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
