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
import { SelectionDock, type DockConfirm } from "@/components/os/selection-dock";
import type { ConfirmResult } from "@/components/os/confirm-dialog";
import { keepsScroll, useRowOpen } from "@/components/os/row-open";
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

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number | null;
  searchValue?: (row: T) => string | null | undefined;
  width?: string;
  align?: "start" | "end";
  hideable?: boolean;
  defaultHidden?: boolean;
  mono?: boolean;
  minWidth?: "sm" | "md" | "lg" | "xl";
}

export interface BulkAction<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  confirm?: DockConfirm | ((rows: T[]) => DockConfirm);
  onRun: (rows: T[]) => ConfirmResult | Promise<ConfirmResult>;
}

export interface DataTableProps<T> {
  tableId: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string | undefined;
  onRowClick?: (row: T) => void;
  mobile?: { title: string; subtitle?: string; meta?: string[] };
  selectable?: boolean;
  bulkActions?: BulkAction<T>[];
  rowActions?: (row: T) => React.ReactNode;
  selectionNoun?: string;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  empty: React.ReactNode;
  initialSort?: { columnId: string; dir: "asc" | "desc" };
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
  rowActions,
  selectionNoun = "row",
  searchPlaceholder = "Search…",
  toolbar,
  empty,
  initialSort = undefined,
  pageSize = 50,
}: DataTableProps<T>) {
  const rowOpen = useRowOpen();
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortState>(initialSort ?? null);
  const [hidden, setHidden] = React.useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id)),
  );
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [limit, setLimit] = React.useState(pageSize ?? Infinity);
  const [density, setDensity] = React.useState<
    "compact" | "comfortable" | "relaxed"
  >("comfortable");
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const view = loadView(tableId);
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
      searchable.some((c) =>
        (c.searchValue!(row) ?? "").toLowerCase().includes(needle),
      ),
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
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort, columns]);

  const visible = sorted.slice(0, limit);
  const selectedRows = sorted.filter((r) => selected.has(rowKey(r)));
  const allVisibleSelected =
    visible.length > 0 && visible.every((r) => selected.has(rowKey(r)));

  function toggleSort(columnId: string) {
    setSort((prev) => {
      if (prev?.columnId !== columnId) return { columnId, dir: "asc" };
      if (prev.dir === "asc") return { columnId, dir: "desc" };
      return null;
    });
  }

  const clearSelection = React.useCallback(() => setSelected(new Set()), []);

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
                <DropdownMenuRadioItem value="compact">
                  Compact
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="comfortable">
                  Comfortable
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="relaxed">
                  Relaxed
                </DropdownMenuRadioItem>
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

      {selectable && (
        <SelectionDock
          count={selected.size}
          noun={selectionNoun}
          onClear={clearSelection}
          actions={bulkActions.map((action) => ({
            label: action.label,
            icon: action.icon,
            destructive: action.destructive,
            confirm:
              typeof action.confirm === "function"
                ? action.confirm(selectedRows)
                : action.confirm,
            onRun: async () => {
              const result = await action.onRun(selectedRows);
              if (!(result && result.ok === false)) clearSelection();
              return result;
            },
          }))}
        />
      )}

      {sorted.length === 0 ? (
        query ? (
          <div className="plane px-6 py-12 text-center">
            <p className="text-base text-muted-foreground">
              Nothing matches{" "}
              <span className="font-medium text-foreground">“{query}”</span>.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setQuery("")}
            >
              Clear search
            </Button>
          </div>
        ) : (
          empty
        )
      ) : (
        <>
          <div className="plane hidden overflow-x-auto md:block">
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
                        style={{
                          width: c.width,
                          minWidth: c.width ? undefined : "9rem",
                        }}
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
                                active
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-60",
                              )}
                            />
                          </button>
                        ) : (
                          <span className="telemetry text-subtle-foreground">
                            {c.header}
                          </span>
                        )}
                      </th>
                    );
                  })}
                  {rowActions && (
                    <th
                      scope="col"
                      style={{ width: "3rem" }}
                      className="h-8 px-2"
                    >
                      <span className="sr-only">Row actions</span>
                    </th>
                  )}
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
                      {...(!onRowClick ? { onClick: rowOpen(rowHref?.(row)) } : {})}
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
                        !onRowClick && rowHref && "cursor-pointer",
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
                              scroll={!keepsScroll(rowHref(row)!)}
                              className="-mx-1 block truncate rounded-xs px-1 font-medium hover:text-brand"
                            >
                              {c.cell(row)}
                            </Link>
                          ) : (
                            c.cell(row)
                          )}
                        </td>
                      ))}
                      {rowActions && (
                        <td
                          className="px-2 text-end align-middle"
                          style={{ width: "3rem" }}
                        >
                          {rowActions(row)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {visible.map((row) => {
              const key = rowKey(row);
              const titleCol = columns.find(
                (c) => c.id === (mobile?.title ?? columns[0].id),
              );
              const subtitleCol = mobile?.subtitle
                ? columns.find((c) => c.id === mobile.subtitle)
                : undefined;
              const metaCols = (mobile?.meta ?? [])
                .map((id) => columns.find((c) => c.id === id))
                .filter(Boolean) as Column<T>[];

              const body = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-md font-medium">
                        {rowHref?.(row) ? (
                          <Link
                            href={rowHref(row)!}
                            scroll={!keepsScroll(rowHref(row)!)}
                            className="after:absolute after:inset-0 after:content-['']"
                          >
                            {titleCol?.cell(row)}
                          </Link>
                        ) : onRowClick ? (
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
                    <span className="relative z-10 flex shrink-0 items-center gap-1">
                      {rowActions?.(row)}
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
                    </span>
                  </div>
                  {metaCols.length > 0 && (
                    <dl className="relative z-10 mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border pt-2.5">
                      {metaCols.map((c) => (
                        <div key={c.id} className="min-w-0">
                          <dt className="telemetry text-subtle-foreground">
                            {c.header}
                          </dt>
                          <dd
                            className={cn(
                              "truncate",
                              c.mono && "font-mono text-meta tabular-nums",
                            )}
                          >
                            {c.cell(row)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </>
              );

              return (
                <div
                  key={key}
                  className="plane relative p-3 transition-colors duration-[var(--dur-state)] active:bg-surface"
                >
                  {body}
                </div>
              );
            })}
          </div>

          {limit < sorted.length && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLimit((l) => l + (pageSize ?? 50))}
              >
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

export function FilterChip({
  label,
  value,
  clearHref,
  className,
}: {
  label: string;
  value: React.ReactNode;
  clearHref: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[var(--control-h-sm)] max-w-full items-center gap-1.5 rounded-sm border border-border bg-surface ps-2 pe-1 text-meta",
        className,
      )}
    >
      <span className="telemetry shrink-0 text-subtle-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium">{value}</span>
      <Link
        href={clearHref}
        aria-label={`Remove the ${label.toLowerCase()} filter`}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-xs text-subtle-foreground transition-colors duration-[var(--dur-state)] hover:bg-surface-2 hover:text-foreground"
      >
        <X className="size-3" />
      </Link>
    </span>
  );
}
