import Link from "next/link";
import { ArrowRight, Rocket, Wallet } from "lucide-react";
import { getDashboardData, STAGE_TONE } from "@/lib/dashboard-data";
import { getActionCentre } from "@/lib/action-center";
import { statusOf } from "@/lib/status";
import { money, moneyByCurrency, percent, dueLabel, sumByCurrency } from "@/lib/format";
import { PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { ActionCenter } from "@/components/os/action-center";
import { FunnelBars } from "@/components/os/funnel";
import { Timeline } from "@/components/os/timeline";
import { EmptyInline } from "@/components/os/empty-state";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, actions] = await Promise.all([getDashboardData(), getActionCentre()]);

  const withCurrency = (rows: typeof data.paymentsOverdue) =>
    rows.map((p) => ({ amount: p.amount, currency: p.project.contract.proposal.currency }));
  const overdueTotal = sumByCurrency(withCurrency(data.paymentsOverdue));
  const dueSoonTotal = sumByCurrency(withCurrency(data.paymentsDueSoon));
  const hasOverdue = data.paymentsOverdue.length > 0;
  const urgent = actions.filter((a) => a.tone === "danger").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Today"
        description={
          actions.length === 0
            ? "Nothing is waiting on a person right now."
            : `${actions.length} item${actions.length === 1 ? "" : "s"} need a decision${urgent ? `, ${urgent} of them already late` : ""}.`
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/pipeline">
              Open pipeline
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        }
      />

      {/* ---- what needs a human. Above every metric, on purpose. -------- */}
      <Panel
        title="Action centre"
        description="Ranked by urgency across every module, not grouped by type"
        action={actions.length > 0 ? <PanelLink href="/actions">All {actions.length}</PanelLink> : null}
        flush
      >
        <ActionCenter items={actions} limit={8} />
      </Panel>

      {/* ---- the four numbers that decide the week ---------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Weighted pipeline"
          value={moneyByCurrency(data.pipeline.weightedValueByCurrency, true)}
          sub={`${moneyByCurrency(data.pipeline.openValueByCurrency, true)} unweighted · ${data.pipeline.total} clients`}
          href="/pipeline"
        />
        <StatTile
          label="Open proposals"
          value={data.openProposals.count}
          sub={moneyByCurrency(data.openProposals.byCurrency, true)}
          tone={data.openProposals.count > 0 ? "warning" : "neutral"}
          href="/proposals"
        />
        <StatTile
          label="Signed this month"
          value={data.signedThisMonth.count}
          sub={moneyByCurrency(data.signedThisMonth.byCurrency, true)}
          tone={data.signedThisMonth.count > 0 ? "success" : "neutral"}
          trend={
            data.signedThisMonth.deltaPct != null
              ? { value: data.signedThisMonth.deltaPct, label: "vs last month" }
              : undefined
          }
          href="/contracts"
        />
        <StatTile
          label="Overdue payments"
          value={data.paymentsOverdue.length}
          sub={hasOverdue ? moneyByCurrency(overdueTotal, true) : "Nothing late"}
          tone={data.paymentsOverdue.length > 0 ? "danger" : "success"}
          href="/payments"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---- pipeline ------------------------------------------------- */}
        <Panel
          title="Lead pipeline"
          description={`Win rate ${percent(data.pipeline.winRate)}${
            data.pipeline.avgCycleDays != null
              ? ` · ${data.pipeline.avgCycleDays}d average cycle`
              : ""
          }`}
          action={<PanelLink href="/pipeline">Board</PanelLink>}
        >
          {data.pipeline.total === 0 ? (
            <EmptyInline>
              No clients yet. The first website submission that gets converted will
              appear here as a New lead.
            </EmptyInline>
          ) : (
            <>
              <FunnelBars
                stages={data.pipeline.stages.map((s) => ({
                  id: s.stage,
                  label: statusOf("pipelineStage", s.stage).label,
                  count: s.count,
                  tone: STAGE_TONE[s.stage],
                }))}
                hrefBase="/pipeline?stage="
              />
              {(data.pipeline.lost > 0 || data.pipeline.spam > 0) && (
                <p className="mt-3 border-t border-border pt-2 font-mono text-micro text-subtle-foreground">
                  LOST {data.pipeline.lost} · SPAM {data.pipeline.spam}
                </p>
              )}
            </>
          )}
        </Panel>

        {/* ---- delivery health ------------------------------------------ */}
        <Panel
          title="Project health"
          description="Derived from launch dates and staging, not self-reported"
          action={<PanelLink href="/projects">All projects</PanelLink>}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <HealthCell label="Healthy" value={data.projectHealth.healthy} tone="success" />
            <HealthCell label="At risk" value={data.projectHealth.atRisk} tone="warning" />
            <HealthCell label="Blocked" value={data.projectHealth.blocked} tone="danger" />
            <HealthCell label="Completed" value={data.projectHealth.completed} tone="neutral" />
          </div>

          {data.atRiskProjects.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
              {data.atRiskProjects.slice(0, 4).map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-2 text-base hover:text-brand"
                  >
                    <Rocket className="size-3.5 shrink-0 text-warning" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{project.name}</span>
                    <span className="shrink-0 font-mono text-micro text-danger">
                      {dueLabel(project.targetLaunchDate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 border-t border-border pt-3 text-base text-muted-foreground">
              Nothing is behind schedule.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ---- proposal engagement -------------------------------------- */}
        <Panel
          title="Proposal engagement"
          description="What happens after a deck is sent"
        >
          {data.proposalRates.sent === 0 ? (
            <EmptyInline>
              No proposal has been sent yet. Delivery, read and response rates start
              once the first one goes out.
            </EmptyInline>
          ) : (
            <dl className="space-y-2.5">
              <RateRow label="Sent" value={data.proposalRates.sent} pct={100} />
              <RateRow
                label="Delivered"
                value={data.proposalRates.delivered}
                pct={data.proposalRates.deliveredPct}
              />
              <RateRow
                label="Read"
                value={data.proposalRates.read}
                pct={data.proposalRates.readPct}
              />
              <RateRow
                label="Answered"
                value={data.proposalRates.responded}
                pct={data.proposalRates.respondedPct}
              />
            </dl>
          )}
        </Panel>

        {/* ---- money ---------------------------------------------------- */}
        <Panel title="Cash" description="This month, and what is coming" action={<PanelLink href="/payments">Payments</PanelLink>}>
          <dl className="space-y-3">
            <MoneyRow
              label="Collected this month"
              value={moneyByCurrency(data.cashCollectedThisMonth)}
              tone="success"
            />
            <MoneyRow
              label="Due in 14 days"
              value={moneyByCurrency(dueSoonTotal)}
              tone={data.paymentsDueSoon.length ? "warning" : "neutral"}
            />
            <MoneyRow
              label="Overdue"
              value={moneyByCurrency(overdueTotal)}
              tone={hasOverdue ? "danger" : "neutral"}
            />
          </dl>
          {data.paymentsOverdue.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
              {data.paymentsOverdue.slice(0, 3).map((payment) => (
                <li key={payment.id} className="flex items-center gap-2 text-base">
                  <Wallet className="size-3.5 shrink-0 text-danger" aria-hidden />
                  <Link
                    href={`/projects/${payment.project.id}`}
                    className="min-w-0 flex-1 truncate hover:text-brand"
                  >
                    {payment.project.name}
                  </Link>
                  <span className="shrink-0 font-mono text-micro tabular-nums text-danger">
                    {money(payment.amount, payment.project.contract.proposal.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ---- where demand comes from ---------------------------------- */}
        <Panel
          title="Where demand comes from"
          description={`Estimator converts at ${percent(data.transparency.convertedPct)}`}
          action={<PanelLink href="/submissions">Submissions</PanelLink>}
        >
          {data.utmSources.length === 0 ? (
            <EmptyInline>
              No form submissions yet. Source attribution appears as soon as the
              website sends its first lead.
            </EmptyInline>
          ) : (
            <dl className="space-y-2">
              {data.utmSources.map((row) => (
                <div key={row.source} className="flex items-baseline justify-between gap-3">
                  <dt className="min-w-0 truncate text-base text-muted-foreground">{row.source}</dt>
                  <dd className="shrink-0 font-mono text-meta tabular-nums">{row.count}</dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>
      </div>

      {/* ---- the operational memory ------------------------------------ */}
      <Panel
        title="Recent activity"
        description="Every state change across the system, newest first"
        action={<PanelLink href="/activity">Full history</PanelLink>}
        flush
        bodyClassName="p-2"
      >
        <Timeline
          events={data.activity}
          dense
          emptyLabel="Nothing has happened yet. This fills in as leads arrive, proposals move and contracts get signed."
        />
      </Panel>
    </div>
  );
}

function HealthCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const toneClass = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    neutral: "text-muted-foreground",
  }[tone];
  return (
    <div className="rounded-md border border-border bg-surface/60 px-2.5 py-2">
      <p className="telemetry text-subtle-foreground">{label}</p>
      <p className={`mt-1 font-sans text-lg font-medium tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function RateRow({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="w-20 shrink-0 text-base text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </span>
        <span className="w-16 shrink-0 text-end font-mono text-micro tabular-nums">
          {value}
          <span className="ms-1 text-subtle-foreground">{pct}%</span>
        </span>
      </dd>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const toneClass = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    neutral: "text-foreground",
  }[tone];
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-base text-muted-foreground">{label}</dt>
      <dd className={`shrink-0 font-mono text-md tabular-nums ${toneClass}`}>{value}</dd>
    </div>
  );
}
