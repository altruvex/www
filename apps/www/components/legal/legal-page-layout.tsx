"use client";

import { LegalProse } from "@/components/legal/legal-prose";
import { PageHero } from "@/components/sections/page-hero";
import { Container } from "@/components/shared/container";
import { ContentsRail, jumpToSection } from "@/components/shared/contents-rail";
import { DirectionalLink } from "@/components/shared/directional-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

type LegalNamespace = "privacy" | "terms";

type LegalPageLayoutProps = {
  namespace: LegalNamespace;
  formattedDate: string;
  accentClass?: string;
  /** Section numbers and titles, in page order — they build the contents rail. */
  contents: Array<{ number: number; title: string }>;
  /** Plain-language facts set above the clauses, each pointing at its clause. */
  summary?: ReactNode;
  children: ReactNode;
};

function legalSectionId(number: number) {
  return `section-${number}`;
}

/**
 * A legal page is a document someone reads to find one clause, not a
 * marketing page read top to bottom. So: a short hero, a contents rail that
 * holds still beside the text, headings sized for scanning rather than for
 * display, and a measure that stays inside a readable line length.
 */
export function LegalPageLayout({
  namespace,
  formattedDate,
  accentClass = "accent-world-blue",
  contents,
  summary,
  children,
}: LegalPageLayoutProps) {
  const t = useTranslations(namespace);

  return (
    // overflow-x-clip, not -hidden: a hidden ancestor would silently stop
    // the contents rail from sticking.
    <div className="relative min-h-screen w-full overflow-x-clip bg-background">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("title")}
        description={t("hero.description")}
        minHeightClass="min-h-[56vh]"
        className={accentClass}
      >
        <p className="text-sm leading-normal text-muted-foreground">
          {t("lastUpdated")}{" "}
          <span className="text-foreground">{formattedDate}</span>
        </p>
      </PageHero>

      <section
        className={cn(
          accentClass,
          "border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)",
        )}
      >
        <Container>
          <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-20 xl:grid-cols-[17rem_minmax(0,1fr)]">
            <ContentsRail
              title={t("contents")}
              items={contents.map(({ number, title }) => ({
                id: legalSectionId(number),
                label: stripSectionPrefix(title),
              }))}
            />
            <div className="min-w-0 max-w-[46rem]">
              {summary}
              {children}
            </div>
          </div>
        </Container>
      </section>

      {/* A legal page closes on who to ask, not on a sales pitch. */}
      <LegalContactRow />
    </div>
  );
}

/**
 * Set on the same grid as the clauses, so the question sits under the text it
 * is about rather than as a banner across the page.
 */
function LegalContactRow() {
  const t = useTranslations("common.legalContact");
  const tContact = useTranslations("contact");
  const tNav = useTranslations("nav");
  const email = tContact("emailValue");

  return (
    <section
      aria-labelledby="legal-contact-label"
      className="border-t border-border-subtle"
    >
      <Container className="grid gap-10 py-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-20 lg:py-16 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="min-w-0 max-w-[46rem] lg:col-start-2">
          <h2
            id="legal-contact-label"
            className="text-[clamp(1.25rem,1.8vw,1.5rem)] font-normal leading-tight tracking-[-0.015em] text-foreground rtl:tracking-normal"
          >
            {t("label")}
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {t("body")}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
            <a
              href={`mailto:${email}`}
              dir="ltr"
              className="inline-flex min-h-6 items-center rounded-ctl-sm text-base text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
            >
              {email}
            </a>
            <DirectionalLink
              href="/contact"
              className="inline-flex min-h-6 items-center text-base text-muted-foreground underline-offset-4 hover:text-foreground hover:underline pointer-coarse:min-h-11"
            >
              {tNav("contact")}
            </DirectionalLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

function stripSectionPrefix(title: string) {
  return title.replace(/^[\d٠-٩]+\.\s*/, "").trim();
}

export function LegalSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  const locale = useLocale();
  const id = legalSectionId(number);

  return (
    <article
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-28 border-t border-border-subtle py-10 outline-none first:border-t-0 first:pt-0 md:py-12"
    >
      <p
        aria-hidden
        className="mb-3 text-sm tabular-nums text-local-accent-text ltr:font-mono"
      >
        {localizeNumbers(String(number).padStart(2, "0"), locale)}
      </p>
      <h2
        id={`${id}-title`}
        className="mb-5 text-[clamp(1.5rem,2.2vw,2rem)] font-normal leading-tight tracking-[-0.015em] text-foreground"
      >
        {stripSectionPrefix(title)}
      </h2>
      {children}
    </article>
  );
}

export function LegalContactSection({
  number,
  title,
  description,
  email,
}: {
  number: number;
  title: string;
  description: string;
  email: string;
}) {
  const tContact = useTranslations("contact");

  return (
    <LegalSection number={number} title={title}>
      <LegalProse content={description} />
      <div className="mt-8 border-t border-border-subtle pt-6">
        <Eyebrow className="mb-2">{tContact("email")}</Eyebrow>
        <a
          dir="ltr"
          href={`mailto:${email}`}
          className="inline-flex min-h-11 items-center text-[clamp(1.25rem,2vw,1.625rem)] text-foreground underline decoration-border decoration-1 underline-offset-[6px] transition-colors hover:text-local-accent-text hover:decoration-local-accent-text"
        >
          {email}
        </a>
      </div>
    </LegalSection>
  );
}

type LegalSummaryItem = { section: number; text: string };

/**
 * "In short": the policy's load-bearing facts in plain sentences, each one a
 * restatement of a clause below and linked to it. It adds no term the clauses
 * do not already carry — the note under it says the numbered sections are
 * the policy — so it can be read by someone who will never read the rest,
 * without becoming a second, looser version of the agreement.
 */
export function LegalSummary({
  eyebrow,
  items,
  note,
  sectionLabel,
}: {
  eyebrow: string;
  items: LegalSummaryItem[];
  note: string;
  sectionLabel: (number: number) => string;
}) {
  return (
    <section
      aria-labelledby="legal-summary-title"
      className="mb-14 border-t-2 border-foreground pt-5 md:mb-16"
    >
      <h2 id="legal-summary-title" className="eyebrow m-0 font-normal text-foreground">
        {eyebrow}
      </h2>
      <ul className="mt-4 grid sm:grid-cols-2 sm:gap-x-10">
        {items.map((item) => {
          const id = legalSectionId(item.section);
          return (
            <li
              key={item.text}
              className="flex flex-col gap-2 border-b border-border-subtle py-5"
            >
              <p className="text-[1.0625rem] leading-snug text-foreground">
                {item.text}
              </p>
              <a
                href={`#${id}`}
                onClick={(event) => jumpToSection(event, id)}
                className="inline-flex min-h-6 w-fit items-center text-sm text-local-accent-text underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current pointer-coarse:min-h-11"
              >
                {sectionLabel(item.section)}
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
        {note}
      </p>
    </section>
  );
}
