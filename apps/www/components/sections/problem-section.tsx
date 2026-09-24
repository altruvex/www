"use client";

import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import {
  MOTION,
  resolveTrigger,
  splitWords,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
  useStrikeRead,
  whenMotionReady,
} from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { localizeNumbers } from "@/lib/utils/number";
import { useLocale, useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { SectionHeading } from "./section-heading";

interface ProblemItem {
  readonly number: string;
  readonly pitch: string;
  readonly delivery: string;
  readonly evidence: string;
  /** Seconds the delivery takes to "paint": the row replays its own claim. */
  readonly wait?: number;
}

/**
 * The ledger's two columns. One grid for the header and every row, so the
 * promise and the delivery always line up across — the subtitle asks the
 * reader to "read each line across", and the layout is what makes that true.
 */
const LEDGER_COLUMNS =
  "md:grid-cols-[4.5rem_minmax(0,5fr)_minmax(0,7fr)] md:gap-x-10 lg:gap-x-16";
const LEDGER_GRID = `grid grid-cols-1 gap-y-5 ${LEDGER_COLUMNS}`;

/**
 * The strike is a background, not a pseudo-element: `box-decoration-break:
 * clone` gives every wrapped line its own copy, so a two-line promise is
 * struck on both lines, and `--strike` (the width) is what useStrikeRead
 * scrubs. It rests at 100% — struck is the reduced-motion state.
 */
const STRIKE =
  "[--strike:100%] bg-[linear-gradient(var(--local-accent),var(--local-accent))] bg-no-repeat [background-size:var(--strike)_0.075em] [background-position:0_54%] rtl:[background-position:100%_56%] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";

const DELIVERY_TYPE =
  "text-[clamp(1.75rem,3.4vw,3.25rem)] font-medium leading-[1.05] tracking-[-0.035em] rtl:leading-[1.3] rtl:tracking-normal";

/**
 * "Seven seconds to first paint", replayed at its real length. A one-shot
 * demonstration in the maintenance-sweep mould: it waits for MOTION.trigger
 * `inView`, runs once, and the clock is linear because it is the clock —
 * real time, not choreography. The markup rests painted (bar full, final
 * time, delivery visible), which is the reduced-motion state. The delivery
 * is hidden by opacity only while loading, so a screen reader never loses it.
 */
function FirstPaint({ delivery, seconds }: { delivery: string; seconds: number }) {
  const t = useTranslations("problem");
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);

  const format = useRef<(n: number) => string>(() => "");
  useEffect(() => {
    format.current = (n: number) =>
      t("demoSeconds", { n: localizeNumbers(n.toFixed(1), locale) });
  }, [t, locale]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const bar = root.querySelector<HTMLElement>("[data-paint-bar]");
    const timer = root.querySelector<HTMLElement>("[data-paint-timer]");
    const skeleton = root.querySelector<HTMLElement>("[data-paint-skeleton]");
    const painted = root.querySelector<HTMLElement>("[data-paint]");
    if (!bar || !timer || !skeleton || !painted) return;

    let ctx: gsap.Context | null = null;
    const off = whenMotionReady(() => {
      ctx = gsap.context(() => {
        gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
          const clock = { s: 0 };
          const tick = () => {
            timer.textContent = format.current(clock.s);
          };
          gsap.set(bar, { scaleX: 0 });
          gsap.set(skeleton, { autoAlpha: 1 });
          gsap.set(painted, { opacity: 0 });
          tick();

          ScrollTrigger.create({
            trigger: root,
            start: resolveTrigger("inView"),
            once: true,
            onEnter: () => {
              gsap
                .timeline()
                .to(clock, { s: seconds, duration: seconds, ease: "none", onUpdate: tick }, 0)
                .to(bar, { scaleX: 1, duration: seconds, ease: "none" }, 0)
                .to(skeleton, { autoAlpha: 0, duration: MOTION.duration.instant, ease: MOTION.ease.fadeOut })
                .fromTo(
                  painted,
                  { opacity: 0, y: MOTION.distance.xs },
                  { opacity: 1, y: 0, duration: MOTION.duration.fast, ease: MOTION.ease.strong },
                  "<",
                );
            },
          });

          return () => {
            timer.textContent = format.current(seconds);
          };
        });
      }, root);
    });

    return () => {
      off();
      ctx?.revert();
    };
  }, [seconds]);

  return (
    <div ref={rootRef}>
      <div aria-hidden="true" className="mb-5 flex items-center gap-4 md:mb-7">
        <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div
            data-paint-bar
            className="h-full w-full origin-left bg-local-accent rtl:origin-right"
          />
        </div>
        <p className="m-0 shrink-0 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
          {t("demoLabel")}{" "}
          <span data-paint-timer className="normal-case text-local-accent-text">
            {t("demoSeconds", { n: localizeNumbers(seconds.toFixed(1), locale) })}
          </span>
        </p>
      </div>
      {/* Skeleton and delivery share one cell, so painting shifts nothing. */}
      <div className="grid *:col-start-1 *:row-start-1">
        <div
          data-paint-skeleton
          aria-hidden="true"
          className={`${DELIVERY_TYPE} invisible flex flex-col gap-[0.25em] py-[0.05em]`}
        >
          <span className="block h-[0.8em] w-[85%] animate-pulse rounded-md bg-foreground/6" />
          <span className="block h-[0.8em] w-[55%] animate-pulse rounded-md bg-foreground/6" />
        </div>
        <h3 data-paint className={`${DELIVERY_TYPE} m-0 max-w-[22ch] text-foreground`}>
          {delivery}
        </h3>
      </div>
    </div>
  );
}

