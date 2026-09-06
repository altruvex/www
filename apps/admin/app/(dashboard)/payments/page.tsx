import Link from "next/link";
import { prisma } from "@repo/database";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { moneyByCurrency, sumByCurrency } from "@/lib/format";
import { PaymentsTable, type PaymentRow } from "./payments-table";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

/**
 * §18 — operational finance, not an accounting ERP.
 *
 * The question this page answers is "what money is late, and whose is it?"
 * — not "what is our EBITDA". Invoices as documents are a separate, planned
 * module; a Payment row here is the schedule item, and it is what gets chased.
 */
export default async function PaymentsPage() {
  const now = new Date();
  const payments = await prisma.payment.findMany({
    include: {
      project: {
        select: {
          id: true,
          name: true,
          client: { select: { id: true, name: true, company: true } },
          // Payment rows carry no currency of their own — the contract they
          // belong to does, and that is the only truthful source for it.
          contract: { select: { proposal: { select: { currency: true } } } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  const rows: PaymentRow[] = payments.map((p) => ({
    id: p.id,
    projectId: p.project.id,
    projectName: p.project.name,
    clientId: p.project.client.id,
    clientName: p.project.client.company || p.project.client.name || "Unnamed client",
    milestone: p.milestone,
    amount: p.amount,
    currency: p.project.contract.proposal.currency,
    status:
      p.status === "PENDING" && p.dueDate && p.dueDate < now ? "OVERDUE" : p.status,
    dueDate: p.dueDate?.toISOString() ?? null,
    paidAt: p.paidAt?.toISOString() ?? null,
    method: p.method,
    reference: p.reference,
  }));

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const overdue = rows.filter((r) => r.status === "OVERDUE");
  const pending = rows.filter((r) => r.status === "PENDING");
  const collectedThisMonth = sumByCurrency(
    rows.filter((r) => r.status === "PAID" && r.paidAt && new Date(r.paidAt) >= startOfMonth),
  );
  const outstanding = sumByCurrency(overdue.concat(pending));
  const overdueValue = sumByCurrency(overdue);
  const paidAllTime = sumByCurrency(rows.filter((r) => r.status === "PAID"));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        description="Every milestone across every project. A row goes overdue on its own — nobody has to remember to change it."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Overdue"
          value={overdue.length}
          sub={overdue.length ? moneyByCurrency(overdueValue) : "Nothing late"}
          tone={overdue.length ? "danger" : "success"}
        />
        <StatTile
          label="Outstanding"
          value={moneyByCurrency(outstanding, true)}
          sub={`${pending.length + overdue.length} unpaid milestones`}
        />
        <StatTile
          label="Collected this month"
          value={moneyByCurrency(collectedThisMonth, true)}
          tone="success"
          sub="Cash in"
        />
        <StatTile
          label="Paid all time"
          value={moneyByCurrency(paidAllTime, true)}
          sub={`${rows.filter((r) => r.status === "PAID").length} payments`}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payment schedule yet"
          body="Payments are milestones on a project — deposit, milestone, final. They appear as soon as a project has a schedule, and go overdue automatically once their due date passes."
          action={
            <Button asChild variant="outline">
              <Link href="/projects">
                Open projects
              </Link>
            </Button>
          }
        />
      ) : (
        <PaymentsTable rows={rows} />
      )}
    </div>
  );
}
