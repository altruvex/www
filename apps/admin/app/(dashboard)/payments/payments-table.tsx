"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Ban,
  Building2,
  Check,
  FileText,
  FolderKanban,
  Globe,
  MoreHorizontal,
  Repeat,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { DataTable, type Column } from "@/components/os/data-table";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { EntityLink } from "@/components/os/entity-link";
import { inspectHref } from "@/components/os/inspect-sheet";
import { StatusPill } from "@/components/ui/badge";
import { entityHref } from "@/lib/entity-links";
import {
  money,
  date,
  dueLabel,
  moneyByCurrency,
  sumByCurrency,
} from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-source";
import { statusOf } from "@/lib/status";
import {
  issueInvoice,
  reopenPayment,
  waivePayments,
} from "@/app/(dashboard)/_actions/billing";
import {
  RecordPaymentDialog,
  type RecordPaymentTarget,
} from "./record-payment-dialog";

export interface PaymentRow {
  id: string;
  sourceType: "project" | "subscription" | "client_service" | null;
  sourceId: string | null;
  sourceName: string;
  clientId: string | null;
  clientName: string;
  milestone: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  method: string | null;
  reference: string | null;
  invoiceNumber: string | null;
  previousPaidOn?: string | null;
}

export const SOURCE_LINK = {
  project: { label: "Open project", icon: FolderKanban },
  subscription: { label: "Open retainer", icon: Repeat },
  client_service: { label: "Open service", icon: Globe },
} as const;

export function paymentRowLabel(row: PaymentRow): string {
  return `${statusOf("paymentMilestone", row.milestone).label} · ${row.sourceName}`;
}

export function selectionSummary(rows: PaymentRow[]): string {
  return `${rows.length} payment${rows.length === 1 ? "" : "s"} · ${moneyByCurrency(sumByCurrency(rows), true) || "0"}`;
}

