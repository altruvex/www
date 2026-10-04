"use client";

import Link from "next/link";
import { Siren } from "lucide-react";

import { DropdownMenuItem } from "@repo/ui";

import { DataTable, type Column } from "@/components/os/data-table";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { EmptyInline } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { StatusPill } from "@/components/ui/badge";
import { when } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { duration } from "./shared";

export interface BuildRow {
  id: string;
  number: number;
  productId: string;
  productName: string;
  clientId: string;
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
  inspectHref: string;
}

export function BuildsTable({
  rows,
  toolbar,
  empty,
  canDelete,
  canOpenIncident = false,
}: {
  rows: BuildRow[];
  toolbar?: React.ReactNode;
  empty: React.ReactNode;
  canDelete: boolean;
  canOpenIncident?: boolean;
}) {
  const del = useRecordDelete({ entity: "build" });
  const columns: Column<BuildRow>[] = [
    {
      id: "build",
      header: "Build",
      hideable: false,
      width: "160px",
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate font-mono">#{row.number}</span>
          <span className="block truncate font-mono text-meta font-normal text-subtle-foreground">
            {row.branch ?? "no branch"}
          </span>
        </span>
      ),
      sortValue: (row) => -row.number,
      searchValue: (row) =>
        `#${row.number} ${row.branch ?? ""} ${row.commitMessage ?? ""} ${row.commitSha ?? ""}`,
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
      width: "124px",
      cell: (row) => (
        <StatusPill registry="buildStatus" value={row.status} variant="dot" />
      ),
      sortValue: (row) =>
        ["FAILED", "RUNNING", "QUEUED", "CANCELLED", "SUCCEEDED"].indexOf(
          row.status,
        ),
      searchValue: (row) => statusOf("buildStatus", row.status).label,
    },
    {
      id: "environment",
      header: "Env",
      width: "116px",
      cell: (row) => (
        <StatusPill registry="deployEnvironment" value={row.environment} variant="dot" />
      ),
      sortValue: (row) => ["PRODUCTION", "STAGING", "PREVIEW"].indexOf(row.environment),
      searchValue: (row) => statusOf("deployEnvironment", row.environment).label,
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
      searchValue: (row) =>
        `${row.commitMessage ?? ""} ${row.failureReason ?? ""}`,
    },
    {
      id: "triggeredBy",
      header: "Triggered by",
      width: "150px",
      minWidth: "lg",
      cell: (row) => (
        <span className="block truncate text-muted-foreground">{row.triggeredBy ?? "—"}</span>
      ),
      sortValue: (row) => (row.triggeredBy ?? "").toLowerCase(),
      searchValue: (row) => row.triggeredBy ?? "",
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
      cell: (row) => (
        <span className="text-muted-foreground">{when(row.at)}</span>
      ),
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
        rowHref={(row) => row.inspectHref}
        mobile={{
          title: "build",
          subtitle: "product",
          meta: ["status", "environment", "at"],
        }}
        searchPlaceholder="Search product, branch, commit…"
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
                        label: `${row.productName} · build ${row.number}`,
                      })
                  : undefined
              }
            >
              {raise && (
                <DropdownMenuItem asChild>
                  <Link href={`/incidents?new=incident&product=${row.productId}`}>
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
