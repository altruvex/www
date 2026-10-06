"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Eye, FileText, Printer, Receipt, RotateCcw } from "lucide-react";
import {
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  segmentClass,
} from "@repo/ui";
import { DataTable, type Column } from "@/components/os/data-table";
import { EmptyState } from "@/components/os/empty-state";
import { CopyValueButton } from "@/components/os/copy-button";
import { EntityLink } from "@/components/os/entity-link";
import { inspectHref } from "@/components/os/inspect-sheet";
import { StatusPill } from "@/components/ui/badge";
import { entityHref } from "@/lib/entity-links";
import { money, date, dueLabel } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-source";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { issueInvoice, reopenPayment } from "@/app/(dashboard)/_actions/billing";
import { RecordPaymentDialog } from "../payments/record-payment-dialog";
import { NewChargeButton, type ChargeTarget } from "../payments/new-charge-dialog";

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string | null;
  invoicedAt: string | null;
  createdAt: string;
  sourceType: "project" | "subscription" | "client_service" | null;
  sourceId: string | null;
  sourceName: string;
  lineLabel: string;
  clientId: string | null;
  clientName: string;
  client: {
    name: string | null;
    company: string | null;
    email: string | null;
    address: string | null;
    taxId: string | null;
    country: string | null;
  } | null;
  milestone: string;
  amount: number;
  currency: string;
  status: "PAID" | "PENDING" | "OVERDUE" | "WAIVED";
  dueDate: string | null;
  paidAt: string | null;
  method: string | null;
  reference: string | null;
}

export interface InvoiceIssuer {
  name: string;
  phone: string;
  email: string;
  website: string;
}

const STATUS_ORDER = ["OVERDUE", "PENDING", "PAID", "WAIVED"];

type Filter = "all" | "unissued" | "PENDING" | "OVERDUE" | "PAID" | "WAIVED";

