"use client";

import { SegmentedControl } from "@/components/base/segmented-control";
import { Eyebrow } from "@/components/ui/eyebrow";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import {
  BUILD_PHASE,
  phaseName,
  type PhaseLength,
} from "@/lib/process-phases";
import { usePhaseLength, useProcessPhases } from "@/lib/use-process-phases";
import { MAX_DELIVERY_WEEKS } from "@repo/pricing-schema";
import { useState } from "react";

type Scope = "min" | "max";

const workingDays = (phase: PhaseLength, scope: Scope) => phase[scope];

/**
 * CLAIM: scope changes how long a phase runs - never which phases run, their
 * order, or the sign-off between them.
 * PROOF: comparison - the same engagement at its smallest and largest scope.
 * DEVICE: one elastic strip. Five segments on a working-day scale with the
 * sign-offs as fixed gates between them; switching scope stretches the
 * phases while the gates slide but never reorder or vanish. The two ends are
 * the price matrix's delivery window, so the strip never promises a length a
 * price cell does not.
 *
 * Signature: the stretch itself, a CSS flex-grow transition on the visitor's
 * hand. Reduced motion swaps instantly. The markup ships the largest scope,
 * so without JavaScript the page states the long case, not the flattering one.
 */
export function PhaseStrip() {
  const t = useTranslations("process");
  const locale = useLocale();
  const length = usePhaseLength();
  const phases = useProcessPhases();
  const [scope, setScope] = useState<Scope>("max");

  const total = phases.reduce((sum, phase) => sum + workingDays(phase, scope), 0);

  return (
    <figure
      aria-labelledby="phase-strip-label"
      className="mt-(--section-y-bottom) border-t-2 border-foreground pt-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <figcaption>
          <Eyebrow id="phase-strip-label" className="m-0" tone="foreground">
            {t("page.strip.label")}
          </Eyebrow>
        </figcaption>
        <SegmentedControl
          label={t("page.strip.scope.label")}
          value={scope}
          onChange={setScope}
          options={[
            { value: "min", label: t("page.strip.scope.min") },
            { value: "max", label: t("page.strip.scope.max") },
          ]}
        />
      </div>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-2">
        <p aria-live="polite" className="text-foreground">
          <span className="block text-sm text-muted-foreground">
            {t("page.strip.totalLabel")}
          </span>
          <span className="mt-1 block text-[clamp(2.5rem,5vw,4.25rem)] leading-none font-light tracking-[-0.03em] tabular-nums">
            {t.rich("page.strip.total", {
              count: total,
              n: () => <>{localizeNumbers(String(total), locale)}</>,
            })}
          </span>
        </p>
        <p aria-hidden className="flex items-center gap-5 pb-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-5 rounded-full bg-local-accent" />
            {phaseName(t(`phases.${BUILD_PHASE}.title`))}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-5 rounded-full bg-foreground/20" />
            {t("page.strip.legend.other")}
          </span>
        </p>
      </div>

      <div aria-hidden className="mt-8">
        {/* Indices need the room md+ gives the one-day discovery segment. */}
        <div className="hidden md:flex">
          {phases.map((phase, index) => (
            <Grow key={phase.key} days={workingDays(phase, scope)} gate={index > 0}>
              <span className="block ps-1 pb-2 font-mono text-xs text-muted-foreground tabular-nums">
                {localizeNumbers(String(index + 1).padStart(2, "0"), locale)}
              </span>
            </Grow>
          ))}
        </div>
        <div className="flex h-4">
          {phases.map((phase, index) => (
            <Grow key={phase.key} days={workingDays(phase, scope)} gate={index > 0} drawGate>
              <span
                className={cn(
                  "block h-full rounded-full",
                  phase.key === BUILD_PHASE ? "bg-local-accent" : "bg-foreground/20",
                )}
              />
            </Grow>
          ))}
        </div>
      </div>

      <ol className="mt-10 grid gap-x-8 gap-y-6 border-t border-border-subtle pt-8 sm:grid-cols-2 lg:grid-cols-5">
        {phases.map((phase, index) => (
          <li key={phase.key} className="grid grid-cols-[2.25rem_minmax(0,1fr)] lg:block">
            <span className="font-mono text-xs text-local-accent-text tabular-nums lg:block">
              {localizeNumbers(String(index + 1).padStart(2, "0"), locale)}
            </span>
            <span className="lg:mt-2 lg:block">
              <span className="block text-lg leading-snug text-foreground">
                {phaseName(t(`phases.${phase.key}.title`))}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground tabular-nums">
                {length(phase)}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-10 max-w-[56ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
        {t("page.strip.note", {
          ceiling: localizeNumbers(String(MAX_DELIVERY_WEEKS), locale),
        })}
      </p>
    </figure>
  );
}

/**
 * One segment's share of the strip. The index row and the bar use the same
 * grow values, so an index always sits over its own segment. `gate` reserves
 * the sign-off gap before every phase but the first; `drawGate` draws it as a bead.
 */
function Grow({
  days,
  gate,
  drawGate = false,
  children,
}: {
  days: number;
  gate: boolean;
  drawGate?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      {gate && (
        <span className="relative w-2 shrink-0">
          {drawGate && (
            <span className="absolute start-1/2 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-background ltr:-translate-x-1/2 rtl:translate-x-1/2" />
          )}
        </span>
      )}
      <span
        className="min-w-0 basis-0 transition-[flex-grow] duration-(--motion-base) ease-smooth motion-reduce:transition-none"
        style={{ flexGrow: days }}
      >
        {children}
      </span>
    </>
  );
}
