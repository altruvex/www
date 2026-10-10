import Link from "next/link";
import { prisma } from "@repo/database";
import { Building2, Plus } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { EmptyState } from "@/components/os/empty-state";
import { StatTile } from "@/components/os/stat-tile";
import { FilterBar, FilterChip } from "@/components/os/filter-bar";
import { currentRole } from "@/lib/authorize";
import { STAGE_MEETINGS_SELECT, deriveClientStage } from "@/lib/dashboard-data";
import { canSeeFinance } from "@/lib/nav";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { ALL_STAGES, statusOf } from "@/lib/status";
import { moneyByCurrency, sumByCurrency } from "@/lib/format";
import { ClientsTable, type ClientRow } from "./clients-table";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

const STAGES = ALL_STAGES;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const denied = await gateRoute("/clients", "clients");
  if (denied) return denied;
  const role = await currentRole();
  const showMoney = canSeeFinance(role);
  const canCreate = can(role, "create", "client");
  const canDelete = can(role, "delete", "client");
  const canEdit = can(role, "edit", "client");

  const { stage: stageParam } = await searchParams;
  const stage =
    STAGES.find((s) => s === stageParam?.trim().toUpperCase()) ?? null;

  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      company: true,
      phone: true,
      email: true,
      industry: true,
      source: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      proposals: {
        select: {
          status: true,
          readAt: true,
          totalPrice: true,
          currency: true,
        },
        orderBy: { createdAt: "desc" },
      },
      contracts: { select: { status: true }, orderBy: { createdAt: "desc" } },
      projects: { select: { id: true, name: true, status: true, phase: true } },
      ...STAGE_MEETINGS_SELECT,
      _count: {
        select: {
          messages: true,
          proposals: true,
          contracts: true,
          projects: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows: ClientRow[] = clients.map((client) => ({
    id: client.id,
    name: client.name,
    company: client.company,
    phone: client.phone,
    email: client.email,
    industry: client.industry,
    source: client.source,
    status: client.status,
    priority: client.priority,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    stage: deriveClientStage(client),
    lifetimeValue: !showMoney
      ? 0
      : client.proposals
          .filter((p) => p.status === "ACCEPTED")
          .reduce((sum, p) => sum + p.totalPrice, 0),
    lifetimeCurrency:
      client.proposals.find((p) => p.status === "ACCEPTED")?.currency ?? "EGP",
    mixedCurrency:
      new Set(
        client.proposals
          .filter((p) => p.status === "ACCEPTED")
          .map((p) => p.currency),
      ).size > 1,
    latestValue: showMoney ? (client.proposals[0]?.totalPrice ?? null) : null,
    currency: client.proposals[0]?.currency ?? "EGP",
    proposalCount: client._count.proposals,
    contractCount: client._count.contracts,
    projectCount: client._count.projects,
    messageCount: client._count.messages,
    activeProject:
      client.projects.find((p) => p.status === "ACTIVE")?.name ?? null,
    activeProjectId:
      client.projects.find((p) => p.status === "ACTIVE")?.id ?? null,
  }));

  const visible = stage ? rows.filter((r) => r.stage === stage) : rows;

  const active = rows.filter((r) => r.activeProjectId).length;
  const stageCounts = new Map<string, number>();
  for (const r of rows)
    stageCounts.set(r.stage, (stageCounts.get(r.stage) ?? 0) + 1);
  const signed = rows.filter((r) => r.stage === "SIGNED").length;
  const lifetime = sumByCurrency(
    rows.map((r) => ({
      amount: r.lifetimeValue,
      currency: r.lifetimeCurrency,
    })),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clients"
        description="One record per company. Proposals, contracts, projects, payments and messages all hang off it — nothing here is a second copy."
        actions={
          canCreate ? (
            <Button asChild variant="brand">
              <Link href="/clients/new">
                <Plus className="size-3.5" />
                New client
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="Total clients"
          value={rows.length}
          sub="Every record, all stages"
          href="/clients"
        />
        <StatTile
          label="Won"
          value={signed}
          sub="Signed contract, marked won, or a live project"
          tone={signed ? "success" : "neutral"}
          href="/clients?stage=SIGNED"
        />
        <StatTile
          label="In delivery"
          value={active}
          sub="Has an active project"
          tone={active ? "progress" : "neutral"}
          href="/projects"
        />
        {showMoney ? (
          <StatTile
            label="Accepted value"
            value={moneyByCurrency(lifetime, true)}
            sub="Sum of accepted proposals"
          />
        ) : (
          <StatTile
            label="New"
            value={stageCounts.get("NEW") ?? 0}
            sub="Not opened yet"
            tone={stageCounts.get("NEW") ? "warning" : "neutral"}
            href="/clients?stage=NEW"
          />
        )}
      </div>

      {rows.length > 0 && (
        <FilterBar label="Filter clients by stage">
          <FilterChip param="stage" label="All" count={rows.length} />
          {STAGES.filter((s) => s === stage || stageCounts.get(s)).map((s) => (
            <FilterChip
              key={s}
              param="stage"
              value={s}
              label={statusOf("pipelineStage", s).label}
              count={stageCounts.get(s) ?? 0}
            />
          ))}
        </FilterBar>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No clients yet"
          body="A client record is created when a website submission is converted, when the estimator produces a qualified lead, or when you add one by hand. Everything downstream — proposals, contracts, projects — hangs off this record."
          action={
            canCreate ? (
              <Button asChild variant="brand">
                <Link href="/clients/new">
                  <Plus className="size-3.5" />
                  Add the first client
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : visible.length === 0 && stage ? (
        <EmptyState
          icon={Building2}
          title={`No client is at ${statusOf("pipelineStage", stage).label}`}
          body="The stage is derived from each client's proposals and contracts, so a client moves in and out of it on its own."
          action={
            <Button asChild variant="outline">
              <Link href="/clients">All clients</Link>
            </Button>
          }
        />
      ) : (
        <ClientsTable
          rows={visible}
          showMoney={showMoney}
          canEdit={canEdit}
          canDelete={canDelete}
          canPropose={can(role, "create", "proposal")}
        />
      )}
    </div>
  );
}
