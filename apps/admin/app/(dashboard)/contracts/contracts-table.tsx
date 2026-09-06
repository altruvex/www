"use client";

import { DataTable, type Column } from "@/components/os/data-table";
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
  hasProject: boolean;
  signToken: string | null;
}

export function ContractsTable({ rows }: { rows: ContractRow[] }) {
  const columns: Column<ContractRow>[] = [
    {
      id: "client",
      header: "Client",
      hideable: false,
      cell: (row) => <span className="truncate">{row.clientName}</span>,
      sortValue: (row) => row.clientName.toLowerCase(),
      searchValue: (row) => `${row.clientName} ${row.projectType} ${row.signedByName ?? ""}`,
    },
    {
      id: "scope",
      header: "Scope",
      width: "160px",
      cell: (row) => <span className="truncate text-muted-foreground">{row.projectType}</span>,
      sortValue: (row) => row.projectType,
      minWidth: "lg",
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
      width: "128px",
      cell: (row) =>
        row.hasProject ? (
          <span className="text-success">Project created</span>
        ) : row.status === "SIGNED" ? (
          <span className="text-danger">No project yet</span>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) => (row.hasProject ? 2 : row.status === "SIGNED" ? 0 : 1),
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
    <DataTable
      tableId="contracts"
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      rowHref={(row) => `/contracts/${row.id}`}
      searchPlaceholder="Search contracts by client or signatory…"
      initialSort={{ columnId: "created", dir: "desc" }}
      mobile={{ title: "client", subtitle: "scope", meta: ["status", "value", "signed", "delivery"] }}
      empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No contracts.</div>}
    />
  );
}
