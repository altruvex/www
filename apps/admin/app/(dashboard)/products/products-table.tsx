"use client";

import { DataTable, type Column } from "@/components/os/data-table";
import { EmptyInline } from "@/components/os/empty-state";
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
  lastDeployedAt: string | null;
  lastDeploymentNumber: number | null;
  lastDeploymentVersion: string | null;
  openIncidents: number;
  deploymentCount: number;
  /** False when no CI has ever been pointed at this product. */
  hasIngestToken: boolean;
}

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  const columns: Column<ProductRow>[] = [
    {
      id: "name",
      header: "Product",
      hideable: false,
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate">{row.name}</span>
          <span className="block truncate text-meta font-normal text-subtle-foreground">
            {row.clientName}
          </span>
        </span>
      ),
      sortValue: (row) => row.name.toLowerCase(),
      searchValue: (row) => `${row.name} ${row.slug} ${row.clientName} ${row.projectName ?? ""}`,
    },
    {
      id: "status",
      header: "Status",
      width: "128px",
      cell: (row) => <StatusPill registry="productStatus" value={row.status} />,
      sortValue: (row) =>
        ["LIVE", "IN_DEVELOPMENT", "MAINTENANCE", "PLANNED", "SUNSET"].indexOf(row.status),
      searchValue: (row) => statusOf("productStatus", row.status).label,
    },
    {
      id: "kind",
      header: "Type",
      width: "120px",
      cell: (row) => (
        <span className="text-muted-foreground">{statusOf("productKind", row.kind).label}</span>
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
      header: "Last deploy",
      width: "160px",
      cell: (row) =>
        row.lastDeployedAt ? (
          <span className="min-w-0">
            <span className="block truncate">{when(row.lastDeployedAt)}</span>
            <span className="block truncate text-meta font-normal text-subtle-foreground">
              #{row.lastDeploymentNumber}
              {row.lastDeploymentVersion ? ` · ${row.lastDeploymentVersion}` : ""}
            </span>
          </span>
        ) : (
          // Two different kinds of "never deployed" — one is a missing pipeline,
          // the other is a product that simply has not shipped yet. Saying which
          // is the difference between a to-do and a non-event.
          <span className="text-meta text-subtle-foreground">
            {row.hasIngestToken ? "Never" : "No CI connected"}
          </span>
        ),
      sortValue: (row) => -(row.lastDeployedAt ? Date.parse(row.lastDeployedAt) : 0),
      searchValue: (row) => row.lastDeploymentVersion ?? "",
    },
    {
      id: "stack",
      header: "Stack",
      width: "160px",
      defaultHidden: true,
      cell: (row) => (
        <span className="truncate text-muted-foreground">
          {[row.framework, row.hostingProvider].filter(Boolean).join(" · ") || "—"}
        </span>
      ),
      searchValue: (row) => `${row.framework ?? ""} ${row.hostingProvider ?? ""}`,
    },
  ];

  return (
    <DataTable
      tableId="products"
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      rowHref={(row) => `/products/${row.id}`}
      mobile={{ title: "name", subtitle: "status", meta: ["kind", "deployed"] }}
      searchPlaceholder="Search products, clients, slugs…"
      initialSort={{ columnId: "incidents", dir: "asc" }}
      empty={
        <EmptyInline>
          No product matches those filters.
        </EmptyInline>
      }
    />
  );
}
