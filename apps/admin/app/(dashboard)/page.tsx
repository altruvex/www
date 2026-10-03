import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDashboardData, STAGE_TONE } from "@/lib/dashboard-data";
import { getActionCentre } from "@/lib/action-center";
import { slackConfigured } from "@/lib/slack";
import { requireAdminPage } from "@/lib/require-admin";
import { toProductRole } from "@/lib/rbac";
import { canSeeFinance } from "@/lib/nav";
import { statusOf } from "@/lib/status";
import { moneyByCurrency, percent, sumByCurrency } from "@/lib/format";
import { paymentCurrency } from "@/lib/payment-source";
import { PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { ActionCenter } from "@/components/os/action-center";
import { SlackButton } from "@/components/os/slack-button";
import { FunnelBars } from "@/components/os/funnel";
import { EmptyInline } from "@/components/os/empty-state";
import { RevenuePanel } from "@/components/today/revenue-panel";
import { EngineeringStatus } from "@/components/today/engineering-status";
import { DeliveryPanel } from "@/components/today/delivery-panel";
import { ActivityFeed } from "@/components/today/activity-feed";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

/**
 * Today. Read top to bottom it answers, in order: what needs a person now,
 * is anything broken, how is the money, what is shipping, and what just
 * happened. Every number is a link to the list it counts.
 *
 * Money is shown only to roles that may see finance; the counts that do not
 * reveal an amount stay visible to everyone.
 */
export default async function DashboardPage() {
  const session = await requireAdminPage();
  const finance = canSeeFinance(
    toProductRole((session.user as { role?: string }).role),
  );

  const [data, actions] = await Promise.all([
    getDashboardData({ finance }),
    getActionCentre(),
  ]);

  const withCurrency = (rows: typeof data.paymentsOverdue) =>
    rows.map((p) => ({ amount: p.amount, currency: paymentCurrency(p) }));
  const overdueTotal = sumByCurrency(withCurrency(data.paymentsOverdue));
  const hasOverdue = data.paymentsOverdue.length > 0;
  const urgent = actions.filter((a) => a.tone === "danger").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Today"
        description={
          actions.length === 0
            ? "Nothing is waiting on a person right now."
            : `${actions.length} item${actions.length === 1 ? " needs" : "s need"} a decision${urgent ? `, ${urgent} of them already late` : ""}.`
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

      {/* ---- 1. what needs a human. Above every metric, on purpose. ---- */}
      <Panel
        title="Needs attention"
        description="Ranked by urgency across every module; each item opens its record"
        action={
          <div className="flex items-center gap-3">
            {slackConfigured() && (
              <SlackButton
                action="digest"
                label="Post to Slack"
                pendingLabel="Posting…"
              />
            )}
            {actions.length > 0 ? (
              <PanelLink href="/actions">All {actions.length}</PanelLink>
            ) : null}
          </div>
        }
        flush
      >
        <ActionCenter items={actions} limit={8} />
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="New leads"
          value={data.newLeads}
          sub="Not yet contacted"
          tone={data.newLeads > 0 ? "info" : "neutral"}
          href="/leads"
        />
        <StatTile
          label="Awaiting signature"
          value={data.contractsAwaitingSignature}
          sub="Contracts sent, not signed"
          tone={data.contractsAwaitingSignature > 0 ? "warning" : "neutral"}
          href="/contracts?status=SENT"
        />
        <StatTile
          label="Open proposals"
          value={data.openProposals.count}
          sub={
            finance
              ? moneyByCurrency(data.openProposals.byCurrency, true)
              : "Sent, not answered"
          }
          tone={data.openProposals.count > 0 ? "warning" : "neutral"}
          href="/proposals"
        />
        {finance ? (
          <StatTile
            label="Overdue payments"
            value={data.paymentsOverdue.length}
            sub={
              hasOverdue ? moneyByCurrency(overdueTotal, true) : "Nothing late"
            }
            tone={hasOverdue ? "danger" : "success"}
            href="/payments?status=overdue"
          />
        ) : (
          <StatTile
            label="Signed this month"
            value={data.signedThisMonth.count}
            tone={data.signedThisMonth.count > 0 ? "success" : "neutral"}
            href="/contracts?status=SIGNED"
          />
        )}
      </div>

      {/* ---- 2. is anything broken ------------------------------------ */}
      <EngineeringStatus />

      {/* ---- 3. revenue (owned by the revenue domain) ------------------ */}
      {finance && <RevenuePanel />}

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
            No clients yet. The first website submission that gets converted
            will appear here as a New lead.
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
              <p className="mt-3 flex gap-3 border-t border-border pt-2 font-mono text-micro text-subtle-foreground">
                <Link
                  href="/pipeline?stage=LOST"
                  className="hover:text-foreground"
                >
                  LOST {data.pipeline.lost}
                </Link>
                <Link
                  href="/pipeline?stage=SPAM"
                  className="hover:text-foreground"
                >
                  SPAM {data.pipeline.spam}
                </Link>
              </p>
            )}
            {finance && (
              <p className="mt-2 text-meta text-muted-foreground">
                Weighted{" "}
                {moneyByCurrency(data.pipeline.weightedValueByCurrency, true)} ·{" "}
                {moneyByCurrency(data.pipeline.openValueByCurrency, true)} open
              </p>
            )}
          </>
        )}
      </Panel>

      {/* ---- 4. what is shipping -------------------------------------- */}
      <DeliveryPanel
        byPhase={data.activeProjectsByPhase}
        launches={data.upcomingLaunches}
        launchCount={data.upcomingLaunchCount}
        tasks={data.tasksDue}
        taskCount={data.tasksDueCount}
      />

      {/* ---- 5. what just happened ------------------------------------ */}
      <ActivityFeed events={data.activity} />
    </div>
  );
}
