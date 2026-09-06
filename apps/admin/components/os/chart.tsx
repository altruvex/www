import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Chart primitives — built to the `dataviz` skill's procedure, not to taste.
 *
 * Form first: everything on the analytics page is either a MAGNITUDE COMPARISON
 * (horizontal bars, sorted, direct-labelled) or a CHANGE OVER TIME (columns on
 * one axis). No pies, no dual axes, no donut with a number in the middle.
 *
 * Colour last, and only from the validated categorical order (--chart-1..6 in
 * globals.css). Status tones stay reserved for state and are never a series.
 * Every mark is direct-labelled, so identity never rests on colour alone.
 */
export const SERIES = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-chart-6",
] as const;

export interface BarDatum {
  id: string;
  label: string;
  value: number;
  /** Formatted for display — never derive this from `value` in the component. */
  display: string;
  /** Fixed series index. Omit for a single-series chart (all bars series 1). */
  seriesIndex?: number;
}

/**
 * Horizontal bars. Chosen over columns whenever the category labels are words:
 * a rotated x-axis label is a layout failure, not a style.
 */
export function BarChart({
  data,
  labelWidth = "9rem",
  max,
  className,
}: {
  data: BarDatum[];
  labelWidth?: string;
  max?: number;
  className?: string;
}) {
  const peak = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("space-y-1", className)}>
      {data.map((datum) => (
        <div key={datum.id} className="flex items-center gap-2">
          <span
            className="shrink-0 truncate text-base text-muted-foreground"
            style={{ width: labelWidth }}
            title={datum.label}
          >
            {datum.label}
          </span>
          <span className="h-2 min-w-0 flex-1 rounded-full bg-surface-2">
            <span
              className={cn(
                "block h-full rounded-full",
                SERIES[(datum.seriesIndex ?? 0) % SERIES.length],
              )}
              style={{
                // A zero draws nothing. A minimum-width bar for an empty value
                // is a lie the eye reads before it reads the label.
                width: datum.value === 0 ? 0 : `${Math.max(1.5, (datum.value / peak) * 100)}%`,
              }}
              title={`${datum.label}: ${datum.display}`}
            />
          </span>
          <span className="w-20 shrink-0 text-end font-mono text-meta tabular-nums">
            {datum.display}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Change over time. ONE measure per chart — the dual-axis chart is the single
 * most common charting mistake and it is banned here. A second measure gets its
 * own ColumnChart underneath, sharing the x labels.
 */
export function ColumnChart({
  data,
  height = 96,
  seriesIndex = 0,
  className,
}: {
  data: { id: string; label: string; value: number; display: string }[];
  height?: number;
  seriesIndex?: number;
  className?: string;
}) {
  const peak = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={className}>
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {data.map((datum) => (
          <div
            key={datum.id}
            className="group flex min-w-0 flex-1 flex-col justify-end"
            title={`${datum.label}: ${datum.display}`}
          >
            <span
              className={cn(
                "w-full rounded-t-[4px] transition-opacity duration-[var(--dur-state)] group-hover:opacity-80",
                SERIES[seriesIndex % SERIES.length],
              )}
              style={{
                height: `${Math.max(2, (datum.value / peak) * 100)}%`,
                minHeight: datum.value > 0 ? 3 : 1,
                opacity: datum.value > 0 ? 1 : 0.25,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px] border-t border-border pt-1.5">
        {data.map((datum) => (
          <span
            key={datum.id}
            className="min-w-0 flex-1 truncate text-center font-mono text-micro text-subtle-foreground"
          >
            {datum.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Legend. Required whenever more than one series is on the same chart. */
export function Legend({ items }: { items: { label: string; seriesIndex: number }[] }) {
  if (items.length < 2) return null;
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-meta text-muted-foreground">
          <span
            className={cn("size-2 rounded-xs", SERIES[item.seriesIndex % SERIES.length])}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * The hero number. `choosing-a-form.md`: when the data is ONE value, the right
 * chart is not a chart.
 */
export function HeroNumber({
  value,
  label,
  detail,
}: {
  value: string;
  label: string;
  detail?: string;
}) {
  return (
    <div>
      <p className="telemetry text-subtle-foreground">{label}</p>
      <p className="mt-1.5 font-sans text-[length:var(--text-metric)] font-medium leading-none tracking-[-0.02em] tabular-nums">
        {value}
      </p>
      {detail && <p className="mt-1.5 text-meta text-muted-foreground">{detail}</p>}
    </div>
  );
}
