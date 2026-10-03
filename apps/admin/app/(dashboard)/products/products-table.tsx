"use client";

import Link from "next/link";

import { DataTable, type Column } from "@/components/os/data-table";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { EmptyInline } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { when } from "@/lib/format";
import { statusOf } from "@/lib/status";

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  kind: string;
  status: string;
  clientId: string;
  clientName: string;
  projectId: string | null;
  projectName: string | null;
  productionUrl: string | null;
  stagingUrl: string | null;
  repositoryUrl: string | null;
  framework: string | null;
  hostingProvider: string | null;
  /** The last successful PRODUCTION deploy — what the client's visitors are running. */
  lastProductionId: string | null;
  lastProductionAt: string | null;
  lastProductionNumber: number | null;
  lastProductionVersion: string | null;
  openIncidents: number;
  deploymentCount: number;
  /** False when no CI has ever been pointed at this product. */
  hasIngestToken: boolean;
}

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  const del = useRecordDelete({ entity: "product" });
  const columns: Column<ProductRow>[] = [
    {
      id: "name",
      header: "Product",
      hideable: false,
      // The row's own link wraps this cell, so client and project — which are
      // links of their own — live in the next column rather than nested here.
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate">{row.name}</span>
          <span className="block truncate font-mono text-meta font-normal text-subtle-foreground">
            {row.slug}
          </span>
        </span>
      ),
      sortValue: (row) => row.name.toLowerCase(),
      searchValue: (row) =>
        `${row.name} ${row.slug} ${row.clientName} ${row.projectName ?? ""}`,
    },
    {
      id: "client",
      header: "Client",
      cell: (row) => (
        <span className="min-w-0">
          <EntityLink
            type="client"
            id={row.clientId}
            className="block truncate"
          >
            {row.clientName}
          </EntityLink>
          {row.projectId ? (
            <EntityLink
              type="project"
              id={row.projectId}
              muted
              className="block truncate text-meta"
            >
              {row.projectName}
            </EntityLink>
          ) : (
            <span className="block truncate text-meta text-subtle-foreground">
              No project
            </span>
          )}
        </span>
      ),
      sortValue: (row) => row.clientName.toLowerCase(),
      searchValue: (row) => `${row.clientName} ${row.projectName ?? ""}`,
    },
    {
      id: "status",
      header: "Status",
      width: "128px",
      cell: (row) => <StatusPill registry="productStatus" value={row.status} />,
      sortValue: (row) =>
        ["LIVE", "IN_DEVELOPMENT", "MAINTENANCE", "PLANNED", "SUNSET"].indexOf(
          row.status,
        ),
      searchValue: (row) => statusOf("productStatus", row.status).label,
    },
    {
      id: "kind",
      header: "Type",
      width: "120px",
      cell: (row) => (
        <span className="text-muted-foreground">
          {statusOf("productKind", row.kind).label}
        </span>
      ),
      sortValue: (row) => row.kind,
      searchValue: (row) => statusOf("productKind", row.kind).label,
    },
    {
      id: "incidents",
      header: "Open incidents",
      width: "128px",
      align: "end",
      cell: (row) =>
        row.openIncidents > 0 ? (
          <ToneBadge tone="danger">{row.openIncidents}</ToneBadge>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) => -row.openIncidents,
    },
    {
      id: "deployed",
      header: "Last production deploy",
      width: "180px",
      cell: (row) =>
        row.lastProductionId && row.lastProductionAt ? (
          <Link
            href={`/deployments/${row.lastProductionId}`}
            className="group block min-w-0"
          >
            <span className="block truncate group-hover:underline">
              {when(row.lastProductionAt)}
            </span>
            <span className="block truncate text-meta font-normal text-subtle-foreground">
              #{row.lastProductionNumber}
              {row.lastProductionVersion
                ? ` · ${row.lastProductionVersion}`
                : ""}
            </span>
          </Link>
        ) : (
          // Two different kinds of "never deployed" — one is a missing pipeline,
          // the other is a product that simply has not shipped yet. Saying which
          // is the difference between a to-do and a non-event.
          <span className="text-meta text-subtle-foreground">
            {row.hasIngestToken ? "Never to production" : "No CI connected"}
          </span>
        ),
      sortValue: (row) =>
        -(row.lastProductionAt ? Date.parse(row.lastProductionAt) : 0),
      searchValue: (row) => row.lastProductionVersion ?? "",
    },
    {
      id: "stack",
      header: "Stack",
      width: "160px",
      defaultHidden: true,
      cell: (row) => (
        <span className="truncate text-muted-foreground">
          {[row.framework, row.hostingProvider].filter(Boolean).join(" · ") ||
            "—"}
        </span>
      ),
      searchValue: (row) =>
        `${row.framework ?? ""} ${row.hostingProvider ?? ""}`,
    },
  ];

  return (
    <>
      <DataTable
        tableId="products"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        rowHref={(row) => `/products/${row.id}`}
        mobile={{
          title: "name",
          subtitle: "client",
          meta: ["status", "deployed"],
        }}
        searchPlaceholder="Search products, clients, slugs…"
        initialSort={{ columnId: "incidents", dir: "asc" }}
        rowActions={(row) => (
          <RowActions
            onDelete={() => del.request({ id: row.id, label: row.name })}
          />
        )}
        empty={<EmptyInline>No product matches those filters.</EmptyInline>}
      />
      {del.dialog}
    </>
  );
}
