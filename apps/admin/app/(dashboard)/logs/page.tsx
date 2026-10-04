import Link from "next/link";
import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";

import { prisma, type DeployEnvironment, type LogLevel } from "@repo/database";
import { Button } from "@repo/ui";

import { DeleteRecordButton } from "@/components/os/delete-record";
import { EmptyState } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import {
  ActiveFilters,
  FilterBar,
  FilterChip,
} from "@/components/os/filter-bar";
import { InspectSheet, inspectHref } from "@/components/os/inspect-sheet";
import { List, ListRow } from "@/components/os/list-row";
import { PageHeader } from "@/components/os/page-header";
import { Pager } from "@/components/os/pager";
import { Panel } from "@/components/os/panel";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import {
  LOG_PAGE_SIZE,
  isLogLevel,
  listLogSources,
  listLogs,
} from "@/lib/engineering";
import { dateTime } from "@/lib/format";
import { currentRole } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { statusOf } from "@/lib/status";
import { CustomRange, IncidentLinker, LogScope } from "./log-explorer";

export const dynamic = "force-dynamic";

const ENVIRONMENTS = ["PRODUCTION", "STAGING", "PREVIEW"] as const;
const PAGE_SIZES = [50, 100, 200];

const LEVEL_CHIPS: { value: LogLevel; label: string }[] = [
  { value: "INFO", label: "Info+" },
  { value: "WARN", label: "Warn+" },
  { value: "ERROR", label: "Error+" },
  { value: "FATAL", label: "Fatal" },
];

const RANGES = {
  "1h": { ms: 3_600_000, label: "Last hour" },
  "24h": { ms: 86_400_000, label: "24 hours" },
  "7d": { ms: 7 * 86_400_000, label: "7 days" },
} as const;
type RangeKey = keyof typeof RANGES;

const asEnvironment = (v?: string): DeployEnvironment | undefined =>
  ENVIRONMENTS.includes(v as DeployEnvironment)
    ? (v as DeployEnvironment)
    : undefined;
const asRange = (v?: string): RangeKey | undefined =>
  v && v in RANGES ? (v as RangeKey) : undefined;

