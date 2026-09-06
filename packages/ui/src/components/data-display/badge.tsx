import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "progress";

export const toneClasses: Record<Tone, string> = {
  neutral: "border-neutral/20 bg-neutral/8 text-neutral",
  info: "border-info/20 bg-info/8 text-info",
  success: "border-success/20 bg-success/8 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/8 text-danger",
  progress: "border-progress/20 bg-progress/8 text-progress",
};

export const toneDot: Record<Tone, string> = {
  neutral: "bg-neutral",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  progress: "bg-progress",
};

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-meta font-medium",
  {
    variants: {
      tone: toneClasses,
      variant: {
        soft: "",
        glass: "liquid-glass-flat",
        outline: "bg-transparent",
      },
    },
    defaultVariants: {
      tone: "neutral",
      variant: "soft",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-tone={tone ?? "neutral"}
      className={cn(badgeVariants({ tone, variant, className }))}
      {...props}
    />
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
          ? "bg-surface text-muted-foreground"
          : toneClasses[tone],
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
