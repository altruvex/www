"use client";

import { DataTable, type Column } from "@/components/os/data-table";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { EmptyInline } from "@/components/os/empty-state";
import { StatusPill } from "@/components/ui/badge";
import { when } from "@/lib/format";
import { statusOf } from "@/lib/status";

export interface BuildRow {
  id: string;
  number: number;
  productId: string;
  productName: string;
  clientName: string;
  environment: string;
  status: string;
  branch: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  triggeredBy: string | null;
  durationMs: number | null;
  failureReason: string | null;
  deploymentCount: number;
  at: string;
}

function duration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export function BuildsTable({ rows }: { rows: BuildRow[] }) {
  const del = useRecordDelete({ entity: "build" });
  const columns: Column<BuildRow>[] = [
    {
      id: "product",
      header: "Build",
      hideable: false,
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate">
            {row.productName}
            <span className="ms-1.5 font-mono text-meta text-subtle-foreground">
              #{row.number}
            </span>
          </span>
          <span className="block truncate text-meta font-normal text-subtle-foreground">
            {row.branch ?? "no branch"} · {row.clientName}
          </span>
        </span>
      ),
      sortValue: (row) => row.productName.toLowerCase(),
      searchValue: (row) =>
        `${row.productName} ${row.clientName} ${row.branch ?? ""} ${row.commitMessage ?? ""} ${row.commitSha ?? ""}`,
    },
    {
      id: "status",
      header: "Status",
      width: "124px",
      cell: (row) => <StatusPill registry="buildStatus" value={row.status} variant="dot" />,
      sortValue: (row) =>
        ["FAILED", "RUNNING", "QUEUED", "CANCELLED", "SUCCEEDED"].indexOf(row.status),
      searchValue: (row) => statusOf("buildStatus", row.status).label,
    },
    {
      id: "commit",
      header: "Commit",
      minWidth: "lg",
      cell: (row) => (
        <span className="block truncate text-muted-foreground">
          {row.failureReason ? (
            <span className="text-danger">{row.failureReason}</span>
          ) : (
            (row.commitMessage ?? row.commitSha?.slice(0, 7) ?? "—")
          )}
        </span>
      ),
      searchValue: (row) => `${row.commitMessage ?? ""} ${row.failureReason ?? ""}`,
    },
    {
      id: "duration",
      header: "Duration",
      width: "104px",
      align: "end",
      mono: true,
      cell: (row) => <span>{duration(row.durationMs)}</span>,
      sortValue: (row) => -(row.durationMs ?? 0),
    },
    {
      id: "deployed",
      header: "Deployed",
      width: "104px",
      align: "end",
      defaultHidden: true,
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.deploymentCount > 0 ? `${row.deploymentCount}×` : "Never"}
        </span>
      ),
      sortValue: (row) => -row.deploymentCount,
    },
    {
      id: "at",
      header: "When",
      width: "120px",
      align: "end",
      cell: (row) => <span className="text-muted-foreground">{when(row.at)}</span>,
      sortValue: (row) => -Date.parse(row.at),
    },
  ];

  return (
    <>
      <DataTable
        tableId="builds"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        rowHref={(row) => `/products/${row.productId}?tab=builds`}
        mobile={{ title: "product", subtitle: "status", meta: ["duration", "at"] }}
        searchPlaceholder="Search product, branch, commit…"
        initialSort={{ columnId: "at", dir: "asc" }}
        rowActions={(row) => (
          <RowActions onDelete={() => del.request({ id: row.id, label: `${row.productName} · build ${row.number}` })} />
        )}
        empty={<EmptyInline>No build matches those filters.</EmptyInline>}
      />
      {del.dialog}
    </>
  );
}
