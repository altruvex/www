import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * §37 — an empty state explains the section, says why it is empty, and offers
 * the action that would fill it. "No data found." is banned in this codebase.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("plane flex flex-col items-center px-6 py-12 text-center", className)}>
      {Icon && (
        <div className="mb-3 flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-subtle-foreground">
          <Icon className="size-4" />
        </div>
      )}
      <h3 className="text-md font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-md text-base text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** The inline version, for an empty tab inside a detail page. */
export function EmptyInline({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 px-3 py-6 text-base text-muted-foreground">
      <p className="max-w-prose">{children}</p>
      {action}
    </div>
  );
}
