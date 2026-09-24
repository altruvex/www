"use client";

import { SectionEndCta } from "@/components/sections/section-end-cta";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import { bodyMarks } from "@/components/ui/rich-text";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { CHECK_COUNT, PassLineSheet, STANDARDS } from "./pass-line";

export default function StandardsPage() {
  return (
    <div className="accent-world-green relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <OpeningSection />
      <ErrorBoundary>
        <StandardsSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <GateSection />
      </ErrorBoundary>
      <StandardsEndCta />
    </div>
  );
}

const BODY = "text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75]";

/** The failing check the gate section uses as its example. */
const EXAMPLE_FAILURE = { standard: "performance", check: "lcp" } as const;

/**
 * The statement, then the page's own contents: four standards, each with the
 * number of checks it carries, counted from the data rather than written in.
 */
function OpeningSection() {
  const t = useTranslations("standards.hero");
  const tCat = useTranslations("standards.categories");
  const locale = useLocale();
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const contentsRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-contents-item]",
  });

  return (
    <section
      aria-labelledby="standards-hero-heading"
      className="pt-(--section-y-top) pb-12 lg:pb-16"
    >
      <Container>
        <SectionHeading
          titleAs="h1"
          titleId="standards-hero-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          description={t("description")}
          classes={{
            titleWrapper: "space-y-6",
            title:
              "max-w-[20ch] text-[clamp(2.5rem,5.2vw,4.75rem)] font-light leading-[1.04] tracking-[-0.03em]",
            description:
              "max-w-[40ch] text-[clamp(1rem,1.1vw,1.125rem)] md:max-w-[40ch] lg:max-w-[22rem]",
          }}
        />

        <nav
          aria-labelledby="standards-contents-label"
          className="mt-(--section-y-bottom) border-t border-border-subtle pt-6"
        >
          <p
            id="standards-contents-label"
            className="text-[0.9375rem] leading-relaxed text-muted-foreground"
          >
            {t("contents.summary", {
              standards: localizeNumbers(String(STANDARDS.length), locale),
              standardsCount: STANDARDS.length,
              checks: localizeNumbers(String(CHECK_COUNT), locale),
              checksCount: CHECK_COUNT,
            })}
          </p>
          <ol
            ref={contentsRef}
            className="mt-8 grid gap-px sm:grid-cols-2 lg:grid-cols-4"
          >
            {STANDARDS.map((standard, index) => (
              <li key={standard.id} data-contents-item>
                <a
                  href={`#standard-${standard.id}`}
                  className="group flex h-full flex-col gap-3 border-t border-border-subtle py-5 transition-colors duration-(--motion-drawer) hover:border-local-accent focus-visible:rounded-ctl-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:pe-6"
                >
                  <span className="font-mono text-xs text-local-accent-text tabular-nums">
                    <Num value={index + 1} pad={2} />
                  </span>
                  <span className="text-xl leading-snug text-foreground md:text-2xl md:font-light md:tracking-[-0.015em]">
                    {tCat(`${standard.id}.title`)}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {t("contents.checks", {
                      n: localizeNumbers(String(standard.checks.length), locale),
                      count: standard.checks.length,
                    })}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </Container>
    </section>
  );
}

/**
 * Each standard as a chapter: the argument and what it is built with on one
 * side, the lines it is held to on the other. The sheet carries the page's
 * signature; the text around it enters quietly.
 */
function StandardsSection() {
  const t = useTranslations("standards");
  const sectionRef = useSectionCardGrid<HTMLElement>({
    selector: "[data-standard-text]",
  });

  return (
    <section ref={sectionRef} aria-label={t("sheet.sectionLabel")}>
      <Container>
        {STANDARDS.map((standard, index) => (
          <article
            key={standard.id}
            id={`standard-${standard.id}`}
            aria-labelledby={`standard-${standard.id}-title`}
            className="grid scroll-mt-28 gap-12 border-t border-border-subtle py-(--section-y-top) lg:grid-cols-12 lg:gap-12"
          >
            <div data-standard-text className="lg:col-span-5">
              <span className="eyebrow text-local-accent-text tabular-nums">
                <Num value={index + 1} pad={2} />
              </span>
              <h2
                id={`standard-${standard.id}-title`}
                className="mt-4 max-w-[18ch] text-[clamp(1.875rem,3.4vw,2.75rem)] leading-[1.08] font-light tracking-[-0.02em] text-foreground"
              >
                {t(`categories.${standard.id}.title`)}
              </h2>
              <p className={cn(BODY, "mt-6 max-w-[52ch] text-muted-foreground")}>
                {t.rich(`categories.${standard.id}.description`, bodyMarks)}
              </p>

              <div className="mt-10">
                <Eyebrow className="m-0">{t("sheet.builtWith")}</Eyebrow>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {t(`categories.${standard.id}.requirements`)
                    .split(" | ")
                    .map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-border-subtle bg-surface px-3 py-1 text-sm text-foreground"
                      >
                        {item}
                      </li>
                    ))}
                </ul>
              </div>
            </div>

            <div className="lg:col-span-6 lg:col-start-7 lg:pt-10">
              <PassLineSheet standard={standard} />
            </div>
          </article>
        ))}
      </Container>
    </section>
  );
}

