"use client";

import { TransparencyChapter } from "@/components/sections/transparency-chapter";
import { Container } from "@/components/shared/container";
import { useSectionCardGrid } from "@/lib/motion";
import { formatIndex } from "@/lib/utils/number";
import { useLocale, useTranslations } from "next-intl";

type MeasureSection = {
  body: string;
  points: string[];
  title: string;
};

export function TransparencyMeasuresDetailsSection() {
  const t = useTranslations("transparency.seo");
  const locale = useLocale();
  const sections = t.raw("sections") as MeasureSection[];

  const listRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-measure]",
  });

  return (
    <section
      aria-labelledby="transparency-measures-heading"
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <TransparencyChapter
          index={1}
          titleId="transparency-measures-heading"
          eyebrow={t("eyebrow")}
          title={t("title")}
          lede={t("body")}
        />
        <ol
          ref={listRef}
          className="mt-12 list-none border-t border-border-subtle lg:mt-16"
        >
          {sections.map((section, index) => (
            <li
              key={section.title}
              data-measure
              className="grid gap-4 border-b border-border-subtle py-8 lg:grid-cols-12 lg:gap-12 lg:py-10 xl:gap-16"
            >
              <div className="flex items-baseline gap-4 lg:col-span-4">
                <span
                  aria-hidden
                  className="shrink-0 text-xs tabular-nums text-muted-foreground ltr:font-mono"
                >
                  {formatIndex(index + 1, 2, locale)}
                </span>
                <h3 className="text-lg font-medium leading-snug text-balance text-foreground lg:text-xl">
                  {section.title}
                </h3>
              </div>
              <div className="lg:col-span-8">
                <p className="max-w-[56ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
                  {section.body}
                </p>
                <ul className="mt-5 grid list-none gap-x-8 gap-y-2 text-sm leading-relaxed text-foreground sm:grid-cols-2">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span
                        aria-hidden
                        className="mt-[0.7em] h-px w-3 shrink-0 bg-muted-foreground/60"
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