function asDate(v?: string): Date | undefined {
  if (!v) return undefined;
  const date = new Date(v);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function rangeStart(range: RangeKey): Date {
  return new Date(Date.now() - RANGES[range].ms);
}

type Params = {
  product?: string;
  level?: string;
  environment?: string;
  q?: string;
  requestId?: string;
  source?: string;
  deployment?: string;
  build?: string;
  incident?: string;
  range?: string;
  from?: string;
  to?: string;
  page?: string;
  pageSize?: string;
  inspect?: string;
};

function hrefWith(
  sp: Params,
  patch: Partial<Record<keyof Params, string | null>>,
): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...sp, ...patch })) {
    if (typeof value === "string" && value) next.set(key, value);
  }
  if (!("page" in patch)) next.delete("page");
  const qs = next.toString();
  return qs ? `/logs?${qs}` : "/logs";
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const denied = await gateRoute("/logs");
  if (denied) return denied;

  const sp = await searchParams;

  const range = asRange(sp.range);
  let from = range ? undefined : asDate(sp.from);
  let to = range ? undefined : asDate(sp.to);
  if (from && to && from >= to) {
    from = undefined;
    to = undefined;
  }
  const staleFrom = Boolean(sp.from) && !from;
  const staleTo = Boolean(sp.to) && !to;
  if (staleFrom || staleTo) {
    redirect(
      hrefWith(sp, {
        ...(staleFrom ? { from: null } : {}),
        ...(staleTo ? { to: null } : {}),
        page: sp.page ?? null,
      }),
    );
  }
  if (range) from = rangeStart(range);

  const role = await currentRole();
  const canDeleteLine = can(role, "delete", "project");
  const canLinkIncident = can(role, "edit", "incident");

  const minLevel = isLogLevel(sp.level) ? sp.level : undefined;
  const environment = asEnvironment(sp.environment);
  const q = sp.q?.trim() || undefined;
  const requestId = sp.requestId?.trim() || undefined;
  const source = sp.source?.trim() || undefined;
  const pageSize = PAGE_SIZES.includes(Number(sp.pageSize))
    ? Number(sp.pageSize)
    : LOG_PAGE_SIZE;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [products, sources, result, deployment, build, incident, inspected] =
    await Promise.all([
      prisma.product.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      listLogSources(sp.product),
      listLogs({
        productId: sp.product,
        minLevel,
        environment,
        q,
        requestId,
        source,
        deploymentId: sp.deployment,
        buildId: sp.build,
        incidentId: sp.incident,
        from,
        to,
        page,
        pageSize,
      }),
      sp.deployment
        ? prisma.deployment.findUnique({
            where: { id: sp.deployment },
            select: {
              id: true,
              number: true,
              product: { select: { name: true } },
            },
          })
        : null,
      sp.build
        ? prisma.build.findUnique({
            where: { id: sp.build },
            select: {
              id: true,
              number: true,
              product: { select: { name: true } },
            },
          })
        : null,
      sp.incident
        ? prisma.incident.findUnique({
            where: { id: sp.incident },
            select: {
              id: true,
              number: true,
              title: true,
              product: { select: { name: true } },
            },
          })
        : null,
      sp.inspect
        ? prisma.logEntry.findUnique({
            where: { id: sp.inspect },
            include: {
              product: { select: { id: true, name: true } },
              deployment: { select: { id: true, number: true } },
              build: { select: { id: true, number: true } },
              incident: { select: { id: true, number: true, title: true } },
            },
          })
        : null,
    ]);

  const openIncidents =
    inspected && canLinkIncident
      ? await prisma.incident.findMany({
          where: {
            productId: inspected.product.id,
            status: { not: "RESOLVED" },
          },
          orderBy: { detectedAt: "desc" },
          select: { id: true, number: true, title: true },
        })
      : [];

  const productName = products.find((p) => p.id === sp.product)?.name;
  const hasFilters = Boolean(
    sp.product ||
    minLevel ||
    environment ||
    q ||
    requestId ||
    source ||
    sp.deployment ||
    sp.build ||
    sp.incident ||
    range ||
    from ||
    to,
  );
  const closeHref = inspectHref("/logs", sp, null);

  const header = (
    <PageHeader
      title="Logs"
      meta={<ToneBadge tone="neutral">Written by CI</ToneBadge>}
      description="Everything products report, newest first. Lines arrive from each product's pipeline and runtime through the ingest endpoint; nothing here writes one."
    />
  );

  if (products.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          icon={ScrollText}
          title="No pipeline connected yet"
          body="Logs belong to a product. Add the sites and apps Altruvex operates, then on each product's page connect its pipeline — issue an ingest token and post log lines in batches to /api/ingest/logs. Lines are never generated here."
          action={
            <Button asChild variant="outline">
              <Link href="/products">Open products</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      <div className="space-y-2">
        <FilterBar
          label="Filter logs"
          search={{ placeholder: "Search messages…" }}
          trailing={
            <>
              <LogScope products={products} sources={sources} />
              <CustomRange
                from={from && !range ? from.toISOString() : ""}
                to={to ? to.toISOString() : ""}
              />
            </>
          }
        >
          <FilterChip param="level" label="All levels" />
          {LEVEL_CHIPS.map((chip) => (
            <FilterChip
              key={chip.value}
              param="level"
              value={chip.value}
              label={chip.label}
            />
          ))}
          <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
          {ENVIRONMENTS.map((env) => (
            <FilterChip
              key={env}
              param="environment"
              value={env}
              label={statusOf("deployEnvironment", env).label}
            />
          ))}
          <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
          {(Object.keys(RANGES) as RangeKey[]).map((key) => (
            <FilterChip
              key={key}
              param="range"
              value={key}
              label={RANGES[key].label}
            />
          ))}
        </FilterBar>
        <ActiveFilters
          labels={{
            product: { label: "Product", clears: ["source"] },
            source: "Source",
            requestId: "Request",
            deployment: "Deployment",
            build: "Build",
            incident: "Incident",
            from: "From",
            to: "To",
          }}
          valueLabels={{
            product: sp.product
              ? { [sp.product]: productName ?? "Unknown product" }
              : {},
            deployment: sp.deployment
              ? {
                  [sp.deployment]: deployment
                    ? `#${deployment.number} · ${deployment.product.name}`
                    : "Deleted deployment",
                }
              : {},
            build: sp.build
              ? {
                  [sp.build]: build
                    ? `#${build.number} · ${build.product.name}`
                    : "Deleted build",
                }
              : {},
            incident: sp.incident
              ? {
                  [sp.incident]: incident
                    ? `${incident.product.name} #${incident.number} · ${incident.title}`
                    : "Deleted incident",
                }
              : {},
            from:
              from && !range && sp.from ? { [sp.from]: dateTime(from) } : {},
            to: to && sp.to ? { [sp.to]: dateTime(to) } : {},
          }}
        />
      </div>

      {result.entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={hasFilters ? "No lines match" : "No logs yet"}
          body={
            hasFilters
              ? "No log line matches every filter. Remove one to widen the view — the newest lines are always at the top."
              : "No product has posted a log line yet. Connect a pipeline on a product's page (an ingest token), then post lines in batches to /api/ingest/logs."
          }
          action={
            <Button asChild variant="outline">
              <Link href={hasFilters ? "/logs" : "/products"}>
                {hasFilters ? "Clear filters" : "Open products"}
              </Link>
            </Button>
          }
        />
      ) : (
        <Panel flush>
          <List label="Log lines">
            {result.entries.map((entry) => (
              <ListRow
                key={entry.id}
                inspect={inspectHref("/logs", sp, entry.id)}
                selected={sp.inspect === entry.id}
                tone={statusOf("logLevel", entry.level).tone}
                title={
                  <span className="font-mono text-meta font-normal">
                    {entry.message}
                  </span>
                }
                meta={
                  <>
                    <time
                      dateTime={entry.timestamp.toISOString()}
                      className="font-mono tabular-nums"
                    >
                      {dateTime(entry.timestamp)}
                    </time>
                    <span className="truncate">{entry.product.name}</span>
                    {entry.source && (
                      <span className="max-sm:hidden">{entry.source}</span>
                    )}
                    <span className="max-sm:hidden">
                      {statusOf("deployEnvironment", entry.environment).label}
                    </span>
                    {entry.incident && (
                      <span className="font-mono">
                        INC #{entry.incident.number}
                      </span>
                    )}
                  </>
                }
                trailing={
                  <StatusPill
                    registry="logLevel"
                    value={entry.level}
                    variant="dot"
                  />
                }
              />
            ))}
          </List>
          <Pager
            className="border-t border-border px-3 py-2"
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            noun="lines"
            hrefFor={(n) => hrefWith(sp, { page: String(n), inspect: null })}
            pageSizes={PAGE_SIZES}
            pageSizeHref={(size) =>
              hrefWith(sp, { pageSize: String(size), inspect: null })
            }
          />
        </Panel>
      )}

      <InspectSheet
        open={Boolean(inspected)}
        width="lg"
        title={
          inspected
            ? `${inspected.level} · ${inspected.product.name}`
            : "Log line"
        }
        subtitle={inspected ? dateTime(inspected.timestamp) : undefined}
        status={
          inspected ? (
            <StatusPill registry="logLevel" value={inspected.level} />
          ) : undefined
        }
        footer={
          inspected && canDeleteLine ? (
            <DeleteRecordButton
              entity="log"
              id={inspected.id}
              label={inspected.message.slice(0, 60)}
              redirectTo={closeHref}
              size="sm"
            >
              Delete line
            </DeleteRecordButton>
          ) : undefined
        }
      >
        {inspected && (
          <div className="space-y-4">
            <p className="text-meta text-subtle-foreground">
              Written by CI — read-only.
            </p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-sm border border-border bg-surface p-2 font-mono text-meta">
              {inspected.message}
            </pre>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-meta">
              <Fact label="Product">
                <EntityLink type="product" id={inspected.product.id}>
                  {inspected.product.name}
                </EntityLink>
              </Fact>
              <Fact label="Environment">
                {statusOf("deployEnvironment", inspected.environment).label}
              </Fact>
              <Fact label="Source">
                {inspected.source ? (
                  <Link
                    className="text-brand hover:underline"
                    href={hrefWith(sp, {
                      source: inspected.source,
                      product: inspected.product.id,
                      inspect: null,
                    })}
                  >
                    {inspected.source}
                  </Link>
                ) : (
                  "—"
                )}
              </Fact>
              <Fact label="Request">
                {inspected.requestId ? (
                  <Link
                    className="break-all font-mono text-brand hover:underline"
                    href={hrefWith({}, { requestId: inspected.requestId })}
                  >
                    {inspected.requestId}
                  </Link>
                ) : (
                  "—"
                )}
              </Fact>
              <Fact label="Deployment">
                {inspected.deployment ? (
                  <EntityLink type="deployment" id={inspected.deployment.id}>
                    #{inspected.deployment.number}
                  </EntityLink>
                ) : (
                  "—"
                )}
              </Fact>
              <Fact label="Build">
                {inspected.build ? (
                  <EntityLink type="build" id={inspected.build.id}>
                    #{inspected.build.number}
                  </EntityLink>
                ) : (
                  "—"
                )}
              </Fact>
            </dl>

            {inspected.metadata != null && (
              <div>
                <p className="telemetry text-subtle-foreground">Metadata</p>
                <pre className="mt-1 max-h-64 overflow-auto rounded-sm border border-border bg-surface p-2 font-mono text-meta">
                  {JSON.stringify(inspected.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="telemetry text-subtle-foreground">Evidence for</p>
              {canLinkIncident ? (
                <IncidentLinker
                  logId={inspected.id}
                  productName={inspected.product.name}
                  current={inspected.incident}
                  options={openIncidents}
                />
              ) : inspected.incident ? (
                <EntityLink type="incident" id={inspected.incident.id}>
                  #{inspected.incident.number} · {inspected.incident.title}
                </EntityLink>
              ) : (
                <p className="text-meta text-subtle-foreground">
                  Not attached to an incident.
                </p>
              )}
            </div>
          </div>
        )}
      </InspectSheet>
    </div>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="telemetry text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 min-w-0 truncate">{children}</dd>
    </div>
  );
}
