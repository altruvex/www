"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@repo/ui";

import { DataTable, type Column } from "@/components/os/data-table";
import { EmptyInline } from "@/components/os/empty-state";
import { ToneBadge } from "@/components/ui/badge";
import { dateTime, when } from "@/lib/format";
import { titleCase, type Tone } from "@/lib/status";

export interface AuditRecord {
  id: string;
  /** Dot-namespaced, e.g. "contract.signed". */
  action: string;
  actorKind: string;
  actorLabel: string;
  actorRole: string | null;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  summary: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

const ANY = "__any__";

/**
 * Tone is taken from the VERB of the action, not from a per-action table.
 *
 * Actions are open-ended — every new mutation site adds one — so a lookup table
 * would silently render each new action as "unknown". Reading the verb means a
 * `subscription.cancelled` added next month is already coloured correctly.
 */
function toneFor(action: string): Tone {
  const verb = action.split(".")[1] ?? "";
  if (/deleted|failed|revoked|cancelled|suspended|rejected/.test(verb)) return "danger";
  if (/created|opened|signed|succeeded|resolved|renewed|paid/.test(verb)) return "success";
  if (/updated|changed|rotated|moved/.test(verb)) return "progress";
  if (/due|overdue|expiring|past/.test(verb)) return "warning";
  return "info";
}

const ACTOR_TONE: Record<string, Tone> = {
  USER: "info",
  CLIENT: "progress",
  INTEGRATION: "neutral",
  SYSTEM: "neutral",
};

function actionLabel(action: string): string {
  const [entity, verb] = action.split(".");
  return verb ? `${titleCase(entity)} ${verb.replace(/_/g, " ")}` : titleCase(action);
}

export function AuditClient({ records }: { records: AuditRecord[] }) {
  const [active, setActive] = React.useState<AuditRecord | null>(null);
  const [entityFilter, setEntityFilter] = React.useState(ANY);
  const [actorFilter, setActorFilter] = React.useState(ANY);

  const entityTypes = React.useMemo(
    () => [...new Set(records.map((r) => r.entityType))].sort(),
    [records],
  );
  const actorKinds = React.useMemo(
    () => [...new Set(records.map((r) => r.actorKind))].sort(),
    [records],
  );

  const rows = records.filter(
    (r) =>
      (entityFilter === ANY || r.entityType === entityFilter) &&
      (actorFilter === ANY || r.actorKind === actorFilter),
  );

  const columns: Column<AuditRecord>[] = [
    {
      id: "summary",
      header: "What happened",
      hideable: false,
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate">{row.summary}</span>
          <span className="block truncate text-meta font-normal text-subtle-foreground">
            {row.entityLabel ?? row.entityType}
          </span>
        </span>
      ),
      sortValue: (row) => row.summary.toLowerCase(),
      searchValue: (row) =>
        `${row.summary} ${row.entityLabel ?? ""} ${row.entityType} ${row.action} ${row.actorLabel}`,
    },
    {
      id: "action",
      header: "Action",
      width: "168px",
      cell: (row) => <ToneBadge tone={toneFor(row.action)}>{actionLabel(row.action)}</ToneBadge>,
      sortValue: (row) => row.action,
      searchValue: (row) => actionLabel(row.action),
    },
    {
      id: "actor",
      header: "Actor",
      width: "168px",
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate">{row.actorLabel}</span>
          <span className="block truncate text-meta font-normal text-subtle-foreground">
            {row.actorRole ?? titleCase(row.actorKind)}
          </span>
        </span>
      ),
      sortValue: (row) => row.actorLabel.toLowerCase(),
      searchValue: (row) => `${row.actorLabel} ${row.actorKind}`,
    },
    {
      id: "change",
      header: "Change",
      minWidth: "lg",
      cell: (row) => {
        const keys = Object.keys(row.after ?? row.before ?? {});
        if (keys.length === 0) {
          return <span className="text-subtle-foreground">—</span>;
        }
        const key = keys[0]!;
        return (
          <span className="flex min-w-0 items-center gap-1.5 font-mono text-meta">
            <span className="text-subtle-foreground">{key}</span>
            <span className="truncate text-muted-foreground">
              {format(row.before?.[key])}
            </span>
            <ArrowRight className="size-3 shrink-0 text-subtle-foreground" aria-hidden />
            <span className="truncate">{format(row.after?.[key])}</span>
            {keys.length > 1 && (
              <span className="shrink-0 text-subtle-foreground">+{keys.length - 1}</span>
            )}
          </span>
        );
      },
    },
    {
      id: "timestamp",
      header: "When",
      width: "120px",
      align: "end",
      cell: (row) => (
        <span className="text-muted-foreground" title={dateTime(row.timestamp)}>
          {when(row.timestamp)}
        </span>
      ),
      sortValue: (row) => -Date.parse(row.timestamp),
    },
  ];

  return (
    <>
      <DataTable
        tableId="audit"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        onRowClick={setActive}
        mobile={{ title: "summary", subtitle: "action", meta: ["actor", "timestamp"] }}
        searchPlaceholder="Search actor, entity, action…"
        initialSort={{ columnId: "timestamp", dir: "asc" }}
        toolbar={
          <div className="flex items-center gap-1.5">
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-36" aria-label="Filter by entity">
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All entities</SelectItem>
                {entityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {titleCase(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actorFilter} onValueChange={setActorFilter}>
              <SelectTrigger className="w-32" aria-label="Filter by actor">
                <SelectValue placeholder="All actors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All actors</SelectItem>
                {actorKinds.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {titleCase(kind)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        empty={
          <EmptyInline>
            {records.length === 0
              ? "Nothing has been recorded yet. Events are written from the moment of the change onward — history from before this log existed was not back-filled, because inventing it would defeat the point of an audit trail."
              : "No event matches those filters."}
          </EmptyInline>
        }
      />

      {rows.length > 0 && (
        <p className="text-meta text-subtle-foreground">
          Select a row to inspect every changed field.
        </p>
      )}

      <Sheet open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <SheetContent side="end" className="w-full sm:max-w-lg">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle className="pe-6">{active.summary}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <ToneBadge tone={toneFor(active.action)}>
                    {actionLabel(active.action)}
                  </ToneBadge>
                  <ToneBadge tone={ACTOR_TONE[active.actorKind] ?? "neutral"}>
                    {titleCase(active.actorKind)}
                  </ToneBadge>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <Meta label="Actor">{active.actorLabel}</Meta>
                  <Meta label="Role">{active.actorRole ?? "—"}</Meta>
                  <Meta label="Entity">{active.entityLabel ?? titleCase(active.entityType)}</Meta>
                  <Meta label="Entity id">
                    <span className="font-mono">{active.entityId}</span>
                  </Meta>
                  <Meta label="Action">
                    <span className="font-mono">{active.action}</span>
                  </Meta>
                  <Meta label="When">{dateTime(active.timestamp)}</Meta>
                </dl>

                <ChangeTable before={active.before} after={active.after} />

                {active.metadata && Object.keys(active.metadata).length > 0 && (
                  <div>
                    <p className="telemetry text-subtle-foreground">Metadata</p>
                    <pre className="mt-1 max-h-48 overflow-auto rounded-sm border border-border bg-surface p-2 font-mono text-meta">
                      {JSON.stringify(active.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

    </>
  );
}

function format(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value || '""';
  return String(value);
}

function ChangeTable({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  if (keys.length === 0) {
    return (
      <p className="text-base text-muted-foreground">
        This event records no field change — it is the fact that it happened.
      </p>
    );
  }
  return (
    <div>
      <p className="telemetry text-subtle-foreground">Changed fields</p>
      <ul className="mt-1 divide-y divide-border rounded-sm border border-border">
        {keys.map((key) => (
          <li key={key} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-2 py-1.5">
            <span className="min-w-0">
              <span className="telemetry block text-subtle-foreground">{key}</span>
              <span className="block truncate font-mono text-meta text-muted-foreground">
                {format(before?.[key])}
              </span>
            </span>
            <ArrowRight className="size-3 shrink-0 text-subtle-foreground" aria-hidden />
            <span className="min-w-0 self-end">
              <span className="block truncate font-mono text-meta">{format(after?.[key])}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="telemetry text-subtle-foreground">{label}</dt>
      <dd className="truncate text-base">{children}</dd>
    </div>
  );
}
