import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@repo/ui";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { Panel } from "@/components/os/panel";
import { EmptyState } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { FilterChip } from "@/components/os/data-table";
import { StatusPill } from "@/components/ui/badge";
import { date, dueLabel, money, moneyByCurrency, sumByCurrency } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-source";
import { entityHref } from "@/lib/entity-links";
import { statusOf } from "@/lib/status";
import { DUE_SOON_DAYS } from "@/lib/payment-overdue";
import { PaymentsTable, type PaymentRow } from "./payments-table";
import { BillingTabs } from "./billing-tabs";
import { NewChargeButton } from "./new-charge-dialog";
import { FocusedPaymentActions } from "./focused-payment";
import {
  BILLING_STATUS_LABEL,
  loadBillingRows,
  loadChargeTargets,
  matchesStatus,
  parseStatusFilter,
  type BillingRow,
} from "./billing-rows";

export const dynamic = "force-dynamic";

/**
 * Billing — operational finance, not an accounting ERP.
 *
 * The question this page answers is "what money is late, and whose is it?",
 * not "what is our EBITDA". A Payment row is the schedule item that gets
 * chased; the Invoices tab is the document view of the same rows.
 *
 * Refunds, partial payments and card payments are not offered. There is no
 * payment provider behind this screen, and a button that only pretends would
 * be worse than the plain statement below the tiles.
 */

interface SearchParams {
  tab?: string;
  payment?: string;
  client?: string;
  project?: string;
  status?: string;
}

function hrefWithout(params: SearchParams, drop: keyof SearchParams): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== drop && value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `/payments?${query}` : "/payments";
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const now = new Date();
  const [allRows, chargeTargets] = await Promise.all([loadBillingRows(now), loadChargeTargets(now)]);

  const tab = params.tab === "outstanding" ? "outstanding" : "payments";
  const statusFilter = parseStatusFilter(params.status);
  const focused = params.payment ? (allRows.find((r) => r.id === params.payment) ?? null) : null;

  let rows = allRows;
  if (params.client) rows = rows.filter((r) => r.clientId === params.client);
  if (params.project) rows = rows.filter((r) => r.sourceType === "project" && r.sourceId === params.project);
  if (statusFilter) rows = rows.filter((r) => matchesStatus(r, statusFilter));

  const scopedClient = params.client ? allRows.find((r) => r.clientId === params.client) : null;
  const scopedProject = params.project
    ? allRows.find((r) => r.sourceType === "project" && r.sourceId === params.project)
    : null;

  // The tiles describe the scoped list, so a client filter turns them into
  // that client's balance rather than leaving company totals above their rows.
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const overdue = rows.filter((r) => r.status === "OVERDUE");
  const pending = rows.filter((r) => r.status === "PENDING");
  const dueSoon = rows.filter((r) => r.dueSoon);
  const paid = rows.filter((r) => r.status === "PAID");
  const collectedThisMonth = sumByCurrency(paid.filter((r) => r.paidAt && new Date(r.paidAt) >= startOfMonth));

  const chips = [
    scopedClient && (
      <FilterChip key="client" label="Client" value={scopedClient.clientName} clearHref={hrefWithout(params, "client")} />
    ),
    scopedProject && (
      <FilterChip key="project" label="Project" value={scopedProject.sourceName} clearHref={hrefWithout(params, "project")} />
    ),
    statusFilter && (
      <FilterChip key="status" label="Status" value={BILLING_STATUS_LABEL[statusFilter]} clearHref={hrefWithout(params, "status")} />
    ),
    params.payment && !focused && (
      <FilterChip key="payment" label="Payment" value="Not found" clearHref={hrefWithout(params, "payment")} />
    ),
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Billing"
        description="Every milestone, renewal and charge across every client. A row goes overdue on its own — nobody has to remember to change it."
        actions={<NewChargeButton targets={chargeTargets} />}
      />

      <BillingTabs active={tab} counts={{ outstanding: allRows.filter((r) => r.status === "OVERDUE").length }} />

      {chips.length > 0 && <div className="flex flex-wrap items-center gap-2">{chips}</div>}

      {focused && <FocusedPayment row={focused} clearHref={hrefWithout(params, "payment")} />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Overdue"
          value={overdue.length}
          sub={overdue.length ? moneyByCurrency(sumByCurrency(overdue)) : "Nothing late"}
          tone={overdue.length ? "danger" : "success"}
          href="/payments?status=overdue"
        />
        <StatTile
          label="Outstanding"
          value={moneyByCurrency(sumByCurrency(overdue.concat(pending)), true)}
          sub={`${pending.length + overdue.length} unpaid`}
          href="/payments?tab=outstanding"
        />
        <StatTile
          label={`Due in ${DUE_SOON_DAYS} days`}
          value={moneyByCurrency(sumByCurrency(dueSoon), true)}
          tone={dueSoon.length ? "warning" : "neutral"}
          sub={`${dueSoon.length} coming up`}
          href="/payments?status=due"
        />
        <StatTile
          label="Collected this month"
          value={moneyByCurrency(collectedThisMonth, true)}
          tone="success"
          sub={`${paid.length} paid all time`}
          href="/payments?status=paid"
        />
      </div>

      {allRows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payment schedule yet"
          body="Payments are milestones on a project — deposit, milestone, final — and renewals on a retainer. They appear as soon as a project has a schedule, and go overdue automatically once their due date passes."
          action={
            <Button asChild variant="outline">
              <Link href="/projects">Open projects</Link>
            </Button>
          }
        />
      ) : tab === "outstanding" ? (
        <OutstandingTab rows={rows.filter((r) => r.status === "OVERDUE" || r.status === "PENDING")} />
      ) : (
        <PaymentsTable rows={rows} />
      )}

      <p className="text-meta text-subtle-foreground">
        Refunds, partial payments and card payments: integration required. This screen records
        money that has already arrived; it does not move any.
      </p>
    </div>
  );
}

