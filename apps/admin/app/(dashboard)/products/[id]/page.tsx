import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ExternalLink, GitBranch } from "lucide-react";

import { prisma } from "@repo/database";
import { Button } from "@repo/ui";

import { EmptyInline } from "@/components/os/empty-state";
import {
  DetailLayout,
  MetaList,
  QuickActions,
} from "@/components/os/detail-layout";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { EntityAudit } from "@/components/os/entity-audit";
import { EntityLink } from "@/components/os/entity-link";
import { PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { TabNav } from "@/components/os/tab-nav";
import { StatusPill } from "@/components/ui/badge";
import { AlertBar } from "@/components/os/error-state";
import { env } from "@/lib/env";
import { dateTime, when } from "@/lib/format";
import {
  getProduct,
  lastProductionDeployment,
  listLogs,
} from "@/lib/engineering";
import { githubRepoSlug } from "@/lib/github";
import { publicBaseUrlFromHeaders } from "@/lib/public-url";
import {
  KIND_LABEL,
  expiryPhrase,
  serviceState,
} from "@/lib/service-lifecycle";
import { statusOf } from "@/lib/status";
import { ExternalUrl, duration, safeHttpUrl } from "../../deployments/shared";
import { EditProductSheet } from "./edit-product-sheet";
import { GithubPanel } from "./github-panel";
import { IngestTokenPanel } from "./ingest-token-panel";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "deployments", label: "Deployments" },
  { id: "builds", label: "Builds" },
  { id: "incidents", label: "Incidents" },
] as const;

