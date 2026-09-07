"use client";

import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { useLocale } from "next-intl";
import type { ReactNode } from "react";

/**
 * The opening move of every part of the transparency page.
 *
 * The page used to be four bands that each began the same way — an eyebrow, a
 * headline, a paragraph — with nothing telling the reader which part of the
 * disclosure they were standing in, or that the parts were one document at all.
 * This gives the page a spine: an indexed rule, then a headline set against the
 * start edge with the lede hung off the end edge.
 *
 * `index` is what separates the two roles. The estimator opens without one: it
 * is the instrument that produces the figure, not a chapter of the record. The
 * three chapters that follow are numbered 01–03, so the numbering itself
 * carries the claim the page is making — the record is ordered, finite, and
 * nothing between the numbers is missing.
 *
 * The index is derived from position, never authored, so it can never disagree
 * with the page. It is `aria-hidden`: to a screen reader the chapters are
 * already ordered by the document, and reading "01" before every heading only
 * adds noise.
 */
export function TransparencyChapter({
  className,
  eyebrow,
  index,
  lede,
  title,
  titleAs = "h2",
  titleId,
  titleItalic,
}: {
  className?: string;
  eyebrow: string;
  /** 1-based position in the record. Omitted for the estimator, which is not a chapter of it. */
  index?: number;
  lede?: ReactNode;
  title: string;
  /** The page's `h1` lives on the estimator; every chapter after it is an `h2`. */
  titleAs?: "h1" | "h2";
  titleId: string;
  /**
   * Second clause of the headline, rendered through `<Highlight>` — the
   * composed voice (craft, method, restraint). Colour is reserved for outcome
   * and conversion clauses and is not offered here: this page spends no
   * Accent budget. Rules: docs/section-heading-emphasis.md
   */
  titleItalic?: string;
}) {
  const locale = useLocale();

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const ledeRef = useSectionDescription<HTMLParagraphElement>();

  const Heading = titleAs;

  return (
    <header className={cn("scroll-mt-28", className)}>
      <div className="flex items-center gap-3 sm:gap-5">
        {index !== undefined ? (
          <span
            aria-hidden
            className="eyebrow shrink-0 self-start text-[11px] leading-none tabular-nums text-local-accent-text sm:self-center ltr:font-mono"
          >
            {localizeNumbers(String(index).padStart(2, "0"), locale)}
          </span>
        ) : null}
        <span
          aria-hidden
          className="hidden h-px w-10 shrink-0 bg-local-accent/50 sm:block"
        />
        <Eyebrow ref={eyebrowRef} className="min-w-0 text-[11px] leading-snug">
          {eyebrow}
        </Eyebrow>
        <span
          aria-hidden
          className="hidden h-px min-w-6 flex-1 bg-border sm:block"
        />
      </div>
      {/* Under 640px a long label wraps and the inline rule collapses to a
          stub floating beside two lines of text. The rule drops below the
          label instead, so the chapter still opens on a full-width line. */}
      <span
        aria-hidden
        className="mt-4 block h-px w-full bg-border sm:hidden"
      />

      <div className="mt-10 grid gap-x-16 gap-y-6 lg:mt-14 lg:grid-cols-12 lg:items-end">
        <Heading
          id={titleId}
          ref={titleRef}
          className={cn(
            "section-title col-span-full m-0 font-normal text-foreground",
            // With a lede the headline shares the row; without one it is the
            // whole row and can run to a comfortable measure of its own.
            lede
              ? "lg:col-span-7 lg:max-w-[18ch]"
              : "lg:col-span-9 lg:max-w-[24ch]",
          )}
        >
          {title}
          {titleItalic ? (
            <>
              <br className="hidden md:block" />
              <Highlight className="mt-2 block text-foreground/45 md:mt-0 md:inline">
                {titleItalic}
              </Highlight>
            </>
          ) : null}
        </Heading>
        {lede ? (
          <p
            ref={ledeRef}
            className="col-span-full max-w-[54ch] text-[clamp(1.0625rem,1.2vw,1.1875rem)] leading-relaxed text-muted-foreground lg:col-span-5 lg:pb-1.5"
          >
            {lede}
          </p>
        ) : null}
      </div>
    </header>
  );
}
