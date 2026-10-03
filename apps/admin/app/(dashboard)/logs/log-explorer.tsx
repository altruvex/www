"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

import { linkLogToIncident } from "@/app/(dashboard)/_actions/engineering";
import { useRecordDelete } from "@/components/os/delete-record";
import { EmptyState } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface LogRow {
  id: string;
  level: string;
  environment: string;
  message: string;
  source: string | null;
  requestId: string | null;
  timestamp: string;
  productId: string;
  productName: string;
  deploymentNumber: number | null;
  deploymentId: string | null;
  buildNumber: number | null;
  buildId: string | null;
  incident: { id: string; number: number; title: string } | null;
  metadata: string | null;
}

export interface OpenIncidentOption {
  id: string;
  number: number;
  title: string;
  productId: string;
}

const LEVELS = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"];
const ENVIRONMENTS = ["PRODUCTION", "STAGING", "PREVIEW"];
const RANGES = [
  { value: "1h", label: "Last hour" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "custom", label: "Custom range…" },
];

/** Sentinel for "no filter" — Radix Select cannot hold an empty-string value. */
const ANY = "__any__";
const UNLINKED = "__unlinked__";

/**
 * An ISO instant as a `datetime-local` value in the viewer's own zone. The
 * URL carries ISO so a shared link means the same instant for everyone; the
 * input shows it in local time because that is how people read clocks.
 */
