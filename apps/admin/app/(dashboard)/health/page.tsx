import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { ToneBadge } from "@/components/ui/badge";
import { AlertBar } from "@/components/os/error-state";
import { getHealthChecks, STATE_LABEL, STATE_TONE } from "@/lib/system-health";
import { dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const checks = await getHealthChecks();
  const down = checks.filter((c) => c.state === "down");
  const degraded = checks.filter((c) => c.state === "degraded");
  const unconfigured = checks.filter((c) => c.state === "unconfigured");
  const ok = checks.filter((c) => c.state === "ok");

  return (
    <div className="space-y-4">
      <PageHeader
        title="System health"
        description="What is failing right now, what it costs, and what to do about it. Checks run when this page loads — there is no cached status to go stale."
        alert={
          down.length > 0 ? (
            <AlertBar tone="danger" href="#dependencies" cta="Read the impact and recovery">
              {down.length} dependenc{down.length === 1 ? "y is" : "ies are"} down. The
              impact is described on each card below.
            </AlertBar>
          ) : degraded.length > 0 ? (
            <AlertBar tone="warning" href="#dependencies" cta="Read the impact and recovery">
              {degraded.length} dependenc{degraded.length === 1 ? "y is" : "ies are"}{" "}
              degraded — working, but losing some requests.
            </AlertBar>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Healthy" value={ok.length} tone={ok.length ? "success" : "neutral"} sub="Responding normally" />
        <StatTile label="Degraded" value={degraded.length} tone={degraded.length ? "warning" : "neutral"} sub="Partially failing" />
        <StatTile label="Down" value={down.length} tone={down.length ? "danger" : "success"} sub="Not responding" />
        <StatTile label="Not configured" value={unconfigured.length} sub="Feature unavailable" />
      </div>

      <div id="dependencies" className="grid scroll-mt-20 gap-4 lg:grid-cols-2">
        {checks.map((check) => (
          <Panel
            key={check.id}
            title={check.name}
            description={check.summary}
            action={<ToneBadge tone={STATE_TONE[check.state]}>{STATE_LABEL[check.state]}</ToneBadge>}
          >
            <div className="space-y-2.5">
              <div>
                <p className="telemetry text-subtle-foreground">Impact</p>
                <p className="mt-0.5 text-base text-muted-foreground">{check.impact}</p>
              </div>
              {check.remedy && (
                <div>
                  <p className="telemetry text-subtle-foreground">Recovery</p>
                  <p className="mt-0.5 text-base">{check.remedy}</p>
                </div>
              )}
              {check.metrics && (
                <dl className="grid gap-x-4 gap-y-1 border-t border-border pt-2.5 sm:grid-cols-2">
                  {check.metrics.map((metric) => (
                    <div key={metric.label} className="flex items-baseline justify-between gap-2">
                      <dt className="shrink-0 text-meta text-muted-foreground">{metric.label}</dt>
                      <dd className="min-w-0 truncate text-end font-mono text-micro tabular-nums">
                        {metric.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {check.detail && (
                <details>
                  <summary className="telemetry cursor-pointer text-subtle-foreground hover:text-foreground">
                    Technical detail
                  </summary>
                  <pre className="mt-1.5 overflow-x-auto rounded-md border border-border bg-surface p-2 font-mono text-micro text-muted-foreground">
                    {check.detail}
                  </pre>
                </details>
              )}
              <p className="font-mono text-micro text-subtle-foreground">
                Checked {dateTime(check.lastChecked)}
              </p>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
