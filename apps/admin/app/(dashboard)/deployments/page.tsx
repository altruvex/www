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
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { TabNav } from "@/components/os/tab-nav";
import { listBuildsPage, listDeploymentsPage } from "@/lib/engineering";
import { statusOf } from "@/lib/status";
import { BuildsTable, type BuildRow } from "./builds-table";
import { DeploymentsTable, type DeploymentRow } from "./deployments-table";
import { DeploymentFilters } from "./filters";
import { clientName, safeHttpUrl } from "./shared";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "deployments", label: "Deployments" },
  { id: "builds", label: "Builds" },
] as const;

type Tab = (typeof TABS)[number]["id"];

interface Params {
  tab?: string;
  product?: string;
  environment?: string;
  status?: string;
  client?: string;
  cursor?: string;
}

const FILTER_KEYS = ["product", "environment", "status", "client"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const ENVIRONMENTS = Object.values(DeployEnvironment);
const DEPLOYMENT_STATUSES = Object.values(DeploymentStatus);
const BUILD_STATUSES = Object.values(BuildStatus);

/** The window the tiles count over. Named in every tile so no figure is unlabelled. */
const WINDOW_DAYS = 30;

/**
 * Deployments and builds across every product (§7).
 *
 * Two tabs rather than two nav entries: an operator asking "did it ship" and an
 * operator asking "did it compile" are the same person thirty seconds apart,
 * and splitting them across the sidebar makes that a navigation problem.
 *
 * Nothing on this page is writable. Deployment state arrives from CI, and a
 * "Deploy" button here would be a claim rather than a cause — see §18.
 *
 * Filters live in the URL so a filtered view is a link someone can be sent.
 * The list is cursor-paginated: the history only grows, and an offset into a
 * list that CI keeps prepending to shows the same rows twice.
 */
export default async function DeploymentsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === "builds" ? "builds" : "deployments";

  // Anything unrecognised is dropped rather than passed to Prisma — a stale
  // link with `status=FOO` should show the unfiltered list, not a crash.
  const environment = ENVIRONMENTS.includes(sp.environment as DeployEnvironment)
    ? (sp.environment as DeployEnvironment)
    : undefined;
  // A status only means something on the tab whose enum it belongs to:
  // `QUEUED` is a build state, `ROLLED_BACK` a deployment one.
  const statuses: readonly string[] =
    tab === "builds" ? BUILD_STATUSES : DEPLOYMENT_STATUSES;
  const status =
    sp.status && statuses.includes(sp.status) ? sp.status : undefined;
  const productId = sp.product || undefined;
  const clientId = sp.client || undefined;
  const cursor = sp.cursor || undefined;
  const filters = { productId, environment, status, clientId };

  const now = new Date();
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
  // The tiles follow the product / client scope, because "failed deploys" next
  // to one client's list should be that client's. They ignore the status and
  // environment filters: each tile is itself a status/environment count.
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
    prisma.deployment.count({
      where: { ...scope, status: "FAILED", createdAt: { gte: since } },
    }),
    prisma.build.count({
      where: { ...scope, status: "FAILED", createdAt: { gte: since } },
    }),
    prisma.incident.count({ where: { ...scope, status: { not: "RESOLVED" } } }),
    tab === "deployments" ? listDeploymentsPage(filters, cursor) : null,
    tab === "builds" ? listBuildsPage(filters, cursor) : null,
  ]);

  // Nothing has ever been reported. Saying so once, plainly, beats an empty
  // table under four zero tiles.
  if (!anyDeployment && !anyBuild) {
    const noProducts = products.length === 0 && !clientId;
    return (
      <div className="space-y-4">
        <PageHeader
          title="Deployments"
          description="Build and deployment history for every product Altruvex operates."
        />
        <EmptyState
          icon={Rocket}
          title={noProducts ? "No products yet" : "Nothing has been reported"}
          body={
            noProducts
              ? "Deployments belong to a product. Add the sites and apps Altruvex operates, then point their pipelines at the ingest endpoint."
              : "No build or deployment has reached the ingest endpoint. This page is deliberately read-only: rows appear because CI reported them, never because someone filled in a form — so it stays empty until a pipeline posts. Issue an ingest token on a product to connect one."
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
  };

  /** This page with one filter changed; the cursor always resets. */
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
  ].filter(Boolean) as { key: FilterKey; label: string; value: string }[];

  const filterControls = (
    <DeploymentFilters
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
  }));

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
        tabs={
          <TabNav
            tabs={[...TABS]}
            active={tab}
            basePath="/deployments"
            // A status that is not valid on the other tab is dropped there
            // when the page validates it, so keeping it is safe.
            keep={{ product: productId, environment, status, client: clientId }}
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
          sub={windowNote.charAt(0).toUpperCase() + windowNote.slice(1)}
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
          sub={windowNote.charAt(0).toUpperCase() + windowNote.slice(1)}
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
              // Clearing the client also clears a product that belongs to it,
              // or the product select would hold a value it no longer lists.
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
        />
      ) : (
        <BuildsTable rows={buildRows} toolbar={filterControls} empty={empty} />
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
    </div>
  );
}
