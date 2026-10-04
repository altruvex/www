import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toneText, type Tone } from "@/lib/status";

export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
  href,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  href?: string;
  trend?: { value: number; label?: string };
  className?: string;
}) {
  const body = (
    <>
      <p className="telemetry text-subtle-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 font-sans text-[length:var(--text-metric)] font-medium leading-[1.08] tracking-[-0.02em] tabular-nums",
          "text-balance [overflow-wrap:anywhere]",
          toneText[tone],
        )}
      >
        {value}
      </p>
      <div className="mt-2 flex min-h-4 items-center gap-2">
        {sub && <span className="truncate text-meta text-muted-foreground">{sub}</span>}
        {trend != null && (
          <span
            className={cn(
              "font-mono text-micro tabular-nums",
              trend.value > 0 ? "text-success" : trend.value < 0 ? "text-danger" : "text-subtle-foreground",
            )}
          >
            {trend.value > 0 ? "▲" : trend.value < 0 ? "▼" : "—"}{" "}
            {Math.abs(trend.value)}% {trend.label}
          </span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "plane block p-3.5 no-underline transition-colors duration-[var(--dur-state)] hover:border-border-mid hover:bg-surface/50",
          "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
          className,
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={cn("plane p-3.5", className)}>{body}</div>;
}
