"use client";

import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import { bodyMarks } from "@/components/ui/rich-text";
import {
  MOTION,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { cn, splitHeadline } from "@/lib/utils/utils";
import { BUILD_PHASE, phaseName, type PhaseLength } from "@/lib/process-phases";
import { usePhaseLength, useProcessPhases } from "@/lib/use-process-phases";
import { useTranslations } from "next-intl";
import { memo, useMemo, useRef } from "react";
import { SectionHeading } from "./section-heading";

interface PlacedPhase extends PhaseLength {
  /** Working days at the long end of the range. */
  days: number;
  /** Working day the phase starts on, counted from zero. */
  startDay: number;
  /** Offset and width as percentages of the whole calendar. */
  start: number;
  width: number;
}

interface Calendar {
  placed: PlacedPhase[];
  total: number;
  /** Day 0, every phase boundary, and the last day. */
  boundaries: number[];
}

/**
 * Lays the phases end to end at their longest case. The lengths come from
 * `lib/process-phases.ts`, which splits the price matrix's delivery window,
 * so the ruler's last day is the longest engagement a price cell promises.
 */
function placePhases(phases: readonly PhaseLength[]): Calendar {
  const total = phases.reduce((sum, phase) => sum + phase.max, 0);
  const placed = phases.reduce<PlacedPhase[]>((list, phase) => {
    const previous = list.at(-1);
    const startDay = previous ? previous.startDay + previous.days : 0;
    list.push({
      ...phase,
      days: phase.max,
      startDay,
      start: (startDay / total) * 100,
      width: (phase.max / total) * 100,
    });
    return list;
  }, []);
  return {
    placed,
    total,
    boundaries: [0, ...placed.map((phase) => phase.startDay + phase.days)],
  };
}

const pct = (value: number): string => `${value}%`;

/**
 * The calendar for one phase, drawn to the same scale on every row: the
 * phases already behind it as a faint trace, this phase solid, and nothing
 * ahead of it. Read top to bottom, the five rows are a Gantt chart — and the
 * development bar is most of the line before a word of it has been read.
 */
function PhaseTrack({
  phase,
  index,
  calendar,
}: {
  phase: PlacedPhase;
  index: number;
  calendar: Calendar;
}) {
  const { placed, total, boundaries } = calendar;
  const isBuild = phase.key === BUILD_PHASE;

  return (
    <div aria-hidden className="relative h-6">
      {/* The calendar still ahead is a dotted thread, not a wall: the eye reads it as "not yet". */}
      <span
        style={{ insetInlineStart: pct(phase.start + phase.width) }}
        className="absolute end-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-s-border-hover"
      />
      {/* Sign-offs are beads on the thread — a handoff is a point, not a cut. */}
      {boundaries.map((day, i) => {
        const end = i === 0 || i === boundaries.length - 1;
        return (
          <span
            key={day}
            style={{ insetInlineStart: pct((day / total) * 100) }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 rounded-full bg-background ring-2 ring-s-border-hover ltr:-translate-x-1/2 rtl:translate-x-1/2",
              end ? "size-2.5" : "size-1.5",
            )}
          />
        );
      })}
      {placed.slice(0, index).map((done) => (
        <span
          key={done.key}
          style={{
            insetInlineStart: `calc(${pct(done.start)} + 2px)`,
            width: `calc(${pct(done.width)} - 4px)`,
          }}
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-s-border-hover"
        />
      ))}
      {/* The clip is static so the pill keeps its radius; only the fill is drawn. */}
      <span
        style={{
          insetInlineStart: `calc(${pct(phase.start)} + 2px)`,
          width: `calc(${pct(phase.width)} - 4px)`,
        }}
        className={cn(
          "absolute top-1/2 h-3 -translate-y-1/2 overflow-clip rounded-full",
          isBuild &&
            "shadow-[0_0_0_5px_color-mix(in_oklab,var(--local-accent)_14%,transparent)]",
        )}
      >
        <span
          data-phase-bar
          className={cn(
            "block size-full origin-left rtl:origin-right",
            isBuild ? "bg-local-accent" : "bg-s-high",
          )}
        />
      </span>
    </div>
  );
}

