"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Info, RefreshCw } from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@/lib/utils";

export function ErrorState({
  what,
  impact,
  recovery,
  detail,
  onRetry,
  className,
}: {
  what: string;
  impact: string;
  recovery?: React.ReactNode;
  detail?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("plane border-danger/30 bg-danger/[0.04] p-4", className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <h3 className="text-md font-semibold text-danger">{what}</h3>
          <p className="mt-1 text-base text-muted-foreground">{impact}</p>
          {recovery && <div className="mt-3 flex flex-wrap items-center gap-2">{recovery}</div>}
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              <RefreshCw className="size-3.5" />
              Try again
            </Button>
          )}
          {detail && (
            <details className="mt-3">
              <summary className="telemetry cursor-pointer text-subtle-foreground hover:text-foreground">
                Technical detail
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-surface p-2 font-mono text-micro text-muted-foreground">
                {detail}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

type AlertBarNext =
  | { href: string; cta: string; action?: never }
  | { action: React.ReactNode; href?: never; cta?: never }
  | { action?: undefined; href?: never; cta?: never };

export function AlertBar({
  tone = "warning",
  children,
  ...next
}: {
  tone?: "warning" | "danger" | "info";
  children: React.ReactNode;
} & AlertBarNext) {
  const tones = {
    warning: "border-warning/30 bg-warning/[0.07] text-warning",
    danger: "border-danger/30 bg-danger/[0.06] text-danger",
    info: "border-info/30 bg-info/[0.06] text-info",
  };
  const Icon = tone === "info" ? Info : AlertTriangle;
  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-x-3 gap-y-2 rounded-md border px-3 py-2 text-base",
        tones[tone],
      )}
      role="status"
    >
      <Icon className="mt-0.5 size-3.5 shrink-0 self-start" aria-hidden />
      <span className="min-w-[min(14rem,100%)] flex-1 text-foreground">{children}</span>
      {next.action ?? (next.href ? <AlertAction href={next.href} label={next.cta} /> : null)}
    </div>
  );
}

function AlertAction({ href, label }: { href: string; label: string }) {
  const className = cn(
    "ms-auto inline-flex shrink-0 items-center gap-1 rounded-xs text-meta font-medium text-foreground",
    "transition-colors duration-[var(--dur-state)] hover:text-brand hover:underline",
    "underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
  );

  if (/^https?:/.test(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={className}>
        {label}
        <ExternalLink className="size-3" aria-hidden />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
      <span aria-hidden>&rarr;</span>
    </Link>
  );
}
