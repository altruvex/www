import { prisma } from "@repo/database";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { getCompanySettings } from "@/lib/company-settings";
import { moneyByCurrency, sumByCurrency } from "@/lib/format";
import { InvoicesClient, type InvoiceRecord } from "./invoices-client";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const now = new Date();
  const [payments, company] = await Promise.all([
    prisma.payment.findMany({
      include: {
        project: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            client: { select: { id: true, name: true, company: true } },
            contract: {
              select: {
                proposal: { select: { currency: true, totalPrice: true } },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    getCompanySettings(),
  ]);

  // Derive sequential invoice records deterministically from payment milestones
  const invoices: InvoiceRecord[] = payments.map((p, index) => {
    const isOverdue = p.status === "PENDING" && p.dueDate && p.dueDate < now;
    const year = new Date(p.createdAt || now).getFullYear();
    const invoiceNumber = `INV-${year}-${String(index + 1).padStart(3, "0")}`;
    const currency = p.project.contract.proposal.currency ?? "EGP";

    return {
      id: p.id,
      invoiceNumber,
      projectId: p.project.id,
      projectName: p.project.name,
      clientId: p.project.client.id,
      clientName: p.project.client.name || "Client",
      clientCompany: p.project.client.company,
      milestone: p.milestone,
      amount: p.amount,
      currency,
      status: isOverdue ? "OVERDUE" : (p.status as "PAID" | "PENDING" | "OVERDUE"),
      issueDate: p.createdAt.toISOString(),
      dueDate: p.dueDate?.toISOString() ?? null,
      paidAt: p.paidAt?.toISOString() ?? null,
      reference: p.reference,
      totalContractPrice: p.project.contract.proposal.totalPrice,
    };
  }).reverse(); // newest first

  const paidInvoices = invoices.filter((i) => i.status === "PAID");
  const pendingInvoices = invoices.filter((i) => i.status === "PENDING");
  const overdueInvoices = invoices.filter((i) => i.status === "OVERDUE");

  const totalInvoiced = sumByCurrency(invoices);
  const collected = sumByCurrency(paidInvoices);
  const overdueValue = sumByCurrency(overdueInvoices);
  const pendingValue = sumByCurrency(pendingInvoices);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoices"
        description="Official billing documents issued against project schedules. Generated with sequential audit numbering and compliance-ready records."
      />

      {/* Stat Tiles */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total Invoiced"
          value={moneyByCurrency(totalInvoiced, true)}
          sub={`${invoices.length} total invoices`}
        />
        <StatTile
          label="Collected Revenue"
          value={moneyByCurrency(collected, true)}
          tone="success"
          sub={`${paidInvoices.length} paid invoices`}
        />
        <StatTile
          label="Pending Payment"
          value={moneyByCurrency(pendingValue, true)}
          tone={pendingInvoices.length > 0 ? "info" : "neutral"}
          sub={`${pendingInvoices.length} awaiting settlement`}
        />
        <StatTile
          label="Overdue Balance"
          value={overdueInvoices.length ? moneyByCurrency(overdueValue, true) : "0"}
          tone={overdueInvoices.length > 0 ? "danger" : "success"}
          sub={overdueInvoices.length ? `${overdueInvoices.length} late payments` : "Zero overdue"}
        />
      </div>

      <InvoicesClient
        invoices={invoices}
        companySettings={{
          name: "Altruvex",
          phone: company.phone,
          email: company.email,
          website: company.website,
        }}
      />
    </div>
  );
}
