"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Columns3,
  Rows3,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@repo/ui";
import { Input } from "@repo/ui";
import { Button } from "@repo/ui";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";

/* --------------------------------------------------------------------------
   DataTable — the load-bearing component of this application.

   Everything the brief asks a table to do lives here so that no screen has to
   reimplement it: column visibility, sorting, search, selection, bulk actions,
   density, saved view persistence, and a genuinely different mobile rendering
   (cards, not a shrunken table — §33).

   Deliberately NOT a generic virtualised grid. Altruvex operates in the tens
   to low hundreds of rows per entity; a 40kB table engine would buy nothing
   and cost interaction latency.
   -------------------------------------------------------------------------- */

export interface Column<T> {
  id: string;
  header: string;
  /** Renders the cell. Keep it cheap — this runs for every row on every sort. */
  cell: (row: T) => React.ReactNode;
  /** Comparable value for sorting. Omit to make the column unsortable. */
  sortValue?: (row: T) => string | number | null;
  /** Text used by the search box. Omit to exclude the column from search. */
  searchValue?: (row: T) => string | null | undefined;
  width?: string;
  align?: "start" | "end";
  /** Column can be hidden by the operator. Identity columns should not be. */
  hideable?: boolean;
  defaultHidden?: boolean;
  /** Numeric/ID columns get tabular figures and the mono face. */
  mono?: boolean;
  /** Hide below the given breakpoint in the desktop table. */
  minWidth?: "sm" | "md" | "lg" | "xl";
}

export interface BulkAction<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  onRun: (rows: T[]) => void | Promise<void>;
}

export interface DataTableProps<T> {
  /** Stable id — saved view state (columns, sort, density) is keyed on it. */
  tableId: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /**
   * Makes the whole row a link. Keyboard users get a real anchor in col 1.
   * Return undefined for a row that has nowhere to go — that row stays plain
   * text rather than linking to the page it is already on.
   */
  rowHref?: (row: T) => string | undefined;
  /**
   * Opens a detail surface for the row when the record has no page of its own
   * (an audit entry, a log line). Mutually exclusive with `rowHref` in practice:
   * a row that navigates should be a real anchor, not a click handler.
   */
  onRowClick?: (row: T) => void;
  /** Column ids shown on the mobile card: [title, subtitle, ...meta]. */
  mobile?: { title: string; subtitle?: string; meta?: string[] };
  selectable?: boolean;
  bulkActions?: BulkAction<T>[];
  searchPlaceholder?: string;
  /** Extra controls rendered into the toolbar (status filters, date range…). */
  toolbar?: React.ReactNode;
  empty: React.ReactNode;
  initialSort?: { columnId: string; dir: "asc" | "desc" };
  /** Rows to show before "show more". Null disables paging. */
  pageSize?: number | null;
}

type SortState = { columnId: string; dir: "asc" | "desc" } | null;

interface ViewState {
  hidden: string[];
  sort: SortState;
}

function loadView(tableId: string): ViewState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`avx.table.${tableId}`);
    return raw ? (JSON.parse(raw) as ViewState) : null;
  } catch {
    return null;
  }
}

function saveView(tableId: string, view: ViewState) {
  try {
    window.localStorage.setItem(`avx.table.${tableId}`, JSON.stringify(view));
  } catch {
    /* private mode, quota, blocked storage — the table still works */
  }
}

const MIN_WIDTH_CLASS = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

