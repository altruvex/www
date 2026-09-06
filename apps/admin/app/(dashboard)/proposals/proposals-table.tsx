"use client";

import * as React from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/os/data-table";
import { StatusPill } from "@/components/ui/badge";
import { money, when, date, daysFromNow } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";

export interface ProposalRow {
  id: string;
  clientId: string;
  clientName: string;
  projectType: string;
  complexity: string;
  totalPrice: number;
  currency: string;
  timelineWeeks: number;
  status: string;
  createdAt: string;
  sentAt: string | null;
  readAt: string | null;
  respondedAt: string | null;
  validUntil: string;
  hasContract: boolean;
  pdfUrl: string | null;
}

export function ProposalsTable({ rows }: { rows: ProposalRow[] }) {
  const columns: Column<ProposalRow>[] = [
    {
      id: "client",
      header: "Client",
      hideable: false,
      cell: (row) => <span className="truncate">{row.clientName}</span>,
      sortValue: (row) => row.clientName.toLowerCase(),
      searchValue: (row) => `${row.clientName} ${row.projectType} ${row.complexity}`,
    },
    {
      id: "project",
      header: "Scope",
      width: "160px",
      cell: (row) => (
        <span className="truncate text-muted-foreground">
          {row.projectType}
          <span className="ms-1.5 text-subtle-foreground">{row.complexity}</span>
        </span>
      ),
      sortValue: (row) => row.projectType,
      minWidth: "lg",
    },
    {
      id: "value",
      header: "Value",
      width: "120px",
      align: "end",
      mono: true,
      cell: (row) => money(row.totalPrice, row.currency),
      sortValue: (row) => row.totalPrice,
    },
    {
      id: "weeks",
      header: "Weeks",
      width: "72px",
      align: "end",
      mono: true,
      cell: (row) => row.timelineWeeks,
      sortValue: (row) => row.timelineWeeks,
      minWidth: "xl",
      defaultHidden: true,
    },
    {
      id: "status",
      header: "Status",
      width: "128px",
      cell: (row) => <StatusPill registry="proposalStatus" value={row.status} variant="dot" />,
      sortValue: (row) => row.status,
      searchValue: (row) => statusOf("proposalStatus", row.status).label,
    },
    {
      id: "engagement",
      header: "Engagement",
      width: "140px",
      cell: (row) => (
        <span className="flex items-center gap-1" title="Sent · delivered · read · answered">
          <Step on={Boolean(row.sentAt)} label="Sent" />
          <Step on={Boolean(row.sentAt)} label="Delivered" />
          <Step on={Boolean(row.readAt)} label="Read" />
          <Step on={Boolean(row.respondedAt)} label="Answered" />
        </span>
      ),
      sortValue: (row) =>
        (row.sentAt ? 1 : 0) + (row.readAt ? 1 : 0) + (row.respondedAt ? 1 : 0),
      minWidth: "lg",
    },
    {
      id: "validity",
      header: "Valid until",
      width: "128px",
      align: "end",
      cell: (row) => {
        const days = daysFromNow(row.validUntil);
        const expired = days != null && days < 0;
        const soon = days != null && days >= 0 && days <= 7;
        if (["ACCEPTED", "REJECTED"].includes(row.status))
          return <span className="text-subtle-foreground">—</span>;
        return (
          <span
            className={cn(
              "font-mono text-meta tabular-nums",
              expired ? "text-danger" : soon ? "text-warning" : "text-muted-foreground",
            )}
          >
            {expired ? `expired ${Math.abs(days!)}d ago` : date(row.validUntil)}
          </span>
        );
      },
      sortValue: (row) => new Date(row.validUntil).getTime(),
      minWidth: "xl",
    },
    {
      id: "contract",
      header: "Contract",
      width: "96px",
      cell: (row) =>
        row.hasContract ? (
          <Link href={`/contracts?proposal=${row.id}`} className="text-success hover:underline">
            Generated
          </Link>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) => (row.hasContract ? 1 : 0),
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
      tableId="proposals"
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      rowHref={(row) => `/proposals/${row.id}`}
      searchPlaceholder="Search by client or scope…"
      initialSort={{ columnId: "created", dir: "desc" }}
      mobile={{ title: "client", subtitle: "project", meta: ["status", "value", "validity", "created"] }}
      empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No proposals.</div>}
    />
  );
}

/** Four dots that read as a delivery funnel at 13px. */
function Step({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      title={`${label}: ${on ? "yes" : "not yet"}`}
      className={cn("h-1 w-6 rounded-full", on ? "bg-brand" : "bg-surface-2")}
    />
  );
}
