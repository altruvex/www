"use client";

import { FileSignature } from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { EmptyState } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { StatusPill } from "@/components/ui/badge";
import { money, when, date } from "@/lib/format";
import { statusOf } from "@/lib/status";

export interface ContractRow {
  id: string;
  clientId: string;
  clientName: string;
  projectType: string;
  value: number;
  currency: string;
  status: string;
  signatureMethod: string | null;
  createdAt: string;
  signedAt: string | null;
  signedByName: string | null;
  onboardingSent: boolean;
  /** The project delivering this contract, when one was created. */
  projectId: string | null;
  projectName: string | null;
}

export function ContractsTable({ rows }: { rows: ContractRow[] }) {
  const del = useRecordDelete({ entity: "contract" });
  const columns: Column<ContractRow>[] = [
    // Column 0 is the contract's own identity (scope + reference): DataTable
    // wraps it in the row link, so the client link cannot live here.
    {
      id: "contract",
      header: "Contract",
      hideable: false,
      cell: (row) => (
        <span className="truncate">
          {row.projectType}
          <span className="ms-1.5 font-mono text-micro text-subtle-foreground">
            {row.id.slice(0, 8).toUpperCase()}
          </span>
        </span>
      ),
      sortValue: (row) => row.projectType,
      searchValue: (row) => `${row.projectType} ${row.id.slice(0, 8)} ${row.signedByName ?? ""}`,
    },
    {
      id: "client",
      header: "Client",
      width: "180px",
      cell: (row) => (
        <EntityLink type="client" id={row.clientId} muted className="truncate">
          {row.clientName}
        </EntityLink>
      ),
      sortValue: (row) => row.clientName.toLowerCase(),
      searchValue: (row) => row.clientName,
    },
    {
      id: "value",
      header: "Value",
      width: "120px",
      align: "end",
      mono: true,
      cell: (row) => money(row.value, row.currency),
      sortValue: (row) => row.value,
    },
    {
      id: "status",
      header: "Status",
      width: "150px",
      cell: (row) => <StatusPill registry="contractStatus" value={row.status} variant="dot" />,
      sortValue: (row) => row.status,
      searchValue: (row) => statusOf("contractStatus", row.status).label,
    },
    {
      id: "signed",
      header: "Signed",
      width: "168px",
      cell: (row) =>
        row.signedAt ? (
          <span className="truncate text-muted-foreground">
            {date(row.signedAt)}
            {row.signedByName && <span className="ms-1.5 text-subtle-foreground">{row.signedByName}</span>}
          </span>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) => (row.signedAt ? new Date(row.signedAt).getTime() : 0),
      minWidth: "lg",
    },
    {
      id: "delivery",
      header: "Delivery",
      width: "160px",
      cell: (row) =>
        row.projectId ? (
          <EntityLink type="project" id={row.projectId} className="truncate">
            {row.projectName ?? "Project"}
          </EntityLink>
        ) : row.status === "SIGNED" ? (
          <span className="text-danger">No project yet</span>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) => (row.projectId ? 2 : row.status === "SIGNED" ? 0 : 1),
      minWidth: "xl",
    },
    {
      id: "onboarding",
      header: "Onboarding",
      width: "112px",
      cell: (row) =>
        row.status === "SIGNED" ? (
          row.onboardingSent ? (
            <span className="text-success">Sent</span>
          ) : (
            <span className="text-warning">Not sent</span>
          )
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) => (row.onboardingSent ? 1 : 0),
      minWidth: "xl",
      defaultHidden: true,
    },
    {
      id: "created",
      header: "Created",
      width: "108px",
      align: "end",
      cell: (row) => (
        <span className="font-mono text-meta tabular-nums text-muted-foreground">
          {when(row.createdAt)}
        </span>
      ),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
  ];

  return (
    <>
      <DataTable
        tableId="contracts"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        rowHref={(row) => `/contracts/${row.id}`}
        searchPlaceholder="Search contracts by client or signatory…"
        initialSort={{ columnId: "created", dir: "desc" }}
        mobile={{ title: "contract", subtitle: "client", meta: ["status", "value", "signed", "delivery"] }}
        rowActions={(row) => (
          <RowActions onDelete={() => del.request({ id: row.id, label: `${row.projectType} · ${row.clientName}` })} />
        )}
        empty={
          <EmptyState
            icon={FileSignature}
            title="No contracts in this view"
            body="Nothing here matches the current view. Contracts are generated from accepted proposals."
          />
        }
      />
      {del.dialog}
    </>
  );
}
