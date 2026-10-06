import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@/lib/utils";

const nf = new Intl.NumberFormat("en");

export function Pager({
  page,
  pageSize,
  total,
  hrefFor,
  pageSizes,
  pageSizeHref,
  noun,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
  pageSizes?: number[];
  pageSizeHref?: (size: number) => string;
  noun?: string;
  className?: string;
}) {
  if (total <= 0) return null;

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  const hasPrev = current > 1;
  const hasNext = current < pages;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-2", className)}
    >
      <p className="font-mono text-micro tabular-nums text-muted-foreground" aria-live="polite">
        {nf.format(from)}–{nf.format(to)} of {nf.format(total)}
        {noun ? ` ${noun}` : ""}
      </p>

      <div className="flex items-center gap-2">
        {pageSizes && pageSizeHref && pageSizes.length > 1 && (
          <div className="flex items-center gap-1" role="group" aria-label="Rows per page">
            <span className="telemetry me-1 hidden text-subtle-foreground sm:inline">Per page</span>
            {pageSizes.map((size) => (
              <Link
                key={size}
                href={pageSizeHref(size)}
                aria-current={size === pageSize ? "true" : undefined}
                className={cn(
                  "inline-flex h-[var(--control-h-sm)] min-w-8 items-center justify-center rounded-ctl-sm px-1.5 font-mono text-micro tabular-nums",
                  "transition-colors duration-[var(--dur-state)] outline-none focus-visible:outline-2 focus-visible:outline-brand",
                  size === pageSize
                    ? "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {size}
              </Link>
            ))}
          </div>
        )}

        <PagerStep
          href={hasPrev ? hrefFor(current - 1) : undefined}
          label="Previous page"
          direction="prev"
        />
        <span className="font-mono text-micro tabular-nums text-subtle-foreground">
          {current}/{pages}
        </span>
        <PagerStep
          href={hasNext ? hrefFor(current + 1) : undefined}
          label="Next page"
          direction="next"
        />
      </div>
    </nav>
  );
}

export function CursorPager({
  prevHref,
  nextHref,
  summary,
  prevLabel = "Newer",
  nextLabel = "Older",
  className,
}: {
  prevHref?: string | null;
  nextHref?: string | null;
  summary?: React.ReactNode;
  prevLabel?: string;
  nextLabel?: string;
  className?: string;
}) {
  if (!prevHref && !nextHref) return null;
  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-2", className)}
    >
      <p className="font-mono text-micro tabular-nums text-muted-foreground">{summary}</p>
      <div className="flex items-center gap-2">
        <PagerStep
          href={prevHref ?? undefined}
          label={`${prevLabel} page`}
          text={prevLabel}
          direction="prev"
        />
        <PagerStep
          href={nextHref ?? undefined}
          label={`${nextLabel} page`}
          text={nextLabel}
          direction="next"
        />
      </div>
    </nav>
  );
}

function PagerStep({
  href,
  label,
  direction,
  text,
}: {
  href?: string;
  label: string;
  direction: "prev" | "next";
  text?: string;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const icon = <Icon className="size-3.5 rtl:-scale-x-100" aria-hidden />;
  text ??= direction === "prev" ? "Prev" : "Next";

  if (!href) {
    return (
      <Button variant="outline" size="sm" disabled aria-label={label}>
        {direction === "prev" && icon}
        <span className="hidden sm:inline">{text}</span>
        {direction === "next" && icon}
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href} aria-label={label} rel={direction}>
        {direction === "prev" && icon}
        <span className="hidden sm:inline">{text}</span>
        {direction === "next" && icon}
      </Link>
    </Button>
  );
}
