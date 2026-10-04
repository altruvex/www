"use client";

import { BUILD_PHASE, phaseName, type PhaseLength } from "@/lib/process-phases";
import { useProcessPhases } from "@/lib/use-process-phases";
import { formatIndex, localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import type { RefObject } from "react";

type Scope = "min" | "max";

export const phaseIndex = (i: number, locale: string) =>
  formatIndex(i + 1, 2, locale);

export function ScopeBars({
  barsRef,
  className,
}: {
  barsRef?: RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const t = useTranslations("process");
  const locale = useLocale();
  const phases = useProcessPhases();

  return (
    <div ref={barsRef} className={cn("grid gap-9", className)}>
      {(["min", "max"] as const satisfies readonly Scope[]).map((scope) => {
        const total = phases.reduce((sum, phase) => sum + phase[scope], 0);
        return (
          <figure key={scope} data-scope-bar className="m-0">
            <figcaption className="mb-3 flex justify-between gap-4 text-[0.9375rem]">
              <span className="text-muted-foreground">{t(`page.scope.${scope}`)}</span>
              <span className="font-medium text-foreground tabular-nums">
                {t.rich("page.scope.total", {
                  count: total,
                  n: () => <>{localizeNumbers(String(total), locale)}</>,
                })}
              </span>
            </figcaption>
            <div aria-hidden className="flex h-3.5 gap-1.5">
              {phases.map((phase) => (
                <span
                  key={phase.key}
                  className={cn(
                    "min-w-0 basis-0 rounded-full",
                    phase.key === BUILD_PHASE ? "bg-local-accent" : "bg-foreground/20",
                  )}
                  style={{ flexGrow: phase[scope] }}
                />
              ))}
            </div>
            <div aria-hidden className="mt-2 hidden gap-1.5 md:flex">
              {phases.map((phase, i) => (
                <span
                  key={phase.key}
                  className="min-w-0 basis-0 overflow-hidden font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums"
                  style={{ flexGrow: phase[scope] }}
                >
                  {phaseIndex(i, locale)}
                </span>
              ))}
            </div>
          </figure>
        );
      })}
    </div>
  );
}

export function PhaseGate({
  phase,
  next,
  reached,
  className,
}: {
  phase: PhaseLength;
  next: PhaseLength | undefined;
  reached: boolean;
  className?: string;
}) {
  const t = useTranslations("process");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle pt-5",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-0.5 w-8 origin-left bg-local-accent transition-transform duration-(--motion-slow) ease-strong motion-reduce:scale-x-100 motion-reduce:transition-none rtl:origin-right",
          reached ? "scale-x-100" : "scale-x-0",
        )}
      />
      <span className="eyebrow text-local-accent-text">
        {t("phases.yourRole")} · {t(`phases.${phase.key}.yourRole`)}
      </span>
      <span className="text-[0.9375rem] text-foreground">
        {next
          ? t("page.register.gate.next", { next: phaseName(t(`phases.${next.key}.title`)) })
          : t("page.register.gate.last")}
      </span>
    </div>
  );
}
