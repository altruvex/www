"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Check, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { StatusPill } from "@/components/ui/badge";
import { money, date, dueLabel } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { setPaymentStatus } from "@/app/(dashboard)/_actions/records";

export interface PaymentRow {
  id: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  milestone: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  method: string | null;
  reference: string | null;
}

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  const del = useRecordDelete({ entity: "payment" });
  const router = useRouter();
  const [, startTransition] = React.useTransition();

  function bulk(status: string, label: string) {
    return (selected: PaymentRow[]) => {
      startTransition(async () => {
        try {
          for (const row of selected) await setPaymentStatus(row.id, status);
          toast.success(`${selected.length} payment${selected.length === 1 ? "" : "s"} ${label}`);
          router.refresh();
        } catch (error) {
          toast.error("Could not update", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });
    };
  }

  const columns: Column<PaymentRow>[] = [
    {
      id: "project",
      header: "Project",
      hideable: false,
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate">{row.projectName}</span>
          <span className="block truncate text-meta font-normal text-subtle-foreground">
            {row.clientName}
          </span>
        </span>
      ),
      sortValue: (row) => row.projectName.toLowerCase(),
      searchValue: (row) => `${row.projectName} ${row.clientName} ${row.reference ?? ""}`,
    },
    {
      id: "milestone",
      header: "Milestone",
      width: "150px",
      cell: (row) => (
        <span className="text-muted-foreground">
          {statusOf("paymentMilestone", row.milestone).label}
        </span>
      ),
      sortValue: (row) => row.milestone,
    },
    {
      id: "amount",
      header: "Amount",
      width: "120px",
      align: "end",
      mono: true,
      cell: (row) => money(row.amount, row.currency),
      sortValue: (row) => row.amount,
    },
    {
      id: "status",
      header: "Status",
      width: "116px",
      cell: (row) => <StatusPill registry="paymentStatus" value={row.status} variant="dot" />,
      sortValue: (row) => ["OVERDUE", "PENDING", "PAID", "WAIVED"].indexOf(row.status),
      searchValue: (row) => statusOf("paymentStatus", row.status).label,
    },
    {
      id: "due",
      header: "Due",
      width: "140px",
      cell: (row) =>
        row.status === "PAID" ? (
          <span className="text-success">Paid {date(row.paidAt)}</span>
        ) : row.dueDate ? (
          <span className={row.status === "OVERDUE" ? "text-danger" : "text-muted-foreground"}>
            {dueLabel(row.dueDate)}
          </span>
        ) : (
          <span className="text-subtle-foreground">No date</span>
        ),
      sortValue: (row) => (row.dueDate ? new Date(row.dueDate).getTime() : Number.MAX_SAFE_INTEGER),
    },
    {
      id: "reference",
      header: "Reference",
      width: "150px",
      mono: true,
      cell: (row) => row.reference ?? <span className="text-subtle-foreground">—</span>,
      searchValue: (row) => row.reference ?? "",
      minWidth: "xl",
      defaultHidden: true,
    },
  ];

  return (
    <>
      <DataTable
        tableId="payments"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        rowHref={(row) => `/projects/${row.projectId}?tab=financials`}
        searchPlaceholder="Search by project, client or reference…"
        initialSort={{ columnId: "status", dir: "asc" }}
        selectable
        selectionNoun="payment"
        mobile={{ title: "project", subtitle: "milestone", meta: ["status", "amount", "due"] }}
        bulkActions={[
          { label: "Mark paid", icon: Check, onRun: bulk("PAID", "marked paid") },
          { label: "Waive", icon: Ban, destructive: true, onRun: bulk("WAIVED", "waived") },
          {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            onRun: (selected) =>
              del.request(selected.map((row) => ({ id: row.id, label: `${row.milestone} · ${row.projectName}` }))),
          },
        ]}
        rowActions={(row) => (
          <RowActions onDelete={() => del.request({ id: row.id, label: `${row.milestone} · ${row.projectName}` })} />
        )}
        empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No payments.</div>}
      />
      {del.dialog}
    </>
  );
}
