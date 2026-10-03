import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { EmptyInline } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { Panel, PanelLink } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { dateTime, when } from "@/lib/format";
import { httpUrl } from "@/lib/http-url";
import type { listLogs } from "@/lib/engineering";

/**
 * Pieces the deployment and build pages share. They live beside the routes
 * rather than in `components/os` because nothing outside engineering renders a
 * build duration or a CI-written URL.
 */

export function duration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/** Elapsed time between two stamps, when both exist. */
export function span(
  start: Date | null | undefined,
  end: Date | null | undefined,
): number | null {
  if (!start || !end) return null;
  return Math.max(0, end.getTime() - start.getTime());
}

/**
 * A URL CI wrote, as a link only when it is http(s). The ingest schema checks
 * this on the way in, but rows written before that check — or by the GitHub
 * webhook — are not guaranteed, and an `<a href="javascript:…">` is the cost
 * of trusting them.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return httpUrl.safeParse(value).success ? value : null;
}

export function ExternalUrl({ value }: { value: string | null | undefined }) {
  const safe = safeHttpUrl(value);
  if (!safe)
    return value ? (
      <span className="break-all text-muted-foreground">{value}</span>
    ) : (
      <>—</>
    );
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1 text-brand hover:underline"
    >
      <span className="truncate">{safe.replace(/^https?:\/\//, "")}</span>
      <ExternalLink className="size-3 shrink-0" />
    </a>
  );
}

export function clientName(client: {
  name: string | null;
  company: string | null;
}): string {
  return client.company || client.name || "Unnamed client";
}

type LogPage = Awaited<ReturnType<typeof listLogs>>;

/**
 * The most recent lines a deploy or build wrote, with the way out to the full
 * explorer. Twenty is enough to see whether it is noisy or failing; reading
 * further belongs on /logs, which filters and paginates.
 */
export function RecentLogs({
  page,
  total,
  allHref,
  scope,
}: {
  page: LogPage;
  total: number;
  allHref: string;
  scope: "deployment" | "build";
}) {
  const rows = page.entries.slice(0, 20);
  return (
    <Panel
      title="Logs"
      description={
        total === 0
          ? "Nothing recorded"
          : `${rows.length} most recent of ${total.toLocaleString("en-US")}`
      }
      action={
        total > 0 ? <PanelLink href={allHref}>All logs</PanelLink> : undefined
      }
      flush
    >
      {rows.length === 0 ? (
        <EmptyInline>
          No log line names this {scope}. Lines arrive from CI and the running
          app through the ingest endpoint with a {scope} id attached; a pipeline
          that does not send one leaves this empty.
        </EmptyInline>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2"
            >
              <StatusPill
                registry="logLevel"
                value={entry.level}
                variant="dot"
                className="pt-0.5"
              />
              <span className="min-w-0 flex-1 basis-60">
                <span className="block break-words font-mono text-meta">
                  {entry.message}
                </span>
                <span className="block truncate text-meta text-subtle-foreground">
                  {entry.source ?? "unknown source"}
                  {entry.requestId ? ` · ${entry.requestId}` : ""}
                  {entry.incident ? (
                    <>
                      {" · "}
                      <EntityLink type="incident" id={entry.incident.id} muted>
                        Incident #{entry.incident.number}
                      </EntityLink>
                    </>
                  ) : null}
                </span>
              </span>
              <time
                className="shrink-0 font-mono text-micro tabular-nums text-subtle-foreground"
                dateTime={entry.timestamp.toISOString()}
                title={dateTime(entry.timestamp)}
              >
                {when(entry.timestamp)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Previous / next record in the same history, or a plain dash at either end. */
export function Neighbours({
  previous,
  next,
  hrefFor,
  noun,
}: {
  previous: { id: string; number: number } | null;
  next: { id: string; number: number } | null;
  hrefFor: (id: string) => string;
  noun: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-meta">
      {previous ? (
        <Link
          href={hrefFor(previous.id)}
          className="text-muted-foreground hover:text-foreground"
        >
          ← {noun} #{previous.number}
        </Link>
      ) : (
        <span className="text-subtle-foreground">
          First {noun.toLowerCase()}
        </span>
      )}
      {next ? (
        <Link
          href={hrefFor(next.id)}
          className="text-muted-foreground hover:text-foreground"
        >
          {noun} #{next.number} →
        </Link>
      ) : (
        <span className="text-subtle-foreground">
          Latest {noun.toLowerCase()}
        </span>
      )}
    </div>
  );
}
