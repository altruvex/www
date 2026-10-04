"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toneClasses, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

export interface ListRowProps {
  icon?: React.ReactNode;
  tone?: Tone;
  title: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  actions?: React.ReactNode;
  href?: string;
  inspect?: string;
  expandable?: React.ReactNode;
  defaultExpanded?: boolean;
  selected?: boolean;
  dense?: boolean;
  className?: string;
}

const rowFocus =
  "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand";

export function ListRow({
  icon,
  tone = "neutral",
  title,
  meta,
  trailing,
  actions,
  href,
  inspect,
  expandable,
  defaultExpanded = false,
  selected = false,
  dense = false,
  className,
}: ListRowProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const panelId = React.useId();
  const target = inspect ?? href;
  const kind: "link" | "expand" | "static" = target ? "link" : expandable ? "expand" : "static";
  const interactive = kind !== "static";

  const body = (
    <>
      {icon && (
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md border [&_svg]:size-3.5",
            toneClasses[tone],
          )}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <span
        className={cn(
          "min-w-0 flex-1",
          dense && "flex min-w-0 items-baseline gap-2",
        )}
      >
        <span className="block min-w-0 truncate text-base font-medium text-foreground">
          {title}
        </span>
        {meta && (
          <span
            className={cn(
              "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-meta text-muted-foreground",
              dense ? "flex-nowrap truncate" : "mt-0.5",
            )}
          >
            {meta}
          </span>
        )}
      </span>
      {trailing && (
        <span className="flex shrink-0 items-center gap-2 text-meta text-muted-foreground">
          {trailing}
        </span>
      )}
      {kind === "link" && (
        <ChevronRight
          className="size-3.5 shrink-0 text-subtle-foreground transition-colors duration-[var(--dur-state)] group-hover:text-foreground rtl:-scale-x-100"
          aria-hidden
        />
      )}
      {kind === "expand" && (
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-subtle-foreground transition-transform duration-[var(--dur-state)] group-hover:text-foreground",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      )}
    </>
  );

  const rowClass = cn(
    "group flex w-full min-w-0 items-center gap-3 px-3 text-start",
    dense ? "min-h-[var(--row-h)] py-1.5" : "min-h-[var(--row-h)] py-2",
    interactive && "transition-colors duration-[var(--dur-state)] hover:bg-surface/70",
    interactive && rowFocus,
  );

  let row: React.ReactNode;
  if (kind === "link") {
    row = (
      <Link
        href={target!}
        scroll={inspect ? false : undefined}
        aria-haspopup={inspect ? "dialog" : undefined}
        aria-current={selected ? "true" : undefined}
        className={cn(rowClass, "no-underline")}
      >
        {body}
      </Link>
    );
  } else if (kind === "expand") {
    row = (
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
        className={rowClass}
      >
        {body}
      </button>
    );
  } else {
    row = <div className={rowClass}>{body}</div>;
  }

  return (
    <li
      className={cn(
        "relative min-w-0",
        selected &&
          "bg-surface before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-brand",
        className,
      )}
    >
      <div className="flex min-w-0 items-center">
        <div className="min-w-0 flex-1">{row}</div>
        {actions && <div className="flex shrink-0 items-center gap-1 pe-2">{actions}</div>}
      </div>
      {kind === "expand" && (
        <div
          id={panelId}
          hidden={!expanded}
          className={cn(
            "border-t border-border bg-surface/40 py-2.5 pe-3 text-base",
            icon ? "ps-[calc(0.75rem+1.75rem+0.75rem)]" : "ps-3",
          )}
        >
          {expanded && expandable}
        </div>
      )}
    </li>
  );
}

export function List({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <ul aria-label={label} className={cn("min-w-0 divide-y divide-border", className)}>
      {children}
    </ul>
  );
}
