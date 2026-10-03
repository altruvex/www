"use client";

import { ExternalLink } from "lucide-react";

import { DataTable, type Column } from "@/components/os/data-table";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { EmptyInline } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { StatusPill } from "@/components/ui/badge";
import { when } from "@/lib/format";
import { statusOf } from "@/lib/status";

export interface DeploymentRow {
  id: string;
  number: number;
  productId: string;
  productName: string;
  clientId: string;
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
  /** `url` when it parses as http(s) — decided on the server; null means "do not link". */
  safeUrl: string | null;
  at: string;
}

export function DeploymentsTable({
  rows,
  toolbar,
  empty,
}: {
  rows: DeploymentRow[];
  toolbar?: React.ReactNode;
  empty: React.ReactNode;
}) {
  const del = useRecordDelete({ entity: "deployment" });
  const columns: Column<DeploymentRow>[] = [
    {
      // The identity column is the row's link (DataTable wraps it), so it holds
      // no links of its own; product and client get their own column below.
      id: "deployment",
      header: "Deploy",
      hideable: false,
      width: "140px",
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate font-mono">#{row.number}</span>
          <span className="block truncate font-mono text-meta font-normal text-subtle-foreground">
            {row.version ?? row.commitSha?.slice(0, 7) ?? "no version"}
          </span>
        </span>
      ),
      sortValue: (row) => -row.number,
      searchValue: (row) =>
        `#${row.number} ${row.version ?? ""} ${row.commitSha ?? ""}`,
    },
    {
      id: "product",
      header: "Product",
      cell: (row) => (
        <span className="block min-w-0 truncate">
          <EntityLink type="product" id={row.productId}>
            {row.productName}
          </EntityLink>
          <span className="text-subtle-foreground"> · </span>
          <EntityLink
            type="client"
            id={row.clientId}
            muted
            className="text-meta"
          >
            {row.clientName}
          </EntityLink>
        </span>
      ),
      sortValue: (row) => row.productName.toLowerCase(),
      searchValue: (row) => `${row.productName} ${row.clientName}`,
    },
    {
      id: "status",
      header: "Status",
      width: "132px",
      cell: (row) => (
        <StatusPill
          registry="deploymentStatus"
          value={row.status}
          variant="dot"
        />
      ),
      // Failures first: this table is scanned for what went wrong, not for what
      // routinely worked.
      sortValue: (row) =>
        [
          "FAILED",
          "ROLLED_BACK",
          "IN_PROGRESS",
          "PENDING",
          "SUCCEEDED",
        ].indexOf(row.status),
      searchValue: (row) => statusOf("deploymentStatus", row.status).label,
    },
    {
      id: "environment",
      header: "Environment",
      width: "124px",
      cell: (row) => (
        <StatusPill
          registry="deployEnvironment"
          value={row.environment}
          variant="dot"
        />
      ),
      sortValue: (row) => row.environment,
      searchValue: (row) => row.environment,
    },
    {
      id: "version",
      header: "Version",
      width: "150px",
      // The identity column already shows the version; this one adds the sha.
      defaultHidden: true,
      mono: true,
      cell: (row) => (
        <span className="truncate">
          {row.version ?? "—"}
          {row.commitSha ? (
            <span className="ms-1.5 text-subtle-foreground">
              {row.commitSha.slice(0, 7)}
            </span>
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
      id: "url",
      header: "URL",
      minWidth: "xl",
      defaultHidden: true,
      cell: (row) =>
        row.safeUrl ? (
          <a
            href={row.safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1 text-brand hover:underline"
          >
            <span className="truncate">
              {row.safeUrl.replace(/^https?:\/\//, "")}
            </span>
            <ExternalLink className="size-3 shrink-0" />
          </a>
        ) : (
          <span className="truncate text-muted-foreground">
            {row.url ?? "—"}
          </span>
        ),
      searchValue: (row) => row.url ?? "",
    },
    {
      id: "triggeredBy",
      header: "Triggered by",
      width: "150px",
      defaultHidden: true,
      cell: (row) => (
        <span className="truncate text-muted-foreground">
          {row.triggeredBy ?? "—"}
        </span>
      ),
      searchValue: (row) => row.triggeredBy ?? "",
    },
    {
      id: "at",
      header: "When",
      width: "120px",
      align: "end",
      cell: (row) => (
        <span className="text-muted-foreground">{when(row.at)}</span>
      ),
      sortValue: (row) => -Date.parse(row.at),
    },
  ];

  return (
    <>
      <DataTable
        tableId="deployments"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        rowHref={(row) => `/deployments/${row.id}`}
        mobile={{
          title: "deployment",
          subtitle: "product",
          meta: ["status", "environment", "at"],
        }}
        searchPlaceholder="Search product, version, commit…"
        initialSort={{ columnId: "at", dir: "asc" }}
        rowActions={(row) => (
          <RowActions
            onDelete={() =>
              del.request({
                id: row.id,
                label: `${row.productName} · deployment ${row.number}`,
              })
            }
          />
        )}
        // The list is one cursor page; DataTable's own pager would page inside it.
        pageSize={null}
        toolbar={toolbar}
        empty={<EmptyInline>{empty}</EmptyInline>}
      />
      {del.dialog}
    </>
  );
}
