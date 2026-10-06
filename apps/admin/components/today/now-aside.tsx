import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Hammer,
  Loader,
  RefreshCw,
  Rocket,
  XCircle,
} from "lucide-react";
import type { getNowEngineering, ProductHealth } from "@/lib/dashboard-data";
import type { RenewalRow } from "@/lib/renewals";
import { entityHref } from "@/lib/entity-links";
import { dueLabel, when } from "@/lib/format";
import { statusOf, toneText, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";
import { Panel, PanelLink } from "@/components/os/panel";
import { List, ListRow } from "@/components/os/list-row";
import { EmptyInline } from "@/components/os/empty-state";
import { PickToOpen, type PickOption } from "@/components/os/pick-to-open";
import { ActiveWork, type ActiveWorkProps } from "@/components/today/active-work";
import { Button } from "@repo/ui";

type NowEngineering = Awaited<ReturnType<typeof getNowEngineering>>;

const HEALTH: Record<ProductHealth, { tone: Tone; icon: React.ReactNode; label: string }> = {
  down: { tone: "danger", icon: <XCircle />, label: "Down or failing" },
  degraded: { tone: "warning", icon: <AlertTriangle />, label: "Degraded" },
  deploying: { tone: "progress", icon: <Loader />, label: "Deploying" },
  ok: { tone: "success", icon: <CheckCircle2 />, label: "Healthy" },
  unknown: { tone: "neutral", icon: <CircleDashed />, label: "No production deploy yet" },
};

export function NowAside({
  engineering,
  renewals,
  work,
  canCreateProduct = false,
  connectable = [],
  className,
}: {
  engineering: NowEngineering | null;
  canCreateProduct?: boolean;
  /** Products with no pipeline, for a role that may connect one. */
  connectable?: PickOption[];
  renewals: { rows: RenewalRow[]; total: number } | null;
  work: ActiveWorkProps | null;
  className?: string;
}) {
  if (!engineering && !renewals && !work) return null;
  return (
    <aside
      aria-label="Now"
      className={cn(
        "min-w-0 space-y-4 xl:sticky xl:top-[calc(var(--topbar-h)+1rem)] xl:col-start-2 xl:row-start-1 xl:self-start",
        className,
      )}
    >
      {engineering && <RunningNow eng={engineering} connectable={connectable} canCreate={canCreateProduct} />}
      {engineering && <ProductionHealthPanel eng={engineering} canCreate={canCreateProduct} />}
      {renewals && <RenewalsDue {...renewals} />}
      {work && <ActiveWork {...work} />}
    </aside>
  );
}

function RunningNow({
  eng,
  connectable,
  canCreate,
}: {
  eng: NowEngineering;
  connectable: PickOption[];
  canCreate: boolean;
}) {
  const { builds, buildCount, deploys, deployCount } = eng.running;
  const rows = [
    ...builds.map((b) => ({
      key: `b-${b.id}`,
      at: b.startedAt ?? b.createdAt,
      href: `/deployments/builds/${b.id}`,
      icon: <Hammer />,
      title: `${b.product.name} · build #${b.number}`,
      meta: [statusOf("buildStatus", b.status).label, b.branch, statusOf("deployEnvironment", b.environment).label]
        .filter(Boolean)
        .join(" · "),
    })),
    ...deploys.map((d) => ({
      key: `d-${d.id}`,
      at: d.startedAt ?? d.createdAt,
      href: `/deployments/${d.id}`,
      icon: <Rocket />,
      title: `${d.product.name} · deploy #${d.number}`,
      meta: [statusOf("deploymentStatus", d.status).label, d.version, statusOf("deployEnvironment", d.environment).label]
        .filter(Boolean)
        .join(" · "),
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const total = buildCount + deployCount;

  return (
    <Panel
      title="Running now"
      description={total === 0 ? "Nothing in flight" : `${total} in flight`}
      action={<PanelLink href="/deployments">Deployments</PanelLink>}
      flush
    >
      {rows.length === 0 ? (
        <EmptyInline
          action={
            eng.isEmpty ? (
              canCreate ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/products?new=product">Add a product</Link>
                </Button>
              ) : null
            ) : connectable.length > 0 ? (
              <PickToOpen
                label="Connect a pipeline"
                size="sm"
                searchPlaceholder="Find a product"
                options={connectable}
                footer={connectable.length >= 50 ? { label: "All products", href: "/products" } : undefined}
              />
            ) : null
          }
        >
          {eng.isEmpty
            ? "No product is connected yet. Builds and deploys appear here the moment a product's CI reports them."
            : connectable.length > 0
              ? `Nothing is building or deploying. ${connectable.length === 1 ? "One product has" : `${connectable.length >= 50 ? "50+" : connectable.length} products have`} no pipeline connected yet.`
              : "Nothing is building or deploying. Runs appear here while CI reports them as queued or running."}
        </EmptyInline>
      ) : (
        <List label="Builds and deploys in flight">
          {rows.map((row) => (
            <ListRow
              key={row.key}
              dense
              href={row.href}
              icon={row.icon}
              tone="progress"
              title={row.title}
              meta={row.meta}
              trailing={
                <time dateTime={row.at.toISOString()} title={row.at.toISOString()} className="font-mono text-micro tabular-nums">
                  {when(row.at)}
                </time>
              }
            />
          ))}
        </List>
      )}
    </Panel>
  );
}

/** The section of a product's page that holds what made it unhealthy. */
function healthSection(p: NowEngineering["health"][number]): string {
  if (p.openIncidents > 0) return "#incidents";
  if (p.lastDeploy && (p.lastDeploy.status === "FAILED" || p.lastDeploy.status === "ROLLED_BACK")) return "#deployments";
  if (p.failedBuild24h) return "#builds";
  if (p.state === "unknown") return "#connect";
  return "";
}

function ProductionHealthPanel({ eng, canCreate }: { eng: NowEngineering; canCreate: boolean }) {
  const down = eng.health.filter((p) => p.state === "down").length;
  const degraded = eng.health.filter((p) => p.state === "degraded").length;
  return (
    <Panel
      title="Production health"
      description={
        eng.runningProductCount === 0
          ? "No live product"
          : down + degraded === 0
            ? `${eng.runningProductCount} live, nothing wrong reported`
            : [down && `${down} failing`, degraded && `${degraded} degraded`].filter(Boolean).join(" · ")
      }
      action={<PanelLink href="/products">Products</PanelLink>}
      flush
    >
      {eng.health.length === 0 ? (
        <EmptyInline
          action={
            eng.isEmpty && canCreate ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/products?new=product">Add a product</Link>
              </Button>
            ) : null
          }
        >
          {eng.isEmpty
            ? "No products yet. Add one and connect its CI; its production state shows here."
            : "No product is marked Live or Maintenance yet. A product's health shows here once it is live."}
        </EmptyInline>
      ) : (
        <List label="Live products">
          {eng.health.map((p) => {
            const h = HEALTH[p.state];
            const facts = [
              p.openIncidents > 0 &&
                `${p.openIncidents} open incident${p.openIncidents === 1 ? "" : "s"}${p.worstSeverity ? ` (${p.worstSeverity})` : ""}`,
              p.lastDeploy &&
                `Deploy #${p.lastDeploy.number} ${statusOf("deploymentStatus", p.lastDeploy.status).label.toLowerCase()} ${when(p.lastDeploy.finishedAt ?? p.lastDeploy.createdAt)}`,
              p.failedBuild24h && "Production build failed in 24h",
            ].filter(Boolean);
            return (
              <ListRow
                key={p.id}
                dense
                href={`/products/${p.id}${healthSection(p)}`}
                icon={h.icon}
                tone={h.tone}
                title={p.name}
                meta={facts.length ? facts.join(" · ") : h.label}
              />
            );
          })}
        </List>
      )}
      {eng.runningProductCount > eng.health.length && (
        <div className="border-t border-border-subtle px-3 py-2">
          <PanelLink href="/products">All {eng.runningProductCount} live products</PanelLink>
        </div>
      )}
    </Panel>
  );
}

function RenewalsDue({ rows, total }: { rows: RenewalRow[]; total: number }) {
  return (
    <Panel
      title="Renewals due"
      description={total === 0 ? "Nothing in the alert window" : `${total} need a decision`}
      action={<PanelLink href="/renewals">Renewals</PanelLink>}
      flush
    >
      {rows.length === 0 ? (
        <EmptyInline>
          No retainer or dated service is inside its alert window. They appear here before they lapse.
        </EmptyInline>
      ) : (
        <List label="Renewals needing a decision">
          {rows.map((row) => (
            <ListRow
              key={row.key}
              dense
              href={entityHref(row.entityType, row.id) ?? "/renewals"}
              icon={<RefreshCw />}
              tone={row.rank === 0 ? "danger" : "warning"}
              title={row.clientLabel}
              meta={row.what}
              trailing={
                <span
                  className={cn(
                    "font-mono text-micro tabular-nums",
                    row.daysUntil != null && row.daysUntil < 0 ? toneText.danger : undefined,
                  )}
                >
                  {dueLabel(row.dueAt)}
                </span>
              }
            />
          ))}
        </List>
      )}
      {total > rows.length && (
        <div className="border-t border-border-subtle px-3 py-2">
          <PanelLink href="/renewals">All {total} due</PanelLink>
        </div>
      )}
    </Panel>
  );
}
