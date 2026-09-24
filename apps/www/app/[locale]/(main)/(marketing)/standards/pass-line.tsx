"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import { MOTION } from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

/**
 * Every benchmark the page publishes, written once. The pass text a visitor
 * reads and the scale it is drawn on both render from these numbers, so the
 * copy and the drawing cannot disagree - the old page said "Lighthouse 90+"
 * in its hero and "95+" three screens further down.
 */
type Unit = "score" | "seconds" | "percent" | "ratio" | "plain";

type ScaleCheck = {
  id: string;
  kind: "scale";
  min: number;
  max: number;
  threshold: number;
  /** Which side of the threshold passes, and whether the threshold itself does. */
  pass: "atLeast" | "over" | "under";
  unit: Unit;
};

type Check =
  | ScaleCheck
  | { id: string; kind: "zero" }
  | { id: string; kind: "grade"; grades: readonly string[]; passFrom: string }
  | { id: string; kind: "rule" };

type Standard = { id: string; checks: readonly Check[] };

export const STANDARDS: readonly Standard[] = [
  {
    id: "code",
    checks: [
      { id: "lint", kind: "zero" },
      { id: "coverage", kind: "scale", min: 0, max: 100, threshold: 80, pass: "over", unit: "percent" },
      { id: "apiDocs", kind: "rule" },
    ],
  },
  {
    id: "performance",
    checks: [
      { id: "lighthouse", kind: "scale", min: 0, max: 100, threshold: 95, pass: "atLeast", unit: "score" },
      { id: "lcp", kind: "scale", min: 0, max: 4, threshold: 2.5, pass: "under", unit: "seconds" },
      { id: "cls", kind: "scale", min: 0, max: 0.25, threshold: 0.1, pass: "under", unit: "plain" },
    ],
  },
  {
    id: "accessibility",
    checks: [
      { id: "lighthouse", kind: "scale", min: 0, max: 100, threshold: 95, pass: "atLeast", unit: "score" },
      { id: "aria", kind: "zero" },
      // WCAG contrast runs from 1:1 to 21:1; AA body text needs 4.5:1.
      { id: "contrast", kind: "scale", min: 1, max: 21, threshold: 4.5, pass: "atLeast", unit: "ratio" },
    ],
  },
  {
    id: "security",
    checks: [
      // securityheaders.com's grade ladder, worst to best.
      { id: "headers", kind: "grade", grades: ["F", "E", "D", "C", "B", "A", "A+"], passFrom: "A" },
      { id: "cves", kind: "zero" },
      { id: "patches", kind: "rule" },
    ],
  },
];

export const CHECK_COUNT = STANDARDS.reduce((sum, s) => sum + s.checks.length, 0);

/** Position of a value along its scale, in percent. */
const percentOf = (check: ScaleCheck, value: number) =>
  ((value - check.min) / (check.max - check.min)) * 100;

function useUnitFormat() {
  const t = useTranslations("standards.sheet.unit");
  const locale = useLocale();

  return (value: number, unit: Unit) => {
    const text =
      unit === "seconds" || unit === "percent" || unit === "ratio"
        ? t(unit, { value: String(value) })
        : String(value);
    return localizeNumbers(text, locale);
  };
}

function ScaleTrack({ check }: { check: ScaleCheck }) {
  const format = useUnitFormat();
  const threshold = percentOf(check, check.threshold);
  const passesUp = check.pass !== "under";

  return (
    <div aria-hidden className="mt-5">
      <div className="relative h-4">
        <span className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-foreground/10" />
        {/* The clip is static so the pill keeps its radius; only the fill is drawn. */}
        <span
          className="absolute top-1/2 h-2 -translate-y-1/2 overflow-clip rounded-full"
          style={
            passesUp
              ? { insetInlineStart: `${threshold}%`, insetInlineEnd: 0 }
              : { insetInlineStart: 0, width: `${threshold}%` }
          }
        >
          <span
            data-pass-band
            className={cn(
              "block size-full bg-local-accent",
              // The band grows out of the threshold, so its origin is the
              // threshold's side of the band - mirrored in RTL.
              passesUp ? "origin-left rtl:origin-right" : "origin-right rtl:origin-left",
            )}
          />
        </span>
        {/* The threshold is a bead on the thread, like a sign-off - a point, not a cut. */}
        <span
          data-pass-mark
          className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-foreground ring-4 ring-background ltr:-translate-x-1/2 rtl:translate-x-1/2"
          style={{ insetInlineStart: `${threshold}%` }}
        />
      </div>
      <div className="relative mt-2 h-4 font-mono text-xs text-muted-foreground tabular-nums">
        <span className="absolute start-0">{format(check.min, check.unit)}</span>
        <span className="absolute end-0">{format(check.max, check.unit)}</span>
      </div>
    </div>
  );
}

