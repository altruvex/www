import Link from "next/link";
import { Rocket } from "lucide-react";

import {
  BuildStatus,
  DeployEnvironment,
  DeploymentStatus,
  prisma,
} from "@repo/database";
import { Button } from "@repo/ui";

import { FilterChip } from "@/components/os/data-table";
import { EmptyState } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { InspectSheet, inspectHref } from "@/components/os/inspect-sheet";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { TabNav } from "@/components/os/tab-nav";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { listBuildsPage, listDeploymentsPage } from "@/lib/engineering";
import { dateTime } from "@/lib/format";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { statusOf } from "@/lib/status";
import { BuildsTable, type BuildRow } from "./builds-table";
import { DeploymentsTable, type DeploymentRow } from "./deployments-table";
import { DeploymentFilters } from "./filters";
import { ExternalUrl, clientName, duration, safeHttpUrl } from "./shared";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "deployments", label: "Deployments" },
  { id: "builds", label: "Builds" },
] as const;

type Tab = (typeof TABS)[number]["id"];

type Params = {
  tab?: string;
  product?: string;
  environment?: string;
  status?: string;
  client?: string;
  cursor?: string;
  inspect?: string;
  window?: string;
};

const FILTER_KEYS = ["product", "environment", "status", "client", "window"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const ENVIRONMENTS = Object.values(DeployEnvironment);
const DEPLOYMENT_STATUSES = Object.values(DeploymentStatus);
const BUILD_STATUSES = Object.values(BuildStatus);

const LIST_WINDOWS = {
  "24h": { ms: 86_400_000, label: "Last 24 hours" },
  "7d": { ms: 7 * 86_400_000, label: "Last 7 days" },
  "30d": { ms: 30 * 86_400_000, label: "Last 30 days" },
} as const;
type ListWindow = keyof typeof LIST_WINDOWS;
const asListWindow = (v?: string): ListWindow | undefined =>
  v && v in LIST_WINDOWS ? (v as ListWindow) : undefined;

function withinWindow<T extends { createdAt: Date }>(
  page: { entries: T[]; hasMore: boolean; nextCursor: string | null },
  start: Date | undefined,
) {
  if (!start) return page;
  const entries = page.entries.filter((row) => row.createdAt >= start);
  return entries.length === page.entries.length
    ? page
    : { entries, hasMore: false, nextCursor: null };
}

const WINDOW_DAYS = 30;

export default async function DeploymentsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const denied = await gateRoute("/deployments");
  if (denied) return denied;
  const role = await currentRole();
  const canDelete = can(role, "delete", "project");
  const canOpenIncident =
    can(role, "create", "incident") && roleCanOpen(role, "/incidents");

  const sp = await searchParams;
  const tab: Tab = sp.tab === "builds" ? "builds" : "deployments";

  const environment = ENVIRONMENTS.includes(sp.environment as DeployEnvironment)
    ? (sp.environment as DeployEnvironment)
    : undefined;
  const statuses: readonly string[] =
    tab === "builds" ? BUILD_STATUSES : DEPLOYMENT_STATUSES;
  const status =
    sp.status && statuses.includes(sp.status) ? sp.status : undefined;
  const productId = sp.product || undefined;
  const clientId = sp.client || undefined;
  const cursor = sp.cursor || undefined;
  const filters = { productId, environment, status, clientId };

  const now = new Date();
  const listWindow = asListWindow(sp.window);
  const windowStart = listWindow ? new Date(now.getTime() - LIST_WINDOWS[listWindow].ms) : undefined;
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
  const scope = {
    ...(productId ? { productId } : {}),
    ...(clientId ? { product: { clientId } } : {}),
  };

  const [
    products,
    clients,
    anyDeployment,
    anyBuild,
    productionCount,
    failedDeployCount,
    failedBuildCount,
    openIncidentCount,
    deploymentPage,
    buildPage,
  ] = await Promise.all([
    prisma.product.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.client.findMany({
      where: { products: { some: {} } },
      orderBy: [{ company: "asc" }, { name: "asc" }],
      select: { id: true, name: true, company: true },
    }),
    prisma.deployment.findFirst({ select: { id: true } }),
    prisma.build.findFirst({ select: { id: true } }),
    prisma.deployment.count({
      where: {
        ...scope,
        environment: "PRODUCTION",
        status: "SUCCEEDED",
        createdAt: { gte: since },
      },
    }),
    prisma.deployment.count({ where: { ...scope, status: "FAILED" } }),
    prisma.build.count({ where: { ...scope, status: "FAILED" } }),
    prisma.incident.count({ where: { ...scope, status: { not: "RESOLVED" } } }),
    tab === "deployments"
      ? listDeploymentsPage(filters, cursor).then((p) => withinWindow(p, windowStart))
      : null,
    tab === "builds"
      ? listBuildsPage(filters, cursor).then((p) => withinWindow(p, windowStart))
      : null,
  ]);

  const inspectId = sp.inspect || undefined;
  const [inspectedDeployment, inspectedBuild] = await Promise.all([
    inspectId && tab === "deployments"
      ? prisma.deployment.findUnique({
          where: { id: inspectId },
          include: {
            product: { select: { id: true, name: true } },
            build: { select: { id: true, number: true, branch: true } },
            rolledBackBy: { select: { id: true, number: true } },
            _count: { select: { logs: true, incidents: true } },
          },
        })
      : null,
    inspectId && tab === "builds"
      ? prisma.build.findUnique({
          where: { id: inspectId },
          include: {
            product: { select: { id: true, name: true } },
            _count: { select: { logs: true, deployments: true } },
          },
        })
      : null,
  ]);

  if (!anyDeployment && !anyBuild) {
    const noProducts = products.length === 0 && !clientId;
    return (
      <div className="space-y-4">
        <PageHeader
          title="Deployments"
          description="Build and deployment history for every product Altruvex operates."
          meta={<ToneBadge tone="neutral">Written by CI</ToneBadge>}
        />
        <EmptyState
          icon={Rocket}
          title={noProducts ? "No products yet" : "No pipeline connected yet"}
          body={
            noProducts
              ? "Deployments belong to a product. Add the sites and apps Altruvex operates, then point their pipelines at the ingest endpoint."
              : "No build or deployment has reached the ingest endpoint, and this page is read-only: rows appear because CI reported them, never because someone filled in a form. To connect one, open a product, issue an ingest token under Pipeline (or link its GitHub repository), and have CI post to /api/ingest/builds and /api/ingest/deployments."
          }
          action={
            <Button asChild variant="outline">
              <Link href="/products">
                {noProducts ? "Add a product" : "Connect a pipeline"}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const current: Record<FilterKey, string | undefined> = {
    product: productId,
    environment,
    status,
    client: clientId,
    window: listWindow,
  };

  function hrefWith(
    patch: Partial<Record<FilterKey | "cursor", string | null>>,
  ): string {
    const next = new URLSearchParams();
    if (tab !== "deployments") next.set("tab", tab);
    for (const key of FILTER_KEYS) {
      const value = key in patch ? patch[key] : current[key];
      if (value) next.set(key, value);
    }
    if (patch.cursor) next.set("cursor", patch.cursor);
    const qs = next.toString();
    return qs ? `/deployments?${qs}` : "/deployments";
  }

  const productName = productId
    ? (products.find((p) => p.id === productId)?.name ??
      (
        await prisma.product.findUnique({
          where: { id: productId },
          select: { name: true },
        })
      )?.name ??
      "Unknown product")
    : null;
  const clientRow = clientId ? clients.find((c) => c.id === clientId) : null;
  const statusRegistry = tab === "builds" ? "buildStatus" : "deploymentStatus";

  const chips = [
    productId && { key: "product", label: "Product", value: productName },
    clientId && {
      key: "client",
      label: "Client",
      value: clientRow ? clientName(clientRow) : "Unknown client",
    },
    environment && {
      key: "environment",
      label: "Environment",
      value: statusOf("deployEnvironment", environment).label,
    },
    status && {
      key: "status",
      label: "Status",
      value: statusOf(statusRegistry, status).label,
    },
    listWindow && {
      key: "window",
      label: "Created",
      value: LIST_WINDOWS[listWindow].label,
    },
  ].filter(Boolean) as { key: FilterKey; label: string; value: string }[];

  const filterControls = (
    <DeploymentFilters
      key="filters"
      filters={[
        {
          param: "product",
          label: "Products",
          value: productId,
          options: products.map((p) => ({ value: p.id, label: p.name })),
        },
        {
          param: "client",
          label: "Clients",
          value: clientId,
          options: clients.map((c) => ({ value: c.id, label: clientName(c) })),
        },
        {
          param: "environment",
          label: "Environments",
          value: environment,
          options: ENVIRONMENTS.map((e) => ({
            value: e,
            label: statusOf("deployEnvironment", e).label,
          })),
        },
        {
          param: "status",
          label: "Statuses",
          value: status,
          options: (tab === "builds"
            ? BUILD_STATUSES
            : DEPLOYMENT_STATUSES
          ).map((s) => ({
            value: s,
            label: statusOf(statusRegistry, s).label,
          })),
        },
      ]}
    />
  );

  const deploymentRows: DeploymentRow[] = (deploymentPage?.entries ?? []).map(
    (d) => ({
      id: d.id,
      number: d.number,
      productId: d.product.id,
      productName: d.product.name,
      clientId: d.product.client.id,
      clientName: clientName(d.product.client),
      environment: d.environment,
      status: d.status,
      version: d.version,
      commitSha: d.commitSha,
      triggeredBy: d.triggeredBy,
      buildNumber: d.build?.number ?? null,
      rolledBackByNumber: d.rolledBackBy?.number ?? null,
      failureReason: d.failureReason,
      url: d.url,
      safeUrl: safeHttpUrl(d.url),
      at: (d.finishedAt ?? d.createdAt).toISOString(),
      inspectHref: inspectHref("/deployments", sp, d.id),
    }),
  );

  const buildRows: BuildRow[] = (buildPage?.entries ?? []).map((b) => ({
    id: b.id,
    number: b.number,
    productId: b.product.id,
    productName: b.product.name,
    clientId: b.product.client.id,
    clientName: clientName(b.product.client),
    environment: b.environment,
    status: b.status,
    branch: b.branch,
    commitSha: b.commitSha,
    commitMessage: b.commitMessage,
    triggeredBy: b.triggeredBy,
    durationMs: b.durationMs,
    failureReason: b.failureReason,
    deploymentCount: b._count.deployments,
    at: (b.finishedAt ?? b.createdAt).toISOString(),
    inspectHref: inspectHref("/deployments", sp, b.id),
  }));
  const closeHref = inspectHref("/deployments", sp, null);

  const page = tab === "deployments" ? deploymentPage : buildPage;
  const scoped = Boolean(productId || clientId);
  const scopeNote = scoped ? "in this scope" : "all products";
  const windowNote = `last ${WINDOW_DAYS} days, ${scopeNote}`;
  const filtered = chips.length > 0;

  const empty = filtered ? (
    <span>
      No {tab === "builds" ? "build" : "deployment"} matches those filters.{" "}
      <Link
        href={tab === "builds" ? "/deployments?tab=builds" : "/deployments"}
        className="text-brand hover:underline"
      >
        Clear filters
      </Link>
    </span>
  ) : cursor ? (
    <span>
      Nothing older on this list.{" "}
      <Link href={hrefWith({})} className="text-brand hover:underline">
        Back to newest
      </Link>
    </span>
  ) : tab === "builds" ? (
    "No build has been reported yet. CI posts builds to the ingest endpoint; a pipeline that only reports deployments leaves this tab empty."
  ) : (
    "No deployment has been reported yet. CI posts deployments to the ingest endpoint; a pipeline that only reports builds leaves this tab empty."
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Deployments"
        description="Reported by CI through the ingest endpoint. Nothing here is entered by hand, which is why it can be trusted as a record of what actually shipped."
        meta={<ToneBadge tone="neutral">Written by CI</ToneBadge>}
        tabs={
          <TabNav
            tabs={[...TABS]}
            active={tab}
            basePath="/deployments"
            keep={{ product: productId, environment, status, client: clientId, window: listWindow }}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Production deploys"
          value={productionCount}
          sub={`Succeeded, ${windowNote}`}
          tone={productionCount > 0 ? "success" : "neutral"}
        />
        <StatTile
          label="Failed deploys"
          value={failedDeployCount}
          sub={`All time, ${scopeNote}`}
          tone={failedDeployCount > 0 ? "danger" : "neutral"}
          href={
            failedDeployCount > 0
              ? `/deployments?status=FAILED${productId ? `&product=${productId}` : ""}${clientId ? `&client=${clientId}` : ""}`
              : undefined
          }
        />
        <StatTile
          label="Failed builds"
          value={failedBuildCount}
          sub={`All time, ${scopeNote}`}
          tone={failedBuildCount > 0 ? "warning" : "neutral"}
          href={
            failedBuildCount > 0
              ? `/deployments?tab=builds&status=FAILED${productId ? `&product=${productId}` : ""}${clientId ? `&client=${clientId}` : ""}`
              : undefined
          }
        />
        <StatTile
          label="Open incidents"
          value={openIncidentCount}
          sub={
            scoped ? "Unresolved, in this scope" : "Unresolved, all products"
          }
          tone={openIncidentCount > 0 ? "danger" : "success"}
          href={
            openIncidentCount > 0
              ? `/incidents${productId ? `?product=${productId}` : clientId ? `?client=${clientId}` : ""}`
              : undefined
          }
        />
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              value={chip.value}
              clearHref={hrefWith(
                chip.key === "client"
                  ? { client: null, product: null }
                  : { [chip.key]: null },
              )}
            />
          ))}
        </div>
      )}

      {tab === "deployments" ? (
        <DeploymentsTable
          rows={deploymentRows}
          toolbar={filterControls}
          empty={empty}
          canDelete={canDelete}
          canOpenIncident={canOpenIncident}
        />
      ) : (
        <BuildsTable
          rows={buildRows}
          toolbar={filterControls}
          empty={empty}
          canDelete={canDelete}
          canOpenIncident={canOpenIncident}
        />
      )}

      {(cursor || page?.hasMore) && (
        <nav
          aria-label="Pages"
          className="flex items-center justify-between gap-3 text-meta"
        >
          {cursor ? (
            <Link
              href={hrefWith({})}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Newest
            </Link>
          ) : (
            <span />
          )}
          {page?.hasMore && page.nextCursor ? (
            <Link
              href={hrefWith({ cursor: page.nextCursor })}
              className="text-muted-foreground hover:text-foreground"
            >
              Older →
            </Link>
          ) : (
            <span className="text-subtle-foreground">Oldest reached</span>
          )}
        </nav>
      )}

      <InspectSheet
        open={Boolean(inspectId)}
        width="md"
        title={
          inspectedDeployment
            ? `Deployment #${inspectedDeployment.number} · ${inspectedDeployment.product.name}`
            : inspectedBuild
              ? `Build #${inspectedBuild.number} · ${inspectedBuild.product.name}`
              : "Record"
        }
        subtitle={
          inspectedDeployment
            ? dateTime(inspectedDeployment.finishedAt ?? inspectedDeployment.createdAt)
            : inspectedBuild
              ? dateTime(inspectedBuild.finishedAt ?? inspectedBuild.createdAt)
              : undefined
        }
        status={
          inspectedDeployment ? (
            <StatusPill registry="deploymentStatus" value={inspectedDeployment.status} />
          ) : inspectedBuild ? (
            <StatusPill registry="buildStatus" value={inspectedBuild.status} />
          ) : undefined
        }
        fullHref={
          inspectedDeployment
            ? `/deployments/${inspectedDeployment.id}`
            : inspectedBuild
              ? `/deployments/builds/${inspectedBuild.id}`
              : undefined
        }
      >
        {inspectedDeployment && (
          <div className="space-y-4">
            <p className="text-meta text-subtle-foreground">
              Written by CI — read-only. Nothing here can be changed from the admin.
            </p>
            {inspectedDeployment.failureReason && (
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-sm border border-danger/40 bg-danger/5 p-2 font-mono text-meta">
                {inspectedDeployment.failureReason}
              </pre>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-meta">
              <Fact label="Product">
                <EntityLink type="product" id={inspectedDeployment.product.id}>
                  {inspectedDeployment.product.name}
                </EntityLink>
              </Fact>
              <Fact label="Environment">
                {statusOf("deployEnvironment", inspectedDeployment.environment).label}
              </Fact>
              <Fact label="Version">{inspectedDeployment.version ?? "—"}</Fact>
              <Fact label="Commit">
                <span className="font-mono">{inspectedDeployment.commitSha?.slice(0, 7) ?? "—"}</span>
              </Fact>
              <Fact label="Build">
                {inspectedDeployment.build ? (
                  <EntityLink type="build" id={inspectedDeployment.build.id}>
                    #{inspectedDeployment.build.number}
                    {inspectedDeployment.build.branch ? ` · ${inspectedDeployment.build.branch}` : ""}
                  </EntityLink>
                ) : (
                  "—"
                )}
              </Fact>
              <Fact label="Triggered by">{inspectedDeployment.triggeredBy ?? "—"}</Fact>
              <Fact label="Rolled back by">
                {inspectedDeployment.rolledBackBy ? (
                  <EntityLink type="deployment" id={inspectedDeployment.rolledBackBy.id}>
                    #{inspectedDeployment.rolledBackBy.number}
                  </EntityLink>
                ) : (
                  "—"
                )}
              </Fact>
              <Fact label="URL">
                <ExternalUrl value={inspectedDeployment.url} />
              </Fact>
            </dl>
            <InspectLinks
              logs={`/logs?deployment=${inspectedDeployment.id}`}
              errors={`/logs?deployment=${inspectedDeployment.id}&level=ERROR`}
              logCount={inspectedDeployment._count.logs}
              extra={
                inspectedDeployment._count.incidents > 0
                  ? {
                      href: `/incidents?deployment=${inspectedDeployment.id}&status=all`,
                      label: `${inspectedDeployment._count.incidents} linked incident${inspectedDeployment._count.incidents === 1 ? "" : "s"}`,
                    }
                  : null
              }
            />
          </div>
        )}
        {inspectedBuild && (
          <div className="space-y-4">
            <p className="text-meta text-subtle-foreground">
              Written by CI — read-only. Nothing here can be changed from the admin.
            </p>
            {inspectedBuild.failureReason && (
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-sm border border-danger/40 bg-danger/5 p-2 font-mono text-meta">
                {inspectedBuild.failureReason}
              </pre>
            )}
            {inspectedBuild.commitMessage && (
              <p className="break-words text-body">{inspectedBuild.commitMessage}</p>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-meta">
              <Fact label="Product">
                <EntityLink type="product" id={inspectedBuild.product.id}>
                  {inspectedBuild.product.name}
                </EntityLink>
              </Fact>
              <Fact label="Environment">
                {statusOf("deployEnvironment", inspectedBuild.environment).label}
              </Fact>
              <Fact label="Branch">{inspectedBuild.branch ?? "—"}</Fact>
              <Fact label="Commit">
                <span className="font-mono">{inspectedBuild.commitSha?.slice(0, 7) ?? "—"}</span>
              </Fact>
              <Fact label="Triggered by">{inspectedBuild.triggeredBy ?? "—"}</Fact>
              <Fact label="Duration">{duration(inspectedBuild.durationMs)}</Fact>
              <Fact label="Deployments">{inspectedBuild._count.deployments}</Fact>
            </dl>
            <InspectLinks
              logs={`/logs?build=${inspectedBuild.id}`}
              errors={`/logs?build=${inspectedBuild.id}&level=ERROR`}
              logCount={inspectedBuild._count.logs}
              extra={null}
            />
          </div>
        )}
        {inspectId && !inspectedDeployment && !inspectedBuild && (
          <p className="text-meta text-muted-foreground">
            This record no longer exists, or belongs to the other tab.{" "}
            <Link href={closeHref} className="text-brand hover:underline">
              Close
            </Link>
          </p>
        )}
      </InspectSheet>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="telemetry text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 min-w-0 truncate">{children}</dd>
    </div>
  );
}

function InspectLinks({
  logs,
  errors,
  logCount,
  extra,
}: {
  logs: string;
  errors: string;
  logCount: number;
  extra: { href: string; label: string } | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm" className="pointer-coarse:min-h-11">
        <Link href={logs}>
          {logCount > 0 ? `${logCount.toLocaleString("en-US")} log lines` : "Logs (none yet)"}
        </Link>
      </Button>
      {logCount > 0 && (
        <Button asChild variant="ghost" size="sm" className="pointer-coarse:min-h-11">
          <Link href={errors}>Errors and worse</Link>
        </Button>
      )}
      {extra && (
        <Button asChild variant="ghost" size="sm" className="pointer-coarse:min-h-11">
          <Link href={extra.href}>{extra.label}</Link>
        </Button>
      )}
    </div>
  );
}
