"use client";

import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  splitWords,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
  useStrikeRead,
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

/**
 * The ledger's two columns. One grid for the header and every row, so the
 * promise and the delivery always line up across — the subtitle asks the
 * reader to "read each line across", and the layout is what makes that true.
 */
const LEDGER_GRID =
  "grid grid-cols-1 gap-y-5 md:grid-cols-[4.5rem_minmax(0,5fr)_minmax(0,7fr)] md:gap-x-10 lg:gap-x-16";

/**
 * The strike is a background, not a pseudo-element: `box-decoration-break:
 * clone` gives every wrapped line its own copy, so a two-line promise is
 * struck on both lines, and `--strike` (the width) is what useStrikeRead
 * scrubs. It rests at 100% — struck is the reduced-motion state.
 */
const STRIKE =
  "[--strike:100%] bg-[linear-gradient(var(--local-accent),var(--local-accent))] bg-no-repeat [background-size:var(--strike)_0.075em] [background-position:0_54%] rtl:[background-position:100%_56%] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";

function LedgerRow({ item }: { item: ProblemItem }) {
  const t = useTranslations("problem");
  const rowRef = useStrikeRead<HTMLLIElement>();

  return (
    <li
      ref={rowRef}
      className={`${LEDGER_GRID} border-t border-border-subtle py-10 md:py-16`}
    >
      <p
        aria-hidden="true"
        className="m-0 font-mono text-sm tabular-nums tracking-[0.12em] text-local-accent-text md:pt-2"
      >
        {item.number}
      </p>

      <div>
        <Eyebrow className="mb-3 md:sr-only">{t("trackPitch")}</Eyebrow>
        <p className="m-0 max-w-[26ch] text-[clamp(1.375rem,2.2vw,2rem)] leading-[1.25]">
          <Highlight data-strike className={STRIKE}>
            {item.pitch}
          </Highlight>
        </p>
      </div>

      <div>
        <Eyebrow tone="accent" className="mb-3 md:sr-only">
          {t("trackDelivery")}
        </Eyebrow>
        <h3 className="m-0 max-w-[22ch] text-[clamp(1.75rem,3.4vw,3.25rem)] font-medium leading-[1.05] tracking-[-0.035em] text-foreground rtl:leading-[1.3] rtl:tracking-normal">
          {splitWords(item.delivery).map(({ key, word }) => (
            <span key={key} data-word>
              {word}
            </span>
          ))}
        </h3>
        <p className="mt-5 mb-0 flex max-w-[48ch] items-start gap-3 text-sm leading-[1.7] text-muted-foreground md:mt-7 md:text-base">
          <span
            aria-hidden="true"
            className="mt-[0.7em] size-1 shrink-0 rounded-full bg-local-accent"
          />
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
  const ledgerHeadRef = useSectionElement();
  const closingRef = useSectionElement();

  const items = t.raw("items") as ProblemItem[];

  return (
    <section
      aria-labelledby="problem-section-heading"
      className="
        accent-world-orange
        border-t
        border-border-subtle
        pb-(--section-y-bottom)
        pt-(--section-y-top)
      "
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
          className="mb-16 md:mb-24"
        />

        {/* Column labels for the desktop ledger; on mobile each row carries
            its own, since the columns stack. Rows repeat them for screen
            readers, so this row is presentation only. */}
        <div
          ref={ledgerHeadRef}
          aria-hidden="true"
          className={`${LEDGER_GRID} hidden pb-5 md:grid`}
        >
          <span />
          <Eyebrow className="m-0">{t("trackPitch")}</Eyebrow>
          <Eyebrow tone="accent" className="m-0">
            {t("trackDelivery")}
          </Eyebrow>
        </div>

        <ol className="m-0 list-none p-0">
          {items.map((item) => (
            <LedgerRow key={item.number} item={item} />
          ))}
        </ol>

        <div
          ref={closingRef}
          className={`${LEDGER_GRID} border-t border-border-subtle pt-12 md:pt-20`}
        >
          <span
            aria-hidden="true"
            className="hidden h-px w-10 self-start bg-local-accent md:mt-[0.6em] md:block"
          />
          <p className="m-0 max-w-[24ch] text-[clamp(1.75rem,4vw,3.5rem)] leading-[1.05] tracking-[-0.045em] text-foreground md:col-span-2 rtl:leading-[1.3] rtl:tracking-normal">
            {t("closingPre")}{" "}
            <Highlight tone="world">{t("closingHighlight")}</Highlight>
          </p>
        </div>
      </Container>
    </section>
  );
});