/**
 * CLAIM: a deploy that misses one line does not ship.
 * PROOF: every check on the page as one mark in a run, twice - all passing,
 * then the same run with one mark missed. The run is derived from the data,
 * so the count cannot drift from the sheets above. Quiet on purpose: the
 * sheets carry the page's drawn moment.
 */
function GateSection() {
  const t = useTranslations("standards.enforcement");
  const tCat = useTranslations("standards.categories");
  const locale = useLocale();
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const runsRef = useSectionElement<HTMLDListElement>();
  const n = localizeNumbers(String(CHECK_COUNT), locale);

  const failingLabel = tCat(
    `${EXAMPLE_FAILURE.standard}.checks.${EXAMPLE_FAILURE.check}.label`,
  );

  return (
    <section
      aria-labelledby="standards-gate-heading"
      className="border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container className="grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <SectionHeading
            titleId="standards-gate-heading"
            eyebrowRef={eyebrowRef}
            titleRef={titleRef}
            eyebrow={t("eyebrow")}
            firstTitle={t("title")}
            secondTitle={t("titleItalic")}
            classes={{ title: "max-w-[16ch]" }}
          />
          <p
            ref={descRef}
            className={cn(BODY, "mt-8 max-w-[52ch] text-muted-foreground")}
          >
            {t.rich("description", bodyMarks)}
          </p>
        </div>

        <dl ref={runsRef} className="lg:col-span-6 lg:col-start-7 lg:pt-10">
          <Eyebrow className="m-0 border-t-2 border-foreground pt-4 pb-2" tone="foreground">
            {t("label")}
          </Eyebrow>
          <Run
            state={t("outcomes.pass.state", { n, count: CHECK_COUNT })}
            result={t("outcomes.pass.result")}
          />
          <Run
            state={t("outcomes.fail.state")}
            result={t("outcomes.fail.result")}
            failing={EXAMPLE_FAILURE}
            note={t("outcomes.fail.example", { check: failingLabel })}
          />
        </dl>
      </Container>
    </section>
  );
}

function Run({
  state,
  result,
  failing,
  note,
}: {
  state: string;
  result: string;
  failing?: { standard: string; check: string };
  note?: string;
}) {
  return (
    <div className="grid gap-5 border-b border-border-subtle py-7">
      <div aria-hidden className="flex flex-wrap gap-x-4 gap-y-3">
        {STANDARDS.map((standard) => (
          <span key={standard.id} className="flex gap-1.5">
            {standard.checks.map((check) => {
              const missed =
                failing?.standard === standard.id && failing.check === check.id;
              return (
                <span
                  key={check.id}
                  className={cn(
                    "block h-7 w-2 rounded-full",
                    missed
                      ? "border-2 border-foreground bg-transparent"
                      : failing
                        ? "bg-foreground/25"
                        : "bg-local-accent",
                  )}
                />
              );
            })}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <dt className="text-lg leading-snug text-foreground md:text-xl">{state}</dt>
        <dd
          className={cn(
            "text-lg font-medium md:text-xl",
            failing ? "text-foreground" : "text-local-accent-text",
          )}
        >
          {result}
        </dd>
      </div>
      {note && (
        <p className="-mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}

/** The page publishes benchmarks, so the close offers to measure a visitor's own site against them. */
function StandardsEndCta() {
  const t = useTranslations("common.endCta.pages.standards");

  return (
    <SectionEndCta
      title={t("title")}
      titleAccent={t("titleAccent")}
      body={t("body")}
      primary="technicalAudit"
      secondary="realBuild"
    />
  );
}
