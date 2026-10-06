import * as React from "react";
import { cn } from "@/lib/utils";
import { statusOf, toneClasses, toneDot, type RegistryName, type Tone } from "@/lib/status";

export function StatusPill({
  registry,
  value,
  variant = "pill",
  className,
  title,
}: {
  registry: RegistryName;
  value?: string | null;
  variant?: "pill" | "dot";
  className?: string;
  title?: string;
}) {
  const def = statusOf(registry, value);

  if (variant === "dot") {
    return (
      <span
        className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}
        title={title ?? def.hint}
      >
        <span className={cn("size-1.5 shrink-0 rounded-full", toneDot[def.tone])} aria-hidden />
        <span className="text-foreground">{def.label}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-ctl-xs border px-1.5 py-0.5 text-meta font-medium",
        toneClasses[def.tone],
        className,
      )}
      title={title ?? def.hint}
    >
      {def.label}
    </span>
  );
}

export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-ctl-xs border px-1.5 py-0.5 text-meta font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CountBadge({
  count,
  tone = "neutral",
  className,
}: {
  count: number;
  tone?: Tone;
  className?: string;
}) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "ms-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-micro font-medium tabular-nums",
        tone === "neutral"
          ? "bg-surface-2 text-muted-foreground"
          : toneClasses[tone],
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
