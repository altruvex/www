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
 * The closing chapter: what the estimator actually reads, and what it does not.
 *
 * Presented as modules rather than the hairline rows this used to be. Each
 * measure carries its own frame, an oversized index set as a graphic anchor
 * above the title, and an internal rule that separates the argument (start
 * column) from the evidence (end column) — so a reader scanning only the
 * titles, only the bodies, or only the supporting points gets a coherent pass
 * in each case. The section inverts the page's figure/ground (tinted band,
 * plain panels) so it reads as the record's last chapter rather than one more
 * band of the same colour.
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
  // and at the display size this numeral is set at it reads as a stray mark
  // beside the digit rather than as a leading zero - so `ar` gets the bare
  // numeral. The small mono indices elsewhere keep the pad; the artefact only
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
          className="mt-14 flex list-none flex-col gap-5 lg:mt-20 lg:gap-7"
        >
          {sections.map((section, index) => (
            <li
              key={section.title}
              data-measure
              className="rounded-lg border border-border bg-background p-7 sm:p-9 md:p-10 lg:grid lg:grid-cols-12 lg:p-12 xl:p-14"
            >
              {/* Argument. The index is a graphic anchor, not a label - the
                  <ol> already carries the order, so it stays out of the
                  accessibility tree and out of the reading contrast tier. */}
              <div className="lg:col-span-5 lg:pe-12">
                <span
                  aria-hidden
                  className="block font-sans text-[clamp(3.25rem,5.5vw,4.75rem)] font-medium leading-[0.8] tracking-[-0.06em] tabular-nums text-foreground/15 select-none"
                >
                  {localizeNumbers(
                    isAr
                      ? String(index + 1)
                      : String(index + 1).padStart(2, "0"),
                    locale,
                  )}
                </span>
                <span
                  aria-hidden
                  className="mt-7 block h-px w-10 bg-local-accent/60"
                />
                <h3 className="mt-6 text-[clamp(1.375rem,2.1vw,1.875rem)] font-medium leading-[1.15] tracking-[-0.02em] text-balance text-foreground lg:max-w-[15ch]">
                  {section.title}
                </h3>
              </div>

              {/* Evidence. */}
              <div className="mt-8 border-t border-border pt-8 lg:col-span-7 lg:mt-0 lg:border-t-0 lg:border-s lg:pt-0 lg:ps-12">
                <p className="max-w-[58ch] text-[clamp(1rem,1.02vw,1.0625rem)] leading-relaxed text-muted-foreground">
                  {section.body}
                </p>
                <ul className="mt-8 grid list-none gap-x-10 gap-y-3.5 border-t border-border pt-7 sm:grid-cols-2">
                  {section.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-3.5 text-[0.9375rem] leading-relaxed text-foreground/75"
                    >
                      <span
                        aria-hidden
                        className="mt-2.5 h-px w-3.5 shrink-0 bg-local-accent/60"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