export function DataTable<T>({
  tableId,
  rows,
  columns,
  rowKey,
  rowHref,
  onRowClick,
  mobile,
  selectable = false,
  bulkActions = [],
  searchPlaceholder = "Search…",
  toolbar,
  empty,
  initialSort = undefined,
  pageSize = 50,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortState>(initialSort ?? null);
  const [hidden, setHidden] = React.useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id)),
  );
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [limit, setLimit] = React.useState(pageSize ?? Infinity);
  const [density, setDensity] = React.useState<"compact" | "comfortable" | "relaxed">(
    "comfortable",
  );
  const [hydrated, setHydrated] = React.useState(false);

  // Saved view: read once on mount so SSR markup and first paint agree.
  React.useEffect(() => {
    const view = loadView(tableId);
    // Deliberate: localStorage does not exist during SSR, so the saved view can
    // only be applied after hydration. An initializer here would desync the
    // server and client markup — this rule is waived on purpose.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (view) {
      setHidden(new Set(view.hidden));
      if (view.sort) setSort(view.sort);
    }
    const savedDensity = window.localStorage.getItem("avx.density");
    if (savedDensity === "compact" || savedDensity === "relaxed") {
      setDensity(savedDensity);
      document.documentElement.dataset.density = savedDensity;
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [tableId]);

  React.useEffect(() => {
    if (!hydrated) return;
    saveView(tableId, { hidden: [...hidden], sort });
  }, [hydrated, tableId, hidden, sort]);

  function changeDensity(next: "compact" | "comfortable" | "relaxed") {
    setDensity(next);
    if (next === "comfortable") {
      delete document.documentElement.dataset.density;
      window.localStorage.removeItem("avx.density");
    } else {
      document.documentElement.dataset.density = next;
      window.localStorage.setItem("avx.density", next);
    }
  }

  const visibleColumns = columns.filter((c) => !hidden.has(c.id));

  const filtered = React.useMemo(() => {
    if (!query.trim()) return rows;
    const needle = query.toLowerCase();
    const searchable = columns.filter((c) => c.searchValue);
    return rows.filter((row) =>
      searchable.some((c) => (c.searchValue!(row) ?? "").toLowerCase().includes(needle)),
    );
  }, [rows, query, columns]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col?.sortValue) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // nulls always last, regardless of direction
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort, columns]);

  const visible = sorted.slice(0, limit);
  const selectedRows = sorted.filter((r) => selected.has(rowKey(r)));
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(rowKey(r)));

  function toggleSort(columnId: string) {
    setSort((prev) => {
      if (prev?.columnId !== columnId) return { columnId, dir: "asc" };
      if (prev.dir === "asc") return { columnId, dir: "desc" };
      return null; // third click clears — sorting is not a trap
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((r) => next.delete(rowKey(r)));
      else visible.forEach((r) => next.add(rowKey(r)));
      return next;
    });
  }

  const hideableColumns = columns.filter((c) => c.hideable !== false);

  return (
    <div className="space-y-3">
      {/* ---- toolbar ---------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-64">
          <Search className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(pageSize ?? Infinity);
            }}
            placeholder={searchPlaceholder}
            className="ps-7 pe-7"
            aria-label={searchPlaceholder}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute end-2 top-1/2 -translate-y-1/2 text-subtle-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {toolbar}

        <div className="ms-auto flex items-center gap-1.5">
          <span className="telemetry hidden text-subtle-foreground sm:inline">
            {sorted.length === rows.length
              ? `${rows.length} rows`
              : `${sorted.length} / ${rows.length}`}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="Row density">
                <Rows3 />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Density</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={density}
                onValueChange={(v) => changeDensity(v as typeof density)}
              >
                <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="relaxed">Relaxed</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {hideableColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Columns">
                  <Columns3 />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Columns</DropdownMenuLabel>
                {hideableColumns.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={!hidden.has(c.id)}
                    onCheckedChange={(checked) =>
                      setHidden((prev) => {
                        const next = new Set(prev);
                        if (checked) next.delete(c.id);
                        else next.add(c.id);
                        return next;
                      })
                    }
                  >
                    {c.header}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={hidden.size === 0}
                  onCheckedChange={() => setHidden(new Set())}
                >
                  Show all
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ---- bulk action bar -------------------------------------------- */}
      {selectable && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2">
          <span className="text-base font-medium">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-meta text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear
          </button>
          <div className="ms-auto flex flex-wrap items-center gap-1.5">
            {bulkActions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant={action.destructive ? "destructive" : "outline"}
                onClick={() => action.onRun(selectedRows)}
              >
                {action.icon && <action.icon className="size-3.5" />}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ---- empty ------------------------------------------------------- */}
      {sorted.length === 0 ? (
        query ? (
          <div className="plane px-6 py-12 text-center">
            <p className="text-base text-muted-foreground">
              Nothing matches <span className="font-medium text-foreground">“{query}”</span>.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setQuery("")}>
              Clear search
            </Button>
          </div>
        ) : (
          empty
        )
      ) : (
        <>
          {/* ---- desktop table ------------------------------------------ */}
          <div className="plane hidden overflow-x-auto md:block">
            {/* table-fixed is load-bearing: without it a long cell expands its column
                  and `truncate` never fires, so one verbose message overflows the plane. */}
            <table className="w-full table-fixed border-collapse text-base">
              <thead>
                <tr className="border-b border-border bg-surface">
                  {selectable && (
                    <th className="w-8 ps-3" scope="col">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all rows"
                      />
                    </th>
                  )}
                  {visibleColumns.map((c) => {
                    const active = sort?.columnId === c.id;
                    const Icon = !active
                      ? ChevronsUpDown
                      : sort.dir === "asc"
                        ? ArrowUp
                        : ArrowDown;
                    return (
                      <th
                        key={c.id}
                        scope="col"
                        style={{ width: c.width, minWidth: c.width ? undefined : "9rem" }}
                        className={cn(
                          "h-8 px-3 text-start font-normal",
                          c.align === "end" && "text-end",
                          c.minWidth && MIN_WIDTH_CLASS[c.minWidth],
                        )}
                      >
                        {c.sortValue ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(c.id)}
                            className={cn(
                              "telemetry group inline-flex items-center gap-1 rounded-xs text-subtle-foreground",
                              "transition-colors duration-[var(--dur-state)] hover:text-foreground",
                              active && "text-foreground",
                              c.align === "end" && "flex-row-reverse",
                            )}
                            aria-label={`Sort by ${c.header}`}
                          >
                            {c.header}
                            <Icon
                              className={cn(
                                "size-3 transition-opacity duration-[var(--dur-state)]",
                                active ? "opacity-100" : "opacity-0 group-hover:opacity-60",
                              )}
                            />
                          </button>
                        ) : (
                          <span className="telemetry text-subtle-foreground">{c.header}</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const key = rowKey(row);
                  const isSelected = selected.has(key);
                  return (
                    <tr
                      key={key}
                      data-selected={isSelected || undefined}
                      // A clickable row is a real button for assistive tech and
                      // for the keyboard — a bare onClick on a <tr> is reachable
                      // by mouse only.
                      {...(onRowClick
                        ? {
                            role: "button" as const,
                            tabIndex: 0,
                            onClick: () => onRowClick(row),
                            onKeyDown: (event: React.KeyboardEvent) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onRowClick(row);
                              }
                            },
                          }
                        : {})}
                      className={cn(
                        "border-b border-border last:border-b-0",
                        "transition-colors duration-[var(--dur-state)]",
                        "hover:bg-surface/70 data-[selected]:bg-brand-soft",
                        onRowClick &&
                          "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                      )}
                    >
                      {selectable && (
                        <td className="ps-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(key);
                                else next.delete(key);
                                return next;
                              })
                            }
                            aria-label="Select row"
                          />
                        </td>
                      )}
                      {visibleColumns.map((c, i) => (
                        <td
                          key={c.id}
                          style={{ height: "var(--row-h)" }}
                          className={cn(
                            "overflow-hidden px-3 align-middle",
                            c.align === "end" && "text-end",
                            c.mono && "font-mono text-meta tabular-nums",
                            c.minWidth && MIN_WIDTH_CLASS[c.minWidth],
                          )}
                        >
                          {i === 0 && rowHref?.(row) ? (
                            <Link
                              href={rowHref(row)!}
                              className="-mx-1 block truncate rounded-xs px-1 font-medium hover:text-brand"
                            >
                              {c.cell(row)}
                            </Link>
                          ) : (
                            c.cell(row)
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ---- mobile cards -------------------------------------------
              §33: not a shrunken table. One record per card, the identity and
              its state on the first line, everything else as labelled meta. */}
          <div className="space-y-2 md:hidden">
            {visible.map((row) => {
              const key = rowKey(row);
              const titleCol = columns.find((c) => c.id === (mobile?.title ?? columns[0].id));
              const subtitleCol = mobile?.subtitle
                ? columns.find((c) => c.id === mobile.subtitle)
                : undefined;
              const metaCols = (mobile?.meta ?? [])
                .map((id) => columns.find((c) => c.id === id))
                .filter(Boolean) as Column<T>[];

              // A card cannot be an <a> wrapping other <a>s (phone links, action
              // buttons) — that is invalid HTML and fails hydration. So the title
              // carries a stretched link and everything interactive sits above it.
              const body = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-md font-medium">
                        {rowHref?.(row) ? (
                          <Link
                            href={rowHref(row)!}
                            className="after:absolute after:inset-0 after:content-['']"
                          >
                            {titleCol?.cell(row)}
                          </Link>
                        ) : onRowClick ? (
                          // Same stretched-target trick as the link case, so the
                          // whole card is tappable without nesting interactives.
                          <button
                            type="button"
                            onClick={() => onRowClick(row)}
                            className="block max-w-full truncate text-start after:absolute after:inset-0 after:content-['']"
                          >
                            {titleCol?.cell(row)}
                          </button>
                        ) : (
                          titleCol?.cell(row)
                        )}
                      </p>
                      {subtitleCol && (
                        <p className="relative z-10 mt-0.5 truncate text-meta text-muted-foreground">
                          {subtitleCol.cell(row)}
                        </p>
                      )}
                    </div>
                    {selectable && (
                      <Checkbox
                        className="relative z-10"
                        checked={selected.has(key)}
                        onCheckedChange={(checked) =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(key);
                            else next.delete(key);
                            return next;
                          })
                        }
                        aria-label="Select row"
                      />
                    )}
                  </div>
                  {metaCols.length > 0 && (
                    <dl className="relative z-10 mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border pt-2.5">
                      {metaCols.map((c) => (
                        <div key={c.id} className="min-w-0">
                          <dt className="telemetry text-subtle-foreground">{c.header}</dt>
                          <dd className={cn("truncate", c.mono && "font-mono text-meta tabular-nums")}>
                            {c.cell(row)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </>
              );

              return (
                <div key={key} className="plane relative p-3 transition-colors duration-[var(--dur-state)] active:bg-surface">
                  {body}
                </div>
              );
            })}
          </div>

          {limit < sorted.length && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + (pageSize ?? 50))}>
                Show {Math.min(pageSize ?? 50, sorted.length - limit)} more
                <span className="text-subtle-foreground">
                  ({sorted.length - limit} left)
                </span>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
