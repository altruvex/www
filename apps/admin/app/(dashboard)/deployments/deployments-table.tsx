"use client";

import Link from "next/link";
import { ExternalLink, Siren } from "lucide-react";

import { DropdownMenuItem } from "@repo/ui";

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
  safeUrl: string | null;
  at: string;
  inspectHref: string;
}

export function DeploymentsTable({
  rows,
  toolbar,
  empty,
  canDelete,
  canOpenIncident = false,
}: {
  rows: DeploymentRow[];
  toolbar?: React.ReactNode;
  empty: React.ReactNode;
  canDelete: boolean;
  canOpenIncident?: boolean;
}) {
  const del = useRecordDelete({ entity: "deployment" });
  const columns: Column<DeploymentRow>[] = [
    {
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
        rowHref={(row) => row.inspectHref}
        mobile={{
          title: "deployment",
          subtitle: "product",
          meta: ["status", "environment", "at"],
        }}
        searchPlaceholder="Search product, version, commit…"
        initialSort={{ columnId: "at", dir: "asc" }}
        rowActions={canDelete || canOpenIncident ? (row) => {
          const raise = canOpenIncident && row.status === "FAILED";
          if (!canDelete && !raise) return null;
          return (
            <RowActions
              onDelete={
                canDelete
                  ? () =>
                      del.request({
                        id: row.id,
                        label: `${row.productName} · deployment ${row.number}`,
                      })
                  : undefined
              }
            >
              {raise && (
                <DropdownMenuItem asChild>
                  <Link
                    href={`/incidents?new=incident&product=${row.productId}&deployment=${row.id}`}
                  >
                    <Siren className="size-3.5" />
                    Open an incident
                  </Link>
                </DropdownMenuItem>
              )}
            </RowActions>
          );
        } : undefined}
        pageSize={null}
        toolbar={toolbar}
        empty={<EmptyInline>{empty}</EmptyInline>}
      />
      {del.dialog}
    </>
  );
}
