import Link from "next/link";
import { ScrollText } from "lucide-react";

import { prisma, type DeployEnvironment, type LogLevel } from "@repo/database";
import { Button } from "@repo/ui";

import { FilterChip } from "@/components/os/data-table";
import { EmptyState } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { PageHeader } from "@/components/os/page-header";
import { listLogSources, listLogs } from "@/lib/engineering";
import { dateTime } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { LogExplorer, type LogRow } from "./log-explorer";

export const dynamic = "force-dynamic";

const LEVELS = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const;
const ENVIRONMENTS = ["PRODUCTION", "STAGING", "PREVIEW"] as const;

/** Relative windows, measured back from the moment the page renders. */
const RANGES = {
  "1h": { ms: 3_600_000, label: "Last hour" },
  "24h": { ms: 86_400_000, label: "Last 24 hours" },
  "7d": { ms: 7 * 86_400_000, label: "Last 7 days" },
} as const;
type RangeKey = keyof typeof RANGES;

const asLevel = (v?: string): LogLevel | undefined =>
  LEVELS.includes(v as LogLevel) ? (v as LogLevel) : undefined;
const asEnvironment = (v?: string): DeployEnvironment | undefined =>
  ENVIRONMENTS.includes(v as DeployEnvironment) ? (v as DeployEnvironment) : undefined;
const asRange = (v?: string): RangeKey | undefined =>
  v && v in RANGES ? (v as RangeKey) : undefined;

/** An ISO timestamp from the URL, or nothing — a malformed date is ignored, not a 500. */
function asDate(v?: string): Date | undefined {
  if (!v) return undefined;
  const date = new Date(v);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * The start of a relative window. A server component renders once per request,
 * so reading the clock here is the request's own "now", not an unstable value.
 */
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
  cursor?: string;
  before?: string;
};

/** Every view-state key except the two paging cursors. */
const FILTER_KEYS = [
  "product",
  "level",
  "environment",
  "q",
  "requestId",
  "source",
  "deployment",
  "build",
  "incident",
  "range",
  "from",
  "to",
] as const satisfies readonly (keyof Params)[];

/**
 * The same view with some keys replaced or removed. Paging cursors are dropped
 * unless the patch sets one: page 3 of a different filter is meaningless.
 */
function hrefWith(sp: Params, patch: Partial<Record<keyof Params, string | null>>): string {
  const next = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = key in patch ? patch[key] : sp[key];
    if (value) next.set(key, value);
  }
  if (patch.cursor) next.set("cursor", patch.cursor);
  if (patch.before) next.set("before", patch.before);
  const qs = next.toString();
  return qs ? `/logs?${qs}` : "/logs";
}

/**
 * The log explorer (§7).
 *
 * Filtering, searching and paging all happen in the database and in the URL —
 * not in component state over a preloaded array. That is the only design that
 * survives a product with a hundred thousand log lines, and it makes any view
 * an operator reaches a link they can paste into a message.
 */
