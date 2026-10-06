import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Boxes,
  CircleCheck,
  FileText,
  History,
  ListOrdered,
  MessageSquarePlus,
  Rocket,
  RotateCcw,
  ScrollText,
} from "lucide-react";

import { prisma } from "@repo/database";
import { Button } from "@repo/ui";

import { AttachPicker } from "@/components/os/attach-picker";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { MetaList, QuickActions } from "@/components/os/detail-layout";
import { EmptyInline } from "@/components/os/empty-state";
import { SPELLINGS } from "@/components/os/entity-audit";
import { EntityLink } from "@/components/os/entity-link";
import { EventList } from "@/components/os/event-row";
import { PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import { Dossier, DossierSection } from "@/components/os/section-index";
import { Timeline, type TimelineEvent } from "@/components/os/timeline";
import { StatusPill } from "@/components/ui/badge";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { dateTime, when } from "@/lib/format";
import { getIncident } from "@/lib/engineering";
import { gateRoute } from "@/lib/page-gate";
import { can, resolveRole } from "@/lib/rbac";
import { statusOf } from "@/lib/status";
import { ManageIncident, PostUpdate } from "./incident-actions";
import { IncidentText } from "./incident-text";
import { LinkedLogs } from "./linked-logs";

const HISTORY_TAKE = 30;

export const dynamic = "force-dynamic";

export default async function IncidentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const denied = await gateRoute("/incidents/[id]");
  if (denied) return denied;

  const { id } = await params;
  const { step } = await searchParams;
  const incident = await getIncident(id);
  if (!incident) notFound();

  const [users, recentDeployments, auditEvents, role] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
      select: { id: true, name: true, email: true, role: true, opsRole: true },
      orderBy: { name: "asc" },
    }),
    prisma.deployment.findMany({
      where: { productId: incident.productId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        number: true,
        environment: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.activityEvent.findMany({
      where: { entityType: { in: SPELLINGS.incident! }, entityId: incident.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_TAKE + 1,
      include: { actor: { select: { role: true, opsRole: true } } },
    }),
    currentRole(),
  ]);

  const owners = users
    .filter(
      (u) =>
        u.id === incident.ownerId || can(resolveRole(u), "edit", "incident"),
    )
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));
  const canEdit = can(role, "edit", "incident");
  const canDelete = can(role, "delete", "project");
  const canOpenProduct =
    can(role, "view", "deployment") && roleCanOpen(role, "/products");
  const canOpenDeployment =
    incident.deployment != null &&
    can(role, "view", "deployment") &&
    roleCanOpen(role, "/deployments");

  const moreHistory = auditEvents.length > HISTORY_TAKE;
  const history = auditEvents.slice(0, HISTORY_TAKE).map((event) => ({
    id: event.id,
    action: event.action,
    actorLabel: event.actorLabel,
    actorKind: event.actorKind,
    actorRole: event.actor?.opsRole ?? event.actor?.role ?? null,
    entityType: event.entityType,
    entityId: event.entityId,
    entityLabel: event.entityLabel,
    summary: event.summary,
    before: event.before,
    after: event.after,
    metadata: event.metadata,
    createdAt: event.createdAt,
  }));

  const deployments = [...recentDeployments];
  if (
    incident.deployment &&
    !deployments.some((d) => d.id === incident.deployment!.id)
  ) {
    deployments.push(incident.deployment);
  }

  const { product } = incident;
  const clientName =
    product.client.company || product.client.name || "Unnamed client";
  const label = `${product.name} #${incident.number}`;
  const resolved = incident.status === "RESOLVED";

  const events: TimelineEvent[] = [
    ...incident.updates.map((update) => ({
      id: update.id,
      at: update.createdAt,
      iconName: update.status ? "Flag" : "MessageCircle",
      tone: update.status
        ? statusOf("incidentStatus", update.status).tone
        : ("neutral" as const),
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
          <>
            {canOpenProduct && (
              <Button asChild variant="ghost" className="max-sm:hidden">
                <Link href={`/products/${product.id}`}>
                  <Boxes className="size-3.5" aria-hidden />
                  Open the product
                </Link>
              </Button>
            )}
            {canOpenDeployment && incident.deployment && (
              <Button asChild variant="ghost" className="max-sm:hidden">
                <Link href={`/deployments/${incident.deployment.id}`}>
                  <Rocket className="size-3.5" aria-hidden />
                  Open the deployment
                </Link>
              </Button>
            )}
            {canEdit && !resolved && (
              <Button asChild variant="outline">
                <Link href={`/incidents/${incident.id}?step=resolve#update`}>
                  <CircleCheck className="size-3.5" aria-hidden />
                  Resolve
                </Link>
              </Button>
            )}
            {canEdit && (
              <Button asChild variant={resolved ? "outline" : "brand"}>
                <Link href={`/incidents/${incident.id}#update`}>
                  {resolved ? (
                    <RotateCcw className="size-3.5" aria-hidden />
                  ) : (
                    <MessageSquarePlus className="size-3.5" aria-hidden />
                  )}
                  {resolved ? "Reopen" : "Post an update"}
                </Link>
              </Button>
            )}
            {canDelete && (
              <DeleteRecordButton
                entity="incident"
                id={incident.id}
                label={`${label} ${incident.title}`}
                redirectTo="/incidents"
              />
            )}
          </>
        }
      />

      <Dossier
        label="Incident sections"
        sections={[
          { id: "overview", label: "What happened", icon: <FileText /> },
          ...(canEdit
            ? [
                {
                  id: "update",
                  label: resolved ? "Reopen" : "Post an update",
                  icon: <MessageSquarePlus />,
                },
              ]
            : []),
          {
            id: "timeline",
            label: "Timeline",
            icon: <ListOrdered />,
            count: incident.updates.length,
          },
          {
            id: "evidence",
            label: "Evidence",
            icon: <ScrollText />,
            count: incident._count.logs,
          },
          { id: "history", label: "History", icon: <History /> },
        ]}
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
                    value: (
                      <StatusPill
                        registry="incidentSeverity"
                        value={incident.severity}
                        variant="dot"
                      />
                    ),
                    hint: statusOf("incidentSeverity", incident.severity).hint,
                  },
                  {
                    label: "Status",
                    value: (
                      <StatusPill
                        registry="incidentStatus"
                        value={incident.status}
                        variant="dot"
                      />
                    ),
                  },
                  {
                    label: "Owner",
                    value: incident.owner ? (
                      incident.owner.name || incident.owner.email
                    ) : canEdit && owners.length > 0 ? (
                      <AttachPicker
                        label="Assign an owner"
                        options={owners.map((u) => ({
                          value: u.id,
                          label: u.name || u.email,
                          hint: u.name ? u.email : undefined,
                        }))}
                        request={{
                          url: "/api/admin/incidents",
                          method: "PATCH",
                          body: { id: incident.id },
                          field: "ownerId",
                        }}
                        successMessage="Owner assigned."
                        searchPlaceholder="Search the team"
                      />
                    ) : (
                      "Unowned"
                    ),
                  },
                  { label: "Detected", value: dateTime(incident.detectedAt) },
                  {
                    label: "Acknowledged",
                    value: incident.acknowledgedAt
                      ? dateTime(incident.acknowledgedAt)
                      : "Not yet",
                    hint: "The first time it moved off investigating",
                  },
                  {
                    label: "Resolved",
                    value: incident.resolvedAt
                      ? dateTime(incident.resolvedAt)
                      : "Open",
                  },
                  {
                    label: "Deployment",
                    value: incident.deployment ? (
                      <EntityLink type="deployment" id={incident.deployment.id}>
                        #{incident.deployment.number} ·{" "}
                        {incident.deployment.environment.toLowerCase()}
                      </EntityLink>
                    ) : canEdit && deployments.length > 0 ? (
                      <AttachPicker
                        label="Link a deployment"
                        options={deployments.map((d) => ({
                          value: d.id,
                          label: `#${d.number} · ${d.environment.toLowerCase()}`,
                          hint: `${statusOf("deploymentStatus", d.status).label} · ${when(d.createdAt)}`,
                        }))}
                        request={{
                          url: "/api/admin/incidents",
                          method: "PATCH",
                          body: { id: incident.id },
                          field: "deploymentId",
                        }}
                        successMessage="Deployment linked."
                        searchPlaceholder="Search deployments"
                      />
                    ) : (
                      "None suspected"
                    ),
                  },
                ]}
              />
            </Panel>

            {canEdit && (
              <div id="manage" className="scroll-mt-20">
                <Panel title="Manage" flush>
                  <ManageIncident
                    key={`${incident.severity}:${incident.ownerId}:${incident.deploymentId}`}
                    id={incident.id}
                    severity={incident.severity}
                    ownerId={incident.ownerId}
                    deploymentId={incident.deploymentId}
                    users={owners}
                    deployments={deployments.map((d) => ({
                      id: d.id,
                      number: d.number,
                      environment: d.environment,
                      status: d.status,
                      createdAt: d.createdAt.toISOString(),
                    }))}
                  />
                </Panel>
              </div>
            )}

            <Panel title="Go to" flush>
              <QuickActions>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/logs?incident=${incident.id}`}>
                    Linked logs
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/logs?product=${product.id}&level=ERROR`}>
                    Errors on {product.name}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/deployments?product=${product.id}`}>
                    Deployments of {product.name}
                  </Link>
                </Button>
              </QuickActions>
            </Panel>
          </>
        }
      >
        <DossierSection id="overview" title="What happened">
          <IncidentText
            key={`${incident.title}:${incident.detail ?? ""}`}
            id={incident.id}
            title={incident.title}
            detail={incident.detail}
            canEdit={canEdit}
          />
          {incident.resolution && (
            <div className="mt-3 border-t border-border-subtle pt-3">
              <p className="telemetry text-subtle-foreground">Resolution</p>
              <p className="mt-1 whitespace-pre-wrap text-base">
                {incident.resolution}
              </p>
            </div>
          )}
        </DossierSection>

        {canEdit && (
          <DossierSection
            id="update"
            title={resolved ? "Reopen or add a note" : "Post an update"}
            description={
              resolved
                ? "Resolved. Reopen it if it came back, or add a note for the record."
                : "Updates are the incident's history. Resolving requires saying what fixed it."
            }
          >
            <PostUpdate
              key={`${incident.status}:${step ?? ""}`}
              id={incident.id}
              status={incident.status}
              resolveFirst={step === "resolve"}
            />
          </DossierSection>
        )}

        <DossierSection
          id="timeline"
          title="Timeline"
          description={`${incident.updates.length} update${incident.updates.length === 1 ? "" : "s"}, newest first`}
        >
          <Timeline events={events} emptyLabel="No updates yet." />
        </DossierSection>

        <DossierSection
          id="evidence"
          title="Linked logs"
          description={
            incident._count.logs > incident.logs.length
              ? `Latest ${incident.logs.length} of ${incident._count.logs}`
              : `${incident._count.logs} line${incident._count.logs === 1 ? "" : "s"}`
          }
          action={
            incident._count.logs > 0 ? (
              <PanelLink href={`/logs?incident=${incident.id}`}>
                All linked logs
              </PanelLink>
            ) : undefined
          }
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
              incidentId={incident.id}
              canEdit={canEdit}
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
        </DossierSection>

        <DossierSection
          id="history"
          title="History"
          description="Who changed what, and when — from the persisted audit log"
          action={
            <PanelLink href={`/audit?entity=incident&id=${incident.id}`}>
              {moreHistory ? "Full history" : "Open in audit"}
            </PanelLink>
          }
        >
          {history.length === 0 ? (
            <EmptyInline>
              No recorded changes yet. Every edit made from here on is logged.
            </EmptyInline>
          ) : (
            <EventList events={history} groupByDate dense />
          )}
        </DossierSection>
      </Dossier>
    </div>
  );
}
