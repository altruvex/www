import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * §30 — every page answers the same five questions in the same place:
 *   What is this?        → title + breadcrumb
 *   What state is it in? → status slot, immediately after the title
 *   What changed?        → meta line
 *   What needs me?       → alert slot (only rendered when something does)
 *   What can I do?       → actions, always end-aligned, primary action last
 */
export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  crumbs,
  status,
  meta,
  description,
  actions,
  alert,
  tabs,
  className,
}: {
  title: React.ReactNode;
  crumbs?: Crumb[];
  status?: React.ReactNode;
  meta?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  alert?: React.ReactNode;
  tabs?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-3", className)}>
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 text-meta text-muted-foreground">
            {crumbs.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3 text-subtle-foreground" aria-hidden />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="rounded-xs transition-colors duration-[var(--dur-state)] hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate">{title}</h1>
            {status}
          </div>
          {description && (
            <p className="mt-1 max-w-prose text-base text-muted-foreground">{description}</p>
          )}
          {meta && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-subtle-foreground">
              {meta}
            </div>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {alert}
      {tabs}
    </header>
  );
}

/** A single labelled fact on the header meta line. */
export function MetaItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="telemetry text-subtle-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </span>
  );
}