export default async function LogsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;

  const range = asRange(sp.range);
  // A custom window only counts when it is a real window: both ends parse and
  // the start comes first. Anything else is ignored rather than guessed at.
  let from = range ? undefined : asDate(sp.from);
  let to = range ? undefined : asDate(sp.to);
  if (from && to && from >= to) {
    from = undefined;
    to = undefined;
  }
  if (range) from = rangeStart(range);

  const level = asLevel(sp.level);
  const environment = asEnvironment(sp.environment);
  const q = sp.q?.trim() || undefined;
  const requestId = sp.requestId?.trim() || undefined;
  const source = sp.source?.trim() || undefined;

  const [products, sources, page, deployment, build, incident] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    listLogSources(sp.product),
    listLogs({
      productId: sp.product,
      level,
      environment,
      q,
      requestId,
      source,
      deploymentId: sp.deployment,
      buildId: sp.build,
      incidentId: sp.incident,
      from,
      to,
      cursor: sp.cursor,
      before: sp.before,
    }),
    sp.deployment
      ? prisma.deployment.findUnique({
          where: { id: sp.deployment },
          select: { id: true, number: true, product: { select: { name: true } } },
        })
      : null,
    sp.build
      ? prisma.build.findUnique({
          where: { id: sp.build },
          select: { id: true, number: true, product: { select: { name: true } } },
        })
      : null,
    sp.incident
      ? prisma.incident.findUnique({
          where: { id: sp.incident },
          select: { id: true, number: true, title: true, product: { select: { name: true } } },
        })
      : null,
  ]);

  // Only the open incidents of products on this page can be offered as a link
  // target: a line is evidence for its own product, and a closed incident is
  // reopened on its own page, not by attaching a log to it.
  const productIdsOnPage = [...new Set(page.entries.map((e) => e.product.id))];
  const openIncidents = productIdsOnPage.length
    ? await prisma.incident.findMany({
        where: { productId: { in: productIdsOnPage }, status: { not: "RESOLVED" } },
        orderBy: { detectedAt: "desc" },
        select: { id: true, number: true, title: true, productId: true },
      })
    : [];

  const rows: LogRow[] = page.entries.map((entry) => ({
    id: entry.id,
    level: entry.level,
    environment: entry.environment,
    message: entry.message,
    source: entry.source,
    requestId: entry.requestId,
    timestamp: entry.timestamp.toISOString(),
    productId: entry.product.id,
    productName: entry.product.name,
    deploymentNumber: entry.deployment?.number ?? null,
    deploymentId: entry.deployment?.id ?? null,
    buildNumber: entry.build?.number ?? null,
    buildId: entry.build?.id ?? null,
    incident: entry.incident
      ? { id: entry.incident.id, number: entry.incident.number, title: entry.incident.title }
      : null,
    metadata: entry.metadata ? JSON.stringify(entry.metadata, null, 2) : null,
  }));

  const productName = products.find((p) => p.id === sp.product)?.name;

  // One removable chip per active filter, named rather than shown as an id. A
  // record id that resolves to nothing still gets a chip — the filter is still
  // narrowing the list, and the operator needs a way to drop it.
  const chips: React.ReactNode[] = [];
  if (sp.product) {
    chips.push(
      <FilterChip
        key="product"
        label="Product"
        value={
          productName ? (
            <EntityLink type="product" id={sp.product}>
              {productName}
            </EntityLink>
          ) : (
            "Unknown product"
          )
        }
        clearHref={hrefWith(sp, { product: null, source: null })}
      />,
    );
  }
  if (level) {
    chips.push(
      <FilterChip
        key="level"
        label="Level"
        value={statusOf("logLevel", level).label}
        clearHref={hrefWith(sp, { level: null })}
      />,
    );
  }
  if (environment) {
    chips.push(
      <FilterChip
        key="environment"
        label="Env"
        value={environment.toLowerCase()}
        clearHref={hrefWith(sp, { environment: null })}
      />,
    );
  }
  if (source) {
    chips.push(
      <FilterChip key="source" label="Source" value={source} clearHref={hrefWith(sp, { source: null })} />,
    );
  }
  if (q) {
    chips.push(
      <FilterChip key="q" label="Search" value={`“${q}”`} clearHref={hrefWith(sp, { q: null })} />,
    );
  }
  if (requestId) {
    chips.push(
      <FilterChip
        key="requestId"
        label="Trace"
        value={<span className="font-mono">{requestId}</span>}
        clearHref={hrefWith(sp, { requestId: null })}
      />,
    );
  }
  if (sp.deployment) {
    chips.push(
      <FilterChip
        key="deployment"
        label="Deployment"
        value={
          deployment ? (
            <EntityLink type="deployment" id={deployment.id}>
              #{deployment.number} · {deployment.product.name}
            </EntityLink>
          ) : (
            "Deleted deployment"
          )
        }
        clearHref={hrefWith(sp, { deployment: null })}
      />,
    );
  }
  if (sp.build) {
    chips.push(
      <FilterChip
        key="build"
        label="Build"
        value={
          build ? (
            <EntityLink type="build" id={build.id}>
              #{build.number} · {build.product.name}
            </EntityLink>
          ) : (
            "Deleted build"
          )
        }
        clearHref={hrefWith(sp, { build: null })}
      />,
    );
  }
  if (sp.incident) {
    chips.push(
      <FilterChip
        key="incident"
        label="Incident"
        value={
          incident ? (
            <EntityLink type="incident" id={incident.id}>
              {incident.product.name} #{incident.number} · {incident.title}
            </EntityLink>
          ) : (
            "Deleted incident"
          )
        }
        clearHref={hrefWith(sp, { incident: null })}
      />,
    );
  }
  if (range) {
    chips.push(
      <FilterChip
        key="range"
        label="Time"
        value={RANGES[range].label}
        clearHref={hrefWith(sp, { range: null, from: null, to: null })}
      />,
    );
  } else if (from || to) {
    chips.push(
      <FilterChip
        key="window"
        label="Time"
        value={`${from ? dateTime(from) : "Start"} → ${to ? dateTime(to) : "now"}`}
        clearHref={hrefWith(sp, { range: null, from: null, to: null })}
      />,
    );
  }

  const hasFilters = chips.length > 0;
  const paged = Boolean(sp.cursor || sp.before);

  if (products.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Logs"
          description="Operational log lines from every product Altruvex runs."
        />
        <EmptyState
          icon={ScrollText}
          title="No products yet"
          body="Logs belong to a product. Add the sites and apps Altruvex operates, then point their runtime at the ingest endpoint — log lines are posted in batches and are never generated here."
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
      <PageHeader
        title="Logs"
        description="Everything products report, newest first. Filters and paging run in the database, so a URL from this page is a view someone else can open."
      />
      <LogExplorer
        // Remount when the filters change (a chip removed, a link followed) so
        // the search box and the custom-range inputs show the URL, not what was
        // typed before. Paging keeps the same key, and so keeps open rows.
        key={hrefWith(sp, {})}
        rows={rows}
        products={products}
        sources={sources}
        openIncidents={openIncidents}
        filters={{
          product: sp.product ?? "",
          level: level ?? "",
          environment: environment ?? "",
          q: sp.q ?? "",
          source: source ?? "",
          range: range ?? (from || to ? "custom" : ""),
          from: from && !range ? from.toISOString() : "",
          to: to ? to.toISOString() : "",
        }}
        chips={hasFilters ? chips : null}
        hasFilters={hasFilters}
        paging={{
          newerHref: page.hasNewer && page.prevCursor ? hrefWith(sp, { before: page.prevCursor }) : null,
          olderHref: page.hasMore && page.nextCursor ? hrefWith(sp, { cursor: page.nextCursor }) : null,
          newestHref: paged ? hrefWith(sp, {}) : null,
          hasMore: page.hasMore,
        }}
      />
    </div>
  );
}