export function InvoicesClient({
  invoices,
  canEdit = true,
  chargeTargets = null,
  canRecordProject = false,
}: {
  invoices: InvoiceRecord[];
  canEdit?: boolean;
  /** Set when the list is empty and the role may add a charge: the dialog opens right here. */
  chargeTargets?: ChargeTarget[] | null;
  canRecordProject?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    if (filter === "all") return invoices;
    if (filter === "unissued") return invoices.filter((i) => !i.invoiceNumber);
    return invoices.filter((i) => i.status === filter);
  }, [invoices, filter]);

  const inspect = (row: InvoiceRecord) =>
    router.push(inspectHref(pathname, searchParams, row.id), { scroll: false });

  async function issue(row: InvoiceRecord) {
    setBusyId(row.id);
    try {
      const result = await issueInvoice(row.id);
      if (!result.ok) {
        toast.error("Invoice not issued", { description: result.message });
        return;
      }
      toast.success(`Issued ${result.invoiceNumber}`, { description: row.lineLabel });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function issueMany(selected: InvoiceRecord[]) {
    const issuable = selected.filter((row) => !row.invoiceNumber && row.status !== "WAIVED");
    const skipped = selected.length - issuable.length;
    if (issuable.length === 0) {
      return { ok: false, message: "Every selected invoice is already issued or waived." };
    }
    let issued = 0;
    const refused: { row: InvoiceRecord; reason: string }[] = [];
    for (const row of issuable) {
      try {
        const result = await issueInvoice(row.id);
        if (result.ok) issued += 1;
        else refused.push({ row, reason: result.message });
      } catch (error) {
        refused.push({
          row,
          reason: error instanceof Error && error.message ? error.message : "Nothing was reported back.",
        });
      }
    }
    for (const { row, reason } of refused) {
      toast.error(`Not issued: ${row.lineLabel}`, { description: reason });
    }
    if (issued > 0) router.refresh();
    const notes = [
      refused.length > 0 ? `${refused.length} refused` : null,
      skipped > 0 ? `${skipped} already issued or waived, left out` : null,
    ].filter(Boolean);
    const tail = notes.length > 0 ? ` (${notes.join(", ")})` : "";
    if (issued === 0) {
      return { ok: false, message: `No invoices issued${tail}.` };
    }
    return { ok: true, message: `Issued ${issued} ${issued === 1 ? "invoice" : "invoices"}${tail}.` };
  }

  const columns: Column<InvoiceRecord>[] = [
    {
      id: "invoiceNumber",
      header: "Invoice",
      width: "140px",
      mono: true,
      hideable: false,
      cell: (row) =>
        row.invoiceNumber ? (
          <span className="inline-flex items-center gap-1">
            <Link
              href={inspectHref(pathname, searchParams, row.id)}
              scroll={false}
              onClick={(event) => event.stopPropagation()}
              className="font-semibold text-foreground rounded-xs underline-offset-2 hover:underline"
            >
              {row.invoiceNumber}
            </Link>
            <CopyValueButton value={row.invoiceNumber} label="Invoice number" />
          </span>
        ) : (
          <span className="text-subtle-foreground">Not issued</span>
        ),
      sortValue: (row) => row.invoiceNumber ?? "",
      searchValue: (row) => row.invoiceNumber ?? "not issued",
    },
    {
      id: "client",
      header: "Client & billed for",
      cell: (row) => {
        const href = entityHref(row.sourceType, row.sourceId);
        return (
          <span className="min-w-0">
            <span className="block truncate font-medium">
              <EntityLink type="client" id={row.clientId}>
                {row.clientName}
              </EntityLink>
            </span>
            <span className="block truncate text-meta font-normal text-subtle-foreground">
              {href ? (
                <Link
                  href={href}
                  onClick={(event) => event.stopPropagation()}
                  className="rounded-xs underline-offset-2 hover:underline"
                >
                  {row.sourceName}
                </Link>
              ) : (
                row.sourceName
              )}
            </span>
          </span>
        );
      },
      sortValue: (row) => row.clientName.toLowerCase(),
      searchValue: (row) => `${row.clientName} ${row.sourceName} ${row.reference ?? ""}`,
    },
    {
      id: "milestone",
      header: "Line",
      width: "150px",
      minWidth: "xl",
      cell: (row) => (
        <span className="text-meta text-muted-foreground">{statusOf("paymentMilestone", row.milestone).label}</span>
      ),
      sortValue: (row) => row.milestone,
    },
    {
      id: "amount",
      header: "Amount",
      width: "130px",
      align: "end",
      mono: true,
      cell: (row) => <span className="font-medium">{money(row.amount, row.currency)}</span>,
      sortValue: (row) => row.amount,
    },
    {
      id: "status",
      header: "Status",
      width: "120px",
      cell: (row) => <StatusPill registry="paymentStatus" value={row.status} variant="dot" />,
      sortValue: (row) => STATUS_ORDER.indexOf(row.status),
      searchValue: (row) => statusOf("paymentStatus", row.status).label,
    },
    {
      id: "dates",
      header: "Due",
      width: "140px",
      cell: (row) =>
        row.status === "PAID" ? (
          <span className="font-mono text-meta text-success">Paid {date(row.paidAt)}</span>
        ) : row.status === "WAIVED" ? (
          <span className="font-mono text-meta text-subtle-foreground">Waived</span>
        ) : row.dueDate ? (
          <span className={cn("font-mono text-meta", row.status === "OVERDUE" ? "text-danger" : "text-muted-foreground")}>
            {dueLabel(row.dueDate)}
          </span>
        ) : (
          <span className="font-mono text-meta text-subtle-foreground">—</span>
        ),
      sortValue: (row) => (row.dueDate ? new Date(row.dueDate).getTime() : 0),
    },
    {
      id: "action",
      header: "",
      width: "120px",
      align: "end",
      cell: (row) =>
        row.invoiceNumber ? (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation();
              inspect(row);
            }}
            aria-label={`Open invoice ${row.invoiceNumber}`}
          >
            <Eye />
          </Button>
        ) : row.status === "WAIVED" ? null : (
          <Button
            variant="outline"
            size="sm"
            disabled={busyId === row.id}
            onClick={(event) => {
              event.stopPropagation();
              void issue(row);
            }}
          >
            <FileText className="size-3.5" />
            Issue
          </Button>
        ),
    },
  ];

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: invoices.length },
    { id: "unissued", label: "Not issued", count: invoices.filter((i) => !i.invoiceNumber).length },
    { id: "PENDING", label: "Pending", count: invoices.filter((i) => i.status === "PENDING").length },
    { id: "OVERDUE", label: "Overdue", count: invoices.filter((i) => i.status === "OVERDUE").length },
    { id: "PAID", label: "Paid", count: invoices.filter((i) => i.status === "PAID").length },
    { id: "WAIVED", label: "Waived", count: invoices.filter((i) => i.status === "WAIVED").length },
  ];

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Filter invoices" className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {filters.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="radio"
            aria-checked={filter === tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(segmentClass({ selected: filter === tab.id }), "whitespace-nowrap")}
          >
            <span>{tab.label}</span>
            <span className="rounded-full bg-surface-2 px-1.5 font-mono text-micro tabular-nums text-muted-foreground">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <DataTable
        tableId="invoices"
        rows={filtered}
        columns={columns}
        rowKey={(row) => row.id}
        onRowClick={inspect}
        searchPlaceholder="Search invoice number, client or project…"
        initialSort={{ columnId: "invoiceNumber", dir: "desc" }}
        mobile={{ title: "client", subtitle: "invoiceNumber", meta: ["status", "amount", "dates"] }}
        selectable={canEdit}
        selectionNoun="invoice"
        bulkActions={[
          {
            label: "Issue",
            icon: FileText,
            confirm: (rows) => {
              const count = rows.filter((row) => !row.invoiceNumber && row.status !== "WAIVED").length;
              const skipped = rows.length - count;
              return {
                title: `Issue ${count} ${count === 1 ? "invoice" : "invoices"}?`,
                description:
                  skipped > 0
                    ? `${skipped} of the selection ${skipped === 1 ? "is" : "are"} already issued or waived and will be left out.`
                    : undefined,
                consequence:
                  "Each one draws the next invoice number. A number once issued is not taken back.",
                confirmLabel: "Issue",
                tone: "default",
              };
            },
            onRun: issueMany,
          },
        ]}
        empty={
          filter === "all" ? (
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              body="Invoices are drawn from the payment schedule. Once a project, subscription or service has a payment, it appears here to issue."
              action={
                chargeTargets == null ? undefined : chargeTargets.length > 0 ? (
                  <NewChargeButton targets={chargeTargets} />
                ) : canRecordProject ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/projects?new=recorded">Record a project</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title={`No invoices in “${filters.find((tab) => tab.id === filter)?.label ?? filter}”`}
              body="Nothing matches this filter right now. Pick another chip above, or clear it."
              action={
                <Button variant="outline" size="sm" onClick={() => setFilter("all")}>
                  Clear filters
                </Button>
              }
            />
          )
        }
      />
    </div>
  );
}

