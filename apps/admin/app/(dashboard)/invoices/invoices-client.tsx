"use me";
"use client";

import * as React from "react";
import { Receipt, Printer, X, CheckCircle2, Clock, AlertCircle, Eye, Building2, Calendar, FileText } from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { Button } from "@/components/ui/button";
import { segmentClass } from "@/components/ui/segmented-control";
import { StatusPill } from "@/components/ui/badge";
import { money, date, dueLabel } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  clientCompany: string | null;
  clientEmail?: string | null;
  milestone: string;
  amount: number;
  currency: string;
  status: "PAID" | "PENDING" | "OVERDUE";
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  reference: string | null;
  totalContractPrice?: number;
}

export function InvoicesClient({
  invoices,
  companySettings,
}: {
  invoices: InvoiceRecord[];
  companySettings: {
    name?: string;
    phone: string;
    email: string;
    website: string;
  };
}) {
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceRecord | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const filteredInvoices = React.useMemo(() => {
    if (statusFilter === "all") return invoices;
    return invoices.filter((inv) => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  const columns: Column<InvoiceRecord>[] = [
    {
      id: "invoiceNumber",
      header: "Invoice #",
      width: "130px",
      mono: true,
      cell: (row) => (
        <button
          onClick={() => setSelectedInvoice(row)}
          className="font-semibold text-foreground hover:underline cursor-pointer text-left"
        >
          {row.invoiceNumber}
        </button>
      ),
      sortValue: (row) => row.invoiceNumber,
      searchValue: (row) => row.invoiceNumber,
    },
    {
      id: "client",
      header: "Client & Project",
      hideable: false,
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">
            {row.clientCompany || row.clientName}
          </span>
          <span className="block truncate text-meta font-normal text-subtle-foreground">
            {row.projectName}
          </span>
        </span>
      ),
      sortValue: (row) => (row.clientCompany || row.clientName).toLowerCase(),
      searchValue: (row) => `${row.clientCompany ?? ""} ${row.clientName} ${row.projectName}`,
    },
    {
      id: "milestone",
      header: "Milestone",
      width: "150px",
      cell: (row) => (
        <span className="text-muted-foreground text-meta">
          {statusOf("paymentMilestone", row.milestone).label}
        </span>
      ),
      sortValue: (row) => row.milestone,
    },
    {
      id: "amount",
      header: "Amount",
      width: "130px",
      align: "end",
      mono: true,
      cell: (row) => (
        <span className="font-medium text-foreground">
          {money(row.amount, row.currency)}
        </span>
      ),
      sortValue: (row) => row.amount,
    },
    {
      id: "status",
      header: "Status",
      width: "120px",
      cell: (row) => <StatusPill registry="paymentStatus" value={row.status} variant="dot" />,
      sortValue: (row) => ["OVERDUE", "PENDING", "PAID"].indexOf(row.status),
      searchValue: (row) => row.status,
    },
    {
      id: "dates",
      header: "Due Date",
      width: "140px",
      cell: (row) =>
        row.status === "PAID" ? (
          <span className="text-success font-mono text-meta">Paid {date(row.paidAt)}</span>
        ) : row.dueDate ? (
          <span className={cn("font-mono text-meta", row.status === "OVERDUE" ? "text-danger" : "text-muted-foreground")}>
            {dueLabel(row.dueDate)}
          </span>
        ) : (
          <span className="text-subtle-foreground font-mono text-meta">—</span>
        ),
      sortValue: (row) => (row.dueDate ? new Date(row.dueDate).getTime() : 0),
    },
    {
      id: "action",
      header: "",
      width: "70px",
      align: "end",
      cell: (row) => (
        <Button
          variant="outline"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInvoice(row);
          }}
          title="Preview invoice"
        >
          <Eye />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div role="radiogroup" aria-label="Filter invoices" className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "all", label: "All Invoices", count: invoices.length },
          { id: "PENDING", label: "Pending", count: invoices.filter((i) => i.status === "PENDING").length },
          { id: "OVERDUE", label: "Overdue", count: invoices.filter((i) => i.status === "OVERDUE").length },
          { id: "PAID", label: "Paid", count: invoices.filter((i) => i.status === "PAID").length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="radio"
            aria-checked={statusFilter === tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={cn(segmentClass({ selected: statusFilter === tab.id }), "whitespace-nowrap")}
          >
            <span>{tab.label}</span>
            <span className="rounded-full bg-surface-2 px-1.5 font-mono text-micro tabular-nums text-muted-foreground">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Table */}
      <DataTable
        tableId="invoices"
        rows={filteredInvoices}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search invoice #, client, or project…"
        initialSort={{ columnId: "invoiceNumber", dir: "desc" }}
        empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No invoices found.</div>}
      />

      {/* Printable Invoice Modal / Slide-over */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-n-8/25 p-4 backdrop-blur-[1px]">
          <div className="relative w-full max-w-2xl space-y-6 rounded-lg border border-border bg-card p-6 shadow-[var(--elev-2)] duration-[var(--dur-panel)] animate-in fade-in sm:p-8">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-brand" />
                <span className="font-mono text-md font-semibold text-foreground">
                  {selectedInvoice.invoiceNumber}
                </span>
                <StatusPill registry="paymentStatus" value={selectedInvoice.status} variant="dot" />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer />
                  Print
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setSelectedInvoice(null)}
                  aria-label="Close invoice"
                >
                  <X />
                </Button>
              </div>
            </div>

            {/* Printable Invoice Document Body */}
            <div className="space-y-6 text-foreground">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold font-sans tracking-tight">ALTRUVEX</h2>
                  <p className="text-meta text-muted-foreground mt-0.5">Software Engineering & Digital Products</p>
                  <p className="text-meta text-muted-foreground font-mono mt-1">
                    {companySettings.email} · {companySettings.phone}
                  </p>
                  <p className="text-meta text-muted-foreground font-mono">{companySettings.website}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-meta uppercase tracking-widest text-muted-foreground block">
                    INVOICE
                  </span>
                  <span className="font-mono text-base font-bold text-foreground block">
                    {selectedInvoice.invoiceNumber}
                  </span>
                  <p className="text-meta text-muted-foreground font-mono mt-1">
                    Issued: {date(selectedInvoice.issueDate)}
                  </p>
                  {selectedInvoice.dueDate && (
                    <p className="text-meta text-muted-foreground font-mono">
                      Due: {date(selectedInvoice.dueDate)}
                    </p>
                  )}
                </div>
              </div>

              {/* Bill To */}
              <div className="rounded-lg border border-border/80 bg-surface/50 p-3.5">
                <span className="font-mono text-micro uppercase tracking-wider text-muted-foreground block mb-1">
                  Billed To
                </span>
                <p className="font-semibold text-md text-foreground">
                  {selectedInvoice.clientCompany || selectedInvoice.clientName}
                </p>
                {selectedInvoice.clientCompany && (
                  <p className="text-meta text-muted-foreground">Attn: {selectedInvoice.clientName}</p>
                )}
                <p className="text-meta text-muted-foreground mt-0.5">Project: {selectedInvoice.projectName}</p>
              </div>

              {/* Line Items Table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-meta text-left">
                  <thead className="bg-surface border-b border-border font-mono text-micro text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Description</th>
                      <th className="px-4 py-2.5">Phase / Milestone</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {selectedInvoice.projectName} — Milestone Payment
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {statusOf("paymentMilestone", selectedInvoice.milestone).label}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                        {money(selectedInvoice.amount, selectedInvoice.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 border-t border-border pt-3">
                  <div className="flex justify-between text-meta text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono">{money(selectedInvoice.amount, selectedInvoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-meta text-muted-foreground">
                    <span>Tax (VAT)</span>
                    <span className="font-mono">Included</span>
                  </div>
                  <div className="flex justify-between text-md font-bold text-foreground pt-1.5 border-t border-border">
                    <span>Total Due</span>
                    <span className="font-mono text-brand">
                      {money(selectedInvoice.amount, selectedInvoice.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Instructions */}
              <div className="border-t border-border pt-4 text-meta text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Payment Instructions:</p>
                <p>Please reference invoice number <span className="font-mono font-medium text-foreground">{selectedInvoice.invoiceNumber}</span> on bank transfer or payment receipt.</p>
                <p>Bank wire details or payment confirmation can be shared via WhatsApp or emailed to {companySettings.email}.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