/**
 * `?payment=<id>` — the row a notification or the Today page pointed at. The
 * table has no way to single out a row, so the payment is shown above it with
 * the actions it can take, and the table below stays the full list.
 */
function FocusedPayment({ row, clearHref }: { row: BillingRow; clearHref: string }) {
  const sourceHref = entityHref(row.sourceType, row.sourceId);
  return (
    <Panel
      title={`${statusOf("paymentMilestone", row.milestone).label} · ${row.sourceName}`}
      description={row.clientName}
      action={<FilterChip label="Focused" value={row.invoiceNumber ?? "Payment"} clearHref={clearHref} />}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-base sm:grid-cols-4">
          <div>
            <dt className="telemetry text-subtle-foreground">Amount</dt>
            <dd className="mt-1 font-mono tabular-nums">{money(row.amount, row.currency)}</dd>
          </div>
          <div>
            <dt className="telemetry text-subtle-foreground">Status</dt>
            <dd className="mt-1">
              <StatusPill registry="paymentStatus" value={row.status} variant="dot" />
            </dd>
          </div>
          <div>
            <dt className="telemetry text-subtle-foreground">{row.status === "PAID" ? "Paid" : "Due"}</dt>
            <dd className="mt-1 text-muted-foreground">
              {row.status === "PAID"
                ? `${date(row.paidAt)}${row.method ? ` · ${paymentMethodLabel(row.method)}` : ""}`
                : row.dueDate
                  ? dueLabel(row.dueDate)
                  : "No date"}
            </dd>
          </div>
          <div>
            <dt className="telemetry text-subtle-foreground">Invoice</dt>
            <dd className="mt-1 font-mono text-muted-foreground">
              {row.invoiceNumber ? (
                <Link href={`/invoices?payment=${row.id}`} className="hover:underline">
                  {row.invoiceNumber}
                </Link>
              ) : (
                "Not issued"
              )}
            </dd>
          </div>
        </dl>
        <FocusedPaymentActions
          row={{
            id: row.id,
            label: `${statusOf("paymentMilestone", row.milestone).label} · ${row.sourceName}`,
            status: row.status,
            reference: row.reference,
            invoiceNumber: row.invoiceNumber,
          }}
        />
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 text-meta text-muted-foreground">
        {sourceHref && (
          <Link href={sourceHref} className="hover:underline">
            Open {row.sourceType === "project" ? "project" : row.sourceType === "subscription" ? "retainer" : "service"}
          </Link>
        )}
        {row.clientId && (
          <EntityLink type="client" id={row.clientId} muted>
            Open client
          </EntityLink>
        )}
        {row.reference && <span className="font-mono">{row.reference}</span>}
      </p>
    </Panel>
  );
}

/**
 * Outstanding: what each client owes, per currency. Two currencies are never
 * added together — a client owing E£40,000 and $500 has two balances, and the
 * row says so rather than inventing an exchange rate.
 */
function OutstandingTab({ rows }: { rows: PaymentRow[] }) {
  const byClient = new Map<string, { clientId: string | null; clientName: string; rows: PaymentRow[] }>();
  for (const row of rows) {
    const key = row.clientId ?? "deleted";
    const group = byClient.get(key) ?? { clientId: row.clientId, clientName: row.clientName, rows: [] };
    group.rows.push(row);
    byClient.set(key, group);
  }
  const groups = [...byClient.values()].sort(
    (a, b) => b.rows.filter((r) => r.status === "OVERDUE").length - a.rows.filter((r) => r.status === "OVERDUE").length,
  );

  if (groups.length === 0) {
    return (
      <Panel>
        <p className="py-8 text-center text-muted-foreground">Nothing outstanding — every payment is settled or waived.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Balance per client" description="Unpaid and overdue, grouped by currency" flush>
      <ul className="divide-y divide-border">
        {groups.map((group) => {
          const overdueRows = group.rows.filter((r) => r.status === "OVERDUE");
          const balance = sumByCurrency(group.rows);
          const late = sumByCurrency(overdueRows);
          return (
            <li key={group.clientId ?? "deleted"} className="flex flex-wrap items-start justify-between gap-3 px-3 py-3">
              <div className="min-w-0">
                <EntityLink type="client" id={group.clientId} className="font-medium">
                  {group.clientName}
                </EntityLink>
                <p className="mt-0.5 text-meta text-muted-foreground">
                  {group.rows.length} unpaid
                  {overdueRows.length > 0 && <span className="text-danger"> · {overdueRows.length} overdue</span>}
                  {" · "}
                  <Link href={`/payments?client=${group.clientId ?? ""}`} className="hover:underline">
                    Show payments
                  </Link>
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 text-end">
                <div>
                  <dt className="telemetry text-subtle-foreground">Balance</dt>
                  <dd className="mt-1 font-mono tabular-nums">
                    {Object.entries(balance).map(([currency, amount]) => (
                      <span key={currency} className="block">
                        {money(amount, currency)}
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="telemetry text-subtle-foreground">Overdue</dt>
                  <dd className={`mt-1 font-mono tabular-nums ${overdueRows.length ? "text-danger" : "text-subtle-foreground"}`}>
                    {overdueRows.length
                      ? Object.entries(late).map(([currency, amount]) => (
                          <span key={currency} className="block">
                            {money(amount, currency)}
                          </span>
                        ))
                      : "—"}
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
