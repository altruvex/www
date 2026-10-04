import Link from "next/link";
import { notFound } from "next/navigation";
import { Siren } from "lucide-react";

import { prisma } from "@repo/database";
import { Button } from "@repo/ui";

import { DetailLayout, MetaList } from "@/components/os/detail-layout";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { EmptyInline } from "@/components/os/empty-state";
import { EntityAudit } from "@/components/os/entity-audit";
import { EntityLink } from "@/components/os/entity-link";
import { AlertBar } from "@/components/os/error-state";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { getBuild, listLogs } from "@/lib/engineering";
import { dateTime, when } from "@/lib/format";
import { githubRepoSlug } from "@/lib/github";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { ExternalUrl, Neighbours, RecentLogs, clientName, duration, span } from "../../shared";

export const dynamic = "force-dynamic";

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await gateRoute("/deployments/builds/[id]");
  if (denied) return denied;
  const role = await currentRole();
  const canDelete = can(role, "delete", "project");
  const canOpenIncident =
    can(role, "create", "incident") && roleCanOpen(role, "/incidents");

  const { id } = await params;
  const build = await getBuild(id);
  if (!build) notFound();

  const [logs, repo] = await Promise.all([
    listLogs({ buildId: build.id, pageSize: 20 }),
    prisma.product.findUnique({
      where: { id: build.productId },
      select: { repositoryUrl: true },
    }),
  ]);

  const { product } = build;
  const repoSlug = githubRepoSlug(repo?.repositoryUrl);
  const commitHref =
    repoSlug && build.commitSha && /^[0-9a-f]{7,40}$/i.test(build.commitSha)
      ? `https://github.com/${repoSlug}/commit/${build.commitSha}`
      : null;
  const elapsed = build.durationMs ?? span(build.startedAt, build.finishedAt);
  const incidentHref =
    canOpenIncident && build.status === "FAILED"
      ? `/incidents?new=incident&product=${product.id}${
          build.deployments[0] ? `&deployment=${build.deployments[0].id}` : ""
        }`
      : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${product.name} · build #${build.number}`}
        crumbs={[
          { label: "Deployments", href: "/deployments?tab=builds" },
          { label: product.name, href: `/products/${product.id}#builds` },
          { label: `Build #${build.number}` },
        ]}
        status={<StatusPill registry="buildStatus" value={build.status} />}
        meta={
          <span className="inline-flex flex-wrap items-center gap-2 text-meta text-subtle-foreground">
            <ToneBadge tone="neutral">Written by CI</ToneBadge>
            <StatusPill registry="deployEnvironment" value={build.environment} variant="dot" />
            {build.branch ? <span className="font-mono">{build.branch}</span> : null}
            <span>{when(build.finishedAt ?? build.createdAt)}</span>
          </span>
        }
        description="Reported by CI. Nothing on this page can be edited — it is the record of what the pipeline did."
        alert={
          build.status === "FAILED" && build.failureReason ? (
            <AlertBar tone="danger" href={`/logs?build=${build.id}&level=ERROR`} cta="Error logs">
              This build failed: {build.failureReason}
            </AlertBar>
          ) : null
        }
        actions={
          canDelete || incidentHref ? (
            <>
              {incidentHref && (
                <Button asChild variant="outline">
                  <Link href={incidentHref}>
                    <Siren className="size-3.5" aria-hidden />
                    Open an incident
                  </Link>
                </Button>
              )}
              {canDelete && (
                <DeleteRecordButton
                  entity="build"
                  id={build.id}
                  label={`${product.name} · build ${build.number}`}
                  redirectTo="/deployments?tab=builds"
                />
              )}
            </>
          ) : undefined
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
                    value: <StatusPill registry="deployEnvironment" value={build.environment} variant="dot" />,
                  },
                  { label: "Status", value: <StatusPill registry="buildStatus" value={build.status} /> },
                  {
                    label: "Branch",
                    value: build.branch ? <span className="font-mono">{build.branch}</span> : "—",
                  },
                  {
                    label: "Commit",
                    value: build.commitSha ? (
                      commitHref ? (
                        <a
                          href={commitHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-brand hover:underline"
                        >
                          {build.commitSha.slice(0, 7)}
                        </a>
                      ) : (
                        <span className="font-mono">{build.commitSha.slice(0, 7)}</span>
                      )
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Triggered by", value: build.triggeredBy ?? "—" },
                ]}
              />
            </Panel>

            <Panel title="Timing" flush>
              <MetaList
                items={[
                  { label: "Reported", value: dateTime(build.createdAt) },
                  { label: "Started", value: dateTime(build.startedAt) },
                  { label: "Finished", value: dateTime(build.finishedAt) },
                  { label: "Duration", value: <span className="font-mono">{duration(elapsed)}</span> },
                ]}
              />
            </Panel>

            <Panel title="Build history" flush>
              <Neighbours
                previous={build.previous}
                next={build.next}
                hrefFor={(other) => `/deployments/builds/${other}`}
                noun="Build"
              />
            </Panel>
          </>
        }
      >
        {build.commitMessage && (
          <Panel title="Commit message">
            <p className="whitespace-pre-wrap break-words text-base">{build.commitMessage}</p>
          </Panel>
        )}

        {build.failureReason && (
          <Panel title="Failure">
            <p className="break-words font-mono text-meta text-danger">{build.failureReason}</p>
          </Panel>
        )}

        <Panel
          title="Deployments from this build"
          description={
            build.deployments.length === 0
              ? undefined
              : `${build.deployments.length} deployment${build.deployments.length === 1 ? "" : "s"}`
          }
          flush
        >
          {build.deployments.length === 0 ? (
            <EmptyInline>
              Nothing has been deployed from this build. A failed or cancelled build never is; a
              successful one appears here once CI reports a deployment that names it.
            </EmptyInline>
          ) : (
            <ul className="divide-y divide-border">
              {build.deployments.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <StatusPill registry="deploymentStatus" value={d.status} variant="dot" />
                  <span className="min-w-0 flex-1 basis-40">
                    <Link
                      href={`/deployments/${d.id}`}
                      className="block truncate text-base hover:underline"
                    >
                      Deployment #{d.number}
                    </Link>
                    <span className="block truncate text-meta">
                      <ExternalUrl value={d.url} />
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

        <RecentLogs
          page={logs}
          total={build._count.logs}
          allHref={`/logs?build=${build.id}`}
          scope="build"
        />

        <EntityAudit type="build" id={build.id} />
      </DetailLayout>
    </div>
  );
}
