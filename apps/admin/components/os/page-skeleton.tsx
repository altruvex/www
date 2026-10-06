import * as React from "react";
import { Skeleton, TableSkeleton, TilesSkeleton } from "@repo/ui";
import { cn } from "@/lib/utils";

function Loading({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-4">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function HeaderSkeleton({ actions = 2, crumbs = true }: { actions?: number; crumbs?: boolean }) {
  return (
    <div className="space-y-3" aria-hidden>
      {crumbs && <Skeleton className="h-2.5 w-28" />}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-16 rounded-ctl-xs" />
          </div>
          <Skeleton className="h-2.5 w-64 max-w-full" />
        </div>
        {actions > 0 && (
          <div className="flex items-center gap-2">
            {Array.from({ length: actions }).map((_, i) => (
              <Skeleton key={i} className="h-[var(--control-h)] w-24 rounded-full" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FiltersSkeleton({ chips = 4 }: { chips?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-hidden>
      <Skeleton className="h-[var(--control-h-sm)] w-full rounded-ctl-sm sm:w-64" />
      <div className="flex items-center gap-1.5">
        {Array.from({ length: chips }).map((_, i) => (
          <Skeleton key={i} className="h-[var(--control-h-sm)] w-16 rounded-ctl-sm" />
        ))}
      </div>
    </div>
  );
}

function RowsSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("plane divide-y divide-border-subtle overflow-hidden", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2"
          style={{ minHeight: "var(--row-h)", opacity: 1 - i * 0.08 }}
        >
          <Skeleton className="size-7 shrink-0 rounded-ctl-sm" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-3/5" />
          </div>
          <Skeleton className="h-2.5 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ListPageSkeleton({
  tiles = 0,
  filters = true,
  rows = 10,
  cols = 5,
  actions = 1,
}: {
  tiles?: number;
  filters?: boolean;
  rows?: number;
  cols?: number;
  actions?: number;
}) {
  return (
    <Loading label="Loading list">
      <HeaderSkeleton actions={actions} crumbs={false} />
      {tiles > 0 && (
        <div aria-hidden>
          <TilesSkeleton count={tiles} />
        </div>
      )}
      {filters && <FiltersSkeleton />}
      <div aria-hidden>
        <TableSkeleton rows={rows} cols={cols} />
      </div>
    </Loading>
  );
}

export function DetailPageSkeleton({
  sections = 4,
  aside = true,
}: {
  sections?: number;
  aside?: boolean;
}) {
  return (
    <Loading label="Loading record">
      <HeaderSkeleton actions={3} />
      <div
        aria-hidden
        className={cn(
          "grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-x-8",
          aside && "xl:grid-cols-[180px_minmax(0,1fr)_280px]",
        )}
      >
        <div
          className={cn(
            "flex gap-1.5 overflow-hidden border-b border-border-subtle py-2 lg:col-start-1 lg:row-start-1 lg:flex-col lg:gap-1 lg:border-0 lg:py-0",
            aside && "lg:row-span-2 xl:row-span-1",
          )}
        >
          {Array.from({ length: sections }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-[var(--control-h-sm)] w-20 shrink-0 rounded-ctl-sm lg:w-full"
            />
          ))}
        </div>

        {aside && (
          <div className="plane min-w-0 divide-y divide-border-subtle lg:col-start-2 lg:row-start-1 xl:col-start-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            "min-w-0 lg:col-start-2",
            aside ? "lg:row-start-2 xl:row-start-1" : "lg:row-start-1",
          )}
        >
          {Array.from({ length: sections }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 border-t border-border-subtle py-6 first:border-t-0 first:pt-0"
            >
              <Skeleton className="h-3.5 w-32" />
              <RowsSkeleton rows={i === 0 ? 4 : 3} />
            </div>
          ))}
        </div>
      </div>
    </Loading>
  );
}

export function OverviewSkeleton() {
  return (
    <Loading label="Loading overview">
      <HeaderSkeleton actions={1} crumbs={false} />
      <div aria-hidden>
        <TilesSkeleton count={4} />
      </div>
      <div aria-hidden className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-3.5 w-24" />
            <RowsSkeleton rows={4} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Skeleton className="me-2 h-3.5 w-20" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[var(--control-h-sm)] w-16 rounded-ctl-sm" />
              ))}
            </div>
            <RowsSkeleton rows={8} />
          </div>
        </div>
        <div className="min-w-0 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-3.5 w-28" />
              <RowsSkeleton rows={3} />
            </div>
          ))}
        </div>
      </div>
    </Loading>
  );
}
