import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  ExternalLink,
  FolderKanban,
  GitBranch,
  Hammer,
  History,
  LayoutDashboard,
  Plug,
  Rocket,
  ScrollText,
  Server,
  Siren,
} from "lucide-react";

import { prisma } from "@repo/database";
import { Button } from "@repo/ui";

import { EmptyInline } from "@/components/os/empty-state";
import { MetaList, QuickActions } from "@/components/os/detail-layout";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { DuplicateButton } from "@/components/os/duplicate-button";
import { duplicateProduct } from "@/app/(dashboard)/_actions/duplicate";
import { EntityAudit } from "@/components/os/entity-audit";
import { EntityLink } from "@/components/os/entity-link";
import { List, ListRow } from "@/components/os/list-row";
import { PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import { Dossier, DossierSection } from "@/components/os/section-index";
import { StatTile } from "@/components/os/stat-tile";
import { StatusPill } from "@/components/ui/badge";
import { AlertBar } from "@/components/os/error-state";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { entityHref } from "@/lib/entity-links";
import { env } from "@/lib/env";
import { dateTime, when } from "@/lib/format";
import {
  getProduct,
  lastProductionDeployment,
  listLogs,
} from "@/lib/engineering";
import { githubRepoSlug } from "@/lib/github";
import { gateRoute } from "@/lib/page-gate";
import { publicBaseUrlFromHeaders } from "@/lib/public-url";
import { can } from "@/lib/rbac";
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

function meta(...parts: (string | null | undefined | false)[]) {
  return parts.filter(Boolean).join(" · ");
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const denied = await gateRoute("/products/[id]");
  if (denied) return denied;

  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const role = await currentRole();
  const canEdit = can(role, "edit", "project");
  const canDelete = can(role, "delete", "project");
  const canCreate = can(role, "create", "project");
  const canOpenIncident =
    can(role, "create", "incident") && roleCanOpen(role, "/incidents");
  const canOpenProject =
    product.project != null &&
    can(role, "view", "project") &&
    roleCanOpen(role, "/projects");

  const [lastProduction, errorLogs, clientProjects, requestHeaders] =
    await Promise.all([
      lastProductionDeployment(product.id),
      listLogs({ productId: product.id, minLevel: "ERROR", pageSize: 10 }),
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
  const failedBuilds = product.builds.filter(
    (b) => b.status === "FAILED",
  ).length;
  const failedDeploys = product.deployments.filter(
    (d) => d.status === "FAILED",
  ).length;
  const clientName =
    product.client.company || product.client.name || "Unnamed client";
  const repositoryHref = safeHttpUrl(product.repositoryUrl);
  const productionHref = safeHttpUrl(product.productionUrl);
  const reporting =
    product.ingestTokenHash != null ||
    product.deployments.length + product.builds.length > 0;

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

  const errorsHref = `/logs?product=${product.id}&level=ERROR`;
  const notConnected = (
    <PanelLink href="#connect">Connect a pipeline</PanelLink>
  );

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
          ) : !reporting && product.status === "LIVE" ? (
            <AlertBar tone="warning" href="#connect" cta="Connect a pipeline">
              This product is live but nothing reports to it, so its deployment
              history and logs stay empty. Connect GitHub or issue an ingest
              token.
            </AlertBar>
          ) : null
        }
        actions={
          <>
            {canOpenProject && product.project && (
              <Button asChild variant="ghost" className="max-sm:hidden">
                <Link href={`/projects/${product.project.id}`}>
                  <FolderKanban className="size-3.5" aria-hidden />
                  Open the project
                </Link>
              </Button>
            )}
            {repositoryHref && (
              <Button asChild variant="ghost" className="max-sm:hidden">
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
            {canOpenIncident && (
              <Button asChild variant="outline">
                <Link href={`/incidents?new=incident&product=${product.id}`}>
                  <Siren className="size-3.5" aria-hidden />
                  Open incident
                </Link>
              </Button>
            )}
            {canEdit && (
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
            )}
            {canCreate && (
              <DuplicateButton
                action={duplicateProduct.bind(null, product.id)}
                title={`Duplicate ${product.name}?`}
                copies="Creates a new planned product for the same client and project, with the same type, framework and hosting."
                skips="Not copied: the repository, the production and staging URLs, the ingest token, and every build, deployment, log and incident."
              />
            )}
            {canDelete && (
              <DeleteRecordButton
                entity="product"
                id={product.id}
                label={product.name}
                redirectTo="/products"
              />
            )}
          </>
        }
      />

      <Dossier
        label="Product sections"
        sections={[
          { id: "overview", label: "Overview", icon: <LayoutDashboard /> },
          {
            id: "deployments",
            label: "Deployments",
            icon: <Rocket />,
            count: product.deployments.length,
          },
          {
            id: "builds",
            label: "Builds",
            icon: <Hammer />,
            count: product.builds.length,
          },
          {
            id: "incidents",
            label: "Incidents",
            icon: <Siren />,
            count: openIncidents.length,
          },
          {
            id: "errors",
            label: "Errors",
            icon: <ScrollText />,
            count: errorLogs.total,
          },
          {
            id: "services",
            label: "Services",
            icon: <Server />,
            count: product.services.length,
          },
          { id: "connect", label: "Pipeline", icon: <Plug /> },
          { id: "history", label: "History", icon: <History /> },
        ]}
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
        <DossierSection id="overview" title="Overview">
          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
            <StatTile
              label="Last production deploy"
              value={
                lastProduction
                  ? when(lastProduction.finishedAt ?? lastProduction.createdAt)
                  : "Never"
              }
              sub={
                lastProduction
                  ? `#${lastProduction.number}${lastProduction.version ? ` · ${lastProduction.version}` : ""}`
                  : reporting
                    ? "No successful production deploy reported"
                    : "No pipeline connected"
              }
              tone={lastProduction ? "success" : "neutral"}
              href={
                lastProduction ? `/deployments/${lastProduction.id}` : undefined
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
              value={failedDeploys}
              sub={`Of the last ${product.deployments.length} deploys`}
              tone={failedDeploys > 0 ? "warning" : "neutral"}
              href={
                failedDeploys > 0
                  ? `/deployments?product=${product.id}&status=FAILED`
                  : `/deployments?product=${product.id}`
              }
            />
          </div>

          {lastFailedDeployment && (
            <div className="mt-4 space-y-2 rounded-md border border-danger/30 bg-danger/5 p-3">
              <p className="text-base">
                Most recent failure: deployment #{lastFailedDeployment.number}{" "}
                to{" "}
                {statusOf(
                  "deployEnvironment",
                  lastFailedDeployment.environment,
                ).label.toLowerCase()}{" "}
                failed{" "}
                {when(
                  lastFailedDeployment.finishedAt ??
                    lastFailedDeployment.createdAt,
                )}
                .
              </p>
              {lastFailedDeployment.failureReason && (
                <p className="break-words font-mono text-meta text-danger">
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
                  <Link href={errorsHref}>Error logs for this product</Link>
                </Button>
              </div>
            </div>
          )}
        </DossierSection>

        <DossierSection
          id="deployments"
          title="Deployments"
          description="Written by CI — the most recent 25, newest first"
          action={
            <PanelLink href={`/deployments?product=${product.id}`}>
              All deployments
            </PanelLink>
          }
        >
          {product.deployments.length === 0 ? (
            <EmptyInline action={reporting ? undefined : notConnected}>
              Nothing has deployed this product yet. Deployments are reported by
              its pipeline, never entered by hand.
            </EmptyInline>
          ) : (
            <List label="Deployments">
              {product.deployments.map((d) => {
                const status = statusOf("deploymentStatus", d.status);
                return (
                  <ListRow
                    key={d.id}
                    href={`/deployments/${d.id}`}
                    icon={<Rocket />}
                    tone={status.tone}
                    title={`#${d.number}${d.version ? ` · ${d.version}` : ""}`}
                    meta={meta(
                      statusOf("deployEnvironment", d.environment).label,
                      d.commitSha?.slice(0, 7),
                      d.build ? `from build #${d.build.number}` : null,
                      d.triggeredBy ?? "Unknown source",
                      d.rolledBackBy
                        ? `rolled back by #${d.rolledBackBy.number}`
                        : null,
                    )}
                    trailing={
                      <>
                        <span className="max-sm:hidden">{status.label}</span>
                        <span>{when(d.finishedAt ?? d.createdAt)}</span>
                      </>
                    }
                  />
                );
              })}
            </List>
          )}
        </DossierSection>

        <DossierSection
          id="builds"
          title="Builds"
          description="Written by CI — the most recent 25, newest first"
          action={
            <PanelLink href={`/deployments?tab=builds&product=${product.id}`}>
              All builds
            </PanelLink>
          }
        >
          {product.builds.length === 0 ? (
            <EmptyInline action={reporting ? undefined : notConnected}>
              No build has been reported. A pipeline posts these as it runs.
            </EmptyInline>
          ) : (
            <List label="Builds">
              {product.builds.map((b) => {
                const status = statusOf("buildStatus", b.status);
                return (
                  <ListRow
                    key={b.id}
                    href={`/deployments/builds/${b.id}`}
                    icon={<Hammer />}
                    tone={status.tone}
                    title={`#${b.number}${b.branch ? ` · ${b.branch}` : ""}`}
                    meta={meta(
                      b.commitMessage ??
                        b.commitSha?.slice(0, 7) ??
                        "No commit recorded",
                      b.failureReason,
                    )}
                    trailing={
                      <>
                        <span className="font-mono max-sm:hidden">
                          {duration(b.durationMs)}
                        </span>
                        <span>{when(b.finishedAt ?? b.createdAt)}</span>
                      </>
                    }
                  />
                );
              })}
            </List>
          )}
        </DossierSection>

        <DossierSection
          id="incidents"
          title="Incidents"
          description="The most recent 25, open or resolved"
          action={
            <PanelLink href={`/incidents?product=${product.id}&status=all`}>
              All incidents
            </PanelLink>
          }
        >
          {product.incidents.length === 0 ? (
            <EmptyInline>
              Nothing has been raised against this product.
            </EmptyInline>
          ) : (
            <List label="Incidents">
              {product.incidents.map((incident) => (
                <ListRow
                  key={incident.id}
                  href={`/incidents/${incident.id}`}
                  icon={<Siren />}
                  tone={
                    incident.status === "RESOLVED"
                      ? "neutral"
                      : statusOf("incidentSeverity", incident.severity).tone
                  }
                  title={incident.title}
                  meta={meta(
                    `#${incident.number}`,
                    statusOf("incidentSeverity", incident.severity).label,
                    incident.owner?.name || incident.owner?.email || "Unowned",
                    `detected ${when(incident.detectedAt)}`,
                  )}
                  trailing={
                    <StatusPill
                      registry="incidentStatus"
                      value={incident.status}
                      variant="dot"
                    />
                  }
                />
              ))}
            </List>
          )}
        </DossierSection>

        <DossierSection
          id="errors"
          title="Recent errors"
          description={
            errorLogs.total > 0
              ? `${errorLogs.entries.length} most recent of ${errorLogs.total} error and fatal lines`
              : "Error and fatal lines"
          }
          action={<PanelLink href={errorsHref}>All error logs</PanelLink>}
        >
          {errorLogs.entries.length === 0 ? (
            <EmptyInline
              action={
                reporting ? (
                  <PanelLink href={`/logs?product=${product.id}`}>
                    Open logs
                  </PanelLink>
                ) : (
                  notConnected
                )
              }
            >
              {reporting
                ? "No error has been logged for this product."
                : "No logs arrive for this product until its pipeline or app posts to the ingest endpoint with a token."}
            </EmptyInline>
          ) : (
            <List label="Recent errors">
              {errorLogs.entries.map((entry) => (
                <ListRow
                  key={entry.id}
                  href={`${errorsHref}&inspect=${entry.id}`}
                  icon={<ScrollText />}
                  tone={statusOf("logLevel", entry.level).tone}
                  title={
                    <span className="font-mono text-meta">{entry.message}</span>
                  }
                  meta={meta(
                    entry.level,
                    entry.source ?? "unknown source",
                    entry.deployment
                      ? `deploy #${entry.deployment.number}`
                      : null,
                    entry.incident
                      ? `incident #${entry.incident.number}`
                      : null,
                  )}
                  trailing={
                    <time
                      dateTime={entry.timestamp.toISOString()}
                      title={dateTime(entry.timestamp)}
                    >
                      {when(entry.timestamp)}
                    </time>
                  }
                />
              ))}
            </List>
          )}
        </DossierSection>

        <DossierSection
          id="services"
          title="Services"
          description="Domains, hosting and renewals tied to this product"
          action={<PanelLink href="/services">All services</PanelLink>}
        >
          {product.services.length === 0 ? (
            <EmptyInline
              action={<PanelLink href="/services">Open services</PanelLink>}
            >
              No domain, hosting or other renewal is linked to this product.
              Link one from the services register so its expiry shows up here.
            </EmptyInline>
          ) : (
            <List label="Services">
              {product.services.map((service) => {
                const state = serviceState(service, now);
                const stateInfo = statusOf("clientServiceState", state);
                return (
                  <ListRow
                    key={service.id}
                    href={entityHref("client_service", service.id) ?? undefined}
                    icon={<Server />}
                    tone={stateInfo.tone}
                    title={service.name}
                    meta={meta(
                      KIND_LABEL[service.kind],
                      service.provider,
                      service.autoRenew ? "auto-renews" : null,
                    )}
                    trailing={
                      service.expiresAt && state !== "cancelled"
                        ? expiryPhrase(service.expiresAt, now)
                        : stateInfo.label
                    }
                  />
                );
              })}
            </List>
          )}
        </DossierSection>

        <DossierSection
          id="connect"
          title="Pipeline"
          description="How builds, deployments and logs reach this product. They are only ever written by CI — never from this screen."
        >
          <div className="grid gap-4 2xl:grid-cols-2">
            <div id="github" className="scroll-mt-20">
              <GithubPanel
                productId={product.id}
                repositoryUrl={product.repositoryUrl}
                repoSlug={repoSlug}
                webhookUrl={webhookUrl}
                secretConfigured={Boolean(env?.GITHUB_WEBHOOK_SECRET)}
                lastEventAt={lastGithubEvent ? dateTime(lastGithubEvent) : null}
                canEdit={canEdit}
              />
            </div>
            <div id="ingest-token" className="scroll-mt-20">
              <IngestTokenPanel
                productId={product.id}
                slug={product.slug}
                last4={product.ingestTokenLast4}
                issuedAt={product.ingestTokenIssuedAt?.toISOString() ?? null}
                canEdit={canEdit}
              />
            </div>
          </div>
        </DossierSection>

        <DossierSection id="history" title="History">
          <EntityAudit type="product" id={product.id} />
        </DossierSection>
      </Dossier>
    </div>
  );
}
