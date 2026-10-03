import Link from "next/link";
import { Blocks } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { ToneBadge } from "@/components/ui/badge";
import { AlertBar } from "@/components/os/error-state";
import { MetaList } from "@/components/os/detail-layout";
import { getHealthChecks, STATE_LABEL, STATE_TONE, type HealthCheck } from "@/lib/system-health";
import { dateTime } from "@/lib/format";
import { Button } from "@repo/ui";
import { SlackButton } from "@/components/os/slack-button";

export const dynamic = "force-dynamic";

/** Integrations Altruvex has decided on but has not wired yet (§26). */
const PLANNED = [
  { name: "Stripe", why: "Card and link payments against an invoice, with webhook reconciliation." },
  { name: "Dropbox Sign / DocuSign", why: "Qualified e-signature behind the existing contract status field." },
  { name: "Google Workspace", why: "Two-way calendar sync for meetings and launch dates." },
];

/**
 * Integrations and system health are one screen (§26 / §27). The former
 * `/health` page listed the same checks under a different heading; it now
 * redirects here. Every state below comes from `lib/system-health.ts`, which
 * touches the dependency or reports "unknown" — nothing here is a flag
 * reporting on itself, and no secret value is ever rendered, only whether one
 * is configured.
 */
export default async function IntegrationsPage() {
  const checks = await getHealthChecks();
  const integrations = checks.filter((c) => c.category === "integration");
  const infrastructure = checks.filter((c) => c.category === "infrastructure");
  const down = checks.filter((c) => c.state === "down");
  const degraded = checks.filter((c) => c.state === "degraded");
  const unconfigured = checks.filter((c) => c.state === "unconfigured");
  const ok = checks.filter((c) => c.state === "ok");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Integrations"
        description="Connection state, configuration and health for every dependency this application has. Checks run when the page loads and are made against the live environment — nothing reports healthy because a flag says so. The ones with a screen link to it; the rest are configured by environment variable and need a redeploy."
        alert={
          down.length > 0 ? (
            <AlertBar tone="danger" href="#infrastructure" cta="Read the impact and recovery">
              {down.length} dependenc{down.length === 1 ? "y is" : "ies are"} down. The impact is
              described on each card below.
            </AlertBar>
          ) : degraded.length > 0 ? (
            <AlertBar tone="warning" href="#integrations" cta="Read the impact and recovery">
              {degraded.length} dependenc{degraded.length === 1 ? "y is" : "ies are"} degraded —
              working, but losing some requests.
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

      <section id="integrations" className="scroll-mt-20 space-y-3">
        <h2 className="telemetry text-subtle-foreground">External services</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {integrations.map((check) => (
            <CheckCard key={check.id} check={check} />
          ))}
        </div>
      </section>

      <section id="infrastructure" className="scroll-mt-20 space-y-3">
        <h2 className="telemetry text-subtle-foreground">This application</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {infrastructure.map((check) => (
            <CheckCard key={check.id} check={check} />
          ))}
        </div>
      </section>

      <Panel
        title="Decided, not yet built"
        description="These are on the roadmap. Nothing here is connected, and nothing pretends to be."
        flush
      >
        <ul className="rows">
          {PLANNED.map((item) => (
            <li key={item.name} className="flex items-start gap-3 px-3 py-2.5">
              <Blocks className="mt-0.5 size-3.5 shrink-0 text-subtle-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium">{item.name}</p>
                <p className="text-meta text-muted-foreground">{item.why}</p>
              </div>
              <span className="telemetry shrink-0 text-subtle-foreground">planned</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function CheckCard({ check }: { check: HealthCheck }) {
  return (
    <Panel
      title={check.name}
      description={check.summary}
      action={
        <div className="flex items-center gap-2">
          {check.setup && (
            <Button asChild variant="outline" size="sm">
              <Link href={check.setup.href}>{check.setup.label}</Link>
            </Button>
          )}
          {/* Slack is configured by environment variable, so it has no screen
              to link to — but it does have something a person can press.
              Posting a real message is the only check that proves a write-only
              webhook works. */}
          {check.id === "slack" && check.state !== "unconfigured" && (
            <SlackButton action="test" label="Send a test" pendingLabel="Sending…" />
          )}
          <ToneBadge tone={STATE_TONE[check.state]}>{STATE_LABEL[check.state]}</ToneBadge>
        </div>
      }
      flush
    >
      <div className="space-y-3 p-3">
        <div>
          <p className="telemetry text-subtle-foreground">If this breaks</p>
          <p className="mt-0.5 text-base text-muted-foreground">{check.impact}</p>
        </div>
        {check.remedy && (
          <div className="rounded-md border border-warning/25 bg-warning/[0.06] p-2.5">
            <p className="telemetry text-warning">Fix</p>
            <p className="mt-0.5 text-base">{check.remedy}</p>
          </div>
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
      </div>
      {check.metrics && (
        <MetaList
          className="border-t border-border"
          items={check.metrics.map((m) => ({ label: m.label, value: m.value }))}
        />
      )}
      <p className="border-t border-border px-3 py-1.5 font-mono text-micro text-subtle-foreground">
        Checked {dateTime(check.lastChecked)}
      </p>
    </Panel>
  );
}
