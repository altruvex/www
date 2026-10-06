"use client";

import { ArrowIcon } from "@repo/ui";
import { Eyebrow } from "@repo/ui/www";
import { Num } from "@/components/ui/num";
import { useSectionCardGrid } from "@/lib/motion";
import { PHASE_KEYS, type PhaseKey } from "@/lib/process-phases";
import { usePhaseLength, useProcessPhases } from "@/lib/use-process-phases";
import { useFillPricingTokens } from "@/components/providers/pricing-tokens-provider";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { ServiceSection } from "./service-section";

/*
 * The service-page brief: who a service is for, how an engagement runs and
 * what it leaves behind. Three sections, one idiom each, all copied from the
 * consulting ledger and the maintenance month split so every service page
 * reads the same way. Copy lives under `serviceDetails.<service>.brief.*`.
 */

const PART_TITLE =
  "mt-3 text-[clamp(1.5rem,2.4vw,2rem)] font-light leading-tight tracking-[-0.02em] text-foreground rtl:leading-[1.4] rtl:tracking-normal";

const LIST_ROW =
  "flex items-start gap-3 border-b border-border-subtle py-3 first:pt-0 last:border-b-0 last:pb-0 text-base leading-normal";

type FitPart = { label: string; heading: string; items: string[] };

type BriefSectionProps = {
  namespace: string;
  id: string;
};

/*
 * Descriptions and notes may carry pricing tokens ({deliveryWeeksMin}), which
 * ICU formatting would reject, so they are read raw and filled from the live
 * pricing context like the list items below.
 */
function sectionCopy(
  t: ReturnType<typeof useTranslations>,
  key: string,
  fill: (text: string) => string,
) {
  const optional = (field: string) =>
    t.has(`${key}.${field}`) ? fill(t.raw(`${key}.${field}`) as string) : undefined;
  return {
    eyebrow: t(`${key}.eyebrow`),
    title: t(`${key}.title`),
    titleAccent: t(`${key}.titleAccent`),
    description: optional("description"),
    note: optional("note"),
  };
}

export function ServiceFit({
  namespace,
  id,
  italicWorld,
}: BriefSectionProps & { italicWorld?: boolean }) {
  const t = useTranslations(namespace);
  const fill = useFillPricingTokens();
  const copy = sectionCopy(t, "fit", fill);
  const splitRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-fit-part]" });
  const parts = [
    { key: "for", part: t.raw("fit.for") as FitPart, accent: true },
    { key: "notFor", part: t.raw("fit.notFor") as FitPart, accent: false },
  ];

  return (
    <ServiceSection id={id} titleId={`${id}-heading`} italicWorld={italicWorld} {...copy}>
      <div ref={splitRef} className="grid border-t border-border-subtle lg:grid-cols-2">
        {parts.map(({ key, part, accent }) => (
          <div
            key={key}
            data-fit-part
            className={cn(
              "pt-8",
              accent
                ? "lg:pe-[clamp(2rem,4vw,4rem)]"
                : "mt-12 lg:mt-0 lg:border-s lg:border-border-subtle lg:ps-[clamp(2rem,4vw,4rem)]",
            )}
          >
            <Eyebrow tone={accent ? "accent" : "muted"} className="m-0">
              {part.label}
            </Eyebrow>
            <h3 className={PART_TITLE}>{part.heading}</h3>
            <ul className="mt-7 list-none">
              {part.items.map((item) => (
                <li key={item} className={cn(LIST_ROW, "text-foreground")}>
                  <ArrowIcon
                    motion="none"
                    className={cn(
                      "mt-[0.35em] size-4 shrink-0",
                      accent ? "text-local-accent-text" : "text-muted-foreground",
                    )}
                  />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ServiceSection>
  );
}

type Step = { name: string; what: string; yours: string; phase?: PhaseKey };

export function ServiceSteps({ namespace, id }: BriefSectionProps) {
  const t = useTranslations(namespace);
  const fill = useFillPricingTokens();
  const copy = sectionCopy(t, "steps", fill);
  const phases = useProcessPhases();
  const phaseLength = usePhaseLength();
  const listRef = useSectionCardGrid<HTMLOListElement>({ selector: "[data-step-row]" });
  const steps = t.raw("steps.items") as Step[];

  return (
    <ServiceSection id={id} titleId={`${id}-heading`} {...copy}>
      <ol ref={listRef} className="list-none border-t border-border-subtle">
        {steps.map((step, index) => {
          const phase =
            step.phase && PHASE_KEYS.includes(step.phase)
              ? phases.find((item) => item.key === step.phase)
              : undefined;

          return (
            <li
              key={step.name}
              data-step-row
              className="grid gap-2 border-b border-border-subtle py-6 sm:grid-cols-[minmax(7.5rem,11rem)_minmax(0,1fr)] sm:items-baseline sm:gap-8"
            >
              <div>
                <span className="block text-base text-local-accent-text">
                  <span className="text-muted-foreground tabular-nums">
                    <Num value={index + 1} pad={2} />
                  </span>
                  {" — "}
                  {step.name}
                </span>
                {phase ? (
                  <span className="mt-1 block text-sm text-muted-foreground tabular-nums">
                    {phaseLength(phase)}
                  </span>
                ) : null}
              </div>
              <div>
                <p className="max-w-[60ch] text-body leading-normal text-foreground">
                  {fill(step.what)}
                </p>
                <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {t("steps.yourPartLabel")}:
                  </span>{" "}
                  {fill(step.yours)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </ServiceSection>
  );
}

type Term = { label: string; title: string; points: string[] };

export function ServiceTerms({
  namespace,
  id,
  section = "terms",
}: BriefSectionProps & { section?: string }) {
  const t = useTranslations(namespace);
  const fill = useFillPricingTokens();
  const copy = sectionCopy(t, section, fill);
  const ledgerRef = useSectionCardGrid<HTMLOListElement>({ selector: "[data-term-row]" });
  const terms = t.raw(`${section}.items`) as Term[];

  return (
    <ServiceSection id={id} titleId={`${id}-heading`} {...copy}>
      <ol ref={ledgerRef} className="list-none border-t border-border-subtle">
        {terms.map((term) => (
          <li
            key={term.label}
            data-term-row
            className="grid gap-x-10 gap-y-6 border-b border-border-subtle py-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:py-10"
          >
            <div>
              <Eyebrow tone="accent" className="m-0">
                {term.label}
              </Eyebrow>
              <h3 className={PART_TITLE}>{term.title}</h3>
            </div>

            <ul className="list-none lg:mt-1.5">
              {term.points.map((point) => (
                <li key={point} className={cn(LIST_ROW, "text-foreground")}>
                  <ArrowIcon
                    motion="none"
                    className="mt-[0.35em] size-4 shrink-0 text-local-accent-text"
                  />
                  <span className="min-w-0">{fill(point)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </ServiceSection>
  );
}
