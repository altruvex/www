"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Receipt, Printer, X, Eye, FileText } from "lucide-react";
import { Button, segmentClass } from "@repo/ui";
import { DataTable, type Column } from "@/components/os/data-table";
import { EntityLink } from "@/components/os/entity-link";
import { StatusPill } from "@/components/ui/badge";
import { entityHref } from "@/lib/entity-links";
import { money, date, dueLabel } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-source";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";
import { issueInvoice } from "@/app/(dashboard)/_actions/billing";

export interface InvoiceRecord {
  id: string;
  /** Null until issued — the list shows "Not issued", never a made-up number. */
  invoiceNumber: string | null;
  invoicedAt: string | null;
  createdAt: string;
  sourceType: "project" | "subscription" | "client_service" | null;
  sourceId: string | null;
  sourceName: string;
  /** The invoice line: "Deposit · 50% · Acme website". */
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

const STATUS_ORDER = ["OVERDUE", "PENDING", "PAID", "WAIVED"];

type Filter = "all" | "unissued" | "PENDING" | "OVERDUE" | "PAID" | "WAIVED";

export function InvoicesClient({
  invoices,
  initialOpenId,
  company,
}: {
  invoices: InvoiceRecord[];
  /** `?payment=<id>` opens that invoice's document on arrival. */
  initialOpenId: string | null;
  company: { name: string; phone: string; email: string; website: string };
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState<InvoiceRecord | null>(
    () => invoices.find((i) => i.id === initialOpenId) ?? null,
  );
  const [filter, setFilter] = React.useState<Filter>("all");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    if (filter === "all") return invoices;
    if (filter === "unissued") return invoices.filter((i) => !i.invoiceNumber);
    return invoices.filter((i) => i.status === filter);
  }, [invoices, filter]);

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

  const columns: Column<InvoiceRecord>[] = [
    {
      id: "invoiceNumber",
      header: "Invoice",
      width: "140px",
      mono: true,
      hideable: false,
      cell: (row) =>
        row.invoiceNumber ? (
          <button
            type="button"
            onClick={() => setOpen(row)}
            className="cursor-pointer text-left font-semibold text-foreground rounded-xs underline-offset-2 hover:underline"
          >
            {row.invoiceNumber}
          </button>
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
                <Link href={href} className="rounded-xs underline-offset-2 hover:underline">
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
              setOpen(row);
            }}
            aria-label="Open invoice"
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
        searchPlaceholder="Search invoice number, client or project…"
        initialSort={{ columnId: "invoiceNumber", dir: "desc" }}
        mobile={{ title: "client", subtitle: "invoiceNumber", meta: ["status", "amount", "dates"] }}
        empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No invoices match.</div>}
      />

      {open && open.invoiceNumber && <InvoiceDocument invoice={open} company={company} onClose={() => setOpen(null)} />}
    </div>
  );
}

/**
 * The printable document. It claims only what the record holds: the issued
 * number and date, the client's billing identity when it was captured, one
 * line for the payment. No tax line is computed because no tax rate is
 * configured anywhere — the footer says so instead of printing "Included".
 */
function InvoiceDocument({
  invoice,
  company,
  onClose,
}: {
  invoice: InvoiceRecord;
  company: { name: string; phone: string; email: string; website: string };
  onClose: () => void;
}) {
  const client = invoice.client;
  const billedName = client?.company || client?.name || invoice.clientName;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-n-8/25 p-4 backdrop-blur-[1px]">
      <div className="relative w-full max-w-2xl space-y-6 rounded-lg border border-border bg-card p-6 shadow-[var(--elev-2)] duration-[var(--dur-panel)] animate-in fade-in sm:p-8">
        <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-brand" />
            <span className="font-mono text-md font-semibold">{invoice.invoiceNumber}</span>
            <StatusPill registry="paymentStatus" value={invoice.status} variant="dot" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer />
              Print
            </Button>
            <Button variant="outline" size="icon-sm" onClick={onClose} aria-label="Close invoice">
              <X />
            </Button>
          </div>
        </div>

        <div className="space-y-6 text-foreground">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-sans text-xl font-bold tracking-tight">{company.name.toUpperCase()}</h2>
              <p className="mt-1 font-mono text-meta text-muted-foreground">
                {company.email}
                {company.phone && ` · ${company.phone}`}
              </p>
              {company.website && <p className="font-mono text-meta text-muted-foreground">{company.website}</p>}
            </div>
            <div className="text-right">
              <span className="block font-mono text-meta uppercase tracking-widest text-muted-foreground">Invoice</span>
              <span className="block font-mono text-base font-bold">{invoice.invoiceNumber}</span>
              <p className="mt-1 font-mono text-meta text-muted-foreground">Issued {date(invoice.invoicedAt)}</p>
              {invoice.dueDate && (
                <p className="font-mono text-meta text-muted-foreground">Due {date(invoice.dueDate)}</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border/80 bg-surface/50 p-3.5">
            <span className="mb-1 block font-mono text-micro uppercase tracking-wider text-muted-foreground">Billed to</span>
            <p className="text-md font-semibold">{billedName}</p>
            {client?.company && client.name && <p className="text-meta text-muted-foreground">Attn: {client.name}</p>}
            {client?.address && <p className="whitespace-pre-line text-meta text-muted-foreground">{client.address}</p>}
            {client?.country && <p className="text-meta text-muted-foreground">{client.country}</p>}
            {client?.email && <p className="font-mono text-meta text-muted-foreground">{client.email}</p>}
            {client?.taxId && <p className="font-mono text-meta text-muted-foreground">Tax ID {client.taxId}</p>}
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-meta">
              <thead className="border-b border-border bg-surface font-mono text-micro uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
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
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    {money(invoice.amount, invoice.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 border-t border-border pt-3">
              <div className="flex justify-between text-meta text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">{money(invoice.amount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-md font-bold">
                <span>{invoice.status === "PAID" ? "Paid" : "Total due"}</span>
                <span className="font-mono text-brand">{money(invoice.amount, invoice.currency)}</span>
              </div>
              <p className="text-micro text-subtle-foreground">Tax not configured.</p>
            </div>
          </div>

          <div className="space-y-1 border-t border-border pt-4 text-meta text-muted-foreground">
            {invoice.status === "PAID" ? (
              <p>
                Paid {date(invoice.paidAt)}
                {invoice.method && ` by ${paymentMethodLabel(invoice.method)?.toLowerCase()}`}.
              </p>
            ) : (
              <p>
                Please quote <span className="font-mono font-medium text-foreground">{invoice.invoiceNumber}</span> on
                the bank transfer, and send the confirmation to {company.email}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