function toLocalInput(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * The log list.
 *
 * Every filter is a URL parameter, so the browser back button walks the
 * investigation backwards and a view can be shared verbatim. Rows expand in
 * place rather than opening a drawer: reading a stack trace should not cost the
 * surrounding context that made it interesting.
 */
export function LogExplorer({
  rows,
  products,
  sources,
  openIncidents,
  filters,
  chips,
  hasFilters,
  paging,
}: {
  rows: LogRow[];
  products: { id: string; name: string; slug: string }[];
  sources: string[];
  openIncidents: OpenIncidentOption[];
  filters: {
    product: string;
    level: string;
    environment: string;
    q: string;
    source: string;
    range: string;
    from: string;
    to: string;
  };
  /** Removable chips for every active filter, rendered on the server. */
  chips: React.ReactNode;
  hasFilters: boolean;
  paging: {
    newerHref: string | null;
    olderHref: string | null;
    newestHref: string | null;
    hasMore: boolean;
  };
}) {
  const del = useRecordDelete({ entity: "log" });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(filters.q);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [customOpen, setCustomOpen] = React.useState(filters.range === "custom");
  const [fromValue, setFromValue] = React.useState(() => toLocalInput(filters.from));
  const [toValue, setToValue] = React.useState(() => toLocalInput(filters.to));

  /** Any filter change resets paging — page 3 of the old filter is meaningless. */
  const apply = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === ANY) next.delete(key);
        else next.set(key, value);
      }
      next.delete("cursor");
      next.delete("before");
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const clearAll = () => {
    setQuery("");
    setCustomOpen(false);
    router.push(pathname);
  };

  const showPaging = paging.newerHref || paging.olderHref || paging.newestHref;

  return (
    <div className="space-y-3">
      <Panel flush>
        <div className="flex flex-wrap items-center gap-2 p-2">
          <form
            className="relative min-w-0 flex-1 basis-56"
            onSubmit={(event) => {
              event.preventDefault();
              apply({ q: query.trim() || null });
            }}
          >
            <Search className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search messages…"
              aria-label="Search log messages"
              className="ps-7"
            />
          </form>

          <Select
            value={filters.product || ANY}
            // Sources differ per product, so a source chosen for one product
            // would silently empty the list for another.
            onValueChange={(value) => apply({ product: value, source: null })}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="Product">
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All products</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.level || ANY} onValueChange={(value) => apply({ level: value })}>
            <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-32" aria-label="Level">
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All levels</SelectItem>
              {LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.environment || ANY}
            onValueChange={(value) => apply({ environment: value })}
          >
            <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-36" aria-label="Environment">
              <SelectValue placeholder="All environments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All environments</SelectItem>
              {ENVIRONMENTS.map((environment) => (
                <SelectItem key={environment} value={environment}>
                  {environment.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(sources.length > 0 || filters.source) && (
            <Select
              value={filters.source || ANY}
              onValueChange={(value) => apply({ source: value })}
            >
              <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-36" aria-label="Source">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All sources</SelectItem>
                {filters.source && !sources.includes(filters.source) && (
                  <SelectItem value={filters.source}>{filters.source}</SelectItem>
                )}
                {sources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={customOpen ? "custom" : filters.range || ANY}
            onValueChange={(value) => {
              if (value === "custom") {
                setCustomOpen(true);
                return;
              }
              setCustomOpen(false);
              apply({ range: value, from: null, to: null });
            }}
          >
            <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-40" aria-label="Time range">
              <SelectValue placeholder="Any time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any time</SelectItem>
              {RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>

        {customOpen && (
          <form
            className="flex flex-wrap items-end gap-2 border-t border-border px-2 py-2"
            onSubmit={(event) => {
              event.preventDefault();
              const from = fromLocalInput(fromValue);
              const to = fromLocalInput(toValue);
              if (!from && !to) {
                toast.error("Pick a start, an end, or both.");
                return;
              }
              if (from && to && from >= to) {
                toast.error("The start has to come before the end.");
                return;
              }
              apply({ range: null, from, to });
            }}
          >
            <label className="flex min-w-0 flex-1 basis-44 flex-col gap-1">
              <span className="telemetry text-subtle-foreground">From</span>
              <Input
                type="datetime-local"
                value={fromValue}
                onChange={(event) => setFromValue(event.target.value)}
                // The server renders this in its own zone; the browser corrects
                // it to the viewer's on hydration.
                suppressHydrationWarning
              />
            </label>
            <label className="flex min-w-0 flex-1 basis-44 flex-col gap-1">
              <span className="telemetry text-subtle-foreground">To</span>
              <Input
                type="datetime-local"
                value={toValue}
                onChange={(event) => setToValue(event.target.value)}
                suppressHydrationWarning
              />
            </label>
            <Button type="submit" variant="outline" size="sm">
              Apply range
            </Button>
          </form>
        )}

        {chips && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-2 py-2">
            {chips}
          </div>
        )}
      </Panel>

      {rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No lines match" : "No logs yet"}
          body={
            hasFilters
              ? "No log line matches every filter above. Remove a chip to widen the view — the newest lines are always at the top."
              : "No product has posted a log line. Logs arrive in batches from a product's runtime through the ingest endpoint; nothing is written here by the admin app."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearAll}>
                Clear filters
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/products">Open products</Link>
              </Button>
            )
          }
        />
      ) : (
        <Panel flush>
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const isOpen = expanded === row.id;
              return (
                <li key={row.id}>
                  {/* The toggle and the record links are siblings, never
                      nested — an <a> inside a <button> is invalid HTML. */}
                  <div
                    className={cn(
                      "flex w-full items-start gap-2 pe-3",
                      "transition-colors duration-[var(--dur-state)] hover:bg-surface",
                      isOpen && "bg-surface",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : row.id)}
                      aria-expanded={isOpen}
                      className="flex min-w-0 flex-1 items-start gap-2 py-1.5 ps-3 text-start"
                    >
                      <span className="shrink-0 pt-0.5">
                        <StatusPill registry="logLevel" value={row.level} variant="dot" />
                      </span>
                      <time
                        dateTime={row.timestamp}
                        className="hidden shrink-0 pt-px font-mono text-meta text-subtle-foreground sm:block"
                      >
                        {dateTime(row.timestamp)}
                      </time>
                      <span
                        className={cn(
                          "min-w-0 flex-1 font-mono text-meta",
                          isOpen ? "whitespace-pre-wrap break-words" : "truncate",
                        )}
                      >
                        {row.message}
                      </span>
                      <ChevronDown
                        className={cn(
                          "mt-0.5 size-3.5 shrink-0 text-subtle-foreground transition-transform duration-[var(--dur-state)]",
                          isOpen && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </button>
                    {row.incident && (
                      <EntityLink
                        type="incident"
                        id={row.incident.id}
                        className="shrink-0 py-1.5 font-mono text-meta"
                      >
                        <span title={row.incident.title}>INC #{row.incident.number}</span>
                      </EntityLink>
                    )}
                    <EntityLink
                      type="product"
                      id={row.productId}
                      muted
                      className="hidden max-w-40 shrink-0 truncate py-1.5 text-meta md:block"
                    >
                      {row.productName}
                    </EntityLink>
                  </div>

                  {isOpen && (
                    <div className="space-y-2 border-t border-border bg-surface px-3 py-2.5">
                      <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-4">
                        <Field label="Product">
                          <EntityLink type="product" id={row.productId}>
                            {row.productName}
                          </EntityLink>
                        </Field>
                        <Field label="Environment">{row.environment.toLowerCase()}</Field>
                        <Field label="Source">
                          {row.source ? (
                            <button
                              type="button"
                              onClick={() => apply({ source: row.source })}
                              className="text-brand hover:underline"
                              title="Show only this source"
                            >
                              {row.source}
                            </button>
                          ) : (
                            "—"
                          )}
                        </Field>
                        <Field label="Time">{dateTime(row.timestamp)}</Field>
                        <Field label="Request">
                          {row.requestId ? (
                            // The single most useful action on a log line: pull
                            // every other line from the same request.
                            <button
                              type="button"
                              onClick={() => apply({ requestId: row.requestId })}
                              className="font-mono text-brand hover:underline"
                            >
                              {row.requestId}
                            </button>
                          ) : (
                            "—"
                          )}
                        </Field>
                        <Field label="Deployment">
                          {row.deploymentId && row.deploymentNumber != null ? (
                            <EntityLink type="deployment" id={row.deploymentId}>
                              #{row.deploymentNumber}
                            </EntityLink>
                          ) : (
                            "—"
                          )}
                        </Field>
                        <Field label="Build">
                          {row.buildId && row.buildNumber != null ? (
                            <EntityLink type="build" id={row.buildId}>
                              #{row.buildNumber}
                            </EntityLink>
                          ) : (
                            "—"
                          )}
                        </Field>
                        <Field label="Incident">
                          {row.incident ? (
                            <EntityLink type="incident" id={row.incident.id}>
                              #{row.incident.number} {row.incident.title}
                            </EntityLink>
                          ) : (
                            "Not linked"
                          )}
                        </Field>
                      </dl>

                      {row.metadata && (
                        <div>
                          <p className="telemetry text-subtle-foreground">Metadata</p>
                          <pre className="mt-1 max-h-64 overflow-auto rounded-sm border border-border bg-background p-2 font-mono text-meta">
                            {row.metadata}
                          </pre>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <IncidentLinker
                          row={row}
                          options={openIncidents.filter((i) => i.productId === row.productId)}
                        />
                        {/* Log lines are ingested, not authored here, so deleting
                            one is an owner-level override rather than a routine
                            row action — the dialog says so before it happens. */}
                        <Button
                          variant="destructive-ghost"
                          size="sm"
                          onClick={() =>
                            del.request({ id: row.id, label: row.message.slice(0, 60) })
                          }
                        >
                          <Trash2 className="size-3.5" />
                          Delete line
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2">
            <p className="text-meta text-subtle-foreground">
              {rows.length} line{rows.length === 1 ? "" : "s"}
              {paging.hasMore ? " · older lines available" : ""}
            </p>
            {showPaging && (
              <div className="flex flex-wrap items-center gap-1.5">
                {paging.newestHref && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={paging.newestHref}>Newest</Link>
                  </Button>
                )}
                {paging.newerHref && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={paging.newerHref}>Newer</Link>
                  </Button>
                )}
                {paging.olderHref && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={paging.olderHref}>Older</Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </Panel>
      )}
      {del.dialog}
    </div>
  );
}

/**
 * Marks a line as evidence for one of its product's open incidents, or drops
 * that link. The server checks the product match again and records the change
 * on the incident; this control only offers what it would accept.
 */
function IncidentLinker({ row, options }: { row: LogRow; options: OpenIncidentOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  // The current incident may be resolved and so missing from the open list;
  // it still has to be selectable as the current value.
  const choices =
    row.incident && !options.some((o) => o.id === row.incident!.id)
      ? [{ ...row.incident, productId: row.productId }, ...options]
      : options;

  if (choices.length === 0) {
    return (
      <p className="text-meta text-subtle-foreground">
        No open incident on {row.productName} to link this line to.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="telemetry shrink-0 text-subtle-foreground">Evidence for</span>
      <Select
        value={row.incident?.id ?? UNLINKED}
        disabled={pending}
        onValueChange={(value) => {
          const incidentId = value === UNLINKED ? null : value;
          startTransition(async () => {
            const result = await linkLogToIncident({ logId: row.id, incidentId });
            if (result.ok) {
              toast.success(result.message);
              router.refresh();
            } else {
              toast.error(result.message);
            }
          });
        }}
      >
        <SelectTrigger className="w-56 max-w-full" aria-label="Link this line to an incident">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNLINKED}>Not linked</SelectItem>
          {choices.map((incident) => (
            <SelectItem key={incident.id} value={incident.id}>
              #{incident.number} {incident.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="telemetry text-subtle-foreground">{label}</dt>
      <dd className="truncate text-meta">{children}</dd>
    </div>
  );
}
