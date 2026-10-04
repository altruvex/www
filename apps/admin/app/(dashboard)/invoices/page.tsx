import Link from "next/link";
import { Building2, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { FilterChip } from "@/components/os/data-table";
import { EntityLink } from "@/components/os/entity-link";
import { InspectSheet } from "@/components/os/inspect-sheet";
import { Soon } from "@/components/os/soon";
import { StatusPill } from "@/components/ui/badge";
import { getCompanySettings } from "@/lib/company-settings";
import { date, dueLabel, money, moneyByCurrency, sumByCurrency } from "@/lib/format";
import { entityHref } from "@/lib/entity-links";
import { gateRoute } from "@/lib/page-gate";
import { currentRole } from "@/lib/authorize";
import { roleCanOpen } from "@/lib/action-center";
import { can } from "@/lib/rbac";
import { paymentMethodLabel } from "@/lib/payment-source";
import { statusOf } from "@/lib/status";
import { BillingTabs } from "../payments/billing-tabs";
import { PaymentReminderButton } from "../payments/payment-reminder";
import { loadInspectorReminder } from "@/lib/payment-reminder";
import { loadBillingRows } from "../payments/billing-rows";
import { InvoiceInspectorActions, InvoicesClient, type InvoiceIssuer, type InvoiceRecord } from "./invoices-client";

export const dynamic = "force-dynamic";

const ISSUER_NAME = "Altruvex";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ inspect?: string; payment?: string }>;
}) {
  const denied = await gateRoute("/invoices");
  if (denied) return denied;

  const [params, rows, company, role] = await Promise.all([
    searchParams,
    loadBillingRows(),
    getCompanySettings(),
    currentRole(),
  ]);
  const issuer: InvoiceIssuer = {
    name: ISSUER_NAME,
    phone: company.phone,
    email: company.email,
    website: company.website,
  };

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

  const inspectId = params.inspect ?? params.payment ?? null;
  const inspected = inspectId ? (invoices.find((i) => i.id === inspectId) ?? null) : null;
  const reminder = inspected ? await loadInspectorReminder(inspected, role) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Billing"
        description="Invoices issued against the payment schedule. Numbers come from one company-wide sequence and are never reused."
      />

      <BillingTabs active="invoices" counts={{ invoices: unissued.length }} />

      {inspectId && !inspected && (
        <div>
          <FilterChip label="Invoice" value="Not found — it may have been deleted" clearHref="/invoices" />
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

      <InvoicesClient invoices={invoices} canEdit={can(role, "edit", "payment")} />

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-subtle-foreground">
        <span>
          Documents print {ISSUER_NAME} with the contact details from Settings and no tax line.
        </span>
        <span className="inline-flex items-center gap-1">
          Legal name, registered address and tax rate
          <Soon reason="CompanySettings has no legalName, address or taxRate columns yet; until they exist the document prints the trading name and says tax is not configured." />
        </span>
      </p>

      {inspected && (
        <InvoiceInspector
          invoice={inspected}
          issuer={issuer}
          canEdit={can(role, "edit", "payment")}
          canMessage={roleCanOpen(role, "/whatsapp")}
          reminder={reminder}
        />
      )}
    </div>
  );
}

function InvoiceInspector({
  invoice,
  issuer,
  canEdit,
  canMessage,
  reminder,
}: {
  invoice: InvoiceRecord;
  issuer: InvoiceIssuer;
  canEdit: boolean;
  canMessage: boolean;
  reminder: Awaited<ReturnType<typeof loadInspectorReminder>>;
}) {
  const sourceHref = entityHref(invoice.sourceType, invoice.sourceId);
  const sourceNoun =
    invoice.sourceType === "project" ? "project" : invoice.sourceType === "subscription" ? "retainer" : "service";
  return (
    <InspectSheet
      open
      title={invoice.invoiceNumber ?? "Not issued"}
      subtitle={invoice.lineLabel}
      status={<StatusPill registry="paymentStatus" value={invoice.status} variant="dot" />}
      footer={<InvoiceInspectorActions invoice={invoice} issuer={issuer} canEdit={canEdit} />}
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-base">
        <div>
          <dt className="telemetry text-subtle-foreground">Client</dt>
          <dd className="mt-1">
            <EntityLink type="client" id={invoice.clientId}>
              {invoice.clientName}
            </EntityLink>
          </dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">Amount</dt>
          <dd className="mt-1 font-mono tabular-nums">{money(invoice.amount, invoice.currency)}</dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">{invoice.status === "PAID" ? "Paid" : "Due"}</dt>
          <dd className={`mt-1 ${invoice.status === "OVERDUE" ? "text-danger" : "text-muted-foreground"}`}>
            {invoice.status === "PAID"
              ? `${date(invoice.paidAt)}${invoice.method ? ` · ${paymentMethodLabel(invoice.method)}` : ""}`
              : invoice.status === "WAIVED"
                ? "Waived"
                : invoice.dueDate
                  ? dueLabel(invoice.dueDate)
                  : "No date"}
          </dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">Issued</dt>
          <dd className="mt-1 text-muted-foreground">{invoice.invoicedAt ? date(invoice.invoicedAt) : "Not yet"}</dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">Reference</dt>
          <dd className="mt-1 font-mono text-muted-foreground">{invoice.reference ?? "—"}</dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">Billed to</dt>
          <dd className="mt-1 text-muted-foreground">
            {invoice.client?.company || invoice.client?.name || invoice.clientName}
            {invoice.client?.taxId && <span className="block font-mono text-meta">Tax ID {invoice.client.taxId}</span>}
          </dd>
        </div>
      </dl>
      <p className="mt-4 flex flex-wrap gap-x-4 text-meta text-muted-foreground">
        <Link href={`/payments?inspect=${invoice.id}`} className="rounded-xs underline-offset-2 hover:underline">
          Open in payments
        </Link>
        {sourceHref && (
          <Link href={sourceHref} className="rounded-xs underline-offset-2 hover:underline">
            Open {sourceNoun}
          </Link>
        )}
        {invoice.clientId && (
          <Link
            href={`/clients/${invoice.clientId}`}
            className="inline-flex items-center gap-1 rounded-xs underline-offset-2 hover:underline"
          >
            <Building2 className="size-3.5" aria-hidden />
            Open client
          </Link>
        )}
        {reminder && <PaymentReminderButton target={reminder.target} emailConfigured={reminder.emailConfigured} />}
        {canMessage && invoice.clientId && (invoice.status === "OVERDUE" || invoice.status === "PENDING") && (
          <Link
            href={`/whatsapp/${invoice.clientId}`}
            className="inline-flex items-center gap-1 rounded-xs underline-offset-2 hover:underline"
          >
            <MessageCircle className="size-3.5" aria-hidden />
            {invoice.clientName} on WhatsApp
          </Link>
        )}
      </p>
    </InspectSheet>
  );
}