function PaymentRowMenu({
  children,
}: {
  children: React.ReactNode;
  onDelete?: () => void;
}) {
  return (
    // Not modal: a modal menu that opens a modal dialog leaves body pointer-events stuck at none.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Row actions"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type Pending =
  | { kind: "record"; targets: RecordPaymentTarget[]; summary: string }
  | { kind: "waive"; rows: PaymentRow[] }
  | { kind: "reopen"; row: PaymentRow }
  | null;

export function PaymentsTable({
  rows,
  canDelete = false,
  canEdit = true,
}: {
  rows: PaymentRow[];
  canDelete?: boolean;
  canEdit?: boolean;
}) {
  const del = useRecordDelete({ entity: "payment" });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = React.useTransition();
  const [pending, setPending] = React.useState<Pending>(null);

  const toTarget = (row: PaymentRow): RecordPaymentTarget => ({
    id: row.id,
    label: paymentRowLabel(row),
    amountLabel: money(row.amount, row.currency),
    reference: row.reference,
    previousPaidOn: row.previousPaidOn ?? null,
  });

  const unpaid = (row: PaymentRow) =>
    row.status === "PENDING" || row.status === "OVERDUE";

  function issue(row: PaymentRow) {
    startTransition(async () => {
      const result = await issueInvoice(row.id);
      if (!result.ok) {
        toast.error("Invoice not issued", { description: result.message });
        return;
      }
      toast.success(`Issued ${result.invoiceNumber}`, {
        description: paymentRowLabel(row),
      });
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
              <Link
                href={href}
                onClick={(event) => event.stopPropagation()}
                className="block truncate rounded-xs underline-offset-2 hover:underline"
              >
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
      cell: (row) => (
        <StatusPill registry="paymentStatus" value={row.status} variant="dot" />
      ),
      sortValue: (row) =>
        ["OVERDUE", "PENDING", "PAID", "WAIVED"].indexOf(row.status),
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
          <span
            className={
              row.status === "OVERDUE" ? "text-danger" : "text-muted-foreground"
            }
          >
            {dueLabel(row.dueDate)}
          </span>
        ) : (
          <span className="text-subtle-foreground">No date</span>
        ),
      sortValue: (row) =>
        row.dueDate ? new Date(row.dueDate).getTime() : Number.MAX_SAFE_INTEGER,
    },
    {
      id: "invoice",
      header: "Invoice",
      width: "120px",
      mono: true,
      cell: (row) =>
        row.invoiceNumber ? (
          <Link
            href={`/invoices?inspect=${row.id}`}
            onClick={(event) => event.stopPropagation()}
            className="rounded-xs underline-offset-2 hover:underline"
          >
            {row.invoiceNumber}
          </Link>
        ) : row.status === "WAIVED" ? (
          <span className="text-subtle-foreground">—</span>
        ) : canEdit ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              issue(row);
            }}
            className="rounded-xs font-sans text-meta text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Issue invoice
          </button>
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
      cell: (row) =>
        row.reference ?? <span className="text-subtle-foreground">—</span>,
      searchValue: (row) => row.reference ?? "",
      minWidth: "xl",
      defaultHidden: true,
    },
  ];

  const waiveRows = pending?.kind === "waive" ? pending.rows : [];
  const waivable = waiveRows.filter(unpaid);
  const collected = waiveRows.filter((row) => row.status === "PAID").length;
  const alreadyWaived = waiveRows.filter(
    (row) => row.status === "WAIVED",
  ).length;

  return (
    <>
      <DataTable
        tableId="payments"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        onRowClick={(row) =>
          router.push(inspectHref(pathname, searchParams, row.id), {
            scroll: false,
          })
        }
        searchPlaceholder="Search by project, client, invoice or reference…"
        initialSort={{ columnId: "status", dir: "asc" }}
        selectable
        selectionNoun="payment"
        mobile={{
          title: "source",
          subtitle: "milestone",
          meta: ["status", "amount", "due"],
        }}
        bulkActions={[
          ...(canEdit
            ? [
                {
                  label: "Mark paid",
                  icon: Check,
                  onRun: (selected: PaymentRow[]) => {
                    const payable = selected.filter(unpaid);
                    if (payable.length === 0) {
                      toast.error("Nothing to record", {
                        description:
                          "Every selected payment is already paid or waived.",
                      });
                      return;
                    }
                    const skipped = selected.length - payable.length;
                    setPending({
                      kind: "record",
                      targets: payable.map(toTarget),
                      summary:
                        selectionSummary(payable) +
                        (skipped > 0
                          ? ` (${skipped} already paid or waived, left out)`
                          : ""),
                    });
                  },
                },
                {
                  label: "Waive",
                  icon: Ban,
                  destructive: true,
                  onRun: (selected: PaymentRow[]) =>
                    setPending({ kind: "waive", rows: selected }),
                },
              ]
            : []),
          ...(canDelete
            ? [
                {
                  label: "Delete",
                  icon: Trash2,
                  destructive: true,
                  onRun: (selected: PaymentRow[]) =>
                    del.request(
                      selected.map((row) => ({
                        id: row.id,
                        label: paymentRowLabel(row),
                      })),
                    ),
                },
              ]
            : []),
        ]}
        rowActions={(row) => {
          const Menu = canDelete ? RowActions : PaymentRowMenu;
          const sourceLink = entityHref(row.sourceType, row.sourceId);
          const sourceHref = sourceLink && row.sourceType === "project" ? `${sourceLink}#money` : sourceLink;
          const source = row.sourceType ? SOURCE_LINK[row.sourceType] : null;
          return (
            <Menu
              onDelete={() =>
                del.request({ id: row.id, label: paymentRowLabel(row) })
              }
            >
              {sourceHref && source && (
                <DropdownMenuItem asChild>
                  <Link href={sourceHref}>
                    <source.icon className="size-3.5" />
                    {source.label}
                  </Link>
                </DropdownMenuItem>
              )}
              {row.clientId && (
                <DropdownMenuItem asChild>
                  <Link href={`/clients/${row.clientId}#money`}>
                    <Building2 className="size-3.5" />
                    Open client
                  </Link>
                </DropdownMenuItem>
              )}
              {canEdit && unpaid(row) && (
                <DropdownMenuItem
                  onSelect={() =>
                    setPending({
                      kind: "record",
                      targets: [toTarget(row)],
                      summary: selectionSummary([row]),
                    })
                  }
                >
                  <Check className="size-3.5" />
                  Record payment
                </DropdownMenuItem>
              )}
              {canEdit && unpaid(row) && (
                <DropdownMenuItem
                  onSelect={() => setPending({ kind: "waive", rows: [row] })}
                >
                  <Ban className="size-3.5" />
                  Waive
                </DropdownMenuItem>
              )}
              {canEdit &&
                (row.status === "PAID" || row.status === "WAIVED") && (
                  <DropdownMenuItem
                    onSelect={() => setPending({ kind: "reopen", row })}
                  >
                    <RotateCcw className="size-3.5" />
                    Set back to pending
                  </DropdownMenuItem>
                )}
              {canEdit && !row.invoiceNumber && row.status !== "WAIVED" && (
                <DropdownMenuItem onSelect={() => issue(row)}>
                  <FileText className="size-3.5" />
                  Issue invoice
                </DropdownMenuItem>
              )}
            </Menu>
          );
        }}
        empty={
          <div className="plane px-6 py-12 text-center text-muted-foreground">
            No payments match.
          </div>
        }
      />

      {pending?.kind === "record" && (
        <RecordPaymentDialog
          targets={pending.targets}
          summary={pending.summary}
          onClose={() => setPending(null)}
        />
      )}

      {pending?.kind === "waive" && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          tone="danger"
          title={
            waiveRows.length === 1
              ? "Waive this payment?"
              : `Waive ${waiveRows.length} payments?`
          }
          body={
            <>
              {waiveRows.length === 1
                ? paymentRowLabel(waiveRows[0]!)
                : "Nothing will be owed on them; each one is written to the audit trail."}
              {collected > 0 && (
                <span className="mt-1 block text-warning">
                  {collected} of these {collected === 1 ? "was" : "were"}{" "}
                  already collected and will be refused — returning money is a
                  refund, which needs a payment provider.
                </span>
              )}
              {alreadyWaived > 0 && (
                <span className="mt-1 block text-subtle-foreground">
                  {alreadyWaived} of these {alreadyWaived === 1 ? "is" : "are"}{" "}
                  already waived and left out.
                </span>
              )}
            </>
          }
          consequence={`Waives ${selectionSummary(waivable)}. The payment can be set back to pending later.`}
          confirmLabel={
            waiveRows.length === 1 ? "Waive" : `Waive ${waivable.length}`
          }
          onConfirm={async () => {
            if (waivable.length === 0)
              return {
                ok: false,
                message:
                  "Every selected payment was already collected or waived.",
              };
            const result = await waivePayments(waivable.map((row) => row.id));
            if (result.ok) router.refresh();
            return { ok: result.ok, message: result.message };
          }}
        />
      )}

      {pending?.kind === "reopen" && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          title="Set back to pending?"
          body={paymentRowLabel(pending.row)}
          consequence={
            pending.row.status === "PAID"
              ? `${money(pending.row.amount, pending.row.currency)} reads as owed again and the paid date (${date(pending.row.paidAt)}) is cleared. The audit trail keeps it, and recording the payment again offers that day back.`
              : `${money(pending.row.amount, pending.row.currency)} reads as owed again.`
          }
          confirmLabel="Set pending"
          onConfirm={async () => {
            const result = await reopenPayment(pending.row.id);
            if (result.ok) router.refresh();
            return result.ok
              ? { ok: true, message: "Set back to pending." }
              : result;
          }}
        />
      )}

      {del.dialog}
    </>
  );
}
