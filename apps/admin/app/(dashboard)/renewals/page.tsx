import { prisma } from "@repo/database";

import { FilterChip } from "@/components/os/data-table";
import { ActiveFilters } from "@/components/os/filter-bar";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { TabNav } from "@/components/os/tab-nav";
import { currentRole } from "@/lib/authorize";
import { moneyByCurrency } from "@/lib/format";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { listRenewals, type RenewalRow } from "@/lib/renewals";
import { InspectSheet } from "@/components/os/inspect-sheet";
import { EntityLink } from "@/components/os/entity-link";
import { StatusPill } from "@/components/ui/badge";
import { date, money } from "@/lib/format";
import { entityHref } from "@/lib/entity-links";

import { RenewalInspectorActions, RenewalsTable, type CanRenew } from "./renewals-table";

export const dynamic = "force-dynamic";

const KINDS = [
  { id: "all", label: "Everything" },
  { id: "retainers", label: "Retainers" },
  { id: "services", label: "Services" },
] as const;
type Kind = (typeof KINDS)[number]["id"];

export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; kind?: string; inspect?: string; attention?: string }>;
}) {
  const denied = await gateRoute("/renewals");
  if (denied) return denied;

  const { client: clientParam, kind: kindParam, inspect, attention: attentionParam } = await searchParams;
  const clientId = clientParam?.trim() || null;
  const kind: Kind = KINDS.some((k) => k.id === kindParam) ? (kindParam as Kind) : "all";
  const attentionOnly = attentionParam === "1";

  const role = await currentRole();
  const canRenew: CanRenew = {
    retainer: can(role, "edit", "payment"),
    service: can(role, "edit", "project"),
  };

  const [rows, scopeClient] = await Promise.all([
    listRenewals(clientId ? { clientId } : {}),
    clientId
      ? prisma.client.findUnique({ where: { id: clientId }, select: { name: true, company: true } })
      : null,
  ]);
  const scopeName = scopeClient
    ? scopeClient.company || scopeClient.name || "Unnamed client"
    : "Unknown client";

  const inspected = inspect ? (rows.find((row) => row.key === inspect) ?? null) : null;
  const retainers = rows.filter((row) => row.kind === "retainer");
  const services = rows.filter((row) => row.kind === "service");
  const byKind = kind === "retainers" ? retainers : kind === "services" ? services : rows;
  const visible = attentionOnly ? byKind.filter((row) => row.needsAttention) : byKind;

  const overdue = rows.filter((row) => row.rank === 0);
  const soon = rows.filter((row) => row.rank === 1);
  const dueSoon: Record<string, number> = {};
  for (const row of rows) {
    if (row.rank === 2 || row.amount === null || row.blocked !== null) continue;
    dueSoon[row.currency] = (dueSoon[row.currency] ?? 0) + row.amount;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Renewals"
        crumbs={[{ label: "Renewals" }]}
        description="Retainer periods and service terms, across every client, sorted by what needs a decision first. Status is derived from each date and the clock, so a period that lapsed this morning already reads as overdue."
        tabs={
          <TabNav
            tabs={KINDS.map((k) => ({
              id: k.id,
              label: k.label,
              count: k.id === "all" ? rows.length : k.id === "retainers" ? retainers.length : services.length,
            }))}
            active={kind}
            basePath="/renewals"
            param="kind"
            keep={{ client: clientId, attention: attentionOnly ? "1" : null }}
          />
        }
      />

      <ActiveFilters
        labels={{ client: "Client", attention: "Showing" }}
        valueLabels={{
          client: clientId ? { [clientId]: scopeName } : {},
          attention: { "1": "Needs attention" },
        }}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Lapsed or overdue"
          value={overdue.length}
          tone={overdue.length > 0 ? "danger" : "neutral"}
          sub={overdue.length > 0 ? "decide today — renew or let go" : "nothing has lapsed"}
        />
        <StatTile
          label="Due in 30 days"
          value={soon.length}
          tone={soon.length > 0 ? "warning" : "neutral"}
          sub="invoice before the date"
        />
        <StatTile
          label="To invoice in 30 days"
          value={Object.keys(dueSoon).length > 0 ? moneyByCurrency(dueSoon, true) : "—"}
          sub="lapsed and due rows that can be renewed"
        />
        <StatTile
          label="Scheduled"
          value={rows.length - overdue.length - soon.length}
          sub={`${retainers.length} retainer${retainers.length === 1 ? "" : "s"} · ${services.length} service${services.length === 1 ? "" : "s"} in all`}
        />
      </div>

      {inspect && !inspected && (
        <div className="flex flex-wrap gap-2">
          <FilterChip label="Renewal" value="Not found — it may have been renewed or removed" clearHref="/renewals" />
        </div>
      )}

      <RenewalsTable
        rows={visible}
        clientScoped={clientId !== null}
        attentionOnly={attentionOnly}
        canRenew={canRenew}
        canRemind={can(role, "send", "message")}
      />

      {inspected && <RenewalInspector row={inspected} canRenew={canRenew} />}
    </div>
  );
}

function RenewalInspector({ row, canRenew }: { row: RenewalRow; canRenew: CanRenew }) {
  const href = entityHref(row.entityType, row.id);
  return (
    <InspectSheet
      open
      title={row.what}
      subtitle={row.detail ?? (row.kind === "retainer" ? "Retainer period" : "Service term")}
      status={<StatusPill registry={row.urgency.registry} value={row.urgency.value} />}
      fullHref={href ?? undefined}
      footer={<RenewalInspectorActions row={row} canRenew={canRenew} />}
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-base">
        <div>
          <dt className="telemetry text-subtle-foreground">Client</dt>
          <dd className="mt-1">
            <EntityLink type="client" id={row.clientId}>
              {row.clientLabel}
            </EntityLink>
          </dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">Next invoice</dt>
          <dd className="mt-1 font-mono tabular-nums">
            {row.amount !== null ? money(row.amount, row.currency) : <span className="text-subtle-foreground">no quote</span>}
          </dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">{row.kind === "retainer" ? "Period ends" : "Expires"}</dt>
          <dd className="mt-1 font-mono tabular-nums">{row.dueAt ? date(row.dueAt) : "No date yet"}</dd>
        </div>
        <div>
          <dt className="telemetry text-subtle-foreground">Renews</dt>
          <dd className="mt-1 text-muted-foreground">
            {row.kind === "retainer" ? (row.autoRenew ? "Automatically, into the next period" : "Not renewing") : row.autoRenew ? "Automatically at the provider" : "By hand"}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-meta text-muted-foreground">{row.blocked ?? row.billingNote}</p>
    </InspectSheet>
  );
}