function GradeTrack({ grades, passFrom }: { grades: readonly string[]; passFrom: string }) {
  const firstPass = grades.indexOf(passFrom);

  return (
    <ol aria-hidden className="mt-5 grid gap-1" style={{ gridTemplateColumns: `repeat(${grades.length}, minmax(0, 1fr))` }}>
      {grades.map((grade, index) => {
        const passes = index >= firstPass;
        return (
          <li
            key={grade}
            data-pass-grade={passes || undefined}
            className={cn(
              "flex h-8 items-center justify-center rounded-full font-mono text-xs tabular-nums",
              passes
                ? "bg-local-accent/10 font-medium text-foreground ring-1 ring-local-accent/50 ring-inset"
                : "bg-foreground/[0.04] text-muted-foreground",
            )}
          >
            {grade}
          </li>
        );
      })}
    </ol>
  );
}

/** Label and pass text for one check. */
function useCheckText(standard: string, check: Check): { label: string; passText: string } {
  const t = useTranslations("standards.sheet.pass");
  const tCheck = useTranslations(`standards.categories.${standard}.checks.${check.id}`);
  const format = useUnitFormat();

  const passText = (() => {
    switch (check.kind) {
      case "scale":
        return t(check.pass, { value: format(check.threshold, check.unit) });
      case "zero":
        return t("zero");
      case "grade":
        return t("grade", { value: check.passFrom });
      case "rule":
        return tCheck("value");
    }
  })();

  return { label: tCheck("label"), passText };
}

function CheckRow({ standard, check }: { standard: string; check: Check }) {
  const { label, passText } = useCheckText(standard, check);

  return (
    <li className="border-b border-border-subtle py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-base leading-snug text-foreground md:text-[1.0625rem]">
          {label}
        </h3>
        <p className="text-base font-medium whitespace-nowrap text-local-accent-text tabular-nums md:text-[1.0625rem]">
          {passText}
        </p>
      </div>
      {check.kind === "scale" && <ScaleTrack check={check} />}
      {check.kind === "grade" && <GradeTrack grades={check.grades} passFrom={check.passFrom} />}
    </li>
  );
}

/**
 * CLAIM: each standard is a number with a line, not an adjective.
 * PROOF: quantity against a target - a bullet-chart grid with no bar, because
 * nothing here is a measurement: what is published is where the line sits.
 * DEVICE: a pass-line sheet. Every benchmark on its own true scale, the pass
 * side filled, the threshold a hard mark; counts that must be zero and the
 * grade ladder keep their own shapes instead of being forced onto a slider.
 *
 * Signature: when the sheet reaches the reading line, each threshold mark
 * drops in and the pass band grows out of it towards the side that passes.
 * The markup is the finished sheet; reduced motion renders it untouched.
 */
export function PassLineSheet({ standard }: { standard: Standard }) {
  const t = useTranslations("standards.sheet");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const marks = list.querySelectorAll("[data-pass-mark]");
        const bands = list.querySelectorAll("[data-pass-band]");
        const grades = list.querySelectorAll("[data-pass-grade]");

        gsap.set(marks, { scale: 0 });
        gsap.set(bands, { scaleX: 0 });
        gsap.set(grades, { opacity: 0 });

        const timeline = gsap
          .timeline({ paused: true })
          .to(marks, {
            scale: 1,
            duration: MOTION.duration.fast,
            ease: MOTION.ease.strong,
            stagger: MOTION.stagger.base,
          })
          .to(
            bands,
            {
              scaleX: 1,
              duration: MOTION.duration.slow,
              ease: MOTION.ease.gentle,
              stagger: MOTION.stagger.base,
            },
            "-=0.2",
          )
          .to(
            grades,
            {
              opacity: 1,
              duration: MOTION.duration.fast,
              ease: MOTION.ease.smooth,
              stagger: MOTION.stagger.base,
            },
            "<",
          );

        const trigger = ScrollTrigger.create({
          trigger: list,
          start: MOTION.trigger.inView,
          once: true,
          onEnter: () => timeline.play(),
        });

        return () => {
          trigger.kill();
          timeline.kill();
        };
      });
    }, list);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={listRef}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t-2 border-foreground pt-4 pb-2">
        <Eyebrow className="m-0" tone="foreground">
          {t("passLine")}
        </Eyebrow>
        <p aria-hidden className="flex items-center gap-5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-5 rounded-full bg-local-accent" />
            {t("legend.pass")}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-5 rounded-full bg-foreground/10" />
            {t("legend.fail")}
          </span>
        </p>
      </div>
      <ul>
        {standard.checks.map((check) => (
          <CheckRow key={check.id} standard={standard.id} check={check} />
        ))}
      </ul>
    </div>
  );
}
