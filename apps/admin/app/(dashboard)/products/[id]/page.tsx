import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, GitBranch } from "lucide-react";

import { Button } from "@repo/ui";

import { EmptyInline } from "@/components/os/empty-state";
import { DetailLayout, MetaList, QuickActions } from "@/components/os/detail-layout";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { TabNav } from "@/components/os/tab-nav";
import { StatusPill } from "@/components/ui/badge";
import { AlertBar } from "@/components/os/error-state";
import { dateTime, when } from "@/lib/format";
import { getProduct } from "@/lib/engineering";
import { IngestTokenPanel } from "./ingest-token-panel";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "deployments", label: "Deployments" },
  { id: "builds", label: "Builds" },
  { id: "incidents", label: "Incidents" },
] as const;

function duration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/**
 * The product hub (§30, §6).
 *
 * Everything an operator needs to answer "what is the state of this site" sits
 * on one screen: where it is deployed, what shipped last, what is failing, and
 * what is open against it. The tabs are query params rather than nested routes
 * so the aside — which is identity, not tab content — never re-renders.
 */
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const product = await getProduct(id);
  if (!product) notFound();

  const tab = TABS.some((t) => t.id === rawTab) ? rawTab! : "overview";

  const openIncidents = product.incidents.filter((i) => i.status !== "RESOLVED");
  const lastDeployment = product.deployments.find((d) => d.status === "SUCCEEDED") ?? null;
  const lastFailedDeployment = product.deployments.find((d) => d.status === "FAILED") ?? null;
  const recentBuilds = product.builds.slice(0, 10);
  const failedBuilds = product.builds.filter((b) => b.status === "FAILED").length;
  const clientName = product.client.company || product.client.name || "Unnamed client";

  return (
    <div className="space-y-4">
      <PageHeader
        title={product.name}
        crumbs={[
          { label: "Products", href: "/products" },
          { label: product.name },
        ]}
        status={<StatusPill registry="productStatus" value={product.status} />}
        meta={
          <span className="font-mono text-meta text-subtle-foreground">{product.slug}</span>
        }
        description={
          <>
            Operated for{" "}
            <Link href={`/clients/${product.client.id}`} className="text-brand hover:underline">
              {clientName}
            </Link>
            {product.project ? (
              <>
                {" · "}
                <Link
                  href={`/projects/${product.project.id}`}
                  className="text-brand hover:underline"
                >
                  {product.project.name}
                </Link>
              </>
            ) : null}
          </>
        }
        alert={
          openIncidents.length > 0 ? (
            <AlertBar tone="danger">
              {openIncidents.length} open incident
              {openIncidents.length === 1 ? "" : "s"} on this product — the most severe is{" "}
              {openIncidents[0]?.severity}.{" "}
              <Link href="/incidents" className="underline">
                Open incidents
              </Link>
            </AlertBar>
          ) : !product.ingestTokenHash && product.status === "LIVE" ? (
            <AlertBar tone="warning">
              This product is live but no CI pipeline reports to it, so its deployment
              history and logs will stay empty. Issue an ingest token below to connect one.
            </AlertBar>
          ) : null
        }
        actions={
          <>
            {product.repositoryUrl && (
              <Button asChild variant="ghost">
                <a href={product.repositoryUrl} target="_blank" rel="noreferrer noopener">
                  <GitBranch className="size-3.5" />
                  Repository
                </a>
              </Button>
            )}
            {product.productionUrl && (
              <Button asChild variant="outline">
                <a href={product.productionUrl} target="_blank" rel="noreferrer noopener">
                  <ExternalLink className="size-3.5" />
                  Visit
                </a>
              </Button>
            )}
          </>
        }
        tabs={<TabNav tabs={[...TABS]} active={tab} basePath={`/products/${product.id}`} />}
      />

      <DetailLayout
        aside={
          <>
            <Panel title="Identity" flush>
              <MetaList
                items={[
                  { label: "Client", value: clientName },
                  {
                    label: "Project",
                    value: product.project?.name ?? "Not linked",
                    hint: "A product can outlive the project that built it",
                  },
                  { label: "Type", value: product.kind.replace(/_/g, " ").toLowerCase() },
                  { label: "Framework", value: product.framework ?? "—" },
                  { label: "Hosting", value: product.hostingProvider ?? "—" },
                  { label: "Added", value: dateTime(product.createdAt) },
                ]}
              />
            </Panel>

            <Panel title="Environments" flush>
              <MetaList
                items={[
                  {
                    label: "Production",
                    value: product.productionUrl ? (
                      <a
                        href={product.productionUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="truncate text-brand hover:underline"
                      >
                        {product.productionUrl.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      "Not deployed"
                    ),
                  },
                  {
                    label: "Staging",
                    value: product.stagingUrl ? (
                      <a
                        href={product.stagingUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="truncate text-brand hover:underline"
                      >
                        {product.stagingUrl.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      "Not deployed"
                    ),
                  },
                ]}
              />
            </Panel>

            <IngestTokenPanel
              productId={product.id}
              slug={product.slug}
              last4={product.ingestTokenLast4}
              issuedAt={product.ingestTokenIssuedAt?.toISOString() ?? null}
            />

            <QuickActions>
              <Button asChild variant="ghost">
                <Link href={`/logs?product=${product.id}`}>Inspect logs</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href={`/deployments?product=${product.id}`}>All deployments</Link>
              </Button>
            </QuickActions>
          </>
        }
      >
        {tab === "overview" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Last deploy"
                value={lastDeployment ? when(lastDeployment.finishedAt ?? lastDeployment.createdAt) : "Never"}
                sub={
                  lastDeployment
                    ? `#${lastDeployment.number}${lastDeployment.version ? ` · ${lastDeployment.version}` : ""}`
                    : product.ingestTokenHash
                      ? "Nothing reported yet"
                      : "No CI connected"
                }
                tone={lastDeployment ? "success" : "neutral"}
              />
              <StatTile
                label="Open incidents"
                value={openIncidents.length}
                sub={openIncidents.length ? "Needs attention" : "Nothing open"}
                tone={openIncidents.length ? "danger" : "success"}
              />
              <StatTile
                label="Failed builds"
                value={failedBuilds}
                sub={`of ${product.builds.length} recorded`}
                tone={failedBuilds > 0 ? "warning" : "neutral"}
              />
              <StatTile
                label="Deployments"
                value={product.deployments.length}
                sub="Most recent 25"
              />
            </div>

            <Panel
              title="Recent deployments"
              action={
                <Button asChild variant="link" size="sm">
                  <Link href={`/deployments?product=${product.id}`}>All</Link>
                </Button>
              }
              flush
            >
              {product.deployments.length === 0 ? (
                <EmptyInline>
                  No deployment has been reported for this product. Deployments arrive from
                  CI through the ingest endpoint — they are never entered by hand, so this
                  stays empty until a pipeline posts one.
                </EmptyInline>
              ) : (
                <ul className="divide-y divide-border">
                  {product.deployments.slice(0, 8).map((d) => (
                    <li key={d.id} className="flex items-center gap-3 px-3 py-2">
                      <StatusPill registry="deploymentStatus" value={d.status} variant="dot" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base">
                          #{d.number}
                          {d.version ? ` · ${d.version}` : ""}
                          {d.commitSha ? (
                            <span className="ms-2 font-mono text-meta text-subtle-foreground">
                              {d.commitSha.slice(0, 7)}
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-meta text-subtle-foreground">
                          {d.triggeredBy ?? "Unknown source"}
                          {d.failureReason ? ` · ${d.failureReason}` : ""}
                        </span>
                      </span>
                      <StatusPill registry="deployEnvironment" value={d.environment} variant="dot" />
                      <span className="shrink-0 text-meta text-subtle-foreground">
                        {when(d.finishedAt ?? d.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {lastFailedDeployment && (
              <Panel title="Most recent failure">
                <div className="space-y-2">
                  <p className="text-base">
                    Deployment #{lastFailedDeployment.number} to{" "}
                    {lastFailedDeployment.environment.toLowerCase()} failed{" "}
                    {when(lastFailedDeployment.finishedAt ?? lastFailedDeployment.createdAt)}.
                  </p>
                  {lastFailedDeployment.failureReason && (
                    <p className="font-mono text-meta text-danger">
                      {lastFailedDeployment.failureReason}
                    </p>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/logs?product=${product.id}&level=ERROR`}>
                      Error logs for this product
                    </Link>
                  </Button>
                </div>
              </Panel>
            )}
          </>
        )}

        {tab === "deployments" && (
          <Panel title="Deployment history" description="Most recent 25, newest first" flush>
            {product.deployments.length === 0 ? (
              <EmptyInline>
                Nothing has deployed this product yet.
              </EmptyInline>
            ) : (
              <ul className="divide-y divide-border">
                {product.deployments.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <StatusPill registry="deploymentStatus" value={d.status} variant="dot" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base">
                        #{d.number}
                        {d.version ? ` · ${d.version}` : ""}
                        {d.build ? (
                          <span className="ms-2 text-meta text-subtle-foreground">
                            from build #{d.build.number}
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-meta text-subtle-foreground">
                        {d.commitSha ? `${d.commitSha.slice(0, 7)} · ` : ""}
                        {d.triggeredBy ?? "Unknown source"}
                        {d.rolledBackBy
                          ? ` · rolled back by #${d.rolledBackBy.number}`
                          : ""}
                      </span>
                    </span>
                    <StatusPill registry="deployEnvironment" value={d.environment} variant="dot" />
                    <span className="shrink-0 text-meta text-subtle-foreground">
                      {when(d.finishedAt ?? d.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "builds" && (
          <Panel title="Builds" description="Most recent 25, newest first" flush>
            {recentBuilds.length === 0 ? (
              <EmptyInline>
                No build has been reported. A CI pipeline posts these to the ingest endpoint
                as it runs.
              </EmptyInline>
            ) : (
              <ul className="divide-y divide-border">
                {product.builds.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <StatusPill registry="buildStatus" value={b.status} variant="dot" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base">
                        #{b.number}
                        {b.branch ? (
                          <span className="ms-2 font-mono text-meta text-subtle-foreground">
                            {b.branch}
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-meta text-subtle-foreground">
                        {b.commitMessage ?? b.commitSha?.slice(0, 7) ?? "No commit recorded"}
                        {b.failureReason ? ` · ${b.failureReason}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-meta text-subtle-foreground">
                      {duration(b.durationMs)}
                    </span>
                    <span className="shrink-0 text-meta text-subtle-foreground">
                      {when(b.finishedAt ?? b.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "incidents" && (
          <Panel
            title="Incidents"
            action={
              <Button asChild variant="link" size="sm">
                <Link href="/incidents">All incidents</Link>
              </Button>
            }
            flush
          >
            {product.incidents.length === 0 ? (
              <EmptyInline>
                Nothing has been raised against this product.
              </EmptyInline>
            ) : (
              <ul className="divide-y divide-border">
                {product.incidents.map((incident) => (
                  <li key={incident.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <StatusPill registry="incidentSeverity" value={incident.severity} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base">{incident.title}</span>
                      <span className="block truncate text-meta text-subtle-foreground">
                        {incident.owner?.name || incident.owner?.email || "Unowned"} ·
                        detected {when(incident.detectedAt)}
                      </span>
                    </span>
                    <StatusPill registry="incidentStatus" value={incident.status} variant="dot" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </DetailLayout>
    </div>
  );
}
