"use client";

import { PageHero } from "@/components/sections/page-hero";
import { Container } from "@/components/shared/container";
import { ContentsRail, jumpToSection } from "@/components/shared/contents-rail";
import { DirectionalLink } from "@/components/shared/directional-link";
import { formatIndex } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

type LegalNamespace = "privacy" | "terms";

type LegalPageLayoutProps = {
  namespace: LegalNamespace;
  formattedDate: string;
  accentClass?: string;
  contents: Array<{ number: number; title: string }>;
  summary?: ReactNode;
  children: ReactNode;
};

function legalSectionId(number: number) {
  return `section-${number}`;
}

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
    <div className="relative min-h-screen w-full overflow-x-clip bg-background">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("title")}
        description={t("hero.description")}
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

      <LegalContactRow />
    </div>
  );
}

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
      <Container className="grid gap-10 pt-(--section-y-top) pb-(--section-y-bottom) lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-20 xl:grid-cols-[17rem_minmax(0,1fr)]">
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
        {formatIndex(number, 2, locale)}
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

type LegalSummaryItem = { section: number; text: string };

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
      className="mb-(--section-block) border-t-2 border-foreground pt-5"
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
