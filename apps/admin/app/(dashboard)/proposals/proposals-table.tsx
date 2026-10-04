"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, CopyPlus, FileSignature, FileText, Send, Trash2 } from "lucide-react";
import { Button, DropdownMenuItem, Hint } from "@repo/ui";
import { DataTable, type Column } from "@/components/os/data-table";
import { EmptyState } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { inspectHref } from "@/components/os/inspect-sheet";
import { StatusPill } from "@/components/ui/badge";
import { money, when, date, daysFromNow } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";
import { needsNewVersion, newVersionHref } from "./reissue";

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
  deliveredAt: string | null;
  readAt: string | null;
  respondedAt: string | null;
  validUntil: string;
  contractId: string | null;
  pdfUrl: string | null;
  hasDocument: boolean;
}

export function ProposalsTable({
  rows,
  canDelete,
  filtered,
  canOpenClient,
  canPropose,
  canSend,
  canContract,
  canOpenContract,
}: {
  rows: ProposalRow[];
  canDelete: boolean;
  filtered: string | null;
  canOpenClient: boolean;
  canPropose: boolean;
  canSend: boolean;
  canContract: boolean;
  canOpenContract: boolean;
}) {
  const del = useRecordDelete({ entity: "proposal" });
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const columns: Column<ProposalRow>[] = [
    {
      id: "project",
      header: "Scope",
      hideable: false,
      cell: (row) => (
        <span className="truncate">
          {row.projectType}
          <span className="ms-1.5 text-subtle-foreground">{row.complexity}</span>
        </span>
      ),
      sortValue: (row) => `${row.projectType} ${row.complexity}`.toLowerCase(),
      searchValue: (row) => `${row.projectType} ${row.complexity}`,
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
        <Hint label="Sent · delivered · read · answered">
          <span
            role="img"
            aria-label={engagementLabel(row)}
            className="flex items-center gap-1"
          >
            <Step on={Boolean(row.sentAt)} />
            <Step on={Boolean(row.deliveredAt)} />
            <Step on={Boolean(row.readAt)} />
            <Step on={Boolean(row.respondedAt)} />
          </span>
        </Hint>
      ),
      sortValue: (row) =>
        (row.sentAt ? 1 : 0) +
        (row.deliveredAt ? 1 : 0) +
        (row.readAt ? 1 : 0) +
        (row.respondedAt ? 1 : 0),
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
        row.contractId ? (
          <Link href={`/contracts/${row.contractId}`} className="text-success hover:underline">
            Generated
          </Link>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) => (row.contractId ? 1 : 0),
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
        tableId="proposals"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        rowHref={(row) => inspectHref(pathname, searchParams, row.id)}
        searchPlaceholder="Search by client or scope…"
        initialSort={{ columnId: "created", dir: "desc" }}
        mobile={{ title: "project", subtitle: "client", meta: ["status", "value", "validity", "created"] }}
        selectable={canDelete}
        selectionNoun="proposal"
        bulkActions={
          canDelete
            ? [
                {
                  label: "Delete",
                  icon: Trash2,
                  destructive: true,
                  onRun: (selected) =>
                    del.request(
                      selected.map((row) => ({
                        id: row.id,
                        label: `${row.projectType} · ${row.clientName}`,
                      })),
                    ),
                },
              ]
            : undefined
        }
        rowActions={(row) => {
          const expired = (daysFromNow(row.validUntil) ?? 0) < 0;
          const generate = row.status === "ACCEPTED" && !row.contractId && canContract;
          const openContract = Boolean(row.contractId) && canOpenContract;
          const reissue = canPropose && needsNewVersion(row.status, row.validUntil);
          const send =
            canSend &&
            row.hasDocument &&
            (row.status === "DRAFT" || (row.status === "SENT" && !expired));
          if (!generate && !openContract && !reissue && !send && !canOpenClient && !canDelete)
            return null;
          return (
            <RowActions
              onDelete={
                canDelete
                  ? () =>
                      del.request({ id: row.id, label: `${row.projectType} · ${row.clientName}` })
                  : undefined
              }
            >
              {generate && (
                <DropdownMenuItem asChild>
                  <Link href={inspectHref(pathname, searchParams, row.id)} scroll={false}>
                    <FileSignature className="size-3.5" />
                    Generate contract…
                  </Link>
                </DropdownMenuItem>
              )}
              {openContract && (
                <DropdownMenuItem asChild>
                  <Link href={`/contracts/${row.contractId}`}>
                    <FileSignature className="size-3.5" />
                    Open the contract
                  </Link>
                </DropdownMenuItem>
              )}
              {send && (
                <DropdownMenuItem asChild>
                  <Link href={inspectHref(pathname, searchParams, row.id)} scroll={false}>
                    <Send className="size-3.5" />
                    {row.status === "DRAFT" ? "Send…" : "Resend…"}
                  </Link>
                </DropdownMenuItem>
              )}
              {reissue && (
                <DropdownMenuItem asChild>
                  <Link href={newVersionHref(row.clientId, row.id)}>
                    <CopyPlus className="size-3.5" />
                    New version
                  </Link>
                </DropdownMenuItem>
              )}
              {canOpenClient && (
                <DropdownMenuItem asChild>
                  <Link href={`/clients/${row.clientId}`}>
                    <Building2 className="size-3.5" />
                    Open client
                  </Link>
                </DropdownMenuItem>
              )}
            </RowActions>
          );
        }}
        empty={
          <EmptyState
            icon={FileText}
            title={filtered ? `No proposals in “${filtered}”` : "No proposals in this view"}
            body={
              filtered
                ? "Nothing matches this status. Pick another chip above, or All."
                : "Nothing here matches the search. Clear it, or quote a client from their record."
            }
            action={
              filtered ? (
                <Button asChild variant="outline">
                  <Link href="/proposals">All proposals</Link>
                </Button>
              ) : undefined
            }
          />
        }
      />
      {del.dialog}
    </>
  );
}

function engagementLabel(row: ProposalRow) {
  const steps = [
    ["Sent", row.sentAt],
    ["delivered", row.deliveredAt],
    ["read", row.readAt],
    ["answered", row.respondedAt],
  ] as const;
  return steps.map(([label, at]) => `${label}: ${at ? "yes" : "not yet"}`).join(", ");
}

function Step({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={cn("h-1 w-6 rounded-full", on ? "bg-brand" : "bg-surface-2")} />
  );
}
