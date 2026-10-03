"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Check, FileText, RotateCcw, Trash2 } from "lucide-react";
import { DropdownMenuItem } from "@repo/ui";
import { DataTable, type Column } from "@/components/os/data-table";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { EntityLink } from "@/components/os/entity-link";
import { StatusPill } from "@/components/ui/badge";
import { entityHref } from "@/lib/entity-links";
import { money, date, dueLabel } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-source";
import { statusOf } from "@/lib/status";
import { setPaymentStatus } from "@/app/(dashboard)/_actions/records";
import { issueInvoice } from "@/app/(dashboard)/_actions/billing";
import { RecordPaymentDialog, type RecordPaymentTarget } from "./record-payment-dialog";

export interface PaymentRow {
  id: string;
  /** What the row bills, as an entity-link target; null for a deleted retainer. */
  sourceType: "project" | "subscription" | "client_service" | null;
  sourceId: string | null;
  /** The project, the service, or "<Plan> retainer". */
  sourceName: string;
  clientId: string | null;
  clientName: string;
  milestone: string;
  amount: number;
  currency: string;
  /** Effective status: a PENDING row past its due day reads OVERDUE here. */
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  method: string | null;
  reference: string | null;
  invoiceNumber: string | null;
}

export function paymentRowLabel(row: PaymentRow): string {
  return `${statusOf("paymentMilestone", row.milestone).label} · ${row.sourceName}`;
}

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  const del = useRecordDelete({ entity: "payment" });
  const router = useRouter();
  const [, startTransition] = React.useTransition();
  const [recording, setRecording] = React.useState<RecordPaymentTarget | null>(null);

  // OVERDUE is derived from the due date and is deliberately not offered here:
  // the only statuses an operator sets by hand are PAID, WAIVED and PENDING.
  function bulk(status: "PAID" | "WAIVED" | "PENDING", label: string) {
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

  function issue(row: PaymentRow) {
    startTransition(async () => {
      const result = await issueInvoice(row.id);
      if (!result.ok) {
        toast.error("Invoice not issued", { description: result.message });
        return;
      }
      toast.success(`Issued ${result.invoiceNumber}`, { description: paymentRowLabel(row) });
      router.refresh();
    });
  }

  const columns: Column<PaymentRow>[] = [
    {
      id: "source",
      header: "Billed for",
      hideable: false,
      cell: (row) => {
        const href = entityHref(row.sourceType, row.sourceId);
        return (
          <span className="min-w-0">
            {href ? (
              <Link href={href} className="block truncate rounded-xs underline-offset-2 hover:underline">
                {row.sourceName}
              </Link>
            ) : (
              <span className="block truncate">{row.sourceName}</span>
            )}
            <span className="block truncate text-meta font-normal">
              <EntityLink type="client" id={row.clientId} muted>
                {row.clientName}
              </EntityLink>
            </span>
          </span>
        );
      },
      sortValue: (row) => row.sourceName.toLowerCase(),
      searchValue: (row) =>
        `${row.sourceName} ${row.clientName} ${row.reference ?? ""} ${row.invoiceNumber ?? ""}`,
    },
    {
      id: "milestone",
      header: "Milestone",
      width: "150px",
      cell: (row) => (
        <span className="text-muted-foreground">{statusOf("paymentMilestone", row.milestone).label}</span>
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
      width: "150px",
      cell: (row) =>
        row.status === "PAID" ? (
          <span className="text-success">
            Paid {date(row.paidAt)}
            {row.method && (
              <span className="block text-meta font-normal text-subtle-foreground">
                {paymentMethodLabel(row.method)}
              </span>
            )}
          </span>
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
      id: "invoice",
      header: "Invoice",
      width: "120px",
      mono: true,
      cell: (row) =>
        row.invoiceNumber ? (
          <Link href={`/invoices?payment=${row.id}`} className="rounded-xs underline-offset-2 hover:underline">
            {row.invoiceNumber}
          </Link>
        ) : row.status === "WAIVED" ? (
          <span className="text-subtle-foreground">—</span>
        ) : (
          <span className="text-subtle-foreground">Not issued</span>
        ),
      sortValue: (row) => row.invoiceNumber ?? "",
      searchValue: (row) => row.invoiceNumber ?? "",
      minWidth: "lg",
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
        searchPlaceholder="Search by project, client, invoice or reference…"
        initialSort={{ columnId: "status", dir: "asc" }}
        selectable
        selectionNoun="payment"
        mobile={{ title: "source", subtitle: "milestone", meta: ["status", "amount", "due"] }}
        bulkActions={[
          { label: "Mark paid", icon: Check, onRun: bulk("PAID", "marked paid") },
          { label: "Waive", icon: Ban, destructive: true, onRun: bulk("WAIVED", "waived") },
          {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            onRun: (selected) => del.request(selected.map((row) => ({ id: row.id, label: paymentRowLabel(row) }))),
          },
        ]}
        rowActions={(row) => (
          <RowActions onDelete={() => del.request({ id: row.id, label: paymentRowLabel(row) })}>
            {(row.status === "PENDING" || row.status === "OVERDUE") && (
              <DropdownMenuItem
                onSelect={() =>
                  setRecording({ id: row.id, label: paymentRowLabel(row), reference: row.reference })
                }
              >
                <Check className="size-3.5" />
                Record payment
              </DropdownMenuItem>
            )}
            {(row.status === "PAID" || row.status === "WAIVED") && (
              <DropdownMenuItem onSelect={() => bulk("PENDING", "set to pending")([row])}>
                <RotateCcw className="size-3.5" />
                Set back to pending
              </DropdownMenuItem>
            )}
            {!row.invoiceNumber && row.status !== "WAIVED" && (
              <DropdownMenuItem onSelect={() => issue(row)}>
                <FileText className="size-3.5" />
                Issue invoice
              </DropdownMenuItem>
            )}
          </RowActions>
        )}
        empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No payments match.</div>}
      />
      {recording && <RecordPaymentDialog target={recording} onClose={() => setRecording(null)} />}
      {del.dialog}
    </>
  );
}
