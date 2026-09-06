import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyInline } from "@/components/os/empty-state";
import { BarChart, ColumnChart, HeroNumber } from "@/components/os/chart";
import { getAnalytics } from "@/lib/analytics-data";
import { statusOf } from "@/lib/status";
import { money, moneyByCurrency, percent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getAnalytics();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        description="Metrics that change a decision. Anything that would only ever be looked at is deliberately not here."
      />

      {/* ---- sales ---------------------------------------------------- */}
      <section className="space-y-3">
        <h2 className="telemetry text-subtle-foreground">Sales</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Win rate" value={percent(data.sales.winRate)} sub={`${data.sales.accepted} of ${data.sales.proposalsSent} sent`} tone={data.sales.winRate >= 50 ? "success" : "warning"} />
          <StatTile
            label="Average deal"
            value={moneyByCurrency(data.sales.avgDealByCurrency, true)}
            sub="Accepted proposals only"
          />
          <StatTile
            label="Sales cycle"
            value={data.sales.avgCycle != null ? `${data.sales.avgCycle}d` : "—"}
            sub="Sent to accepted"
            tone={data.sales.avgCycle != null && data.sales.avgCycle > 21 ? "warning" : "neutral"}
          />
          <StatTile
            label="Won value"
            value={moneyByCurrency(data.sales.wonValueByCurrency, true)}
            sub="All time"
            tone="success"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Signed value by month"
            description="Contract value, dated by signature — one measure, one axis"
          >
            {data.signedByMonth.every((m) => m.value === 0) ? (
              <EmptyInline>
                Nothing has been signed in the last twelve months, so there is no series
                to draw. This chart appears with the first signature.
              </EmptyInline>
            ) : (
              <ColumnChart
                seriesIndex={0}
                data={data.signedByMonth.map((m) => ({
                  id: m.key,
                  label: m.label,
                  value: m.value,
                  display: money(m.value, m.currency || "EGP", { compact: true }),
                }))}
              />
            )}
            {data.signedByMonth.some((m) => m.mixed) && (
              <p className="mt-2 text-meta text-warning">
                Some months contain more than one currency; the chart plots the largest and
                the rest are excluded rather than added.
              </p>
            )}
          </Panel>

          <Panel
            title="Cash collected by month"
            description="Payments actually received — deliberately a separate chart, not a second axis"
          >
            {data.cashByMonth.every((m) => m.value === 0) ? (
              <EmptyInline>
                No payments recorded as received yet. Signed value and cash collected are
                different numbers, which is why they are two charts.
              </EmptyInline>
            ) : (
              <ColumnChart
                seriesIndex={2}
                data={data.cashByMonth.map((m) => ({
                  id: m.key,
                  label: m.label,
                  value: m.value,
                  display: money(m.value, m.currency || "EGP", { compact: true }),
                }))}
              />
            )}
            {data.cashByMonth.some((m) => m.mixed) && (
              <p className="mt-2 text-meta text-warning">
                Some months contain more than one currency; the chart plots the largest and
                the rest are excluded rather than added.
              </p>
            )}
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Where the money comes from" description="Leads by source, and how many closed">
            {data.sources.length === 0 ? (
              <EmptyInline>No clients yet, so no source has a track record.</EmptyInline>
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
                <div className="border-t border-border pt-3">
                  <p className="telemetry mb-1.5 text-subtle-foreground">Closed from that source</p>
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

          <Panel title="What actually closes" description="Proposals quoted vs accepted, by project type">
            {data.projectTypes.length === 0 ? (
              <EmptyInline>No proposals issued yet.</EmptyInline>
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
      </section>

      {/* ---- clients -------------------------------------------------- */}
      <section className="space-y-3">
        <h2 className="telemetry text-subtle-foreground">Clients</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Total clients" value={data.clientsMetrics.total} sub="Every record" />
          <StatTile label="Converted" value={data.clientsMetrics.won} sub="At least one signed contract" tone={data.clientsMetrics.won ? "success" : "neutral"} />
          <StatTile
            label="Repeat business"
            value={data.clientsMetrics.repeat}
            sub={data.clientsMetrics.repeat ? "More than one signed contract" : "None yet"}
            tone={data.clientsMetrics.repeat ? "success" : "neutral"}
          />
          <StatTile
            label="Average client value"
            value={moneyByCurrency(data.clientsMetrics.avgValueByCurrency, true)}
            sub="Accepted value per won client"
          />
        </div>

        <Panel title="New clients by month" description="Volume of demand entering the system">
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

      {/* ---- delivery ------------------------------------------------- */}
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
            tone={data.delivery.onTimePct >= 80 ? "success" : data.delivery.launched ? "warning" : "neutral"}
          />
          <StatTile
            label="Average duration"
            value={data.delivery.avgDurationWeeks != null ? `${data.delivery.avgDurationWeeks}w` : "—"}
            sub="Project start to launch"
          />
          <StatTile label="Active projects" value={data.delivery.active} sub="In delivery now" tone={data.delivery.active ? "progress" : "neutral"} />
          <StatTile label="Projects all time" value={data.delivery.total} sub="Including completed" />
        </div>
      </section>

      {/* ---- website -------------------------------------------------- */}
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
                  ? Math.round((data.website.estimatesConverted / data.website.estimates) * 100)
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
