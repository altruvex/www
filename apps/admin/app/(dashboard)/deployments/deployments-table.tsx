"use client";

import { DataTable, type Column } from "@/components/os/data-table";
import { EmptyInline } from "@/components/os/empty-state";
import { StatusPill } from "@/components/ui/badge";
import { when } from "@/lib/format";
import { statusOf } from "@/lib/status";

export interface DeploymentRow {
  id: string;
  number: number;
  productId: string;
  productName: string;
  clientName: string;
  environment: string;
  status: string;
  version: string | null;
  commitSha: string | null;
  triggeredBy: string | null;
  buildNumber: number | null;
  rolledBackByNumber: number | null;
  failureReason: string | null;
  url: string | null;
  at: string;
}

export function DeploymentsTable({ rows }: { rows: DeploymentRow[] }) {
  const columns: Column<DeploymentRow>[] = [
    {
      id: "product",
      header: "Product",
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
            {row.clientName}
          </span>
        </span>
      ),
      sortValue: (row) => `${row.productName}`.toLowerCase(),
      searchValue: (row) =>
        `${row.productName} ${row.clientName} ${row.version ?? ""} ${row.commitSha ?? ""}`,
    },
    {
      id: "status",
      header: "Status",
      width: "132px",
      cell: (row) => <StatusPill registry="deploymentStatus" value={row.status} variant="dot" />,
      // Failures first: this table is scanned for what went wrong, not for what
      // routinely worked.
      sortValue: (row) =>
        ["FAILED", "ROLLED_BACK", "IN_PROGRESS", "PENDING", "SUCCEEDED"].indexOf(row.status),
      searchValue: (row) => statusOf("deploymentStatus", row.status).label,
    },
    {
      id: "environment",
      header: "Environment",
      width: "124px",
      cell: (row) => (
        <StatusPill registry="deployEnvironment" value={row.environment} variant="dot" />
      ),
      sortValue: (row) => row.environment,
      searchValue: (row) => row.environment,
    },
    {
      id: "version",
      header: "Version",
      width: "150px",
      mono: true,
      cell: (row) => (
        <span className="truncate">
          {row.version ?? "—"}
          {row.commitSha ? (
            <span className="ms-1.5 text-subtle-foreground">{row.commitSha.slice(0, 7)}</span>
          ) : null}
        </span>
      ),
      sortValue: (row) => row.version ?? "",
      searchValue: (row) => `${row.version ?? ""} ${row.commitSha ?? ""}`,
    },
    {
      id: "detail",
      header: "Detail",
      minWidth: "lg",
      cell: (row) => (
        <span className="block truncate text-muted-foreground">
          {row.failureReason ? (
            <span className="text-danger">{row.failureReason}</span>
          ) : row.rolledBackByNumber ? (
            `Rolled back by #${row.rolledBackByNumber}`
          ) : row.buildNumber ? (
            `From build #${row.buildNumber}`
          ) : (
            "—"
          )}
        </span>
      ),
      searchValue: (row) => row.failureReason ?? "",
    },
    {
      id: "triggeredBy",
      header: "Triggered by",
      width: "150px",
      defaultHidden: true,
      cell: (row) => (
        <span className="truncate text-muted-foreground">{row.triggeredBy ?? "—"}</span>
      ),
      searchValue: (row) => row.triggeredBy ?? "",
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
    <DataTable
      tableId="deployments"
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      rowHref={(row) => `/products/${row.productId}?tab=deployments`}
      mobile={{ title: "product", subtitle: "status", meta: ["environment", "at"] }}
      searchPlaceholder="Search product, version, commit…"
      initialSort={{ columnId: "at", dir: "asc" }}
      empty={<EmptyInline>No deployment matches those filters.</EmptyInline>}
    />
  );
}
