"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * §38 — a failure state states four things, in this order:
 *   what happened · what it means for the business · how to recover ·
 *   the technical detail, collapsed.
 * "Something went wrong" alone is not an error state.
 */
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

/** A one-line inline warning used inside panels and page headers. */
export function AlertBar({
  tone = "warning",
  children,
  action,
}: {
  tone?: "warning" | "danger" | "info";
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const tones = {
    warning: "border-warning/30 bg-warning/[0.07] text-warning",
    danger: "border-danger/30 bg-danger/[0.06] text-danger",
    info: "border-info/30 bg-info/[0.06] text-info",
  };
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border px-3 py-2 text-base",
        tones[tone],
      )}
      role="status"
    >
      <AlertTriangle className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 text-foreground">{children}</span>
      {action}
    </div>
  );
}
