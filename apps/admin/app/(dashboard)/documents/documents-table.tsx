"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { StatusPill } from "@/components/ui/badge";
import { when } from "@/lib/format";
import type { RegistryName } from "@/lib/status";

export interface DocumentRow {
  id: string;
  name: string;
  category: string;
  url: string;
  ownerName: string;
  clientId: string;
  clientName: string;
  entityHref: string;
  entityLabel: string;
  status: string;
  statusRegistry: RegistryName;
  createdAt: string;
  updatedAt: string;
}

export function DocumentsTable({ rows }: { rows: DocumentRow[] }) {
  const columns: Column<DocumentRow>[] = [
    {
      id: "name",
      header: "Document",
      hideable: false,
      cell: (row) => <span className="truncate">{row.name}</span>,
      sortValue: (row) => row.name.toLowerCase(),
      searchValue: (row) => `${row.name} ${row.category} ${row.clientName}`,
    },
    {
      id: "category",
      header: "Category",
      width: "132px",
      cell: (row) => <span className="text-muted-foreground">{row.category}</span>,
      sortValue: (row) => row.category,
      minWidth: "xl",
    },
    {
      id: "client",
      header: "Client",
      width: "160px",
      cell: (row) => (
        <Link href={`/clients/${row.clientId}`} className="truncate hover:text-brand">
          {row.clientName}
        </Link>
      ),
      sortValue: (row) => row.clientName.toLowerCase(),
      minWidth: "md",
    },
    {
      id: "entity",
      header: "Belongs to",
      width: "112px",
      cell: (row) => (
        <Link href={row.entityHref} className="text-muted-foreground hover:text-brand">
          {row.entityLabel} →
        </Link>
      ),
      minWidth: "xl",
    },
    {
      id: "status",
      header: "Record status",
      width: "128px",
      cell: (row) => <StatusPill registry={row.statusRegistry} value={row.status} variant="dot" />,
      sortValue: (row) => row.status,
      minWidth: "lg",
    },
    {
      id: "owner",
      header: "Owner",
      width: "128px",
      cell: (row) => <span className="truncate text-muted-foreground">{row.ownerName}</span>,
      sortValue: (row) => row.ownerName,
      minWidth: "xl",
      defaultHidden: true,
    },
    {
      id: "created",
      header: "Created",
      width: "100px",
      align: "end",
      cell: (row) => (
        <span className="font-mono text-meta tabular-nums text-muted-foreground">
          {when(row.createdAt)}
        </span>
      ),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
    {
      id: "open",
      header: "",
      width: "68px",
      align: "end",
      hideable: false,
      cell: (row) => (
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-6 items-center gap-1 rounded-sm border border-border px-1.5 text-meta hover:bg-surface"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="size-3" />
          Open
        </a>
      ),
    },
  ];

  return (
    <DataTable
      tableId="documents"
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      searchPlaceholder="Search documents…"
      initialSort={{ columnId: "created", dir: "desc" }}
      mobile={{ title: "name", subtitle: "client", meta: ["category", "status", "created"] }}
      empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No documents.</div>}
    />
  );
}
