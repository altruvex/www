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
  /** What the agency sold — reproduced as a quote, in the serif-italic voice. */
  readonly pitch: string;
  /** What the client actually received — the counter-claim, carrying the weight. */
  readonly delivery: string;
  /** The measurable consequence. Mono + tabular reads as evidence, not a slogan. */
  readonly evidence: string;
}

/**
 * Opposed two-track register.
 *
 * Claim: businesses are not buying engineering, they are being handed templates.
 * Proof shape: comparison — every item on this list is a substitution, so the
 * section holds both states in one frame instead of describing the gap.
 * Device: two tracks (pitch | delivery) split by one continuous rule that runs
 * the height of the list. Deliberately NOT a card grid, and NOT the annotated
 * artifact used by quote-artifact-section — there the margin column comments on
 * the body, here the second column contradicts the first and outweighs it.
 *
 * The asymmetry is the argument: the pitch column is set back (quoted, muted,
 * narrower), the delivery column sits forward (foreground, heavier, wider).
 * It reads with all motion disabled.
 */
function ProblemRow({ item }: { item: ProblemItem }) {
  return (
    <li className="group grid grid-cols-1 gap-y-5 border-t border-border py-9 sm:py-10 md:grid-cols-[3.25rem_minmax(0,0.82fr)_minmax(0,1.18fr)] md:items-start md:gap-y-0">
      <div
        aria-hidden="true"
        className="flex items-center gap-3 md:flex-col md:items-start md:gap-2.5"
      >
        {/* World tick — the only place the orange world shows as fill. */}
        <span className="h-[3px] w-6 shrink-0 origin-left rounded-full bg-local-accent/60 transition-transform duration-300 ease-smooth group-hover:scale-x-125 rtl:origin-right md:w-7" />
        {/* Ghost index numeral: decorative (the <ol> carries the enumeration),
            so it may sit below the reading floor (principles C14). Latin gets
            Geist Mono; Arabic-Indic numerals stay in Vazirmatn. */}
        <span className="text-[clamp(1.75rem,3vw,2.25rem)] font-medium leading-none tracking-[-0.02em] text-foreground/25 transition-colors duration-300 ease-smooth tabular-nums group-hover:text-local-accent-text ltr:font-mono rtl:text-foreground/35 dark:text-foreground/30 dark:rtl:text-foreground/40">
          {item.number}
        </span>
      </div>

      {/* Track A — the pitch, reproduced as a quotation. <Highlight> is the
          site's quoted voice (serif-italic in LTR, sans-bold in RTL, since
          Arabic has no italic). On mobile a quote bar stands in for the rule. */}
      <p
        data-problem-pitch
        className="border-s-2 border-border ps-4 text-[clamp(1.0625rem,1.3vw,1.1875rem)] leading-[1.6] text-muted-foreground md:border-s-0 md:pe-10 md:ps-0 lg:pe-14"
      >
        <Highlight>{item.pitch}</Highlight>
      </p>

      {/* Track B — what arrived. Carries the rule, the weight and the evidence. */}
      <div
        data-problem-delivery
        className="md:border-s md:border-border md:ps-10 lg:ps-14"
      >
        <h3 className="text-[clamp(1.25rem,2vw,1.625rem)] font-medium leading-[1.25] tracking-[-0.02em] text-foreground">
          {item.delivery}
        </h3>
        <p className="mt-3.5 max-w-[46ch] border-s-2 border-local-accent/35 ps-4 text-[0.8125rem] leading-[1.7] text-muted-foreground transition-colors duration-300 ease-smooth tabular-nums group-hover:border-local-accent/70 ltr:font-mono rtl:text-sm">
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

  /* One motion idea: the delivery always arrives after the pitch, and heavier.
     Two batches over the same list — the lag between them is the argument.
     Reduced motion is handled inside the hooks. */
  const pitchTrackRef = useBatch<HTMLDivElement>({
    selector: "[data-problem-pitch]",
    distance: 20,
    stagger: 0.05,
  });
  const deliveryTrackRef = useBatch<HTMLOListElement>({
    selector: "[data-problem-delivery]",
    delay: 0.14,
    distance: 40,
    stagger: 0.06,
  });

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

        <div ref={pitchTrackRef}>
          {/* Track headers — they name the two columns once, so no row has to
              repeat the framing. Hidden below md, where the tracks stack and
              the quote bar carries the distinction instead. */}
          <div
            aria-hidden="true"
            className="hidden md:grid md:grid-cols-[3.25rem_minmax(0,0.82fr)_minmax(0,1.18fr)] md:items-end md:pb-5"
          >
            <span />
            <Eyebrow className="md:pe-10 lg:pe-14">{t("trackPitch")}</Eyebrow>
            <Eyebrow tone="accent" className="md:ps-10 lg:ps-14">
              {t("trackDelivery")}
            </Eyebrow>
          </div>

          <ol
            ref={deliveryTrackRef}
            aria-label={t("eyebrow")}
            className="list-none border-b border-border"
          >
            {items.map((item) => (
              <ProblemRow key={item.number} item={item} />
            ))}
          </ol>
        </div>

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
