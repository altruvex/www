"use client";

import { STANDARDS } from "@/app/[locale]/(main)/(marketing)/standards/pass-line";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Link } from "@/i18n/navigation";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * CLAIM: the page you are reading is the proof of the standard.
 * PROOF: an artifact — this page, measured by the visitor's own browser.
 * DEVICE: a live readout of real data. Nothing here is typed by us: every
 * figure comes from the Performance API after the page has loaded, and the
 * pass lines are read from `STANDARDS`, the same numbers /standards draws.
 * A slow connection produces a slow number, and the readout says so.
 */

type MetricId = "lcp" | "cls" | "ttfb";

/** `undefined` while measuring, `null` when the browser does not report it. */
type Readings = Record<MetricId, number | null | undefined>;

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

const isLayoutShift = (entry: PerformanceEntry): entry is LayoutShift =>
  entry.entryType === "layout-shift" && "value" in entry && "hadRecentInput" in entry;

function passLine(id: "lcp" | "cls") {
  for (const standard of STANDARDS) {
    for (const check of standard.checks) {
      if (check.id === id && check.kind === "scale") return check;
    }
  }
  return null;
}

const LINES = { lcp: passLine("lcp"), cls: passLine("cls") } as const;

const METRICS: readonly MetricId[] = ["lcp", "cls", "ttfb"];

function supports(type: string): boolean {
  return (
    typeof PerformanceObserver !== "undefined" &&
    PerformanceObserver.supportedEntryTypes.includes(type)
  );
}

function useReadings(): Readings {
  const [readings, setReadings] = useState<Readings>({
    lcp: undefined,
    cls: undefined,
    ttfb: undefined,
  });

  useEffect(() => {
    const set = (id: MetricId, value: number | null) =>
      setReadings((current) => (current[id] === value ? current : { ...current, [id]: value }));
    const observers: PerformanceObserver[] = [];

    const [navigation] = performance.getEntriesByType("navigation");
    set(
      "ttfb",
      navigation && navigation instanceof PerformanceNavigationTiming
        ? Math.max(0, navigation.responseStart - navigation.startTime)
        : null,
    );

    if (supports("largest-contentful-paint")) {
      const observer = new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1);
        if (last) set("lcp", last.startTime);
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(observer);
    } else {
      set("lcp", null);
    }

    if (supports("layout-shift")) {
      // The Core Web Vitals definition: shifts group into sessions (under 1 s
      // apart, 5 s at most), and CLS is the worst session — not the sum.
      let worst = 0;
      let session = 0;
      let first = 0;
      let previous = 0;
      set("cls", 0);
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!isLayoutShift(entry) || entry.hadRecentInput) continue;
          const joins = session > 0 && entry.startTime - previous < 1000 && entry.startTime - first < 5000;
          session = joins ? session + entry.value : entry.value;
          if (!joins) first = entry.startTime;
          previous = entry.startTime;
          worst = Math.max(worst, session);
        }
        set("cls", worst);
      });
      observer.observe({ type: "layout-shift", buffered: true });
      observers.push(observer);
    } else {
      set("cls", null);
    }

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return readings;
}

/** The number at display size, its unit a step down so it never wraps the cell. */
function Figure({ text }: { text: string }) {
  const [, figure, unit] = /^([\d٠-٩.,٫٬]+)\s*(.*)$/.exec(text) ?? [text, text, ""];
  return (
    <>
      {figure}
      {unit && <span className="ms-1.5 text-[0.5em] tracking-normal text-muted-foreground">{unit}</span>}
    </>
  );
}

export function HeroReadout() {
  const t = useTranslations("hero.readout");
  const tSheet = useTranslations("standards.sheet");
  const locale = useLocale();
  const readings = useReadings();
  const num = (text: string) => localizeNumbers(text, locale);

  const format = (id: MetricId, value: number): string => {
    switch (id) {
      case "lcp":
        return num(tSheet("unit.seconds", { value: (value / 1000).toFixed(2) }));
      case "cls":
        return num(value.toFixed(3));
      case "ttfb":
        return num(t("unit.ms", { value: String(Math.round(value)) }));
    }
  };

  const verdict = (id: MetricId, value: number) => {
    if (id !== "lcp" && id !== "cls") return null;
    const line = LINES[id];
    if (!line) return null;
    const measured = id === "lcp" ? value / 1000 : value;
    const threshold =
      id === "lcp"
        ? tSheet("unit.seconds", { value: String(line.threshold) })
        : String(line.threshold);
    return {
      passes: measured < line.threshold,
      line: num(tSheet("pass.under", { value: threshold })),
    };
  };

  return (
    <div role="group" aria-labelledby="hero-readout-title" className="w-full">
      <div className="flex items-baseline justify-between gap-6 border-t-2 border-foreground pt-4">
        <Eyebrow id="hero-readout-title" tone="foreground" className="text-xs">
          {t("title")}
        </Eyebrow>
        <Eyebrow className="flex shrink-0 items-center gap-2 text-xs">
          <span aria-hidden className="size-1.5 rounded-full bg-success" />
          {t("live")}
        </Eyebrow>
      </div>

      <dl className="grid sm:grid-cols-3">
        {METRICS.map((id, index) => {
          const value = readings[id];
          const resolved = typeof value === "number";
          const result = resolved ? verdict(id, value) : null;

          return (
            <div
              key={id}
              className={cn(
                "flex flex-col border-b border-border-subtle py-5 sm:border-b-0 lg:py-7",
                index > 0 && "sm:ps-8",
              )}
            >
              <dt className="eyebrow text-xs text-muted-foreground">
                {t(`metrics.${id}`)}
              </dt>
              <dd
                className={cn(
                  "mt-3 text-[clamp(1.75rem,2.8vw,2.5rem)] leading-none font-light tracking-[-0.02em] rtl:tracking-normal tabular-nums text-foreground",
                  "transition-opacity duration-(--motion-fast) ease-smooth motion-reduce:transition-none",
                  resolved ? "opacity-100" : "opacity-40",
                )}
              >
                {resolved ? <Figure text={format(id, value)} /> : "—"}
              </dd>
              <dd className="mt-3 flex items-center gap-2 text-sm leading-snug text-muted-foreground">
                {value === undefined && t("measuring")}
                {value === null && t("unsupported")}
                {resolved && result && (
                  <>
                    <span
                      aria-hidden
                      className={cn(
                        "size-2 shrink-0",
                        result.passes ? "bg-local-accent" : "border border-foreground/60",
                      )}
                    />
                    <span>
                      <span className="text-foreground">
                        {result.passes ? t("passes") : t("misses")}
                      </span>
                      {" · "}
                      {result.line}
                    </span>
                  </>
                )}
                {resolved && !result && t("noLine")}
              </dd>
            </div>
          );
        })}
      </dl>

      <noscript>
        <p className="mt-4 text-sm text-muted-foreground">{t("noScript")}</p>
      </noscript>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground lg:mt-2">
        {t("source")}{" "}
        <Link
          href="/standards"
          className="text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
        >
          {t("standardsLink")}
        </Link>
      </p>
    </div>
  );
}
