import Link from "next/link";
import { MessageCircle, Wallet } from "lucide-react";
import { Button } from "@repo/ui";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { Panel } from "@/components/os/panel";
import { EmptyState } from "@/components/os/empty-state";
import { FilterChip } from "@/components/os/data-table";
import { InspectSheet } from "@/components/os/inspect-sheet";
import { List, ListRow } from "@/components/os/list-row";
import { Soon } from "@/components/os/soon";
import { StatusPill } from "@/components/ui/badge";
import {
  date,
  dueLabel,
  money,
  moneyByCurrency,
  sumByCurrency,
} from "@/lib/format";
import { gateRoute } from "@/lib/page-gate";
import { paymentMethodLabel } from "@/lib/payment-source";
import { entityHref } from "@/lib/entity-links";
import { statusOf } from "@/lib/status";
import { DUE_SOON_DAYS } from "@/lib/payment-overdue";
import { currentRole } from "@/lib/authorize";
import { roleCanOpen } from "@/lib/action-center";
import { canSeeFinance } from "@/lib/nav";
import { can } from "@/lib/rbac";
import { PaymentsTable, type PaymentRow } from "./payments-table";
import { BillingTabs } from "./billing-tabs";
import { PickToOpen } from "@/components/os/pick-to-open";
import { NewChargeButton } from "./new-charge-dialog";
import { PaymentInspectorActions } from "./focused-payment";
import { PaymentReminderButton } from "./payment-reminder";
import { loadInspectorReminder } from "@/lib/payment-reminder";
import {
  BILLING_STATUS_LABEL,
  loadBillingRows,
  loadChargeTargets,
  matchesStatus,
  parseStatusFilter,
  type BillingRow,
} from "./billing-rows";

export const dynamic = "force-dynamic";

interface SearchParams {
  tab?: string;
  inspect?: string;
  payment?: string;
  client?: string;
  project?: string;
  status?: string;
  new?: string;
}