export function InvoiceInspectorActions({
  invoice,
  issuer,
  canEdit = true,
}: {
  invoice: InvoiceRecord;
  issuer: InvoiceIssuer;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [showDocument, setShowDocument] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [busy, startTransition] = React.useTransition();

  const unpaid = invoice.status === "PENDING" || invoice.status === "OVERDUE";
  const canIssue = canEdit && !invoice.invoiceNumber && invoice.status !== "WAIVED";
  const settled = invoice.status === "PAID" || invoice.status === "WAIVED";

  function issue() {
    startTransition(async () => {
      const result = await issueInvoice(invoice.id);
      if (!result.ok) {
        toast.error("Invoice not issued", { description: result.message });
        return;
      }
      toast.success(`Issued ${result.invoiceNumber}`, { description: invoice.lineLabel });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {invoice.invoiceNumber && (
        <Button variant="brand" size="sm" onClick={() => setShowDocument(true)}>
          <Receipt className="size-3.5" />
          Open document
        </Button>
      )}
      {invoice.invoiceNumber && (
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(invoice.invoiceNumber!);
              toast.success("Invoice number copied", { description: invoice.invoiceNumber! });
            } catch {
              toast.error("The browser refused the clipboard. Select the number and copy it by hand.", {
                description: invoice.invoiceNumber!,
              });
            }
          }}
        >
          <Copy className="size-3.5" />
          Copy number
        </Button>
      )}
      {canIssue && (
        <Button variant="brand" size="sm" onClick={issue} disabled={busy}>
          <FileText className="size-3.5" />
          Issue invoice
        </Button>
      )}
      {canEdit && unpaid && (
        <Button variant="outline" size="sm" onClick={() => setRecording(true)}>
          <Check className="size-3.5" />
          Record payment
        </Button>
      )}
      {canEdit && settled && (
        <ConfirmDialog
          trigger={
            <Button variant="outline" size="sm">
              <RotateCcw className="size-3.5" />
              Set back to pending
            </Button>
          }
          title="Set back to pending?"
          body={invoice.lineLabel}
          consequence={
            invoice.status === "PAID"
              ? `${money(invoice.amount, invoice.currency)} reads as owed again and the paid date (${date(invoice.paidAt)}) is cleared. The audit trail keeps it, and recording the payment again offers that day back.`
              : `${money(invoice.amount, invoice.currency)} reads as owed again.`
          }
          confirmLabel="Set pending"
          onConfirm={async () => {
            const result = await reopenPayment(invoice.id);
            if (result.ok) router.refresh();
            return result.ok ? { ok: true, message: "Set back to pending." } : result;
          }}
        />
      )}
      {invoice.invoiceNumber && (
        <InvoiceDocument invoice={invoice} issuer={issuer} open={showDocument} onOpenChange={setShowDocument} />
      )}
      {recording && (
        <RecordPaymentDialog
          target={{
            id: invoice.id,
            label: invoice.lineLabel,
            reference: invoice.reference,
            amountLabel: money(invoice.amount, invoice.currency),
          }}
          onClose={() => setRecording(false)}
        />
      )}
    </div>
  );
}

