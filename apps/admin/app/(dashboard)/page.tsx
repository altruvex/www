import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDashboardData, getNowEngineering } from "@/lib/dashboard-data";
import { getActionCentre, resolveActionView, roleCanOpen, scopeActions } from "@/lib/action-center";
import { prisma } from "@repo/database";
import { getOperator } from "@/lib/authorize";
import { can } from "@/lib/rbac";
import { gateRoute } from "@/lib/page-gate";
import { getShellBadges } from "@/lib/shell-data";
import { listRenewals } from "@/lib/renewals";
import { slackConfigured } from "@/lib/slack";
import { canSeeFinance } from "@/lib/nav";
import { entityHref } from "@/lib/entity-links";
import { cn } from "@/lib/utils";
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

/** The /leads groups home links to instead of repeating their counts. */
const LEAD_GROUP_LINKS = [
  { group: "overdue", label: "Overdue" },
  { group: "due", label: "Due today" },
  { group: "calls", label: "Calls" },
  { group: "proposals", label: "Proposals" },
  { group: "stalled", label: "Stalled" },
  { group: "unassigned", label: "Unassigned" },
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const denied = await gateRoute("/");
  if (denied) return denied;

  const operator = await getOperator();
  const role = operator?.role;
  const viewerId = operator?.session.user.id ?? "";
  // "Mine" (owned by the viewer) by default; "Unassigned" for everyone; "All"
  // only for roles that oversee the team. Rules: scopeActions in lib/action-center.ts.
  const canSeeAll = can(role, "view", "team");
  const view = resolveActionView((await searchParams).view, canSeeAll);
  const showAll = view === "all";
  const finance = canSeeFinance(role);
  const sees = (href: string) => roleCanOpen(role, href);
  const seesEngineering = sees("/deployments");
  const seesRenewals = sees("/renewals");
  const seesWork = sees("/projects");
  const seesAudit = sees("/audit");

  const [data, everyAction, shell, engineering, renewals] = await Promise.all([
    getDashboardData({ finance, audit: seesAudit }),
    getActionCentre(role),
    getShellBadges(operator?.session.user.id ?? ""),
    seesEngineering ? getNowEngineering() : Promise.resolve(null),
    seesRenewals ? listRenewals() : Promise.resolve(null),
  ]);
  const badges = shell.badges;
  const actions = scopeActions(everyAction, view, viewerId);

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
    // Lead, proposal, contract and call counts live on /leads (its groups,
    // linked from "Needs you"), read by the engine; they are not repeated here.
    { label: "Unanswered chats", value: badges.inbox ?? 0, href: "/inbox?filter=waiting", tone: "warning" },
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
          description={
            view === "all"
              ? "Everyone's leads and deals, ranked by urgency; each row says why and opens its record"
              : view === "unassigned"
                ? "Leads and deals nobody owns yet, ranked by urgency; open one to take it on"
                : "Leads and deals you own plus team duties (payments, incidents, renewals), ranked by urgency"
          }
          action={
            <div className="flex items-center gap-3">
              <div role="group" aria-label="Whose work" className="flex items-center gap-1">
                {(
                  [
                    { view: null, label: "Mine", active: view === "mine" },
                    { view: "unassigned", label: "Unassigned", active: view === "unassigned" },
                    ...(canSeeAll ? [{ view: "all", label: "All", active: showAll }] : []),
                  ] as const
                ).map((option) => (
                  <Button
                    key={option.label}
                    asChild
                    size="sm"
                    variant={option.active ? "secondary" : "ghost"}
                  >
                    <Link
                      href={option.view ? `/?view=${option.view}` : "/"}
                      aria-current={option.active ? "page" : undefined}
                      scroll={false}
                    >
                      {option.label}
                    </Link>
                  </Button>
                ))}
              </div>
              {slackConfigured() && (
                <SlackButton action="digest" label="Post to Slack" pendingLabel="Posting…" />
              )}
              {actions.length > 0 ? (
                <PanelLink href={view === "mine" ? "/actions" : `/actions?view=${view}`}>
                  Full list · {actions.length}
                </PanelLink>
              ) : null}
            </div>
          }
          className="xl:col-start-1"
          flush
        >
          <ActionCenter items={actions} limit={8} />
          {sees("/leads") && (
            <nav
              aria-label="Sales work queue groups"
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-subtle px-3 py-2 text-meta text-muted-foreground"
            >
              <span>Sales queue:</span>
              {LEAD_GROUP_LINKS.map(({ group, label }) => (
                <Link
                  key={group}
                  href={
                    // The queue scoped like this panel: owner=mine is the viewer's
                    // leads only, owner=unassigned the leads nobody owns. The
                    // Unassigned group is already owner-free, so it carries no owner.
                    group === "unassigned" || view === "all" || (view === "mine" && !viewerId)
                      ? `/leads?group=${group}`
                      : `/leads?group=${group}&owner=${view}`
                  }
                  className={cn(
                    "rounded-xs transition-colors duration-[var(--dur-state)] hover:text-foreground",
                    "outline-none focus-visible:outline-2 focus-visible:outline-brand",
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}
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
