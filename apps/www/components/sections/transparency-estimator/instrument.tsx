"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import { MOTION, readMotionEnv, resolveEase } from "@/lib/motion";
import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap } from "@/lib/utils/gsap";
import { cn } from "@/lib/utils/utils";
import { MAX_DELIVERY_WEEKS, type EstimateResult } from "@repo/pricing-schema";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { QUESTIONS, STICKY_OFFSET, TOTAL } from "./constants";
import { useStuck } from "./hooks";
import type { Delta, MoneyFormats, Translator } from "./types";

export function PreselectedTier({
  label,
  t,
}: {
  label: string;
  t: Translator;
}) {
  return (
    <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border-subtle bg-surface px-4 py-2">
      <span className="size-2 rounded-full bg-local-accent" aria-hidden />
      <span className="eyebrow text-micro text-muted-foreground">
        {t("preselected")} / {label}
      </span>
    </div>
  );
}

function TweenedMoney({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const previous = useRef(value);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const from = previous.current;
    previous.current = value;

    if (!el.style.fontVariantNumeric)
      el.style.fontVariantNumeric = "tabular-nums";

    const env = readMotionEnv();
    if (from === value || env.reduce || env.constrained) {
      el.textContent = format(value);
      return;
    }

    const counter = { value: from };
    const tween = gsap.to(counter, {
      value,
      duration: MOTION.duration.fast,
      ease: resolveEase(MOTION.ease.strong),
      onUpdate() {
        el.textContent = format(counter.value);
      },
      onComplete() {
        el.textContent = format(value);
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, format]);

  return <span ref={ref}>{format(value)}</span>;
}

function Collapsible({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-(--motion-drawer) ease-smooth motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="overflow-hidden" inert={!open}>
        {children}
      </div>
    </div>
  );
}

function DeltaChip({
  delta,
  fmt,
  compact = false,
}: {
  delta: Delta | null;
  fmt: MoneyFormats;
  compact?: boolean;
}) {
  if (!delta) return null;

  const signed = (n: number, format: (v: number) => string) =>
    `${n > 0 ? "+" : "−"}${format(Math.abs(n))}`;

  const { minChange, maxChange } = delta;
  const movement =
    minChange === maxChange
      ? signed(maxChange, fmt.money)
      : minChange === 0
        ? signed(maxChange, fmt.money)
        : maxChange === 0
          ? signed(minChange, fmt.money)
          : `${signed(minChange, fmt.lead)} – ${signed(maxChange, fmt.trail)}`;
  const up = (maxChange || minChange) > 0;

  return (
    <span
      aria-hidden
      className="inline-flex items-center gap-2 rounded-full border border-transparent bg-local-accent-soft px-3 py-1.5 text-xs leading-none text-local-accent-text animate-in fade-in slide-in-from-bottom-1 duration-(--motion-instant)"
    >
      {up ? (
        <ArrowUp aria-hidden strokeWidth={2.5} className="size-3" />
      ) : (
        <ArrowDown aria-hidden strokeWidth={2.5} className="size-3" />
      )}
      <span
        className={cn("font-medium", compact ? "hidden sm:inline" : undefined)}
      >
        {delta.label}
      </span>
      <span
        className={cn("opacity-60", compact ? "hidden sm:inline" : undefined)}
      >
        ·
      </span>
      <span className="tabular-nums" dir="ltr">
        {movement}
      </span>
    </span>
  );
}
export function Instrument({
  shown,
  resolved,
  settled,
  answeredCount,
  delta,
  handedOff,
  fmt,
  num,
  t,
}: {
  shown: EstimateResult;
  resolved: boolean;
  settled: boolean;
  answeredCount: number;
  delta: Delta | null;
  handedOff: boolean;
  fmt: MoneyFormats;
  num: (n: string | number) => string;
  t: Translator;
}) {
  const { sentinel, stuck } = useStuck(STICKY_OFFSET);

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />
      <div
        style={{ top: STICKY_OFFSET }}
        aria-hidden={handedOff || undefined}
        className={cn(
          "sticky z-30 mt-10 overflow-hidden rounded-panel-sm border transition-[opacity,transform,box-shadow] duration-(--motion-drawer) ease-smooth motion-reduce:transition-none",
          stuck && !handedOff
            ? "liquid-glass-panel"
            : cn(
                "bg-background shadow-none",
                settled ? "border-local-accent/40" : "border-border-subtle",
              ),
          handedOff
            ? "pointer-events-none -translate-y-2 opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        {settled ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden rtl:-scale-x-100"
          >
            <span className="block h-px w-1/3 animate-edge-sweep bg-linear-to-r from-transparent via-local-accent to-transparent" />
          </span>
        ) : null}
        <div
          className={cn(
            "px-5 transition-[padding] duration-(--motion-drawer) ease-smooth motion-reduce:transition-none sm:px-8",
            stuck ? "py-3 sm:py-3.5" : "py-5 sm:py-7",
          )}
        >
          <Collapsible open={!stuck}>
            <Eyebrow
              tone={resolved ? "accent" : "muted"}
              className="pb-4 text-micro leading-none sm:pb-5"
            >
              {resolved
                ? t("instrument.yourLabel")
                : t("instrument.publishedLabel")}
            </Eyebrow>
          </Collapsible>
          <div
            className={cn(
              "flex gap-x-6",
              stuck
                ? "flex-row items-center justify-between"
                : "flex-col gap-y-3 lg:flex-row lg:items-end lg:justify-between lg:gap-x-10",
            )}
          >
            <div aria-live="polite" className="min-w-0">
              <p
                className={cn(
                  "font-medium leading-[1.1] tracking-[-0.035em] tabular-nums text-foreground transition-[font-size] duration-(--motion-drawer) ease-smooth motion-reduce:transition-none",
                  stuck
                    ? "whitespace-nowrap text-[1.0625rem] sm:text-[1.25rem]"
                    : "text-[clamp(1.5rem,3.6vw,2.75rem)]",
                )}
              >
                <TweenedMoney value={shown.minPrice} format={fmt.lead} />
                <span className="mx-1.5 text-muted-foreground">–</span>
                <TweenedMoney value={shown.maxPrice} format={fmt.trail} />
              </p>
              <p
                className={cn(
                  "tabular-nums text-muted-foreground transition-[font-size,margin] duration-(--motion-drawer) ease-smooth motion-reduce:transition-none",
                  stuck
                    ? "mt-0.5 whitespace-nowrap text-micro"
                    : "mt-1.5 text-sm sm:mt-2",
                )}
              >
                {num(shown.minWeeks)}–{num(shown.maxWeeks)} {t("results.weeks")}
                <span className={cn(stuck ? "hidden sm:inline" : undefined)}>
                  <span className="mx-2 text-muted-foreground" aria-hidden>
                    ·
                  </span>
                  {t("live.deliveryCeiling", {
                    weeks: num(MAX_DELIVERY_WEEKS),
                  })}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <DeltaChip delta={delta} fmt={fmt} compact={stuck} />
              <div
                className={cn(
                  "flex shrink-0 flex-col items-center gap-3",
                  delta ? "hidden sm:flex" : undefined,
                  stuck ? undefined : "lg:block lg:text-end",
                )}
              >
                <p
                  className={cn(
                    "eyebrow shrink-0 text-xs leading-none tabular-nums text-muted-foreground ltr:font-mono",
                    stuck ? "sr-only sm:not-sr-only" : undefined,
                  )}
                >
                  {t("live.answeredCount", {
                    n: num(String(answeredCount).padStart(2, "0")),
                    total: num(String(TOTAL).padStart(2, "0")),
                  })}
                </p>
                <div
                  aria-hidden
                  className={cn(
                    "flex items-center gap-1",
                    stuck
                      ? "w-16 sm:w-20"
                      : "flex-1 lg:mt-3 lg:w-40 lg:flex-none ltr:lg:ms-auto",
                  )}
                >
                  {QUESTIONS.map((q, i) => {
                    const isCompleted = i < answeredCount;
                    const isCurrent = i === answeredCount;
                    const isUpcoming = i > answeredCount;

                    return (
                      <span
                        key={q.key}
                        className={cn(
                          "relative h-1.5 overflow-hidden rounded-full",
                          "transition-[flex-grow,background-color,opacity,transform] duration-(--motion-fast)",
                          "ease-strong",
                          "motion-reduce:transition-none",
                          isCompleted && [
                            "flex-[0.85]",
                            "bg-local-accent",
                            "opacity-90",
                          ],
                          isCurrent && [
                            "flex-[1.8]",
                            "bg-local-accent",
                            "opacity-100",
                            "scale-y-[1.15]",
                          ],
                          isUpcoming && [
                            "flex-1",
                            "bg-border-mid",
                            "opacity-45",
                          ],
                          stuck && isCurrent && ["flex-[1.35]", "scale-y-100"],
                        )}
                      >
                        {isCurrent ? (
                          <span
                            aria-hidden
                            className={cn(
                              "absolute inset-y-0 inset-s-0 w-1/2 rounded-full",
                              "bg-foreground/20",
                              "animate-[instrumentProgress_1.8s_ease-in-out_infinite]",
                              "motion-reduce:animate-none",
                            )}
                          />
                        ) : null}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Collapsible open={!stuck}>
          <p className="border-t border-border-subtle bg-surface/60 px-5 py-2.5 text-xs leading-relaxed text-muted-foreground sm:px-8 sm:py-3">
            {settled
              ? t("live.settled")
              : resolved
                ? t("live.updatesAsYouShape")
                : t("instrument.publishedNote")}
          </p>
        </Collapsible>
      </div>
    </>
  );
}