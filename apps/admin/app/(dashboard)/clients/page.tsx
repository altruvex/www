import Link from "next/link";
import { prisma } from "@repo/database";
import { Building2, Plus } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { EmptyState } from "@/components/os/empty-state";
import { StatTile } from "@/components/os/stat-tile";
import { FilterChip } from "@/components/os/data-table";
import { deriveClientStage } from "@/lib/dashboard-data";
import { statusOf } from "@/lib/status";
import { moneyByCurrency, sumByCurrency } from "@/lib/format";
import { ClientsTable, type ClientRow } from "./clients-table";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

// Every derived stage, including the two the pipeline board leaves out (SPAM
// is never a deal; LOST is a column there but a list is easier to work).
const STAGES = [
  "NEW",
  "VIEWED",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "PROPOSAL_READ",
  "CONTRACT_SENT",
  "SIGNED",
  "LOST",
  "SPAM",
] as const;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { stage: stageParam } = await searchParams;
  // An unknown value is ignored rather than shown as an empty filtered list.
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
    lifetimeValue: client.proposals
      .filter((p) => p.status === "ACCEPTED")
      .reduce((sum, p) => sum + p.totalPrice, 0),
    // The currency the accepted work is actually in — the row used to print the
    // NEWEST proposal's currency next to a total made of older ones.
    lifetimeCurrency:
      client.proposals.find((p) => p.status === "ACCEPTED")?.currency ?? "EGP",
    mixedCurrency:
      new Set(
        client.proposals
          .filter((p) => p.status === "ACCEPTED")
          .map((p) => p.currency),
      ).size > 1,
    latestValue: client.proposals[0]?.totalPrice ?? null,
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

  // The stage is derived, so the filter runs after derivation, not in SQL.
  const visible = stage ? rows.filter((r) => r.stage === stage) : rows;

  const active = rows.filter((r) => r.projectCount > 0).length;
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
          <Button asChild variant="brand">
            <Link href="/clients/new">
              <Plus className="size-3.5" />
              New client
            </Link>
          </Button>
        }
      />

      {stage && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            label="Stage"
            value={statusOf("pipelineStage", stage).label}
            clearHref="/clients"
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total clients"
          value={rows.length}
          sub="Every record, all stages"
        />
        <StatTile
          label="Signed"
          value={signed}
          sub="At least one signed contract"
          tone={signed ? "success" : "neutral"}
          href="/clients?stage=SIGNED"
        />
        <StatTile
          label="In delivery"
          value={active}
          sub="Has a project"
          tone={active ? "progress" : "neutral"}
        />
        <StatTile
          label="Accepted value"
          value={moneyByCurrency(lifetime, true)}
          sub="Sum of accepted proposals"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No clients yet"
          body="A client record is created when a website submission is converted, when the estimator produces a qualified lead, or when you add one by hand. Everything downstream — proposals, contracts, projects — hangs off this record."
          action={
            <Button asChild variant="brand">
              <Link href="/clients/new">
                <Plus className="size-3.5" />
                Add the first client
              </Link>
            </Button>
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
        <ClientsTable rows={visible} />
      )}
    </div>
  );
}
