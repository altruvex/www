import Link from "next/link";
import { prisma } from "@repo/database";
import { Shapes } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { moneyByCurrency, sumByCurrency } from "@/lib/format";
import { ProjectsTable, type ProjectRow } from "./projects-table";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const now = new Date();
  const projects = await prisma.project.findMany({
    include: {
      client: { select: { id: true, name: true, company: true } },
      payments: true,
      contract: { select: { proposal: { select: { totalPrice: true, currency: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: ProjectRow[] = projects.map((p) => {
    const total = p.payments.reduce((s, x) => s + x.amount, 0);
    const collected = p.payments.filter((x) => x.status === "PAID").reduce((s, x) => s + x.amount, 0);
    const overdue = p.payments.some(
      (x) => x.dueDate && x.dueDate < now && x.status !== "PAID" && x.status !== "WAIVED",
    );
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
        description="Delivery. Health is computed from launch dates and staging URLs, not self-reported — a project cannot claim to be fine while its date has passed."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Healthy" value={health.healthy} sub="On track" tone={health.healthy ? "success" : "neutral"} />
        <StatTile label="At risk" value={health.atRisk} sub="Past target, no staging" tone={health.atRisk ? "warning" : "neutral"} />
        <StatTile label="Blocked" value={health.blocked} sub="On hold" tone={health.blocked ? "danger" : "neutral"} />
        <StatTile
          label="Outstanding"
          value={moneyByCurrency(outstanding, true)}
          sub="Billed but not collected"
          tone={Object.values(outstanding).some((v) => v > 0) ? "warning" : "success"}
        />
      </div>

      {rows.length === 0 ? (
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
