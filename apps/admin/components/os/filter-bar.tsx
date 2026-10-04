"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input, LoadingIcon, segmentClass } from "@repo/ui";
import { cn } from "@/lib/utils";

type Changes = Record<string, string | null | undefined>;

const PAGING_PARAMS = ["page", "cursor"] as const;

interface FilterUrl {
  params: URLSearchParams;
  update: (changes: Changes) => void;
  pending: boolean;
}

const FilterContext = React.createContext<FilterUrl | null>(null);

function useOwnFilterUrl(): FilterUrl {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const update = React.useCallback(
    (changes: Changes) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      for (const key of PAGING_PARAMS) next.delete(key);
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  return { params: searchParams as unknown as URLSearchParams, update, pending };
}

function useFilterUrl(): FilterUrl {
  const own = useOwnFilterUrl();
  return React.useContext(FilterContext) ?? own;
}

export function FilterBar({
  search,
  children,
  trailing,
  label = "Filters",
  className,
}: {
  search?: { param?: string; placeholder?: string };
  children?: React.ReactNode;
  trailing?: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const url = useOwnFilterUrl();
  return (
    <FilterContext.Provider value={url}>
      <div
        role="search"
        aria-label={label}
        aria-busy={url.pending || undefined}
        className={cn("flex flex-wrap items-center gap-2", className)}
      >
        {search && <SearchField param={search.param ?? "q"} placeholder={search.placeholder} />}
        {children && (
          <div
            role="group"
            aria-label={label}
            className="-mx-3 flex w-[calc(100%+1.5rem)] min-w-0 items-center gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {children}
          </div>
        )}
        {trailing && (
          <div className="ms-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">{trailing}</div>
        )}
      </div>
    </FilterContext.Provider>
  );
}

function SearchField({ param, placeholder = "Search…" }: { param: string; placeholder?: string }) {
  const { params, update, pending } = useFilterUrl();
  const urlValue = params.get(param) ?? "";
  const [query, setQuery] = React.useState(urlValue);
  const [written, setWritten] = React.useState(urlValue);

  const [lastUrlValue, setLastUrlValue] = React.useState(urlValue);
  if (urlValue !== lastUrlValue) {
    setLastUrlValue(urlValue);
    if (urlValue !== written) {
      setWritten(urlValue);
      setQuery(urlValue);
    }
  }

  React.useEffect(() => {
    const next = query.trim();
    if (next === urlValue) return;
    const timer = window.setTimeout(() => {
      setWritten(next);
      update({ [param]: next || null });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, urlValue, param, update]);

  return (
    <div className="relative w-full min-w-0 sm:w-64">
      <Search
        className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && query) {
            event.preventDefault();
            setQuery("");
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-[var(--control-h-sm)] ps-7 pe-7 [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="absolute end-1 top-1/2 flex -translate-y-1/2 items-center">
        {pending ? (
          <span className="flex size-6 items-center justify-center text-subtle-foreground">
            <LoadingIcon size="sm" />
          </span>
        ) : query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="flex size-6 items-center justify-center rounded-sm text-subtle-foreground transition-colors duration-[var(--dur-state)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </span>
    </div>
  );
}

export function FilterChip({
  param,
  value,
  label,
  count,
  icon,
  className,
}: {
  param: string;
  value?: string;
  label: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
  className?: string;
}) {
  const { params, update } = useFilterUrl();
  const current = params.get(param);
  const active = value ? current === value : current === null;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => update({ [param]: value && !active ? value : null })}
      className={cn(
        segmentClass({ selected: active }),
        "min-h-[var(--control-h-sm)] shrink-0 whitespace-nowrap py-0.5 pointer-coarse:min-h-11 [&_svg]:size-3.5",
        className,
      )}
    >
      {icon}
      {label}
      {count != null && (
        <span className="font-mono text-micro tabular-nums text-subtle-foreground">{count}</span>
      )}
    </button>
  );
}

export type ActiveFilterLabel = string | { label: string; clears?: string[] };

export function ActiveFilters({
  labels,
  valueLabels,
  className,
}: {
  labels: Record<string, ActiveFilterLabel>;
  valueLabels?: Record<string, Record<string, string>>;
  className?: string;
}) {
  const { params, update } = useFilterUrl();
  const active = Object.entries(labels).flatMap(([param, entry]) => {
    const value = params.get(param);
    const { label, clears = [] } = typeof entry === "string" ? { label: entry } : entry;
    return value
      ? [{ param, label, clears, value: valueLabels?.[param]?.[value] ?? value }]
      : [];
  });
  if (active.length === 0) return null;

  const removal = (filters: typeof active): Changes =>
    Object.fromEntries(filters.flatMap((f) => [f.param, ...f.clears]).map((key) => [key, null]));

  return (
    <div
      role="group"
      aria-label="Active filters"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {active.map((filter) => (
        <span
          key={filter.param}
          className="inline-flex h-6 max-w-full items-center gap-1 rounded-sm border border-border bg-surface ps-2 pe-0.5 text-meta"
        >
          <span className="text-subtle-foreground">{filter.label}:</span>
          <span className="min-w-0 truncate font-medium text-foreground">{filter.value}</span>
          <button
            type="button"
            onClick={() => update(removal([filter]))}
            aria-label={`Remove filter ${filter.label}: ${filter.value}`}
            className="flex size-5 shrink-0 items-center justify-center rounded-xs text-subtle-foreground transition-colors duration-[var(--dur-state)] hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand pointer-coarse:size-8"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      {active.length > 1 && (
        <button
          type="button"
          onClick={() => update(removal(active))}
          className="rounded-xs px-1 text-meta text-muted-foreground underline-offset-2 transition-colors duration-[var(--dur-state)] hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-brand"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