const PRINT_RULES = `
@media print {
  body * { visibility: hidden !important; }
  [data-invoice-print], [data-invoice-print] * { visibility: visible !important; }
  [data-invoice-print] {
    position: fixed !important; inset: 0 !important; width: 100% !important; max-width: none !important;
    height: auto !important; max-height: none !important; overflow: visible !important;
    border: 0 !important; box-shadow: none !important; transform: none !important; background: white !important;
  }
  [data-invoice-print] * { overflow: visible !important; }
}
`;

export function InvoiceDocument({
  invoice,
  issuer,
  open,
  onOpenChange,
}: {
  invoice: InvoiceRecord;
  issuer: InvoiceIssuer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const client = invoice.client;
  const billedName = client?.company || client?.name || invoice.clientName;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="lg" data-invoice-print="">
        <style>{PRINT_RULES}</style>
        <SheetHeader className="print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-brand" />
            <SheetTitle className="font-mono">{invoice.invoiceNumber}</SheetTitle>
            <StatusPill registry="paymentStatus" value={invoice.status} variant="dot" />
          </div>
          <SheetDescription>{invoice.lineLabel}</SheetDescription>
        </SheetHeader>

        <SheetBody className="print:p-0">
          <div className="space-y-6 text-foreground sm:p-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-sans text-xl font-bold tracking-tight">{issuer.name.toUpperCase()}</h2>
                <p className="mt-1 font-mono text-meta text-muted-foreground">
                  {issuer.email}
                  {issuer.phone && ` · ${issuer.phone}`}
                </p>
                {issuer.website && <p className="font-mono text-meta text-muted-foreground">{issuer.website}</p>}
              </div>
              <div className="text-end">
                <span className="block font-mono text-meta uppercase tracking-widest text-muted-foreground">Invoice</span>
                <span className="block font-mono text-base font-bold">{invoice.invoiceNumber}</span>
                <p className="mt-1 font-mono text-meta text-muted-foreground">Issued {date(invoice.invoicedAt)}</p>
                {invoice.dueDate && (
                  <p className="font-mono text-meta text-muted-foreground">Due {date(invoice.dueDate)}</p>
                )}
              </div>
            </div>

            <div className="rounded-panel-sm border border-border-subtle/80 bg-surface/50 p-3.5">
              <span className="mb-1 block font-mono text-micro uppercase tracking-wider text-muted-foreground">Billed to</span>
              <p className="text-md font-semibold">{billedName}</p>
              {client?.company && client.name && <p className="text-meta text-muted-foreground">Attn: {client.name}</p>}
              {client?.address && <p className="whitespace-pre-line text-meta text-muted-foreground">{client.address}</p>}
              {client?.country && <p className="text-meta text-muted-foreground">{client.country}</p>}
              {client?.email && <p className="font-mono text-meta text-muted-foreground">{client.email}</p>}
              {client?.taxId && <p className="font-mono text-meta text-muted-foreground">Tax ID {client.taxId}</p>}
            </div>

            <div className="overflow-hidden rounded-panel-sm border border-border-subtle">
              <table className="w-full text-start text-meta">
                <thead className="border-b border-border-subtle bg-surface font-mono text-micro uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-start">Description</th>
                    <th className="px-4 py-2.5 text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3">
                      <span className="block font-medium">{invoice.lineLabel}</span>
                      {invoice.reference && (
                        <span className="block font-mono text-micro text-muted-foreground">{invoice.reference}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end font-mono font-semibold">
                      {money(invoice.amount, invoice.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 border-t border-border-subtle pt-3">
                <div className="flex justify-between text-meta text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">{money(invoice.amount, invoice.currency)}</span>
                </div>
                <div className="flex justify-between border-t border-border-subtle pt-1.5 text-md font-bold">
                  <span>
                    {invoice.status === "PAID" ? "Paid" : invoice.status === "WAIVED" ? "Waived — nothing is due" : "Total due"}
                  </span>
                  <span className="font-mono text-brand">
                    {invoice.status === "WAIVED" ? money(0, invoice.currency) : money(invoice.amount, invoice.currency)}
                  </span>
                </div>
                <p className="text-micro text-subtle-foreground">
                  No tax line: no tax rate is configured for invoices.
                </p>
              </div>
            </div>

            <div className="space-y-1 border-t border-border-subtle pt-4 text-meta text-muted-foreground">
              {invoice.status === "PAID" ? (
                <p>
                  Paid {date(invoice.paidAt)}
                  {invoice.method && ` by ${paymentMethodLabel(invoice.method)?.toLowerCase()}`}.
                </p>
              ) : invoice.status === "WAIVED" ? (
                <p>This invoice was waived: nothing is due and no payment is expected.</p>
              ) : (
                <p>
                  Please quote <span className="font-mono font-medium text-foreground">{invoice.invoiceNumber}</span> on
                  the bank transfer, and send the confirmation to {issuer.email}.
                </p>
              )}
            </div>
          </div>
        </SheetBody>

        <SheetFooter className="print:hidden">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="brand" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Print
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
