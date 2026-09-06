"use client";

import { Container } from "@/components/shared/container";
import { ArrowLabel } from "@/components/shared/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Link } from "@/i18n/navigation";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useFillPricingTokens } from "@/components/providers/pricing-tokens-provider";
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

const SCHEDULE_SEGMENTS = [
  { key: "start", basis: "basis-1/2", tone: "bg-local-accent" },
  { key: "milestone", basis: "basis-[30%]", tone: "bg-local-accent/55" },
  { key: "launch", basis: "basis-1/5", tone: "bg-local-accent/25" },
] as const;

function ScheduleBar(): React.ReactElement {
  const t = useTranslations("quoteArtifact.schedule");
  const barRef = useSectionCardGrid<HTMLDivElement>({
    selector: ".quote-schedule-segment",
  });

  return (
    <div ref={barRef} className="mt-6">
      <div aria-hidden className="flex h-2 w-full gap-1">
        {SCHEDULE_SEGMENTS.map((segment) => (
          <span
            key={segment.key}
            className={cn(
              "quote-schedule-segment flex-none rounded-[2px]",
              segment.basis,
              segment.tone,
            )}
          />
        ))}
      </div>
      <dl className="mt-4 flex w-full gap-1">
        {SCHEDULE_SEGMENTS.map((segment) => (
          <div
            key={segment.key}
            className={cn(
              "quote-schedule-segment flex-none pe-3",
              segment.basis,
            )}
          >
            <dt className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-medium leading-none tabular-nums text-foreground">
              {t(`${segment.key}.share`)}
            </dt>
            <dd className="mt-2 text-[0.8125rem] leading-snug text-muted-foreground">
              {t(`${segment.key}.label`)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export const QuoteArtifactSection = memo(function QuoteArtifactSection() {
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
      className="accent-world-orange border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)"
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
        <div ref={documentRef} className="border border-border bg-card rounded-lg">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-b border-border px-6 py-5 md:px-10">
            <Eyebrow tone="accent">{t("document.label")}</Eyebrow>
            <p className="text-[0.8125rem] leading-snug text-muted-foreground">
              {t("document.status")}
            </p>
          </div>
          <ol className="list-none">
            {CLAUSE_KEYS.map((key: ClauseKey, index) => (
              <li
                key={key}
                className="grid gap-x-10 gap-y-4 border-b border-border px-6 py-8 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] md:px-10 md:py-10"
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
                    {t(`clauses.${key}.body`)}
                  </p>
                  {key === "schedule" ? <ScheduleBar /> : null}
                  {key === "scope" ? (
                    <p className="mt-6 text-[clamp(1.375rem,2.2vw,1.875rem)] font-medium leading-[1.15] tracking-[-0.018em] tabular-nums text-foreground">
                      {fillTokens(t("clauses.scope.figure"))}
                    </p>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "text-[0.875rem] leading-relaxed text-muted-foreground",
                    "border-s border-border ps-5 md:mt-1",
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
          className="mt-10 grid gap-8 border-t border-border pt-10 md:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] md:items-start"
        >
          <div className="flex flex-col items-start gap-5">
            <p className="text-[clamp(1rem,1.02vw,1.0625rem)] leading-relaxed text-foreground">
              {fillTokens(t("footer.minimum"))}
            </p>
            <MagneticButton asChild size="lg" className="group">
              <Link href="/pricing">
                <ArrowLabel>{t("footer.ctaLabel")}</ArrowLabel>
              </Link>
            </MagneticButton>
          </div>
          <Eyebrow>{t("footer.footnote")}</Eyebrow>
        </div>
      </Container>
    </section>
  );
});
