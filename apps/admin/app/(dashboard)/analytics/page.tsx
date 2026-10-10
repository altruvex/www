import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyInline } from "@/components/os/empty-state";
import { BarChart, ColumnChart, HeroNumber } from "@/components/os/chart";
import { FunnelBars } from "@/components/os/funnel";
import { FilterChip } from "@/components/os/filter-bar";
import {
  ANALYTICS_PERIODS,
  DEFAULT_PERIOD,
  NO_LOST_REASON,
  getAnalytics,
  parsePeriod,
} from "@/lib/analytics-data";
import { currentRole } from "@/lib/authorize";
import { canSeeFinance } from "@/lib/nav";
import { gateRoute } from "@/lib/page-gate";
import { ANNUAL_BILLING_NOTE, getRevenueMetrics } from "@/lib/revenue-metrics";
import { RETAINER_CURRENCY } from "@/lib/payment-source";
import { BUSINESS_TIME_ZONE } from "@/lib/payment-overdue";
import { statusOf } from "@/lib/status";
import { money, moneyByCurrency, percent } from "@/lib/format";

export const dynamic = "force-dynamic";

const FINANCE_ONLY = "Finance only";
const FINANCE_ONLY_SUB = "Shown to finance roles";

const PERIOD_LABEL: Record<(typeof ANALYTICS_PERIODS)[number], string> = {
  30: "Last 30 days",
  90: "Last 90 days",
  365: "Last 12 months",
  all: "All time",
};

const RANGE_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

