import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDashboardData, getNowEngineering } from "@/lib/dashboard-data";
import { getActionCentre, roleCanOpen } from "@/lib/action-center";
import { prisma } from "@repo/database";
import { getOperator } from "@/lib/authorize";
import { can } from "@/lib/rbac";
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
import type { PickOption } from "@/components/os/pick-to-open";
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
  const canCreateWork = can(role, "create", "project");
  // With nothing in delivery, "start a project" means one signed contract that has none yet:
  // pick it and land on its Delivery section, where the project is started.
  const noActiveWork = data.activeProjectsByPhase.every((row) => row.count === 0);
  const startable: PickOption[] =
    seesWork && canCreateWork && noActiveWork && sees("/contracts")
      ? (
          await prisma.contract.findMany({
            where: { status: "SIGNED", project: null },
            orderBy: { updatedAt: "desc" },
            take: 50,
            select: { id: true, client: { select: { name: true, company: true } } },
          })
        ).map((c) => ({
          href: `/contracts/${c.id}#delivery`,
          label: c.client.company || c.client.name || "Signed contract",
          hint: c.client.company && c.client.name ? c.client.name : undefined,
        }))
      : [];
  const renewalRows = renewals?.filter((row) => row.needsAttention) ?? null;
  // "Running now" is empty while no product can report: offer the products with no
  // pipeline at all, landing on the one chosen's Connect section.
  const connectable: PickOption[] =
    engineering && engineering.running.buildCount + engineering.running.deployCount === 0 &&
    sees("/products") && can(role, "edit", "project")
      ? (
          await prisma.product.findMany({
            where: {
              ingestTokenHash: null,
              repositoryUrl: null,
              // An existing site runs without a pipeline on purpose.
              existingSite: false,
              status: { not: "SUNSET" },
            },
            orderBy: { updatedAt: "desc" },
            take: 50,
            select: { id: true, name: true, client: { select: { name: true, company: true } } },
          })
        ).map((p) => ({
          href: `/products/${p.id}#connect`,
          label: p.name,
          hint: p.client.company || p.client.name || undefined,
        }))
      : [];

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
          canCreateProduct={canCreateWork}
          connectable={connectable}
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
                  startable,
                  canRecord: canCreateWork,
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