function hrefWithout(
  params: SearchParams,
  drop: keyof SearchParams | Array<keyof SearchParams>,
): string {
  const drops = Array.isArray(drop) ? drop : [drop];
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== "new" && !drops.includes(key as keyof SearchParams) && value)
      next.set(key, value);
  }
  const query = next.toString();
  return query ? `/payments?${query}` : "/payments";
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const denied = await gateRoute("/payments");
  if (denied) return denied;

  const params = await searchParams;
  const now = new Date();
  const [allRows, chargeTargets, role] = await Promise.all([
    loadBillingRows(now),
    loadChargeTargets(now),
    currentRole(),
  ]);
  const canDelete = can(role, "delete", "payment");
  const canEdit = can(role, "edit", "payment");
  const canCharge = can(role, "create", "payment") && canSeeFinance(role);
  const canMessage = roleCanOpen(role, "/whatsapp");
  const projectCharges = canCharge
    ? chargeTargets
        .filter((t) => t.value.startsWith("project:"))
        .slice(0, 50)
        .map((t) => ({
          label: t.label,
          href: `/payments?new=charge&project=${t.value.slice("project:".length)}&client=${t.clientId}`,
        }))
    : [];
  const chargePreset =
    canCharge && params.new === "charge"
      ? { clientId: params.client ?? null, projectId: params.project ?? null }
      : null;

  const tab = params.tab === "outstanding" ? "outstanding" : "payments";
  const statusFilter = parseStatusFilter(params.status);
  const inspectId = params.inspect ?? params.payment ?? null;
  const inspected = inspectId
    ? (allRows.find((r) => r.id === inspectId) ?? null)
    : null;
  const reminder = inspected ? await loadInspectorReminder(inspected, role) : null;

  let rows = allRows;
  if (params.client) rows = rows.filter((r) => r.clientId === params.client);
  if (params.project)
    rows = rows.filter(
      (r) => r.sourceType === "project" && r.sourceId === params.project,
    );
  if (statusFilter) rows = rows.filter((r) => matchesStatus(r, statusFilter));

  const scopedClient = params.client
    ? allRows.find((r) => r.clientId === params.client)
    : null;
  const scopedProject = params.project
    ? allRows.find(
        (r) => r.sourceType === "project" && r.sourceId === params.project,
      )
    : null;

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const overdue = rows.filter((r) => r.status === "OVERDUE");
  const pending = rows.filter((r) => r.status === "PENDING");
  const dueSoon = rows.filter((r) => r.dueSoon);
  const paid = rows.filter((r) => r.status === "PAID");
  const collectedThisMonth = sumByCurrency(
    paid.filter((r) => r.paidAt && new Date(r.paidAt) >= startOfMonth),
  );

  const chips = [
    scopedClient && (
      <FilterChip
        key="client"
        label="Client"
        value={scopedClient.clientName}
        clearHref={hrefWithout(params, "client")}
      />
    ),
    scopedProject && (
      <FilterChip
        key="project"
        label="Project"
        value={scopedProject.sourceName}
        clearHref={hrefWithout(params, "project")}
      />
    ),
    statusFilter && (
      <FilterChip
        key="status"
        label="Status"
        value={BILLING_STATUS_LABEL[statusFilter]}
        clearHref={hrefWithout(params, "status")}
      />
    ),
    inspectId && !inspected && (
      <FilterChip
        key="inspect"
        label="Payment"
        value="Not found — it may have been deleted"
        clearHref={hrefWithout(params, ["inspect", "payment"])}
      />
    ),
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Billing"
        description="Every milestone, renewal and charge across every client. A row goes overdue on its own — nobody has to remember to change it."
        actions={
          <NewChargeButton
            key={chargePreset ? `${chargePreset.clientId}:${chargePreset.projectId}` : "none"}
            targets={chargeTargets}
            preset={chargePreset}
            scope={params.client ? { clientId: params.client, projectId: null } : null}
          />
        }
      />

      <BillingTabs
        active={tab}
        counts={{
          outstanding: allRows.filter((r) => r.status === "OVERDUE").length,
        }}
      />

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">{chips}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Overdue"
          value={overdue.length}
          sub={
            overdue.length
              ? moneyByCurrency(sumByCurrency(overdue))
              : "Nothing late"
          }
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
            projectCharges.length > 0 ? (
              <PickToOpen label="Add a payment" options={projectCharges} />
            ) : can(role, "create", "project") ? (
              <Button asChild variant="outline">
                <Link href="/projects?new=recorded">Record a project</Link>
              </Button>
            ) : undefined
          }
        />
      ) : tab === "outstanding" ? (
        <OutstandingTab
          rows={rows.filter(
            (r) => r.status === "OVERDUE" || r.status === "PENDING",
          )}
        />
      ) : (
        <PaymentsTable rows={rows} canDelete={canDelete} canEdit={canEdit} />
      )}

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-subtle-foreground">
        <span>
          This screen records money that has already arrived; it does not move
          any.
        </span>
        <span className="inline-flex items-center gap-1">
          Refunds, partial payments and card payments
          <Soon reason="Integration required: a payment provider (Stripe, Paymob) that can take or return money. Until then, record what the bank statement shows." />
        </span>
      </p>

      {inspected && (
        <PaymentInspector
          row={inspected}
          canEdit={canEdit}
          canMessage={canMessage}
          reminder={reminder}
        />
      )}
    </div>
  );
}

