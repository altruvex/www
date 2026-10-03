import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@repo/database";
import { Button } from "@repo/ui";

import { DeleteRecordButton } from "@/components/os/delete-record";
import { DetailLayout, MetaList, QuickActions } from "@/components/os/detail-layout";
import { EmptyInline } from "@/components/os/empty-state";
import { EntityAudit } from "@/components/os/entity-audit";
import { EntityLink } from "@/components/os/entity-link";
import { PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import { Timeline, type TimelineEvent } from "@/components/os/timeline";
import { StatusPill } from "@/components/ui/badge";
import { dateTime, when } from "@/lib/format";
import { getIncident } from "@/lib/engineering";
import { statusOf } from "@/lib/status";
import { ManageIncident, PostUpdate } from "./incident-actions";
import { LinkedLogs } from "./linked-logs";

export const dynamic = "force-dynamic";

/**
 * One incident (§8): what broke, who owns it, what has been tried, and the
 * evidence attached to it. Every change made here goes through the incident
 * API, which writes the timeline update and the audit event together.
 */
export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await getIncident(id);
  if (!incident) notFound();

  const [users, recentDeployments] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    // Twenty recent deploys reach well past "the one before last night's"; the
    // linked one is added below when it is older than that.
    prisma.deployment.findMany({
      where: { productId: incident.productId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, number: true, environment: true, status: true, createdAt: true },
    }),
  ]);

  const deployments = [...recentDeployments];
  if (incident.deployment && !deployments.some((d) => d.id === incident.deployment!.id)) {
    deployments.push(incident.deployment);
  }

  const { product } = incident;
  const clientName = product.client.company || product.client.name || "Unnamed client";
  const label = `${product.name} #${incident.number}`;
  const resolved = incident.status === "RESOLVED";

  // Newest first: the question on opening an incident is "where is it now".
  // Detection is the first event, so it sits at the bottom.
  const events: TimelineEvent[] = [
    ...incident.updates.map((update) => ({
      id: update.id,
      at: update.createdAt,
      iconName: update.status ? "Flag" : "MessageCircle",
      tone: update.status ? statusOf("incidentStatus", update.status).tone : ("neutral" as const),
      title: update.status
        ? `Moved to ${statusOf("incidentStatus", update.status).label.toLowerCase()}`
        : "Update",
      detail: update.body,
      meta: update.author?.name || update.author?.email || update.authorLabel,
    })),
    {
      id: "detected",
      at: incident.detectedAt,
      iconName: "Flag",
      tone: statusOf("incidentSeverity", incident.severity).tone,
      title: "Detected",
      detail: incident.title,
    },
  ].reverse();

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[{ label: "Incidents", href: "/incidents" }, { label }]}
        title={incident.title}
        status={
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusPill registry="incidentSeverity" value={incident.severity} />
            <StatusPill registry="incidentStatus" value={incident.status} />
          </span>
        }
        meta={
          <>
            <EntityLink type="product" id={product.id}>
              {product.name}
            </EntityLink>
            {" · "}
            <EntityLink type="client" id={product.client.id} muted>
              {clientName}
            </EntityLink>
            {" · detected "}
            {when(incident.detectedAt)}
          </>
        }
        actions={
          <DeleteRecordButton
            entity="incident"
            id={incident.id}
            label={`${label} ${incident.title}`}
            redirectTo="/incidents"
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
                      "None"
                    ),
                  },
                  {
                    label: "Severity",
                    value: <StatusPill registry="incidentSeverity" value={incident.severity} variant="dot" />,
                    hint: statusOf("incidentSeverity", incident.severity).hint,
                  },
                  {
                    label: "Status",
                    value: <StatusPill registry="incidentStatus" value={incident.status} variant="dot" />,
                  },
                  {
                    label: "Owner",
                    value: incident.owner ? incident.owner.name || incident.owner.email : "Unowned",
                  },
                  { label: "Detected", value: dateTime(incident.detectedAt) },
                  {
                    label: "Acknowledged",
                    value: incident.acknowledgedAt ? dateTime(incident.acknowledgedAt) : "Not yet",
                    hint: "The first time it moved off investigating",
                  },
                  { label: "Resolved", value: incident.resolvedAt ? dateTime(incident.resolvedAt) : "Open" },
                  {
                    label: "Deployment",
                    value: incident.deployment ? (
                      <EntityLink type="deployment" id={incident.deployment.id}>
                        #{incident.deployment.number} · {incident.deployment.environment.toLowerCase()}
                      </EntityLink>
                    ) : (
                      "None suspected"
                    ),
                  },
                ]}
              />
            </Panel>

            <Panel title="Manage" flush>
              <ManageIncident
                // Remount after a save so the selects show what the server holds.
                key={`${incident.severity}:${incident.ownerId}:${incident.deploymentId}`}
                id={incident.id}
                severity={incident.severity}
                ownerId={incident.ownerId}
                deploymentId={incident.deploymentId}
                users={users}
                deployments={deployments.map((d) => ({
                  id: d.id,
                  number: d.number,
                  environment: d.environment,
                  status: d.status,
                  createdAt: d.createdAt.toISOString(),
                }))}
              />
            </Panel>

            <Panel title="Go to" flush>
              <QuickActions>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/logs?incident=${incident.id}`}>Linked logs</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/logs?product=${product.id}&level=ERROR`}>Error logs for {product.name}</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/deployments?product=${product.id}`}>Deployments of {product.name}</Link>
                </Button>
              </QuickActions>
            </Panel>
          </>
        }
      >
        <Panel title="What happened">
          {incident.detail ? (
            <p className="whitespace-pre-wrap text-base">{incident.detail}</p>
          ) : (
            <p className="text-base text-muted-foreground">
              No detail was written when it was opened. Post an update with what is known.
            </p>
          )}
          {incident.resolution && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="telemetry text-subtle-foreground">Resolution</p>
              <p className="mt-1 whitespace-pre-wrap text-base">{incident.resolution}</p>
            </div>
          )}
        </Panel>

        <Panel
          title={resolved ? "Reopen or add a note" : "Post an update"}
          description={
            resolved
              ? "Resolved. Reopen it if it came back, or add a note for the record."
              : "Updates are the incident's history. Resolving requires saying what fixed it."
          }
        >
          <PostUpdate key={incident.status} id={incident.id} status={incident.status} />
        </Panel>

        <Panel title="Timeline" description={`${incident.updates.length} update${incident.updates.length === 1 ? "" : "s"}`}>
          <Timeline events={events} emptyLabel="No updates yet." />
        </Panel>

        <Panel
          title="Linked logs"
          description={
            incident._count.logs > incident.logs.length
              ? `Latest ${incident.logs.length} of ${incident._count.logs}`
              : `${incident._count.logs} line${incident._count.logs === 1 ? "" : "s"}`
          }
          action={
            incident._count.logs > 0 ? (
              <PanelLink href={`/logs?incident=${incident.id}`}>All linked logs</PanelLink>
            ) : undefined
          }
          flush
        >
          {incident.logs.length === 0 ? (
            <EmptyInline>
                No log lines attached yet. Open a line in{" "}
                <Link
                  href={`/logs?product=${product.id}`}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {product.name}&apos;s logs
                </Link>{" "}
                and link it to this incident as evidence.
              </EmptyInline>
          ) : (
            <LinkedLogs
              productId={product.id}
              logs={incident.logs.map((log) => ({
                id: log.id,
                level: log.level,
                environment: log.environment,
                source: log.source,
                message: log.message,
                requestId: log.requestId,
                timestamp: log.timestamp.toISOString(),
              }))}
            />
          )}
        </Panel>

        <EntityAudit type="incident" id={incident.id} />
      </DetailLayout>
    </div>
  );
}
