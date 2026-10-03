"use client";

import { useFillPricingTokens } from "@/components/providers/pricing-tokens-provider";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { SectionHeading } from "./section-heading";

const CLAUSE_KEYS = [
  "scope",
  "schedule",
  "included",
  "passthrough",
  "separate",
  "ownership",
] as const;

type ClauseKey = (typeof CLAUSE_KEYS)[number];

/* In payment-schedule milestone order; each segment's width is its share of
   the resolved payment split, so the bar is drawn to the real proportions. */
const SCHEDULE_SEGMENTS = [
  { key: "start", tone: "bg-local-accent" },
  { key: "milestone", tone: "bg-local-accent/55" },
  { key: "launch", tone: "bg-local-accent/25" },
] as const;

function ScheduleBar({
  paymentSplit,
}: {
  paymentSplit: readonly number[];
}): React.ReactElement {
  const t = useTranslations("quoteArtifact.schedule");
  const fillTokens = useFillPricingTokens();
  const barRef = useSectionCardGrid<HTMLDivElement>({
    selector: ".quote-schedule-segment",
  });

  return (
    <div ref={barRef} className="mt-6">
      <div aria-hidden className="flex h-2 w-full gap-1">
        {SCHEDULE_SEGMENTS.map((segment, index) => (
          <span
            key={segment.key}
            className={cn(
              "quote-schedule-segment flex-none rounded-ctl-xs",
              segment.tone,
            )}
            style={{ flexBasis: `${paymentSplit[index]}%` }}
          />
        ))}
      </div>
      <dl className="mt-4 flex w-full gap-1">
        {SCHEDULE_SEGMENTS.map((segment, index) => (
          <div
            key={segment.key}
            className="quote-schedule-segment flex-none pe-3"
            style={{ flexBasis: `${paymentSplit[index]}%` }}
          >
            <dt className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-medium leading-none tabular-nums text-foreground">
              {fillTokens(t.raw(`${segment.key}.share`))}
            </dt>
            <dd className="mt-2 text-[0.8125rem] leading-snug text-muted-foreground">
              {fillTokens(t.raw(`${segment.key}.label`))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export const QuoteArtifactSection = memo(function QuoteArtifactSection({
  paymentSplit,
  scopeFigure,
}: {
  /** The resolved payment split's percentages, in milestone order. */
  paymentSplit: readonly number[];
  /** Clause 01's range: the worked example's estimate, the same figure
      "Transparent by design" ends on, so both sections tell one story. */
  scopeFigure: string;
}) {
  const t = useTranslations("quoteArtifact");
  const fillTokens = useFillPricingTokens();

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const bodyRef = useSectionDescription();
  const documentRef = useSectionElement<HTMLDivElement>();
  const footerRef = useSectionElement<HTMLDivElement>();

  return (
    <section
      id="quote-artifact"
      aria-labelledby="quote-artifact-heading"
      className="accent-world-orange border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="quote-artifact-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={bodyRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleAccent")}
          accent="sunset"
          description={t("subtitle")}
          className="mb-16"
        />
        <div ref={documentRef} className="border border-border-subtle bg-card rounded-panel-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-b border-border-subtle px-6 py-5 md:px-10">
            <Eyebrow tone="accent">{t("document.label")}</Eyebrow>
            <p className="text-[0.8125rem] leading-snug text-muted-foreground">
              {t("document.status")}
            </p>
          </div>
          <ol className="list-none">
            {CLAUSE_KEYS.map((key: ClauseKey, index) => (
              <li
                key={key}
                className="grid gap-x-10 gap-y-4 px-6 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] md:px-10 md:py-11"
              >
                <div>
                  <div className="flex items-baseline gap-4">
                    <span
                      aria-hidden
                      className="eyebrow shrink-0 text-muted-foreground tabular-nums"
                    >
                      {t(`clauses.${key}.index`)}
                    </span>
                    <h3 className="text-[clamp(1.1875rem,1.5vw,1.4375rem)] font-medium leading-snug text-foreground">
                      {t(`clauses.${key}.title`)}
                    </h3>
                  </div>
                  <p className="mt-4 max-w-[62ch] text-[clamp(1rem,1.02vw,1.0625rem)] leading-relaxed text-muted-foreground">
                    {fillTokens(t.raw(`clauses.${key}.body`))}
                  </p>
                  {key === "schedule" ? (
                    <ScheduleBar paymentSplit={paymentSplit} />
                  ) : null}
                  {key === "scope" ? (
                    <p className="mt-6 text-[clamp(1.375rem,2.2vw,1.875rem)] font-medium leading-[1.15] tracking-[-0.018em] tabular-nums text-foreground">
                      {scopeFigure}
                    </p>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "text-md leading-relaxed text-muted-foreground",
                    "border-s border-border-subtle ps-5 md:mt-1",
                    index % 2 === 0 ? "md:text-balance" : "",
                  )}
                >
                  {t(`clauses.${key}.note`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
        <div
          ref={footerRef}
          className="mt-10 border-t border-border-subtle pt-10"
        >
          <Eyebrow>{t("footer.footnote")}</Eyebrow>
        </div>
      </Container>
    </section>
  );
});
