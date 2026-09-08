"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

import { EmptyState } from "@/components/os/empty-state";
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
  metadata: string | null;
}

const LEVELS = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"];
const ENVIRONMENTS = ["PRODUCTION", "STAGING", "PREVIEW"];

/** Sentinel for "no filter" — Radix Select cannot hold an empty-string value. */
const ANY = "__any__";

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
  filters,
  hasFilters,
  nextCursor,
  hasMore,
}: {
  rows: LogRow[];
  products: { id: string; name: string; slug: string }[];
  filters: {
    product: string;
    level: string;
    environment: string;
    q: string;
    requestId: string;
  };
  hasFilters: boolean;
  nextCursor: string | null;
  hasMore: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(filters.q);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  /** Any filter change resets paging — page 3 of the old filter is meaningless. */
  const apply = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === ANY) next.delete(key);
        else next.set(key, value);
      }
      if (!("cursor" in patch)) next.delete("cursor");
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

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
            onValueChange={(value) => apply({ product: value })}
          >
            <SelectTrigger className="w-40" aria-label="Product">
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
            <SelectTrigger className="w-32" aria-label="Level">
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
            <SelectTrigger className="w-36" aria-label="Environment">
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

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                router.push(pathname);
              }}
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>

        {filters.requestId && (
          <div className="flex items-center gap-2 border-t border-border bg-surface px-3 py-1.5">
            <span className="telemetry text-subtle-foreground">Trace</span>
            <span className="font-mono text-meta">{filters.requestId}</span>
            <button
              type="button"
              onClick={() => apply({ requestId: null })}
              className="text-meta text-brand hover:underline"
            >
              Show everything
            </button>
          </div>
        )}
      </Panel>

      {rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Nothing matches those filters" : "No logs yet"}
          body={
            hasFilters
              ? "No log line matches. Widen the level or clear the filters — the newest lines are always at the top."
              : "No product has posted a log line. Logs arrive in batches from a product's runtime through the ingest endpoint; nothing is written here by the admin app."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={() => router.push(pathname)}>
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
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : row.id)}
                    aria-expanded={isOpen}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-1.5 text-start",
                      "transition-colors duration-[var(--dur-state)] hover:bg-surface",
                      isOpen && "bg-surface",
                    )}
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
                    <span className="hidden shrink-0 text-meta text-subtle-foreground md:block">
                      {row.productName}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 shrink-0 text-subtle-foreground transition-transform duration-[var(--dur-state)]",
                        isOpen && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>

                  {isOpen && (
                    <div className="space-y-2 border-t border-border bg-surface px-3 py-2.5">
                      <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-4">
                        <Field label="Product">
                          <Link
                            href={`/products/${row.productId}`}
                            className="text-brand hover:underline"
                          >
                            {row.productName}
                          </Link>
                        </Field>
                        <Field label="Environment">{row.environment.toLowerCase()}</Field>
                        <Field label="Source">{row.source ?? "—"}</Field>
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
                          {row.deploymentNumber != null ? (
                            <Link
                              href={`/products/${row.productId}?tab=deployments`}
                              className="text-brand hover:underline"
                            >
                              #{row.deploymentNumber}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </Field>
                        <Field label="Build">
                          {row.buildNumber != null ? `#${row.buildNumber}` : "—"}
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
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
            <p className="text-meta text-subtle-foreground">
              {rows.length} line{rows.length === 1 ? "" : "s"}
              {hasMore ? " · more available" : ""}
            </p>
            {hasMore && nextCursor && (
              <Button variant="outline" size="sm" onClick={() => apply({ cursor: nextCursor })}>
                Older
              </Button>
            )}
          </div>
        </Panel>
      )}
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
