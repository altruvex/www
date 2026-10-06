import * as React from "react";
import { cn } from "@/lib/utils";

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
  display: string;
  seriesIndex?: number;
}

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
                "w-full rounded-t-ctl-xs transition-opacity duration-[var(--dur-state)] group-hover:opacity-80",
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
      <div className="mt-1.5 flex gap-[2px] border-t border-border-subtle pt-1.5">
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