function rangeText(period: string | number, start: Date | null, end: Date) {
  if (period !== "all") return `${RANGE_DATE.format(start!)} – ${RANGE_DATE.format(end)}`;
  return start
    ? `All time — since ${RANGE_DATE.format(start)} (first record) to ${RANGE_DATE.format(end)}`
    : "All time — no records yet";
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const denied = await gateRoute("/analytics");
  if (denied) return denied;

  const period = parsePeriod((await searchParams).period);
  const periodLabel = PERIOD_LABEL[period];

  const showMoney = canSeeFinance(await currentRole());
  const [data, revenue] = await Promise.all([
    getAnalytics(period),
    showMoney ? getRevenueMetrics() : null,
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        description="Metrics that change a decision. Anything that would only ever be looked at is deliberately not here."
      />

      {revenue && (
      <section className="space-y-3">
        <h2 className="telemetry text-subtle-foreground">Recurring revenue</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="MRR (contracted)"
            value={moneyByCurrency(revenue.contractedMrr, true) || "0"}
            sub={
              revenue.activeRetainers
                ? `${revenue.activeRetainers} active retainer${revenue.activeRetainers === 1 ? "" : "s"} at their monthly rate${
                    revenue.unpricedRetainers
                      ? ` · ${revenue.unpricedRetainers} unpriced`
                      : ""
                  }`
                : "No active retainers"
            }
            tone={revenue.activeRetainers ? "success" : "neutral"}
          />
          <StatTile
            label="MRR (billed)"
            value={moneyByCurrency(revenue.billedMrr, true) || "0"}
            sub={ANNUAL_BILLING_NOTE}
          />
          <StatTile
            label="Outstanding"
            value={moneyByCurrency(revenue.outstanding, true) || "0"}
            sub={`${revenue.outstandingCount} unpaid payment${revenue.outstandingCount === 1 ? "" : "s"}`}
            tone={
              revenue.overdueCount
                ? "danger"
                : revenue.outstandingCount
                  ? "warning"
                  : "neutral"
            }
            href="/payments?tab=outstanding"
          />
          <StatTile
            label="Overdue"
            value={revenue.overdueCount}
            sub={
              revenue.overdueCount
                ? moneyByCurrency(revenue.overdue, true)
                : "Nothing late"
            }
            tone={revenue.overdueCount ? "danger" : "success"}
            href="/payments?status=overdue"
          />
        </div>
        {revenue.byPlan.length > 0 && (
          <Panel
            title="By plan"
            description="Active retainers per plan, priced the way their renewal invoices are."
          >
            <table className="w-full border-collapse text-start">
              <thead>
                <tr className="border-b border-border-subtle">
                  {["Plan", "Active", "Contracted / mo", "Billed / mo"].map(
                    (h) => (
                      <th
                        key={h}
                        className="py-2 pe-3 text-meta uppercase tracking-wider text-muted-foreground"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {revenue.byPlan.map((plan) => (
                  <tr
                    key={plan.planId}
                    className="border-b border-border-subtle last:border-0"
                  >
                    <td className="py-2 pe-3 text-base text-foreground">
                      {plan.planName}
                    </td>
                    <td className="py-2 pe-3 font-mono text-meta tabular-nums">
                      {plan.activeRetainers}
                      {plan.unpriced ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {plan.unpriced} unpriced
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pe-3 font-mono text-meta tabular-nums">
                      {money(plan.contractedMrr, RETAINER_CURRENCY)}
                    </td>
                    <td className="py-2 font-mono text-meta tabular-nums">
                      {money(plan.billedMrr, RETAINER_CURRENCY)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="telemetry text-subtle-foreground">Sales · {periodLabel}</h2>
          <div role="group" aria-label="Period" className="flex flex-wrap gap-1.5">
            {ANALYTICS_PERIODS.map((days) => (
              <FilterChip
                key={days}
                param="period"
                value={days === DEFAULT_PERIOD ? undefined : String(days)}
                label={PERIOD_LABEL[days]}
              />
            ))}
          </div>
        </div>
        <p className="text-meta text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground">
            {rangeText(period, data.rangeStart, data.rangeEnd)}
          </span>
          . Leads created and proposals issued in this window; proposals count
          once per client (the latest sent version), with no probability
          weighting. The monthly charts always span twelve months; client,
          delivery and website totals are all time. Open deals older than the
          window stay in the pipeline and work queue.
        </p>
        {data.truncated && (
          <p className="text-meta text-warning">
            More leads arrived in this window than one page reads; the counts
            below cover the newest {data.sales.leads} of them only. Pick a
            shorter period for an exact figure.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Win rate"
            value={percent(data.sales.winRate)}
            sub={`${data.sales.accepted} of ${data.sales.proposalsSent} quoted clients`}
            tone={data.sales.winRate >= 50 ? "success" : "warning"}
          />
          <StatTile
            label="Average won deal"
            value={showMoney ? moneyByCurrency(data.sales.avgDealByCurrency, true) : FINANCE_ONLY}
            sub={showMoney ? "Latest accepted quote per won client" : FINANCE_ONLY_SUB}
          />
          <StatTile
            label="Sales cycle"
            value={
              data.sales.avgCycle != null ? `${data.sales.avgCycle}d` : "Not enough data"
            }
            sub={
              data.sales.avgCycle != null
                ? `Proposal sent to contract signed, based on ${data.sales.cycleSample} of ${data.sales.cycleOf} won deals`
                : data.sales.cycleOf === 0
                  ? "No won deals in this window"
                  : `Unavailable: ${data.sales.cycleSample} of ${data.sales.cycleOf} won deals have a signed contract (at least ${data.sales.cycleMin} needed)`
            }
            tone={
              data.sales.avgCycle != null && data.sales.avgCycle > 21
                ? "warning"
                : "neutral"
            }
          />
          <StatTile
            label="Won value"
            value={showMoney ? moneyByCurrency(data.sales.wonValueByCurrency, true) : FINANCE_ONLY}
            sub={showMoney ? "Accepted proposals in the window" : FINANCE_ONLY_SUB}
            tone={showMoney ? "success" : "neutral"}
          />
        </div>

        {showMoney && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Signed value by month"
            description="Contract value, dated by signature — one measure, one axis"
          >
            {data.signedByMonth.every((m) => m.value === 0) ? (
              <EmptyInline>
                Nothing has been signed in the last twelve months, so there is
                no series to draw. This chart appears with the first signature.
              </EmptyInline>
            ) : (
              <ColumnChart
                seriesIndex={0}
                data={data.signedByMonth.map((m) => ({
                  id: m.key,
                  label: m.label,
                  value: m.value,
                  display: money(m.value, m.currency || "EGP", {
                    compact: true,
                  }),
                }))}
              />
            )}
            {data.signedByMonth.some((m) => m.mixed) && (
              <p className="mt-2 text-meta text-warning">
                Some months contain more than one currency; the chart plots the
                largest and the rest are excluded rather than added.
              </p>
            )}
          </Panel>

          <Panel
            title="Cash collected by month"
            description="Payments actually received — deliberately a separate chart, not a second axis"
          >
            {data.cashByMonth.every((m) => m.value === 0) ? (
              <EmptyInline>
                No payments recorded as received yet. Signed value and cash
                collected are different numbers, which is why they are two
                charts.
              </EmptyInline>
            ) : (
              <ColumnChart
                seriesIndex={2}
                data={data.cashByMonth.map((m) => ({
                  id: m.key,
                  label: m.label,
                  value: m.value,
                  display: money(m.value, m.currency || "EGP", {
                    compact: true,
                  }),
                }))}
              />
            )}
            {data.cashByMonth.some((m) => m.mixed) && (
              <p className="mt-2 text-meta text-warning">
                Some months contain more than one currency; the chart plots the
                largest and the rest are excluded rather than added.
              </p>
            )}
          </Panel>
        </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Where these leads stand"
            description="Current derived stage of every lead created in the window — a count, not a forecast"
          >
            {data.sales.leads === 0 ? (
              <EmptyInline>No leads were created in this window.</EmptyInline>
            ) : (
              <FunnelBars
                stages={data.stages
                  .filter((s) => s.count > 0)
                  .map((s) => {
                    const def = statusOf("pipelineStage", s.stage);
                    return { id: s.stage, label: def.label, count: s.count, tone: def.tone };
                  })}
              />
            )}
          </Panel>

          <Panel
            title="Why deals were lost"
            description="Reason recorded on leads from the window that are now lost"
          >
            {data.lostReasons.total === 0 ? (
              <EmptyInline>No lead from this window is marked lost.</EmptyInline>
            ) : (
              <BarChart
                data={data.lostReasons.rows.map((row, i) => ({
                  id: row.reason,
                  label:
                    row.reason === NO_LOST_REASON
                      ? "Not recorded"
                      : statusOf("lostReason", row.reason).label,
                  value: row.count,
                  display: `${row.count} · ${Math.round((row.count / data.lostReasons.total) * 100)}%`,
                  seriesIndex: i,
                }))}
              />
            )}
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Where the money comes from"
            description="Leads by source, and how many closed"
          >
            {data.sources.length === 0 ? (
              <EmptyInline>
                No leads in this window, so no source has a track record.
              </EmptyInline>
            ) : (
              <div className="space-y-3">
                <BarChart
                  data={data.sources.map((source, i) => ({
                    id: source.source,
                    label: statusOf("clientSource", source.source).label,
                    value: source.leads,
                    display: `${source.leads} lead${source.leads === 1 ? "" : "s"}`,
                    seriesIndex: i,
                  }))}
                />
                <div className="border-t border-border-subtle pt-3">
                  <p className="telemetry mb-1.5 text-subtle-foreground">
                    Closed from that source
                  </p>
                  <BarChart
                    data={data.sources.map((source, i) => ({
                      id: `${source.source}-won`,
                      label: statusOf("clientSource", source.source).label,
                      value: source.won,
                      display: source.leads
                        ? `${source.won} · ${Math.round((source.won / source.leads) * 100)}%`
                        : "0",
                      seriesIndex: i,
                    }))}
                  />
                </div>
              </div>
            )}
          </Panel>

          <Panel
            title="What actually closes"
            description="Clients quoted vs won, by project type — one proposal per client"
          >
            {data.projectTypes.length === 0 ? (
              <EmptyInline>No proposals issued in this window.</EmptyInline>
            ) : (
              <BarChart
                data={data.projectTypes.map((type, i) => ({
                  id: type.type,
                  label: type.type,
                  value: type.quoted,
                  display: `${type.won}/${type.quoted} won`,
                  seriesIndex: i,
                }))}
              />
            )}
          </Panel>
        </div>
        <AttributionTable
          title="By first touch"
          description="How each lead first reached the site: the earlier of its form submission and estimator run"
          heading="First touch"
          rows={data.firstTouch}
        />
        <div className="grid gap-3 lg:grid-cols-2">
          <AttributionTable
            title="By campaign source"
            description="UTM source on the first touch; none recorded counts as direct / unknown"
            heading="Source"
            rows={data.utmSources}
          />
          <AttributionTable
            title="Top landing pages"
            description="Where leads first landed on the site"
            heading="Landing page"
            rows={data.landingPages}
            mono
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="telemetry text-subtle-foreground">Clients</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Total clients"
            value={data.clientsMetrics.total}
            sub="Every record"
          />
          <StatTile
            label="Converted"
            value={data.clientsMetrics.won}
            sub="At least one signed contract"
            tone={data.clientsMetrics.won ? "success" : "neutral"}
          />
          <StatTile
            label="Repeat business"
            value={data.clientsMetrics.repeat}
            sub={
              data.clientsMetrics.repeat
                ? "More than one signed contract"
                : "None yet"
            }
            tone={data.clientsMetrics.repeat ? "success" : "neutral"}
          />
          <StatTile
            label="Average client value"
            value={showMoney ? moneyByCurrency(data.clientsMetrics.avgValueByCurrency, true) : FINANCE_ONLY}
            sub={
              showMoney
                ? `Latest accepted proposal per client, ${data.clientsMetrics.valueBasis} of ${data.clientsMetrics.won} won clients`
                : FINANCE_ONLY_SUB
            }
          />
        </div>

        <Panel
          title="New clients by month"
          description="Volume of demand entering the system"
        >
          <ColumnChart
            seriesIndex={3}
            data={data.leadsByMonth.map((m) => ({
              id: m.key,
              label: m.label,
              value: m.value,
              display: `${m.value} client${m.value === 1 ? "" : "s"}`,
            }))}
          />
        </Panel>
      </section>

      <section className="space-y-3">
        <h2 className="telemetry text-subtle-foreground">Delivery</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Launched on time"
            value={percent(data.delivery.onTimePct)}
            sub={
              data.delivery.undated
                ? `${data.delivery.late} late · ${data.delivery.undated} launched with no target`
                : `${data.delivery.launched} launched, ${data.delivery.late} late`
            }
            tone={
              data.delivery.onTimePct >= 80
                ? "success"
                : data.delivery.launched
                  ? "warning"
                  : "neutral"
            }
          />
          <StatTile
            label="Average duration"
            value={
              data.delivery.avgDurationWeeks != null
                ? `${data.delivery.avgDurationWeeks}w`
                : "Not enough data"
            }
            sub={
              data.delivery.avgDurationWeeks != null
                ? `Project opened to launch, based on ${data.delivery.durationSample} of ${data.delivery.launched} launched projects. Recorded projects and projects with no valid span are left out.`
                : data.delivery.launched === 0
                  ? "No launched projects yet"
                  : `Unavailable: none of ${data.delivery.launched} launched projects has a valid opened-to-launch span (recorded projects have no start date)`
            }
          />
          <StatTile
            label="Active projects"
            value={data.delivery.active}
            sub="In delivery now"
            tone={data.delivery.active ? "progress" : "neutral"}
          />
          <StatTile
            label="Projects all time"
            value={data.delivery.total}
            sub="Including completed"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="telemetry text-subtle-foreground">Website</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Panel>
            <HeroNumber
              value={String(data.website.submissions)}
              label="Form submissions"
              detail="All time, across every form on the public site"
            />
          </Panel>
          <Panel>
            <HeroNumber
              value={String(data.website.estimates)}
              label="Estimator completions"
              detail="People who priced a project publicly"
            />
          </Panel>
          <Panel>
            <HeroNumber
              value={percent(
                data.website.estimates
                  ? Math.round(
                      (data.website.estimatesConverted /
                        data.website.estimates) *
                        100,
                    )
                  : 0,
              )}
              label="Estimator conversion"
              detail={`${data.website.estimatesConverted} became client records`}
            />
          </Panel>
        </div>
      </section>
    </div>
  );
}

function AttributionTable({
  title,
  description,
  heading,
  rows,
  mono = false,
}: {
  title: string;
  description: string;
  heading: string;
  rows: { key: string; leads: number; qualified: number; won: number }[];
  mono?: boolean;
}) {
  return (
    <Panel title={title} description={description}>
      {rows.length === 0 ? (
        <EmptyInline>No leads in this window.</EmptyInline>
      ) : (
        <table className="w-full border-collapse text-start">
          <thead>
            <tr className="border-b border-border-subtle">
              {[heading, "Leads", "Qualified", "Won"].map((h) => (
                <th
                  key={h}
                  className="py-2 pe-3 text-meta uppercase tracking-wider text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border-subtle last:border-0">
                <td
                  className={`max-w-0 truncate py-2 pe-3 text-foreground ${mono ? "font-mono text-meta" : "text-base"}`}
                  title={row.key}
                >
                  {row.key}
                </td>
                <td className="py-2 pe-3 font-mono text-meta tabular-nums">{row.leads}</td>
                <td className="py-2 pe-3 font-mono text-meta tabular-nums">{row.qualified}</td>
                <td className="py-2 font-mono text-meta tabular-nums">{row.won}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
