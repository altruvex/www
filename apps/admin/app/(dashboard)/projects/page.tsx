import Link from "next/link";
import { prisma, type ProjectPhase } from "@repo/database";
import { Shapes } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { ActiveFilters, FilterChip } from "@/components/os/filter-bar";
import { moneyByCurrency, sumByCurrency } from "@/lib/format";
import { currentRole } from "@/lib/authorize";
import { roleCanOpen } from "@/lib/action-center";
import { canSeeFinance } from "@/lib/nav";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { isPaymentOverdue } from "@/lib/payment-overdue";
import { PROJECT_PHASE_ORDER, projectPhase } from "@/lib/status";
import { projectCurrency } from "@/lib/project-currency";
import { ProjectsTable, type ProjectRow } from "./projects-table";
import { KIND_LABEL } from "@/lib/service-lifecycle";
import { RecordProjectButton } from "./record-project-sheet";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

const HEALTH_KEYS: ProjectRow["health"][] = [
  "healthy",
  "atRisk",
  "blocked",
  "completed",
];
const HEALTH_LABEL: Record<ProjectRow["health"], string> = {
  healthy: "Healthy",
  atRisk: "At risk",
  blocked: "Blocked",
  completed: "Completed",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    client?: string;
    phase?: string;
    health?: string;
    new?: string;
  }>;
}) {
  const denied = await gateRoute("/projects", "projects");
  if (denied) return denied;
  const role = await currentRole();
  const finance = canSeeFinance(role);
  const {
    client: clientParam,
    phase: phaseParam,
    health: healthParam,
    new: newParam,
  } = await searchParams;
  const canRecord = can(role, "create", "project");
  const clientId = clientParam?.trim() || null;
  const phase = (PROJECT_PHASE_ORDER as readonly string[]).includes(
    phaseParam ?? "",
  )
    ? (phaseParam as ProjectPhase)
    : null;
  const healthFilter = HEALTH_KEYS.includes(healthParam as ProjectRow["health"])
    ? (healthParam as ProjectRow["health"])
    : null;
  const now = new Date();

  const hrefWith = (
    change: Partial<Record<"client" | "phase" | "health", string | null>>,
  ) => {
    const params = new URLSearchParams();
    const next = { client: clientId, phase, health: healthFilter, ...change };
    for (const [key, value] of Object.entries(next))
      if (value) params.set(key, value);
    const query = params.toString();
    return query ? `/projects?${query}` : "/projects";
  };
  const hrefWithout = (drop: "client" | "phase" | "health") =>
    hrefWith({ [drop]: null });

  const [scopeClient, projects, recordClients] = await Promise.all([
    clientId
      ? prisma.client.findUnique({
          where: { id: clientId },
          select: { name: true, company: true },
        })
      : null,
    prisma.project.findMany({
      where: { ...(clientId ? { clientId } : {}), ...(phase ? { phase } : {}) },
      include: {
        client: { select: { id: true, name: true, company: true } },
        payments: true,
        contract: {
          select: {
            proposal: { select: { totalPrice: true, currency: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    canRecord
      ? prisma.client.findMany({
          select: {
            id: true,
            name: true,
            company: true,
            website: true,
            products: {
              where: { projectId: null },
              select: {
                id: true,
                name: true,
                productionUrl: true,
                stagingUrl: true,
              },
              orderBy: { createdAt: "asc" },
            },
            services: {
              where: { projectId: null, cancelledAt: null },
              select: { id: true, kind: true, name: true, currency: true },
              orderBy: { createdAt: "asc" },
            },
            proposals: {
              select: { currency: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: [{ company: "asc" }, { name: "asc" }],
        })
      : [],
  ]);
  const scopeName = scopeClient
    ? scopeClient.company || scopeClient.name || "Unnamed client"
    : "Unknown client";

  const allRows: ProjectRow[] = projects.map((p) => {
    const total = p.payments.reduce((s, x) => s + x.amount, 0);
    const collected = p.payments
      .filter((x) => x.status === "PAID")
      .reduce((s, x) => s + x.amount, 0);
    const overdue = p.payments.some((x) => isPaymentOverdue(x, now));
    const late =
      p.status === "ACTIVE" &&
      p.targetLaunchDate != null &&
      p.targetLaunchDate < now &&
      !p.actualLaunchDate;

    return {
      id: p.id,
      name: p.name,
      clientId: p.clientId,
      clientName: p.client.company || p.client.name || "Unnamed client",
      phase: p.phase,
      status: p.status,
      health:
        p.status === "COMPLETED"
          ? "completed"
          : p.status === "ON_HOLD"
            ? "blocked"
            : late
              ? "atRisk"
              : "healthy",
      targetLaunchDate: p.targetLaunchDate?.toISOString() ?? null,
      actualLaunchDate: p.actualLaunchDate?.toISOString() ?? null,
      stagingUrl: p.stagingUrl,
      liveUrl: p.liveUrl,
      contractValue: p.contract?.proposal.totalPrice ?? null,
      currency: projectCurrency(p),
      billedTotal: total,
      collected,
      hasOverduePayment: overdue,
      createdAt: p.createdAt.toISOString(),
      recorded: p.origin === "RECORDED",
    };
  });

  const health = {
    healthy: allRows.filter((r) => r.health === "healthy").length,
    atRisk: allRows.filter((r) => r.health === "atRisk").length,
    blocked: allRows.filter((r) => r.health === "blocked").length,
    completed: allRows.filter((r) => r.health === "completed").length,
  };
  const rows = healthFilter
    ? allRows.filter((r) => r.health === healthFilter)
    : allRows;
  const outstanding = sumByCurrency(
    allRows.map((r) => ({
      amount: r.billedTotal - r.collected,
      currency: r.currency,
    })),
  );

  const recordClientOptions = recordClients.map((c) => ({
    id: c.id,
    label: c.company || c.name || "Unnamed client",
    known: {
      website: c.website,
      proposalCurrency: c.proposals[0]?.currency ?? null,
      products: c.products,
      services: c.services.map((x) => ({
        id: x.id,
        name: x.name,
        kindLabel: KIND_LABEL[x.kind],
        isDomain: x.kind === "DOMAIN",
        currency: x.currency,
      })),
    },
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        description="Delivery. Health is computed from the target launch date and the project status, not self-reported — a project cannot claim to be fine while its date has passed."
        actions={
          canRecord ? (
            <RecordProjectButton
              clients={recordClientOptions}
              preset={newParam === "recorded" ? { clientId } : null}
              scopeClientId={scopeClient ? clientId : null}
            />
          ) : undefined
        }
      />

      <ActiveFilters
        labels={{ client: "Client", phase: "Phase" }}
        valueLabels={{
          ...(clientId ? { client: { [clientId]: scopeName } } : {}),
          phase: Object.fromEntries(
            PROJECT_PHASE_ORDER.map((p) => [p, projectPhase[p]?.label ?? p]),
          ),
        }}
      />

      <div
        className={
          finance
            ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            : "grid gap-3 sm:grid-cols-3"
        }
      >
        <StatTile
          label="Healthy"
          value={health.healthy}
          sub="On track"
          tone={health.healthy ? "success" : "neutral"}
          href={hrefWith({
            health: healthFilter === "healthy" ? null : "healthy",
          })}
        />
        <StatTile
          label="At risk"
          value={health.atRisk}
          sub="Past target, not launched"
          tone={health.atRisk ? "warning" : "neutral"}
          href={hrefWith({
            health: healthFilter === "atRisk" ? null : "atRisk",
          })}
        />
        <StatTile
          label="Blocked"
          value={health.blocked}
          sub="On hold"
          tone={health.blocked ? "danger" : "neutral"}
          href={hrefWith({
            health: healthFilter === "blocked" ? null : "blocked",
          })}
        />
        {finance && (
          <StatTile
            label="Outstanding"
            value={moneyByCurrency(outstanding, true)}
            sub="Billed but not collected"
            tone={
              Object.values(outstanding).some((v) => v > 0)
                ? "warning"
                : "success"
            }
          />
        )}
      </div>

      {rows.length === 0 && healthFilter ? (
        <EmptyState
          icon={Shapes}
          title={`No ${HEALTH_LABEL[healthFilter].toLowerCase()} project`}
          body="Nothing matches this health right now. Health is computed from the target launch date and the status."
          action={
            <Button asChild variant="ghost">
              <Link href={hrefWithout("health")}>Show every project</Link>
            </Button>
          }
        />
      ) : rows.length === 0 && phase ? (
        <EmptyState
          icon={Shapes}
          title={`No project in ${projectPhase[phase]?.label ?? phase}`}
          body="Nothing is at this phase right now. Projects move phase from their own page."
          action={
            <Button asChild variant="ghost">
              <Link href={hrefWithout("phase")}>Clear the phase filter</Link>
            </Button>
          }
        />
      ) : rows.length === 0 && clientId ? (
        <EmptyState
          icon={Shapes}
          title={`No project for ${scopeName}`}
          body={
            canRecord
              ? "A project opens when this client signs a contract. Their proposals and contracts are where that starts — or record a past project they had built before this system existed."
              : "A project opens when this client signs a contract. Their proposals and contracts are where that starts."
          }
          action={
            <>
              {canRecord && scopeClient && (
                <RecordProjectButton
                  clients={recordClientOptions}
                  scopeClientId={clientId}
                />
              )}
              {scopeClient && (
                <Button asChild variant="outline">
                  <Link href={`/clients/${clientId}#deals`}>Open their deals</Link>
                </Button>
              )}
              <Button asChild variant="ghost">
                <Link href="/projects">All projects</Link>
              </Button>
            </>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Shapes}
          title="Nothing in delivery"
          body={
            canRecord
              ? "A project is created from a signed contract, so it has a commitment and a payment schedule behind it. Work built before this system existed can be recorded by hand instead — it carries no contract, and says so."
              : "A project is created from a signed contract — that is the only route in, so every project has a commitment and a payment schedule behind it. Sign a contract and the project appears here."
          }
          action={
            <>
              {canRecord && (
                <RecordProjectButton clients={recordClientOptions} />
              )}
              <Button asChild variant="outline">
                <Link href="/contracts">Open contracts</Link>
              </Button>
            </>
          }
        />
      ) : (
        <ProjectsTable
          rows={rows}
          showMoney={finance}
          canDelete={can(role, "delete", "project")}
          canEdit={can(role, "edit", "project")}
          canOpenClient={roleCanOpen(role, "/clients")}
          canAddTask={can(role, "create", "project")}
          canOpenPayments={finance && roleCanOpen(role, "/payments")}
          toolbar={
            <div
              className="flex flex-wrap items-center gap-1"
              aria-label="Health"
            >
              <FilterChip param="health" label="All" />
              {HEALTH_KEYS.map((key) => (
                <FilterChip
                  key={key}
                  param="health"
                  value={key}
                  label={HEALTH_LABEL[key]}
                  count={health[key]}
                />
              ))}
            </div>
          }
        />
      )}
    </div>
  );
}
