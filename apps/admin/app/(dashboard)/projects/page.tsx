import Link from "next/link";
import { prisma, type ProjectPhase } from "@repo/database";
import { Shapes } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { FilterChip } from "@/components/os/data-table";
import { moneyByCurrency, sumByCurrency } from "@/lib/format";
import { isPaymentOverdue } from "@/lib/payment-overdue";
import { PROJECT_PHASE_ORDER, projectPhase } from "@/lib/status";
import { ProjectsTable, type ProjectRow } from "./projects-table";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; phase?: string }>;
}) {
  const { client: clientParam, phase: phaseParam } = await searchParams;
  const clientId = clientParam?.trim() || null;
  // `?phase=` arrives from the Today page's delivery strip. An unknown value is
  // ignored rather than producing an empty list that looks like "no projects".
  const phase = (PROJECT_PHASE_ORDER as readonly string[]).includes(phaseParam ?? "")
    ? (phaseParam as ProjectPhase)
    : null;
  const now = new Date();

  // Each chip removes only its own filter; the other one survives.
  const hrefWithout = (drop: "client" | "phase") => {
    const params = new URLSearchParams();
    if (clientId && drop !== "client") params.set("client", clientId);
    if (phase && drop !== "phase") params.set("phase", phase);
    const query = params.toString();
    return query ? `/projects?${query}` : "/projects";
  };

  // A list reached from a client hub (`?client=`) is that client's delivery,
  // not the whole book — scoped in the query, named by the chip.
  const [scopeClient, projects] = await Promise.all([
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
        contract: { select: { proposal: { select: { totalPrice: true, currency: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const scopeName = scopeClient
    ? scopeClient.company || scopeClient.name || "Unnamed client"
    : "Unknown client";

  const rows: ProjectRow[] = projects.map((p) => {
    const total = p.payments.reduce((s, x) => s + x.amount, 0);
    const collected = p.payments.filter((x) => x.status === "PAID").reduce((s, x) => s + x.amount, 0);
    const overdue = p.payments.some((x) => isPaymentOverdue(x, now));
    const late =
      p.status === "ACTIVE" && p.targetLaunchDate != null && p.targetLaunchDate < now && !p.actualLaunchDate;

    return {
      id: p.id,
      name: p.name,
      clientId: p.clientId,
      clientName: p.client.company || p.client.name || "Unnamed client",
      phase: p.phase,
      status: p.status,
      health: p.status === "COMPLETED" ? "completed" : p.status === "ON_HOLD" ? "blocked" : late ? "atRisk" : "healthy",
      targetLaunchDate: p.targetLaunchDate?.toISOString() ?? null,
      actualLaunchDate: p.actualLaunchDate?.toISOString() ?? null,
      stagingUrl: p.stagingUrl,
      liveUrl: p.liveUrl,
      contractValue: p.contract.proposal.totalPrice,
      currency: p.contract.proposal.currency,
      billedTotal: total,
      collected,
      hasOverduePayment: overdue,
      createdAt: p.createdAt.toISOString(),
    };
  });

  const health = {
    healthy: rows.filter((r) => r.health === "healthy").length,
    atRisk: rows.filter((r) => r.health === "atRisk").length,
    blocked: rows.filter((r) => r.health === "blocked").length,
    completed: rows.filter((r) => r.health === "completed").length,
  };
  const outstanding = sumByCurrency(
    rows.map((r) => ({ amount: r.billedTotal - r.collected, currency: r.currency })),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        description="Delivery. Health is computed from the target launch date and the project status, not self-reported — a project cannot claim to be fine while its date has passed."
      />

      {(clientId || phase) && (
        <div className="flex flex-wrap items-center gap-2">
          {clientId && <FilterChip label="Client" value={scopeName} clearHref={hrefWithout("client")} />}
          {phase && (
            <FilterChip
              label="Phase"
              value={projectPhase[phase]?.label ?? phase}
              clearHref={hrefWithout("phase")}
            />
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Healthy" value={health.healthy} sub="On track" tone={health.healthy ? "success" : "neutral"} />
        <StatTile label="At risk" value={health.atRisk} sub="Past target, not launched" tone={health.atRisk ? "warning" : "neutral"} />
        <StatTile label="Blocked" value={health.blocked} sub="On hold" tone={health.blocked ? "danger" : "neutral"} />
        <StatTile
          label="Outstanding"
          value={moneyByCurrency(outstanding, true)}
          sub="Billed but not collected"
          tone={Object.values(outstanding).some((v) => v > 0) ? "warning" : "success"}
        />
      </div>

      {rows.length === 0 && phase ? (
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
          body="A project opens when this client signs a contract. Their proposals and contracts are where that starts."
          action={
            <>
              {scopeClient && (
                <Button asChild variant="outline">
                  <Link href={`/clients/${clientId}`}>Open the client</Link>
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
          body="A project is created from a signed contract — that is the only route in, so every project has a commitment and a payment schedule behind it. Sign a contract and the project appears here."
          action={
            <Button asChild variant="outline">
              <Link href="/contracts">
                Open contracts
              </Link>
            </Button>
          }
        />
      ) : (
        <ProjectsTable rows={rows} />
      )}
    </div>
  );
}
