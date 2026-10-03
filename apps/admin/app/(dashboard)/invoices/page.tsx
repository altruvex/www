import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { FilterChip } from "@/components/os/data-table";
import { getCompanySettings } from "@/lib/company-settings";
import { moneyByCurrency, sumByCurrency } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { BillingTabs } from "../payments/billing-tabs";
import { loadBillingRows } from "../payments/billing-rows";
import { InvoicesClient, type InvoiceRecord } from "./invoices-client";

export const dynamic = "force-dynamic";

/**
 * Invoices — the document view of the payment schedule.
 *
 * An invoice number is `Payment.invoiceNumber`, assigned once by
 * `lib/invoice-number.ts` and never recomputed. A payment without one is
 * shown as "Not issued" with the action to issue it; the list no longer
 * numbers rows by their position, which renumbered every invoice whenever a
 * row was deleted.
 */
export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const [params, rows, company] = await Promise.all([searchParams, loadBillingRows(), getCompanySettings()]);

  const invoices: InvoiceRecord[] = rows
    .filter((row) => row.status !== "WAIVED" || row.invoiceNumber)
    .map((row) => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      invoicedAt: row.invoicedAt,
      createdAt: row.createdAt,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      sourceName: row.sourceName,
      lineLabel: `${statusOf("paymentMilestone", row.milestone).label} · ${row.sourceName}`,
      clientId: row.clientId,
      clientName: row.clientName,
      client: row.client
        ? {
            name: row.client.name,
            company: row.client.company,
            email: row.client.billingEmail || row.client.email,
            address: row.client.address,
            taxId: row.client.taxId,
            country: row.client.country,
          }
        : null,
      milestone: row.milestone,
      amount: row.amount,
      currency: row.currency,
      status: row.status as InvoiceRecord["status"],
      dueDate: row.dueDate,
      paidAt: row.paidAt,
      method: row.method,
      reference: row.reference,
    }))
    .sort((a, b) => (b.invoiceNumber ?? "").localeCompare(a.invoiceNumber ?? "") || b.createdAt.localeCompare(a.createdAt));

  const issued = invoices.filter((i) => i.invoiceNumber);
  const unissued = invoices.filter((i) => !i.invoiceNumber && i.status !== "WAIVED");
  const paid = issued.filter((i) => i.status === "PAID");
  const overdue = issued.filter((i) => i.status === "OVERDUE");
  const open = issued.filter((i) => i.status === "PENDING" || i.status === "OVERDUE");

  const focused = params.payment ? (invoices.find((i) => i.id === params.payment) ?? null) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Billing"
        description="Invoices issued against the payment schedule. Numbers come from one company-wide sequence and are never reused."
      />

      <BillingTabs active="invoices" counts={{ invoices: unissued.length }} />

      {params.payment && !focused && (
        <div>
          <FilterChip label="Invoice" value="Not found" clearHref="/invoices" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Issued" value={issued.length} sub={`${moneyByCurrency(sumByCurrency(issued), true) || "Nothing"} invoiced`} />
        <StatTile
          label="Not issued"
          value={unissued.length}
          tone={unissued.length ? "warning" : "neutral"}
          sub={unissued.length ? "Payments without an invoice number" : "Every open payment has its invoice"}
        />
        <StatTile
          label="Open"
          value={moneyByCurrency(sumByCurrency(open), true) || "0"}
          tone={overdue.length ? "danger" : "neutral"}
          sub={overdue.length ? `${overdue.length} overdue` : `${open.length} awaiting payment`}
        />
        <StatTile label="Settled" value={moneyByCurrency(sumByCurrency(paid), true) || "0"} tone="success" sub={`${paid.length} paid`} />
      </div>

      <InvoicesClient
        invoices={invoices}
        initialOpenId={focused?.id ?? null}
        company={{
          name: "Altruvex",
          phone: company.phone,
          email: company.email,
          website: company.website,
        }}
      />
    </div>
  );
}
