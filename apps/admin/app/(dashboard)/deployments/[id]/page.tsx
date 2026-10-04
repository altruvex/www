import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Siren } from "lucide-react";

import { Button } from "@repo/ui";
import { prisma } from "@repo/database";

import { DetailLayout, MetaList } from "@/components/os/detail-layout";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { EmptyInline } from "@/components/os/empty-state";
import { EntityAudit } from "@/components/os/entity-audit";
import { EntityLink } from "@/components/os/entity-link";
import { AlertBar } from "@/components/os/error-state";
import { PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { getDeployment, listLogs } from "@/lib/engineering";
import { dateTime, when } from "@/lib/format";
import { githubRepoSlug } from "@/lib/github";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { statusOf } from "@/lib/status";
import {
  ExternalUrl,
  Neighbours,
  RecentLogs,
  clientName,
  duration,
  safeHttpUrl,
  span,
} from "../shared";

export const dynamic = "force-dynamic";

export default async function DeploymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const denied = await gateRoute("/deployments/[id]");
  if (denied) return denied;
  const role = await currentRole();
  const canDelete = can(role, "delete", "project");
  const canOpenIncident =
    can(role, "create", "incident") && roleCanOpen(role, "/incidents");

  const { id } = await params;
  const deployment = await getDeployment(id);
  if (!deployment) notFound();

  const [logs, repo] = await Promise.all([
    listLogs({ deploymentId: deployment.id, pageSize: 20 }),
    prisma.product.findUnique({
      where: { id: deployment.productId },
      select: { repositoryUrl: true },
    }),
  ]);

  const { product } = deployment;
  const repoSlug = githubRepoSlug(repo?.repositoryUrl);
  const commitHref =
    repoSlug && deployment.commitSha && /^[0-9a-f]{7,40}$/i.test(deployment.commitSha)
      ? `https://github.com/${repoSlug}/commit/${deployment.commitSha}`
      : null;
  const visit = safeHttpUrl(deployment.url);
  const openIncidents = deployment.incidents.filter((i) => i.status !== "RESOLVED");
  const elapsed = span(deployment.startedAt, deployment.finishedAt);
  const raiseIncident =
    canOpenIncident &&
    deployment.status === "FAILED" &&
    openIncidents.length === 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${product.name} · deployment #${deployment.number}`}
        crumbs={[
          { label: "Deployments", href: "/deployments" },
          { label: product.name, href: `/products/${product.id}` },
          { label: `#${deployment.number}` },
        ]}
        status={<StatusPill registry="deploymentStatus" value={deployment.status} />}
        meta={
          <span className="inline-flex items-center gap-2 text-meta text-subtle-foreground">
            <ToneBadge tone="neutral">Written by CI</ToneBadge>
            <StatusPill registry="deployEnvironment" value={deployment.environment} variant="dot" />
            {deployment.version ? <span className="font-mono">{deployment.version}</span> : null}
            <span>{when(deployment.finishedAt ?? deployment.createdAt)}</span>
          </span>
        }
        description="Reported by CI. Nothing on this page can be edited — it is the record of what the pipeline did."
        alert={
          deployment.status === "FAILED" && deployment.failureReason ? (
            <AlertBar tone="danger" href={`/logs?deployment=${deployment.id}&level=ERROR`} cta="Error logs">
              This deployment failed: {deployment.failureReason}
            </AlertBar>
          ) : openIncidents.length > 0 ? (
            <AlertBar tone="danger" href={`/incidents/${openIncidents[0]!.id}`} cta="Open incident">
              {openIncidents.length} open incident{openIncidents.length === 1 ? "" : "s"} name
              {openIncidents.length === 1 ? "s" : ""} this deployment.
            </AlertBar>
          ) : null
        }
        actions={
          <>
            {visit && (
              <Button asChild variant="outline">
                <a href={visit} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  Visit
                </a>
              </Button>
            )}
            {raiseIncident && (
              <Button asChild variant="outline">
                <Link
                  href={`/incidents?new=incident&product=${product.id}&deployment=${deployment.id}`}
                >
                  <Siren className="size-3.5" aria-hidden />
                  Open an incident
                </Link>
              </Button>
            )}
            {canDelete && (
              <DeleteRecordButton
                entity="deployment"
                id={deployment.id}
                label={`${product.name} · deployment ${deployment.number}`}
                redirectTo="/deployments"
              />
            )}
          </>
        }
      />

      <DetailLayout
        aside={
          <>
            <Panel title="Identity" flush>
              <MetaList
                items={[
                  {
                    label: "Product",
                    value: (
                      <EntityLink type="product" id={product.id}>
                        {product.name}
                      </EntityLink>
                    ),
                  },
                  {
                    label: "Client",
                    value: (
                      <EntityLink type="client" id={product.client.id}>
                        {clientName(product.client)}
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
                      <span className="text-muted-foreground">Not linked</span>
                    ),
                  },
                  {
                    label: "Environment",
                    value: <StatusPill registry="deployEnvironment" value={deployment.environment} variant="dot" />,
                  },
                  {
                    label: "Status",
                    value: <StatusPill registry="deploymentStatus" value={deployment.status} />,
                  },
                  { label: "Version", value: deployment.version ?? "—" },
                  {
                    label: "Commit",
                    value: deployment.commitSha ? (
                      commitHref ? (
                        <a
                          href={commitHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-brand hover:underline"
                        >
                          {deployment.commitSha.slice(0, 7)}
                        </a>
                      ) : (
                        <span className="font-mono">{deployment.commitSha.slice(0, 7)}</span>
                      )
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Triggered by", value: deployment.triggeredBy ?? "—" },
                  { label: "URL", value: <ExternalUrl value={deployment.url} /> },
                ]}
              />
            </Panel>

            <Panel title="Timing" flush>
              <MetaList
                items={[
                  { label: "Reported", value: dateTime(deployment.createdAt) },
                  { label: "Started", value: dateTime(deployment.startedAt) },
                  { label: "Finished", value: dateTime(deployment.finishedAt) },
                  {
                    label: "Duration",
                    value: <span className="font-mono">{duration(elapsed)}</span>,
                  },
                ]}
              />
            </Panel>

            <Panel title={`${statusOf("deployEnvironment", deployment.environment).label} history`} flush>
              <Neighbours
                previous={deployment.previous}
                next={deployment.next}
                hrefFor={(other) => `/deployments/${other}`}
                noun="Deploy"
              />
            </Panel>
          </>
        }
      >
        {deployment.failureReason && (
          <Panel title="Failure">
            <p className="break-words font-mono text-meta text-danger">{deployment.failureReason}</p>
          </Panel>
        )}

        {(deployment.rolledBackBy || deployment.rollbackOf.length > 0) && (
          <Panel title="Rollback" flush>
            <MetaList
              items={[
                ...(deployment.rolledBackBy
                  ? [
                      {
                        label: "Rolled back by",
                        value: (
                          <EntityLink type="deployment" id={deployment.rolledBackBy.id}>
                            Deployment #{deployment.rolledBackBy.number}
                          </EntityLink>
                        ),
                      },
                    ]
                  : []),
                ...(deployment.rollbackOf.length > 0
                  ? [
                      {
                        label: "Rolled back",
                        value: (
                          <span className="inline-flex flex-wrap justify-end gap-x-2">
                            {deployment.rollbackOf.map((d) => (
                              <EntityLink key={d.id} type="deployment" id={d.id}>
                                #{d.number}
                              </EntityLink>
                            ))}
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Panel>
        )}

        <Panel
          title="Build"
          action={
            deployment.build ? (
              <PanelLink href={`/deployments/builds/${deployment.build.id}`}>Open build</PanelLink>
            ) : undefined
          }
          flush
        >
          {deployment.build ? (
            <Link
              href={`/deployments/builds/${deployment.build.id}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 transition-colors duration-[var(--dur-state)] hover:bg-surface/70"
            >
              <StatusPill registry="buildStatus" value={deployment.build.status} variant="dot" />
              <span className="min-w-0 flex-1 basis-48">
                <span className="block truncate text-base">
                  Build #{deployment.build.number}
                  {deployment.build.branch ? (
                    <span className="ms-2 font-mono text-meta text-subtle-foreground">
                      {deployment.build.branch}
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-meta text-subtle-foreground">
                  {deployment.build.commitMessage ??
                    deployment.build.commitSha?.slice(0, 7) ??
                    "No commit recorded"}
                </span>
              </span>
              <span className="shrink-0 font-mono text-meta text-subtle-foreground">
                {duration(deployment.build.durationMs)}
              </span>
            </Link>
          ) : (
            <EmptyInline>
              CI did not name a build for this deployment, so there is nothing to link to. A
              pipeline that sends the build id with the deployment makes this traceable.
            </EmptyInline>
          )}
        </Panel>

        <RecentLogs
          page={logs}
          total={deployment._count.logs}
          allHref={`/logs?deployment=${deployment.id}`}
          scope="deployment"
        />

        <Panel title="Incidents" flush>
          {deployment.incidents.length === 0 ? (
            <EmptyInline>
              No incident names this deployment. When one is raised against it, it is listed here.
            </EmptyInline>
          ) : (
            <ul className="divide-y divide-border">
              {deployment.incidents.map((incident) => (
                <li key={incident.id}>
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 transition-colors duration-[var(--dur-state)] hover:bg-surface/70"
                  >
                    <StatusPill registry="incidentSeverity" value={incident.severity} />
                    <span className="min-w-0 flex-1 basis-48 truncate text-base">
                      <span className="me-1.5 font-mono text-meta text-subtle-foreground">
                        #{incident.number}
                      </span>
                      {incident.title}
                    </span>
                    <StatusPill registry="incidentStatus" value={incident.status} variant="dot" />
                    <span className="shrink-0 text-meta text-subtle-foreground">
                      {when(incident.detectedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <EntityAudit type="deployment" id={deployment.id} />
      </DetailLayout>
    </div>
  );
}
