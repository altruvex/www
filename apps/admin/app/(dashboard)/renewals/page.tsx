import { prisma } from "@repo/database";
import { notFound } from "next/navigation";

import { FilterChip } from "@/components/os/data-table";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { TabNav } from "@/components/os/tab-nav";
import { currentRole } from "@/lib/authorize";
import { moneyByCurrency } from "@/lib/format";
import { canSeeFinance } from "@/lib/nav";
import { listRenewals } from "@/lib/renewals";

import { RenewalsTable } from "./renewals-table";

export const dynamic = "force-dynamic";

const KINDS = [
  { id: "all", label: "Everything" },
  { id: "retainers", label: "Retainers" },
  { id: "services", label: "Services" },
] as const;
type Kind = (typeof KINDS)[number]["id"];

/**
 * Renewals — every retainer period and service term that is coming due, lapsed,
 * or scheduled, across all clients, with the renew action beside each.
 *
 * Finance-gated twice: the sidebar hides it from other roles and this page
 * refuses them itself, because a URL pasted into a message does not go
 * through the sidebar. Everything on it is derived from the clock — the
 * sidebar badge counts the same rows (`countRenewalsNeedingAttention`).
 */
export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; kind?: string }>;
}) {
  const role = await currentRole();
  if (!canSeeFinance(role)) notFound();

  const { client: clientParam, kind: kindParam } = await searchParams;
  const clientId = clientParam?.trim() || null;
  const kind: Kind = KINDS.some((k) => k.id === kindParam) ? (kindParam as Kind) : "all";

  const [rows, scopeClient] = await Promise.all([
    listRenewals(clientId ? { clientId } : {}),
    clientId
      ? prisma.client.findUnique({ where: { id: clientId }, select: { name: true, company: true } })
      : null,
  ]);
  const scopeName = scopeClient
    ? scopeClient.company || scopeClient.name || "Unnamed client"
    : "Unknown client";

  const retainers = rows.filter((row) => row.kind === "retainer");
  const services = rows.filter((row) => row.kind === "service");
  const visible = kind === "retainers" ? retainers : kind === "services" ? services : rows;

  const overdue = rows.filter((row) => row.rank === 0);
  const soon = rows.filter((row) => row.rank === 1);
  // What the next 30 days should invoice, per currency — never summed across
  // currencies, and a quote-only retainer with no quote adds nothing.
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
            keep={{ client: clientId }}
          />
        }
      />

      {clientId && (
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="Client"
            value={scopeName}
            clearHref={kind === "all" ? "/renewals" : `/renewals?kind=${kind}`}
          />
        </div>
      )}

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

      <RenewalsTable rows={visible} clientScoped={clientId !== null} />
    </div>
  );
}