/** A list row that is a link to the record it describes. */
const ROW_LINK =
  "flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 transition-colors duration-[var(--dur-state)] hover:bg-surface/70";

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

  const [lastProduction, errorLogs, clientProjects, requestHeaders] =
    await Promise.all([
      // "Last deploy" on a product means what the client's visitors are running;
      // a preview deploy of a branch is not that.
      lastProductionDeployment(product.id),
      tab === "overview"
        ? listLogs({ productId: product.id, level: "ERROR" })
        : null,
      // The edit sheet offers only this client's projects; the API rejects others.
      prisma.project.findMany({
        where: { clientId: product.client.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true },
      }),
      headers(),
    ]);

  const now = new Date();
  const openIncidents = product.incidents.filter(
    (i) => i.status !== "RESOLVED",
  );
  const lastFailedDeployment =
    product.deployments.find((d) => d.status === "FAILED") ?? null;
  const recentBuilds = product.builds.slice(0, 10);
  const failedBuilds = product.builds.filter(
    (b) => b.status === "FAILED",
  ).length;
  const clientName =
    product.client.company || product.client.name || "Unnamed client";
  const repositoryHref = safeHttpUrl(product.repositoryUrl);
  const productionHref = safeHttpUrl(product.productionUrl);

  // The address GitHub is told to post to comes from BETTER_AUTH_URL, never the
  // request host: a spoofed Host header must not be able to change where a
  // repository's webhook is pointed.
  const webhookUrl = `${publicBaseUrlFromHeaders(requestHeaders)}/api/ingest/github`;
  const repoSlug = githubRepoSlug(product.repositoryUrl);
  const lastGithubEvent =
    [
      ...product.builds.filter((b) => b.externalId?.startsWith("gh-run-")),
      ...product.deployments.filter((d) =>
        d.externalId?.startsWith("gh-deployment-"),
      ),
    ]
      .map((row) => row.createdAt)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

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
          <span className="font-mono text-meta text-subtle-foreground">
            {product.slug}
          </span>
        }
        description={
          <>
            Operated for{" "}
            <Link
              href={`/clients/${product.client.id}`}
              className="text-brand hover:underline"
            >
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
            <AlertBar
              tone="danger"
              href={`/incidents?product=${product.id}`}
              cta="Open incidents"
            >
              {openIncidents.length} open incident
              {openIncidents.length === 1 ? "" : "s"} on this product — the most
              severe is {openIncidents[0]?.severity}.
            </AlertBar>
          ) : !product.ingestTokenHash && product.status === "LIVE" ? (
            <AlertBar
              tone="warning"
              href="#ingest-token"
              cta="Issue an ingest token"
            >
              This product is live but no CI pipeline reports to it, so its
              deployment history and logs will stay empty. Issue an ingest token
              to connect one.
            </AlertBar>
          ) : null
        }
        actions={
          <>
            {repositoryHref && (
              <Button asChild variant="ghost">
                <a
                  href={repositoryHref}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <GitBranch className="size-3.5" />
                  Repository
                </a>
              </Button>
            )}
            {productionHref && (
              <Button asChild variant="outline">
                <a
                  href={productionHref}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <ExternalLink className="size-3.5" />
                  Visit
                </a>
              </Button>
            )}
            <EditProductSheet
              product={{
                id: product.id,
                name: product.name,
                kind: product.kind,
                status: product.status,
                projectId: product.project?.id ?? null,
                productionUrl: product.productionUrl,
                stagingUrl: product.stagingUrl,
                repositoryUrl: product.repositoryUrl,
                framework: product.framework,
                hostingProvider: product.hostingProvider,
              }}
              projects={clientProjects}
            />
            <DeleteRecordButton
              entity="product"
              id={product.id}
              label={product.name}
              redirectTo="/products"
            />
          </>
        }
        tabs={
          <TabNav
            tabs={[...TABS]}
            active={tab}
            basePath={`/products/${product.id}`}
          />
        }
      />

      <DetailLayout
        aside={
          <>
            <Panel title="Identity" flush>
              <MetaList
                items={[
                  {
                    label: "Client",
                    value: (
                      <EntityLink type="client" id={product.client.id}>
                        {clientName}
                      </EntityLink>
                    ),
                  },
                  {
                    label: "Project",
                    value: product.project ? (
                      <EntityLink type="project" id={product.project.id}>
                        {product.project.name}
                      </EntityLink>
                    ) : (
                      "Not linked"
                    ),
                    hint: "A product can outlive the project that built it",
                  },
                  {
                    label: "Type",
                    value: statusOf("productKind", product.kind).label,
                  },
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
                      <ExternalUrl value={product.productionUrl} />
                    ) : (
                      "Not deployed"
                    ),
                  },
                  {
                    label: "Staging",
                    value: product.stagingUrl ? (
                      <ExternalUrl value={product.stagingUrl} />
                    ) : (
                      "Not deployed"
                    ),
                  },
                ]}
              />
            </Panel>

            <div id="github" className="scroll-mt-20">
              <GithubPanel
                productId={product.id}
                repositoryUrl={product.repositoryUrl}
                repoSlug={repoSlug}
                webhookUrl={webhookUrl}
                secretConfigured={Boolean(env?.GITHUB_WEBHOOK_SECRET)}
                lastEventAt={lastGithubEvent ? dateTime(lastGithubEvent) : null}
              />
            </div>

            <div id="ingest-token" className="scroll-mt-20">
              <IngestTokenPanel
                productId={product.id}
                slug={product.slug}
                last4={product.ingestTokenLast4}
                issuedAt={product.ingestTokenIssuedAt?.toISOString() ?? null}
              />
            </div>

            <QuickActions>
              <Button asChild variant="ghost">
                <Link href={`/logs?product=${product.id}`}>Inspect logs</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href={`/deployments?product=${product.id}`}>
                  All deployments
                </Link>
              </Button>
            </QuickActions>
          </>
        }
      >
        {tab === "overview" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Last production deploy"
                value={
                  lastProduction
                    ? when(
                        lastProduction.finishedAt ?? lastProduction.createdAt,
                      )
                    : "Never"
                }
                sub={
                  lastProduction
                    ? `#${lastProduction.number}${lastProduction.version ? ` · ${lastProduction.version}` : ""}`
                    : product.ingestTokenHash
                      ? "No successful production deploy reported"
                      : "No CI connected"
                }
                tone={lastProduction ? "success" : "neutral"}
                href={
                  lastProduction
                    ? `/deployments/${lastProduction.id}`
                    : undefined
                }
              />
              <StatTile
                label="Open incidents"
                value={openIncidents.length}
                sub={openIncidents.length ? "Needs attention" : "Nothing open"}
                tone={openIncidents.length ? "danger" : "success"}
                href={
                  openIncidents.length
                    ? `/incidents?product=${product.id}`
                    : undefined
                }
              />
              <StatTile
                label="Failed builds"
                value={failedBuilds}
                sub={`Of the last ${product.builds.length} builds`}
                tone={failedBuilds > 0 ? "warning" : "neutral"}
                href={
                  failedBuilds > 0
                    ? `/deployments?tab=builds&product=${product.id}&status=FAILED`
                    : undefined
                }
              />
              <StatTile
                label="Failed deploys"
                value={
                  product.deployments.filter((d) => d.status === "FAILED")
                    .length
                }
                sub={`Of the last ${product.deployments.length} deploys`}
                tone={
                  product.deployments.some((d) => d.status === "FAILED")
                    ? "warning"
                    : "neutral"
                }
                href={`/deployments?product=${product.id}`}
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
                  No deployment has been reported for this product. Deployments
                  arrive from CI through the ingest endpoint — they are never
                  entered by hand, so this stays empty until a pipeline posts
                  one.
                </EmptyInline>
              ) : (
                <ul className="divide-y divide-border">
                  {product.deployments.slice(0, 8).map((d) => (
                    <li key={d.id}>
                      <Link href={`/deployments/${d.id}`} className={ROW_LINK}>
                        <StatusPill
                          registry="deploymentStatus"
                          value={d.status}
                          variant="dot"
                        />
                        <span className="min-w-0 flex-1 basis-48">
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
                        <StatusPill
                          registry="deployEnvironment"
                          value={d.environment}
                          variant="dot"
                        />
                        <span className="shrink-0 text-meta text-subtle-foreground">
                          {when(d.finishedAt ?? d.createdAt)}
                        </span>
                      </Link>
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
                    {when(
                      lastFailedDeployment.finishedAt ??
                        lastFailedDeployment.createdAt,
                    )}
                    .
                  </p>
                  {lastFailedDeployment.failureReason && (
                    <p className="font-mono text-meta text-danger">
                      {lastFailedDeployment.failureReason}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/deployments/${lastFailedDeployment.id}`}>
                        Open deployment
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/logs?product=${product.id}&level=ERROR`}>
                        Error logs for this product
                      </Link>
                    </Button>
                  </div>
                </div>
              </Panel>
            )}

            <Panel
              title="Services"
              description="Domains, hosting and renewals tied to this product"
              action={<PanelLink href="/services">All services</PanelLink>}
              flush
            >
              {product.services.length === 0 ? (
                <EmptyInline
                  action={<PanelLink href="/services">Open services</PanelLink>}
                >
                  No domain, hosting or other renewal is linked to this product.
                  Link one from the services register so its expiry shows up
                  here.
                </EmptyInline>
              ) : (
                <ul className="divide-y divide-border">
                  {product.services.map((service) => {
                    const state = serviceState(service, now);
                    return (
                      <li
                        key={service.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
                      >
                        <StatusPill
                          registry="clientServiceState"
                          value={state}
                          variant="dot"
                        />
                        <span className="min-w-0 flex-1 basis-48">
                          <EntityLink
                            type="client_service"
                            id={service.id}
                            className="block truncate text-base"
                          >
                            {service.name}
                          </EntityLink>
                          <span className="block truncate text-meta text-subtle-foreground">
                            {KIND_LABEL[service.kind]}
                            {service.provider ? ` · ${service.provider}` : ""}
                            {service.autoRenew ? " · auto-renews" : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-meta text-subtle-foreground">
                          {service.expiresAt && state !== "cancelled"
                            ? expiryPhrase(service.expiresAt, now)
                            : statusOf("clientServiceState", state).label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel
              title="Recent errors"
              description={
                errorLogs && errorLogs.entries.length > 0
                  ? `${Math.min(errorLogs.entries.length, 10)} most recent error lines`
                  : undefined
              }
              action={
                <PanelLink href={`/logs?product=${product.id}&level=ERROR`}>
                  All logs
                </PanelLink>
              }
              flush
            >
              {!errorLogs || errorLogs.entries.length === 0 ? (
                <EmptyInline
                  action={
                    <PanelLink href={`/logs?product=${product.id}`}>
                      Open logs
                    </PanelLink>
                  }
                >
                  {product.ingestTokenHash
                    ? "No error has been logged for this product."
                    : "No logs arrive for this product until its pipeline or app posts to the ingest endpoint with a token."}
                </EmptyInline>
              ) : (
                <ul className="divide-y divide-border">
                  {errorLogs.entries.slice(0, 10).map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2"
                    >
                      <StatusPill
                        registry="logLevel"
                        value={entry.level}
                        variant="dot"
                        className="pt-0.5"
                      />
                      <span className="min-w-0 flex-1 basis-60">
                        <span className="block break-words font-mono text-meta">
                          {entry.message}
                        </span>
                        <span className="block truncate text-meta text-subtle-foreground">
                          {entry.source ?? "unknown source"}
                          {entry.deployment ? (
                            <>
                              {" · "}
                              <EntityLink
                                type="deployment"
                                id={entry.deployment.id}
                                muted
                              >
                                Deploy #{entry.deployment.number}
                              </EntityLink>
                            </>
                          ) : null}
                          {entry.incident ? (
                            <>
                              {" · "}
                              <EntityLink
                                type="incident"
                                id={entry.incident.id}
                                muted
                              >
                                Incident #{entry.incident.number}
                              </EntityLink>
                            </>
                          ) : null}
                        </span>
                      </span>
                      <time
                        className="shrink-0 font-mono text-micro tabular-nums text-subtle-foreground"
                        dateTime={entry.timestamp.toISOString()}
                        title={dateTime(entry.timestamp)}
                      >
                        {when(entry.timestamp)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <EntityAudit type="product" id={product.id} />
          </>
        )}

        {tab === "deployments" && (
          <Panel
            title="Deployment history"
            description="Most recent 25, newest first"
            action={
              <PanelLink href={`/deployments?product=${product.id}`}>
                All deployments
              </PanelLink>
            }
            flush
          >
            {product.deployments.length === 0 ? (
              <EmptyInline
                action={
                  product.ingestTokenHash ? undefined : (
                    <PanelLink href="#ingest-token">
                      Issue an ingest token
                    </PanelLink>
                  )
                }
              >
                Nothing has deployed this product yet. Deployments are reported
                by CI, never entered by hand.
              </EmptyInline>
            ) : (
              <ul className="divide-y divide-border">
                {product.deployments.map((d) => (
                  <li key={d.id}>
                    <Link href={`/deployments/${d.id}`} className={ROW_LINK}>
                      <StatusPill
                        registry="deploymentStatus"
                        value={d.status}
                        variant="dot"
                      />
                      <span className="min-w-0 flex-1 basis-48">
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
                      <StatusPill
                        registry="deployEnvironment"
                        value={d.environment}
                        variant="dot"
                      />
                      <span className="shrink-0 text-meta text-subtle-foreground">
                        {when(d.finishedAt ?? d.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "builds" && (
          <Panel
            title="Builds"
            description="Most recent 25, newest first"
            action={
              <PanelLink href={`/deployments?tab=builds&product=${product.id}`}>
                All builds
              </PanelLink>
            }
            flush
          >
            {recentBuilds.length === 0 ? (
              <EmptyInline>
                No build has been reported. A CI pipeline posts these to the
                ingest endpoint as it runs.
              </EmptyInline>
            ) : (
              <ul className="divide-y divide-border">
                {product.builds.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/deployments/builds/${b.id}`}
                      className={ROW_LINK}
                    >
                      <StatusPill
                        registry="buildStatus"
                        value={b.status}
                        variant="dot"
                      />
                      <span className="min-w-0 flex-1 basis-48">
                        <span className="block truncate text-base">
                          #{b.number}
                          {b.branch ? (
                            <span className="ms-2 font-mono text-meta text-subtle-foreground">
                              {b.branch}
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-meta text-subtle-foreground">
                          {b.commitMessage ??
                            b.commitSha?.slice(0, 7) ??
                            "No commit recorded"}
                          {b.failureReason ? ` · ${b.failureReason}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-meta text-subtle-foreground">
                        {duration(b.durationMs)}
                      </span>
                      <span className="shrink-0 text-meta text-subtle-foreground">
                        {when(b.finishedAt ?? b.createdAt)}
                      </span>
                    </Link>
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
                <Link href={`/incidents?product=${product.id}`}>
                  All incidents
                </Link>
              </Button>
            }
            flush
          >
            {product.incidents.length === 0 ? (
              <EmptyInline
                action={
                  <PanelLink href={`/incidents?product=${product.id}`}>
                    Open incidents
                  </PanelLink>
                }
              >
                Nothing has been raised against this product.
              </EmptyInline>
            ) : (
              <ul className="divide-y divide-border">
                {product.incidents.map((incident) => (
                  <li key={incident.id}>
                    <Link
                      href={`/incidents/${incident.id}`}
                      className={ROW_LINK}
                    >
                      <StatusPill
                        registry="incidentSeverity"
                        value={incident.severity}
                      />
                      <span className="min-w-0 flex-1 basis-48">
                        <span className="block truncate text-base">
                          {incident.title}
                        </span>
                        <span className="block truncate text-meta text-subtle-foreground">
                          {incident.owner?.name ||
                            incident.owner?.email ||
                            "Unowned"}{" "}
                          · detected {when(incident.detectedAt)}
                        </span>
                      </span>
                      <StatusPill
                        registry="incidentStatus"
                        value={incident.status}
                        variant="dot"
                      />
                    </Link>
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
