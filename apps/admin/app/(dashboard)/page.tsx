import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDashboardData, getNowEngineering } from "@/lib/dashboard-data";
import { getActionCentre, roleCanOpen } from "@/lib/action-center";
import { getOperator } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { getShellBadges } from "@/lib/shell-data";
import { listRenewals } from "@/lib/renewals";
import { slackConfigured } from "@/lib/slack";
import { canSeeFinance } from "@/lib/nav";
import { entityHref } from "@/lib/entity-links";
import { moneyByCurrency, sumByCurrency } from "@/lib/format";
import { paymentCurrency } from "@/lib/payment-source";
import { PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import { ActionCenter } from "@/components/os/action-center";
import { SlackButton } from "@/components/os/slack-button";
import { CountStrip, type CountStripCell } from "@/components/today/count-strip";
import { NowAside } from "@/components/today/now-aside";
import { RevenuePanel } from "@/components/today/revenue-panel";
import { ActivityFeed } from "@/components/today/activity-feed";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const denied = await gateRoute("/");
  if (denied) return denied;

  const operator = await getOperator();
  const role = operator?.role;
  const finance = canSeeFinance(role);
  const sees = (href: string) => roleCanOpen(role, href);
  const seesEngineering = sees("/deployments");
  const seesRenewals = sees("/renewals");
  const seesWork = sees("/projects");
  const seesAudit = sees("/audit");

  const [data, actions, shell, engineering, renewals] = await Promise.all([
    getDashboardData({ finance, audit: seesAudit }),
    getActionCentre(role),
    getShellBadges(operator?.session.user.id ?? ""),
    seesEngineering ? getNowEngineering() : Promise.resolve(null),
    seesRenewals ? listRenewals() : Promise.resolve(null),
  ]);
  const badges = shell.badges;

  const overdueTotal = sumByCurrency(
    data.paymentsOverdue.map((p) => ({ amount: p.amount, currency: paymentCurrency(p) })),
  );
  const urgent = actions.filter((a) => a.tone === "danger").length;
  const renewalRows = renewals?.filter((row) => row.needsAttention) ?? null;

  const allCells: CountStripCell[] = [
    { label: "New leads", value: badges.leads ?? 0, href: "/leads?stage=new", tone: "info" },
    { label: "Unanswered chats", value: badges.inbox ?? 0, href: "/inbox?filter=waiting", tone: "warning" },
    {
      label: "Awaiting reply",
      value: badges.proposals ?? 0,
      href: "/proposals?status=open",
      tone: "warning",
      sub: finance && data.openProposals.count > 0 ? moneyByCurrency(data.openProposals.byCurrency, true) : undefined,
    },
    { label: "Awaiting signature", value: badges.contracts ?? 0, href: "/contracts?status=SENT", tone: "warning" },
    { label: "Meetings pending", value: badges.meetings ?? 0, href: "/calendar", tone: "info" },
    { label: "Tasks due · 7d", value: data.tasksDueCount, href: "/tasks?due=week", tone: "warning" },
    { label: "Open incidents", value: badges.incidents ?? 0, href: "/incidents", tone: "danger" },
    {
      label: "Failed builds · 24h",
      value: engineering?.failedBuildCount ?? 0,
      href: "/deployments?tab=builds&status=FAILED&window=24h",
      tone: "danger",
    },
    {
      label: "Overdue payments",
      value: badges.payments ?? 0,
      href: "/payments?status=overdue",
      tone: "danger",
      sub: finance && data.paymentsOverdue.length > 0 ? moneyByCurrency(overdueTotal, true) : undefined,
    },
    { label: "Renewals due", value: badges.renewals ?? 0, href: "/renewals?attention=1", tone: "warning" },
  ];
  const cells = allCells.filter(
    (cell) => sees(cell.href) && (cell.label !== "Failed builds · 24h" || engineering !== null),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Today"
        description={
          actions.length === 0
            ? "Nothing you can act on is waiting right now."
            : `${actions.length} item${actions.length === 1 ? " needs" : "s need"} a decision${urgent ? `, ${urgent} of them already late` : ""}.`
        }
        actions={
          sees("/pipeline") ? (
            <Button asChild variant="outline">
              <Link href="/pipeline">
                Open pipeline
                <ArrowRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
              </Link>
            </Button>
          ) : null
        }
      />

      <CountStrip cells={cells} label="Queues — each opens its list" />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel
          title="Needs you"
          description="Ranked by urgency across every area you can act on; each row opens its record"
          action={
            <div className="flex items-center gap-3">
              {slackConfigured() && (
                <SlackButton action="digest" label="Post to Slack" pendingLabel="Posting…" />
              )}
              {actions.length > 0 ? <PanelLink href="/actions">All {actions.length}</PanelLink> : null}
            </div>
          }
          className="xl:col-start-1"
          flush
        >
          <ActionCenter items={actions} limit={8} />
        </Panel>

        <NowAside
          className={finance ? "xl:row-span-3" : "xl:row-span-2"}
          engineering={engineering}
          renewals={
            renewalRows ? { rows: renewalRows.slice(0, 5), total: renewalRows.length } : null
          }
          work={
            seesWork
              ? {
                  byPhase: data.activeProjectsByPhase,
                  launches: data.upcomingLaunches,
                  launchCount: data.upcomingLaunchCount,
                  tasks: data.tasksDue,
                  taskCount: data.tasksDueCount,
                }
              : null
          }
        />

        {finance && (
          <div className="min-w-0 xl:col-start-1">
            <RevenuePanel />
          </div>
        )}

        <div className="min-w-0 xl:col-start-1">
          <ActivityFeed
            events={data.activity.map((e) => ({
              ...e,
              linkable: sees(entityHref(e.entityType, e.entityId) ?? "/"),
            }))}
            auditHref={seesAudit ? "/audit" : null}
          />
        </div>
      </div>
    </div>
  );
}