const PhaseRow = memo(function PhaseRow({
  phase,
  index,
  calendar,
}: {
  phase: PlacedPhase;
  index: number;
  calendar: Calendar;
}) {
  const t = useTranslations("process");
  const length = usePhaseLength();
  const rowRef = useRef<HTMLLIElement>(null);
  const isBuild = phase.key === BUILD_PHASE;
  const { total } = calendar;
  const deliverables = t(`phases.${phase.key}.deliverables`).split(" | ");

  // One moment per row, and it is the claim itself: the bar is drawn in a
  // time proportional to the days it stands for, so development takes
  // far longer to draw than the discovery session did. Linear, because a calendar
  // does not ease. The markup ships the finished bar, so reduced motion and
  // no JS read the same scale with nothing moving.
  useIsomorphicLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const bar = row.querySelector("[data-phase-bar]");
        if (!bar) return;

        gsap.fromTo(
          bar,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: MOTION.duration.drawer + (phase.days / total) * 2 * MOTION.duration.slow,
            ease: "none",
            scrollTrigger: {
              trigger: row,
              start: MOTION.trigger.inView,
              once: true,
            },
          },
        );
      });
    }, row);

    return () => ctx.revert();
  }, [phase.days, total]);

  return (
    <li
      ref={rowRef}
      className={cn(
        "grid gap-y-6 lg:grid-cols-12 lg:gap-x-8",
        isBuild ? "pb-16 lg:pb-24" : "pb-12 lg:pb-16",
      )}
    >
      <div className="lg:col-span-12">
        <PhaseTrack phase={phase} index={index} calendar={calendar} />
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 lg:col-span-3 lg:flex-col lg:gap-y-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm text-local-accent-text">
            <Num value={index + 1} pad={2} />
          </span>
          <Eyebrow className="text-s-mid">
            {phaseName(t(`phases.${phase.key}.title`))}
          </Eyebrow>
        </div>
        <p className="text-[0.9375rem] font-medium text-s-high">
          {length(phase)}
        </p>
        {isBuild ? (
          <p className="w-full text-[0.9375rem] text-local-accent-text">
            {t.rich("share", {
              pct: () => (
                <Num value={`${Math.round((phase.days / total) * 100)}%`} />
              ),
            })}
          </p>
        ) : null}
      </div>

      <div className="lg:col-span-6">
        <h3
          className={cn(
            "max-w-[22ch] font-medium text-s-high",
            isBuild
              ? "text-3xl leading-[1.1] tracking-[-0.03em] lg:text-[2.5rem]"
              : "text-2xl leading-[1.15] tracking-[-0.02em] lg:text-[1.75rem]",
          )}
        >
          {t(`phases.${phase.key}.headline`)}
        </h3>
        <p className="mt-4 max-w-[60ch] text-[0.9375rem] leading-[1.7] text-s-mid lg:text-base">
          {t(`phases.${phase.key}.description`)}
        </p>
      </div>

      <div className="lg:col-span-3">
        <Eyebrow className="text-s-mid">{t("meta.deliverables")}</Eyebrow>
        <ul className="mt-3 space-y-1.5">
          {deliverables.map((item) => (
            <li key={item} className="text-[0.9375rem] leading-snug text-s-high">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
});

/**
 * "Clear phases" argued by proportion rather than by numbering: five rows on
 * one working-day scale, so the short discovery, wireframe and design phases and
 * the long build are seen at their real sizes. The scale is stated above the
 * rows — the drawing is only honest if the reader knows what it measures.
 */
export const ProcessSection = memo(function ProcessSection() {
  const t = useTranslations("process");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const subtitleRef = useSectionDescription<HTMLParagraphElement>();
  const footerRef = useSectionElement();

  const { first, second } = splitHeadline(t("title"));
  const phases = useProcessPhases();
  const calendar = useMemo(() => placePhases(phases), [phases]);
  const { placed, total, boundaries } = calendar;

  return (
    <section
      id="process"
      aria-labelledby="process-heading"
      className="pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="process-heading"
          theme="surface"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={subtitleRef}
          eyebrow={t("eyebrow")}
          firstTitle={first}
          secondTitle={second}
          description={t.rich("subtitle", bodyMarks)}
          className="mb-14 lg:mb-20"
        />

        <div>
          <Eyebrow className="pb-4 text-s-mid">{t("scale.label")}</Eyebrow>
          <div aria-hidden className="relative mb-2 h-5">
            {boundaries.map((day, i) => {
              const last = i === boundaries.length - 1;
              return (
                <span
                  key={day}
                  style={{ insetInlineStart: pct((day / total) * 100) }}
                  className={cn(
                    "absolute top-0 font-mono text-xs whitespace-nowrap tabular-nums text-s-mid",
                    last && "ltr:-translate-x-full rtl:translate-x-full",
                    i > 0 &&
                      !last &&
                      "hidden ltr:-translate-x-1/2 rtl:translate-x-1/2 md:block",
                  )}
                >
                  {last ? (
                    t.rich("scale.days", {
                      n: () => <Num value={day} />,
                      count: day,
                    })
                  ) : (
                    <Num value={day} />
                  )}
                </span>
              );
            })}
          </div>

          <ol>
            {placed.map((phase, index) => (
              <PhaseRow key={phase.key} phase={phase} index={index} calendar={calendar} />
            ))}
          </ol>
        </div>

        <div ref={footerRef} className="mt-12 lg:mt-16">
          <p className="max-w-[52ch] text-[clamp(1.0625rem,1.5vw,1.25rem)] text-s-high">
            {t("footer")}
          </p>
        </div>
      </Container>
    </section>
  );
});