function PaymentInspector({
  row,
  canEdit,
  canMessage,
  reminder,
}: {
  row: BillingRow;
  canEdit: boolean;
  canMessage: boolean;
  reminder: Awaited<ReturnType<typeof loadInspectorReminder>>;
}) {
  const label = `${statusOf("paymentMilestone", row.milestone).label} · ${row.sourceName}`;
  const sourceLink = entityHref(row.sourceType, row.sourceId);
  // A project's payments live in its Money section; land there, not on the top of the page.
  const sourceHref = sourceLink && row.sourceType === "project" ? `${sourceLink}#money` : sourceLink;
  const sourceNoun =
    row.sourceType === "project"
      ? "project"
      : row.sourceType === "subscription"
        ? "retainer"
        : "service";

  return (
    <InspectSheet
      open
      title={label}
      subtitle={row.clientName}
      status={
        <StatusPill registry="paymentStatus" value={row.status} variant="dot" />
      }
      footer={
        <PaymentInspectorActions
          row={{
            id: row.id,
            label,
            status: row.status,
            amountLabel: money(row.amount, row.currency),
            reference: row.reference,
            invoiceNumber: row.invoiceNumber,
            previousPaidOn: row.previousPaidOn ?? null,
            paidOnLabel: row.paidAt ? date(row.paidAt) : null,
          }}
          canEdit={canEdit}
        />
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-base">
        <div>
          <dt className="telemetry text-subtle-foreground">Amount</dt>
          <dd className="mt-1 font-mono tabular-nums">
            {money(row.amount, row.currency)}
          </dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">
            {row.status === "PAID" ? "Paid" : "Due"}
          </dt>
          <dd
            className={`mt-1 ${row.status === "OVERDUE" ? "text-danger" : "text-muted-foreground"}`}
          >
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
              <Link
                href={`/invoices?inspect=${row.id}`}
                className="rounded-xs underline-offset-2 hover:underline"
              >
                {row.invoiceNumber}
              </Link>
            ) : row.status === "WAIVED" ? (
              "—"
            ) : (
              "Not issued"
            )}
          </dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">Reference</dt>
          <dd className="mt-1 font-mono text-muted-foreground">
            {row.reference ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">Opened</dt>
          <dd className="mt-1 text-muted-foreground">{date(row.createdAt)}</dd>
        </div>
        {row.invoicedAt && (
          <div>
            <dt className="telemetry text-subtle-foreground">Invoiced</dt>
            <dd className="mt-1 text-muted-foreground">
              {date(row.invoicedAt)}
            </dd>
          </div>
        )}
      </dl>
      <p className="mt-4 flex flex-wrap gap-x-4 text-meta text-muted-foreground">
        {sourceHref && (
          <Link
            href={sourceHref}
            className="rounded-xs underline-offset-2 hover:underline"
          >
            Open {sourceNoun}
          </Link>
        )}
        {row.clientId && (
          <Link
            href={`/clients/${row.clientId}#money`}
            className="rounded-xs text-muted-foreground underline-offset-2 transition-colors duration-[var(--dur-state)] hover:text-foreground hover:underline"
          >
            Open client
          </Link>
        )}
        {reminder && (
          <PaymentReminderButton
            target={reminder.target}
            emailConfigured={reminder.emailConfigured}
          />
        )}
        {canMessage &&
          row.clientId &&
          (row.status === "OVERDUE" || row.status === "PENDING") && (
            <Link
              href={`/whatsapp/${row.clientId}`}
              className="inline-flex items-center gap-1 rounded-xs underline-offset-2 hover:underline"
            >
              <MessageCircle className="size-3.5" aria-hidden />
              {row.clientName} on WhatsApp
            </Link>
          )}
      </p>
    </InspectSheet>
  );
}

function OutstandingTab({ rows }: { rows: PaymentRow[] }) {
  const byClient = new Map<
    string,
    { clientId: string | null; clientName: string; rows: PaymentRow[] }
  >();
  for (const row of rows) {
    const key = row.clientId ?? "deleted";
    const group = byClient.get(key) ?? {
      clientId: row.clientId,
      clientName: row.clientName,
      rows: [],
    };
    group.rows.push(row);
    byClient.set(key, group);
  }
  const groups = [...byClient.values()].sort(
    (a, b) =>
      b.rows.filter((r) => r.status === "OVERDUE").length -
      a.rows.filter((r) => r.status === "OVERDUE").length,
  );

  if (groups.length === 0) {
    return (
      <Panel>
        <p className="py-8 text-center text-muted-foreground">
          Nothing outstanding — every payment is settled or waived.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Balance per client"
      description="Unpaid and overdue, grouped by currency"
      flush
    >
      <List label="Balance per client">
        {groups.map((group) => {
          const overdueRows = group.rows.filter((r) => r.status === "OVERDUE");
          const balance = sumByCurrency(group.rows);
          const late = sumByCurrency(overdueRows);
          return (
            <ListRow
              key={group.clientId ?? "deleted"}
              icon={<Wallet />}
              tone={overdueRows.length ? "danger" : "neutral"}
              title={group.clientName}
              meta={
                <>
                  {group.rows.length} unpaid
                  {overdueRows.length > 0 && (
                    <span className="text-danger">
                      {" "}
                      · {overdueRows.length} overdue
                    </span>
                  )}
                </>
              }
              trailing={
                <span className="grid grid-cols-2 gap-x-6 text-end text-meta">
                  <span>
                    <span className="telemetry block text-subtle-foreground">
                      Balance
                    </span>
                    {Object.entries(balance).map(([currency, amount]) => (
                      <span
                        key={currency}
                        className="block font-mono tabular-nums text-foreground"
                      >
                        {money(amount, currency)}
                      </span>
                    ))}
                  </span>
                  <span>
                    <span className="telemetry block text-subtle-foreground">
                      Overdue
                    </span>
                    {overdueRows.length ? (
                      Object.entries(late).map(([currency, amount]) => (
                        <span
                          key={currency}
                          className="block font-mono tabular-nums text-danger"
                        >
                          {money(amount, currency)}
                        </span>
                      ))
                    ) : (
                      <span className="block text-subtle-foreground">—</span>
                    )}
                  </span>
                </span>
              }
              href={
                group.clientId
                  ? `/payments?client=${group.clientId}`
                  : undefined
              }
            />
          );
        })}
      </List>
    </Panel>
  );
}
