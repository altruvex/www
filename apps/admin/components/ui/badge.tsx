import * as React from "react";
import { cn } from "@/lib/utils";
import { statusOf, toneClasses, toneDot, type RegistryName, type Tone } from "@/lib/status";

/**
 * StatusPill — the ONE way a state is rendered anywhere in this app.
 *
 * Two visual weights on purpose:
 *   variant="pill"  a bordered tint. Use in headers, detail pages, filters.
 *   variant="dot"   a 6px dot + label. Use inside table rows, where twenty
 *                   tinted pills stacked vertically become a rash.
 */
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
        "inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-meta font-medium",
        toneClasses[def.tone],
        className,
      )}
      title={title ?? def.hint}
    >
      {def.label}
    </span>
  );
}

/** Free-form tag, no semantic tone. For labels the operator typed. */
export function Tag({
  children,
  className,
  onRemove,
}: {
  children: React.ReactNode;
  className?: string;
  onRemove?: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-1.5 py-0.5 text-meta text-muted-foreground",
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="-me-0.5 rounded-xs px-0.5 text-subtle-foreground hover:text-danger"
          aria-label="Remove tag"
        >
          ×
        </button>
      )}
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
        "inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-meta font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Numeric count badge for sidebar items and tabs. */
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
