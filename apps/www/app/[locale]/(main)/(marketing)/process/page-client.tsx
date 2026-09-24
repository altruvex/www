"use client";

import { SectionEndCta } from "@/components/sections/section-end-cta";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import { getCommercialCta } from "@/lib/config/commercial";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { phaseName } from "@/lib/process-phases";
import { usePhaseLength, useProcessPhases } from "@/lib/use-process-phases";
import { PhaseStrip } from "./phase-strip";

export default function ProcessPage() {
  return (
    <div className="accent-world-green relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <OpeningSection />
      <ErrorBoundary>
        <PhasesSection />
      </ErrorBoundary>
      <ClosingSection />
    </div>
  );
}

const BODY = "text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75]";

/** The statement, then the engagement drawn once at both ends of its scope. */
function OpeningSection() {
  const t = useTranslations("process.hero");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();

  return (
    <section
      aria-labelledby="process-hero-heading"
      className="pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleAs="h1"
          titleId="process-hero-heading"
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
        <PhaseStrip />
      </Container>
    </section>
  );
}

/**
 * CLAIM: no phase starts until you have done your part in the one before.
 * Each phase is a row; what closes it is not a hairline but the gate - your
 * role, and the phase it releases. Quiet on purpose: the strip above is the
 * page's moving part.
 */
function PhasesSection() {
  const t = useTranslations("process");
  const locale = useLocale();
  const length = usePhaseLength();
  const phases = useProcessPhases();
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const listRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-phase]",
  });

  return (
    <section
      aria-labelledby="process-phases-heading"
      className="border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="process-phases-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          eyebrow={t("page.register.eyebrow")}
          firstTitle={t("page.register.title")}
          secondTitle={t("page.register.titleItalic")}
          classes={{ title: "max-w-[20ch]" }}
        />

        <ol ref={listRef} className="mt-14 border-t-2 border-foreground lg:mt-20">
          {phases.map((phase, index) => {
            const next = phases[index + 1];
            const role = t(`phases.${phase.key}.yourRole`);
            return (
              <li
                key={phase.key}
                data-phase
                className="grid gap-x-12 gap-y-6 pt-10 pb-12 md:pt-12 md:pb-16 lg:grid-cols-12"
              >
                <div className="lg:col-span-3">
                  <span className="font-mono text-xs text-local-accent-text tabular-nums">
                    {localizeNumbers(String(index + 1).padStart(2, "0"), locale)}
                  </span>
                  <h3 className="mt-3 text-[clamp(1.5rem,2.2vw,1.875rem)] leading-tight font-light tracking-[-0.015em] text-foreground">
                    {phaseName(t(`phases.${phase.key}.title`))}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground tabular-nums">
                    {length(phase)}
                  </p>
                </div>

                <p className={cn(BODY, "max-w-[46ch] text-muted-foreground lg:col-span-5")}>
                  {t(`phases.${phase.key}.description`)}
                </p>

                <div className="lg:col-span-4">
                  <Eyebrow className="m-0">{t("phases.deliverables")}</Eyebrow>
                  <ul className="mt-3 space-y-2">
                    {t(`phases.${phase.key}.deliverables`)
                      .split(" | ")
                      .map((item) => (
                        <li
                          key={item}
                          className="grid grid-cols-[1.25rem_minmax(0,1fr)] text-[0.9375rem] leading-relaxed text-foreground"
                        >
                          <span aria-hidden className="mt-[0.7em] h-px w-2.5 bg-foreground/45" />
                          {item}
                        </li>
                      ))}
                  </ul>
                </div>

                {/* The gate that closes the phase: your part, then what it releases. */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle pt-5 lg:col-span-9 lg:col-start-4 lg:mt-2">
                  <span aria-hidden className="h-0.5 w-8 bg-local-accent" />
                  <span className="eyebrow text-local-accent-text">
                    {t("phases.yourRole")} · {role}
                  </span>
                  <span className="text-[0.9375rem] text-foreground">
                    {next
                      ? t("page.register.gate.next", {
                          next: phaseName(t(`phases.${next.key}.title`)),
                        })
                      : t("page.register.gate.last")}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}

/**
 * The close names where a project enters the process: phase 01, with its own
 * length and brief read from the phase list above, so the call being offered is
 * the first step of the framework the page just described - not a generic ask.
 */
function ClosingSection() {
  const t = useTranslations("process");
  const length = usePhaseLength();
  const first = useProcessPhases()[0];

  return (
    <SectionEndCta
      title={t("flexibility.title")}
      titleAccent={t("flexibility.titleItalic")}
      body={t.rich("flexibility.description", bodyMarks)}
      primary={{
        href: getCommercialCta("technicalCall").href,
        label: t("closing.cta"),
      }}
      secondary="projectRange"
      aside={
        <div className="max-w-xl border-t border-border-subtle pt-6">
          <Eyebrow tone="accent" className="mb-4 block">
            {t("closing.startsHere")}
          </Eyebrow>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="text-[clamp(1.375rem,2.2vw,1.875rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground rtl:tracking-normal">
              {phaseName(t(`phases.${first.key}.title`))}
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {length(first)}
            </p>
          </div>
          <p className="mt-3 max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
            {t(`phases.${first.key}.description`)}
          </p>
        </div>
      }
    />
  );
}
