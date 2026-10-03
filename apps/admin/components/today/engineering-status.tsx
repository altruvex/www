import { getTodayEngineering } from "@/lib/dashboard-data";
import { statusOf, toneText } from "@/lib/status";
import { when } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Panel, PanelLink } from "@/components/os/panel";
import { EntityLink } from "@/components/os/entity-link";
import { EmptyInline } from "@/components/os/empty-state";
import { CountCell } from "@/components/today/count-cell";

const SEVERITIES = ["SEV1", "SEV2", "SEV3", "SEV4"] as const;

/**
 * Today → engineering. Three questions, in the order they get asked when
 * something is wrong: is anything on fire (open incidents by severity), what is
 * each client actually running (last production deploy per product), and did
 * anything break on the way there (failed builds, last 24 hours).
 *
 * Every figure is read from what CI and the incident log reported; nothing is
 * inferred. With no products the panel says so instead of showing zeros that
 * would look like a healthy estate.
 */
export async function EngineeringStatus() {
  const eng = await getTodayEngineering();

  if (eng.isEmpty) {
    return (
      <Panel title="Engineering" action={<PanelLink href="/products">Products</PanelLink>}>
        <EmptyInline>
          No product is registered yet. Add one under Products and connect its pipeline to
          the ingest endpoint; deploys, builds and incidents report here from then on.
        </EmptyInline>
      </Panel>
    );
  }

  return (
    <Panel
      title="Engineering"
      description={
        eng.openIncidents === 0
          ? "No open incidents"
          : `${eng.openIncidents} open incident${eng.openIncidents === 1 ? "" : "s"}`
      }
      action={<PanelLink href="/incidents">Incidents</PanelLink>}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {SEVERITIES.map((sev) => {
          const def = statusOf("incidentSeverity", sev);
          return (
            <CountCell
              key={sev}
              label={def.label}
              value={eng.incidentsBySeverity[sev] ?? 0}
              tone={def.tone}
              title={def.hint}
              href={`/incidents?severity=${sev}`}
            />
          );
        })}
        <CountCell
          label="Failed builds · 24h"
          value={eng.failedBuildCount}
          tone="danger"
          href="/deployments?tab=builds&status=FAILED"
        />
      </div>

      <div className="mt-3 grid gap-4 border-t border-border pt-3 md:grid-cols-2">
        <section aria-labelledby="today-prod-deploys">
          <h3 id="today-prod-deploys" className="telemetry mb-1.5 text-subtle-foreground">
            In production
          </h3>
          {eng.lastProductionDeploys.length === 0 ? (
            <p className="text-base text-muted-foreground">
              No production deploy has been reported yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {eng.lastProductionDeploys.map((d) => (
                <li key={d.id} className="flex items-baseline gap-2 text-base">
                  <EntityLink type="product" id={d.product.id} className="min-w-0 truncate">
                    {d.product.name}
                  </EntityLink>
                  <EntityLink
                    type="deployment"
                    id={d.id}
                    muted
                    className="shrink-0 font-mono text-micro tabular-nums"
                  >
                    {d.version ?? `#${d.number}`}
                  </EntityLink>
                  <span className="ms-auto shrink-0 text-meta text-subtle-foreground">
                    {when(d.finishedAt ?? d.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="today-failed-builds">
          <h3 id="today-failed-builds" className="telemetry mb-1.5 text-subtle-foreground">
            Failed builds
          </h3>
          {eng.failedBuilds.length === 0 ? (
            <p className="text-base text-muted-foreground">No build failed in the last 24 hours.</p>
          ) : (
            <ul className="space-y-1">
              {eng.failedBuilds.map((b) => (
                <li key={b.id} className="flex items-baseline gap-2 text-base">
                  <EntityLink type="build" id={b.id} className="min-w-0 truncate">
                    {b.product.name} #{b.number}
                  </EntityLink>
                  {b.branch && (
                    <span className="min-w-0 truncate font-mono text-micro text-muted-foreground">
                      {b.branch}
                    </span>
                  )}
                  <span
                    className={cn(
                      "ms-auto shrink-0 text-meta",
                      toneText[statusOf("buildStatus", "FAILED").tone],
                    )}
                  >
                    {when(b.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Panel>
  );
}