function LedgerRow({
  item,
  index,
  onStrike,
}: {
  item: ProblemItem;
  index: number;
  onStrike: (index: number, struck: boolean) => void;
}) {
  const t = useTranslations("problem");
  const rowRef = useStrikeRead<HTMLLIElement>({
    onStrike: (struck) => onStrike(index, struck),
  });

  return (
    <li
      ref={rowRef}
      className={`${LEDGER_GRID} border-t border-border-subtle py-10 md:py-16`}
    >
      <p
        aria-hidden="true"
        className="m-0 font-mono text-sm tabular-nums tracking-[0.12em] text-local-accent-text md:pt-2"
      >
        {item.number}
      </p>

      <div>
        <Eyebrow className="mb-3 md:sr-only">{t("trackPitch")}</Eyebrow>
        <p className="m-0 max-w-[26ch] text-[clamp(1.375rem,2.2vw,2rem)] leading-[1.25]">
          <Highlight data-strike className={STRIKE}>
            {item.pitch}
          </Highlight>
        </p>
      </div>

      <div>
        <Eyebrow tone="accent" className="mb-3 md:sr-only">
          {t("trackDelivery")}
        </Eyebrow>
        {item.wait ? (
          <FirstPaint delivery={item.delivery} seconds={item.wait} />
        ) : (
          <h3 className={`${DELIVERY_TYPE} m-0 max-w-[22ch] text-foreground`}>
            {splitWords(item.delivery).map(({ key, word }) => (
              <span key={key} data-word>
                {word}
              </span>
            ))}
          </h3>
        )}
        <p className="mt-5 mb-0 flex max-w-[48ch] items-start gap-3 text-sm leading-[1.7] text-muted-foreground md:mt-7 md:text-base">
          <span
            aria-hidden="true"
            className="mt-[0.7em] size-1 shrink-0 rounded-full bg-local-accent"
          />
          {item.evidence}
        </p>
      </div>
    </li>
  );
}

export const ProblemSection = memo(function ProblemSection() {
  const t = useTranslations("problem");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const bodyRef = useSectionDescription();
  const ledgerHeadRef = useSectionElement();
  const closingRef = useSectionElement();

  const items = t.raw("items") as ProblemItem[];

  /* One flag per row, starting struck: the markup's resting state, so a
     reader without motion sees the tally the page ends on. */
  const [struck, setStruck] = useState<readonly boolean[]>(() =>
    items.map(() => true),
  );
  const onStrike = useCallback((index: number, value: boolean) => {
    setStruck((prev) =>
      prev[index] === value ? prev : prev.map((flag, i) => (i === index ? value : flag)),
    );
  }, []);
  const kept = struck.filter((flag) => !flag).length;

  return (
    <section
      aria-labelledby="problem-section-heading"
      className="
        accent-world-orange
        border-t
        border-border-subtle
        pb-(--section-y-bottom)
        pt-(--section-y-top)
      "
    >
      <Container>
        <SectionHeading
          titleId="problem-section-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={bodyRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          description={t("subtitle")}
          className="mb-16 md:mb-24"
        />

        {/* The header rides under the nav (h-14 / lg:h-16) for as long as the
            ledger is on screen, carrying the tally. Column labels are for the
            desktop grid; mobile rows carry their own. Rows repeat the labels
            for screen readers and the closing line states the verdict, so the
            whole bar is presentation only. */}
        <div>
          <div
            ref={ledgerHeadRef}
            aria-hidden="true"
            className="sticky top-14 z-20 border-b border-border-subtle bg-background/90 py-4 backdrop-blur-md lg:top-16"
          >
            <div className={`grid grid-cols-1 items-baseline ${LEDGER_COLUMNS}`}>
              <span className="hidden md:block" />
              <Eyebrow className="m-0 hidden md:block">{t("trackPitch")}</Eyebrow>
              <div className="flex items-baseline justify-between gap-6">
                <Eyebrow tone="accent" className="m-0 hidden md:block">
                  {t("trackDelivery")}
                </Eyebrow>
                <Eyebrow
                  tone={kept === 0 ? "accent" : "muted"}
                  className="m-0 ms-auto tabular-nums transition-colors duration-(--motion-drawer)"
                >
                  {t("tally")}{" "}
                  <span className={kept === 0 ? "" : "text-foreground"}>
                    <Num value={kept} />
                  </span>
                  {" / "}
                  <Num value={items.length} />
                </Eyebrow>
              </div>
            </div>
          </div>

          <ol className="m-0 list-none p-0 [&>li:first-child]:border-t-0">
            {items.map((item, index) => (
              <LedgerRow
                key={item.number}
                item={item}
                index={index}
                onStrike={onStrike}
              />
            ))}
          </ol>
        </div>

        <div
          ref={closingRef}
          className={`${LEDGER_GRID} border-t border-border-subtle pt-12 md:pt-20`}
        >
          <span
            aria-hidden="true"
            className="hidden h-px w-10 self-start bg-local-accent md:mt-[0.6em] md:block"
          />
          <p className="m-0 max-w-[24ch] text-[clamp(1.75rem,4vw,3.5rem)] leading-[1.05] tracking-[-0.045em] text-foreground md:col-span-2 rtl:leading-[1.3] rtl:tracking-normal">
            {t("closingPre")}{" "}
            <Highlight tone="world">{t("closingHighlight")}</Highlight>
          </p>
        </div>
      </Container>
    </section>
  );
});
