import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { EmptyInline } from "@/components/os/empty-state";
import { List, ListRow } from "@/components/os/list-row";
import { Panel, PanelLink } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { when } from "@/lib/format";
import { httpUrl } from "@/lib/http-url";
import type { listLogs } from "@/lib/engineering";

export function duration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export function span(
  start: Date | null | undefined,
  end: Date | null | undefined,
): number | null {
  if (!start || !end) return null;
  return Math.max(0, end.getTime() - start.getTime());
}

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
        <List label={`Recent log lines for this ${scope}`}>
          {rows.map((entry) => (
            <ListRow
              key={entry.id}
              dense
              href={`${allHref}${allHref.includes("?") ? "&" : "?"}inspect=${entry.id}`}
              title={<span className="font-mono">{entry.message}</span>}
              meta={[
                when(entry.timestamp),
                entry.source ?? "unknown source",
                entry.requestId,
                entry.incident ? `Incident #${entry.incident.number}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              trailing={<StatusPill registry="logLevel" value={entry.level} variant="dot" />}
            />
          ))}
        </List>
      )}
    </Panel>
  );
}

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
