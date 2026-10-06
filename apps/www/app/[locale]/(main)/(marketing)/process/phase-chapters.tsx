"use client";

import { PhaseGate, phaseIndex } from "@/components/shared/process-parts";
import { Eyebrow } from "@repo/ui/www";
import { scrollToY, splitWords, useSectionCardGrid, useWordRead } from "@/lib/motion";
import { phaseName, type PhaseLength } from "@/lib/process-phases";
import { usePhaseLength, useProcessPhases } from "@/lib/use-process-phases";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type MouseEvent } from "react";

function goToChapter(event: MouseEvent<HTMLAnchorElement>, key: string) {
  const target = document.getElementById(`phase-${key}`);
  if (!target) return;
  event.preventDefault();
  scrollToY(target.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(target).scrollMarginTop));
  history.replaceState(null, "", `#phase-${key}`);
}

export function PhaseChapters() {
  const t = useTranslations("process");
  const locale = useLocale();
  const length = usePhaseLength();
  const phases = useProcessPhases();
  const indexRef = useSectionCardGrid<HTMLOListElement>({ selector: "[data-index-row]" });
  const chaptersRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(-1);

  useEffect(() => {
    const root = chaptersRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(Number((entry.target as HTMLElement).dataset.chapter));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    root.querySelectorAll("[data-chapter]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <nav aria-label={t("page.register.eyebrow")} className="mt-(--heading-gap)">
        <ol ref={indexRef} className="border-t border-border-mid">
          {phases.map((phase, i) => (
            <li key={phase.key} data-index-row className="border-b border-border-subtle">
              <a
                href={`#phase-${phase.key}`}
                onClick={(event) => goToChapter(event, phase.key)}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-4 py-4 transition-colors hover:text-local-accent-text md:grid-cols-[3rem_minmax(0,1fr)_auto] md:py-5"
              >
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {phaseIndex(i, locale)}
                </span>
                <span className="text-[clamp(1.375rem,2.2vw,1.875rem)] leading-tight font-light tracking-[-0.02em] rtl:tracking-normal">
                  {phaseName(t(`phases.${phase.key}.title`))}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">{length(phase)}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-(--section-y-bottom) lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-16">
        <ol aria-hidden className="hidden self-start lg:sticky lg:top-[40vh] lg:block">
          {phases.map((phase, i) => (
            <li
              key={phase.key}
              className={cn(
                "flex gap-3 py-1.5 text-sm transition-colors",
                i === current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "w-6 font-mono text-xs tabular-nums leading-5",
                  i === current && "text-local-accent-text",
                )}
              >
                {phaseIndex(i, locale)}
              </span>
              {phaseName(t(`phases.${phase.key}.title`))}
            </li>
          ))}
        </ol>

        <div ref={chaptersRef}>
          {phases.map((phase, i) => (
            <Chapter
              key={phase.key}
              phase={phase}
              position={i}
              next={phases[i + 1]}
              reached={i <= current}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function Chapter({
  phase,
  position,
  next,
  reached,
}: {
  phase: PhaseLength;
  position: number;
  next: PhaseLength | undefined;
  reached: boolean;
}) {
  const t = useTranslations("process");
  const locale = useLocale();
  const length = usePhaseLength();
  const readRef = useWordRead<HTMLParagraphElement>();

  return (
    <article
      id={`phase-${phase.key}`}
      data-chapter={position}
      aria-labelledby={`phase-${phase.key}-title`}
      className="grid min-h-[92svh] scroll-mt-24 content-between gap-12 border-t border-border-subtle py-10 md:py-12"
    >
      <div>
        <div className="flex justify-between gap-4 text-sm tabular-nums">
          <span className="font-mono text-xs text-local-accent-text">{phaseIndex(position, locale)}</span>
          <span className="text-muted-foreground">{length(phase)}</span>
        </div>
        <h3
          id={`phase-${phase.key}-title`}
          className="mt-6 text-[clamp(3.25rem,10vw,9.5rem)] leading-[0.92] font-light tracking-[-0.05em] text-foreground rtl:leading-[1.25] rtl:tracking-normal"
        >
          {phaseName(t(`phases.${phase.key}.title`))}
        </h3>
        <p
          ref={readRef}
          className="mt-8 max-w-[22ch] text-[clamp(1.5rem,3vw,2.75rem)] leading-[1.15] font-light tracking-[-0.025em] text-balance text-foreground rtl:leading-[1.45] rtl:tracking-normal"
        >
          {splitWords(t(`phases.${phase.key}.headline`)).map(({ key, word }) => (
            <span key={key} data-word>
              {word}
            </span>
          ))}
        </p>
      </div>

      <div className="grid gap-x-12 gap-y-6 md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] md:items-end">
        <p className="max-w-[38rem] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
          {t(`phases.${phase.key}.description`)}
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {(["inputs", "deliverables"] as const).map((list) => (
            <div key={list}>
              <Eyebrow className="m-0">{t(`phases.${list}`)}</Eyebrow>
              <ul className="mt-3 space-y-1.5 text-base leading-relaxed text-foreground">
                {t(`phases.${phase.key}.${list}`)
                  .split(" | ")
                  .map((item) => (
                    <li key={item}>{item}</li>
                  ))}
              </ul>
            </div>
          ))}
        </div>

        <PhaseGate phase={phase} next={next} reached={reached} className="md:col-span-2" />
      </div>
    </article>
  );
}
