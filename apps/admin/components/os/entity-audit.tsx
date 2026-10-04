import { prisma } from "@repo/database";
import Link from "next/link";
import { Panel, PanelLink } from "@/components/os/panel";
import { EventList, type EventRowData } from "@/components/os/event-row";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { normalizeEntityType } from "@/lib/entity-links";
import { resolveRole } from "@/lib/rbac";

export const SPELLINGS: Record<string, string[]> = {
  client: ["client", "Client"],
  submission: ["submission", "contact", "ContactSubmission"],
  proposal: ["proposal", "Proposal"],
  contract: ["contract", "Contract"],
  project: ["project", "Project"],
  product: ["product", "Product"],
  payment: ["payment", "Payment"],
  subscription: ["subscription", "maintenance_subscription", "MaintenanceSubscription"],
  incident: ["incident", "Incident"],
  deployment: ["deployment", "Deployment"],
  build: ["build", "Build"],
  task: ["task", "ProjectTask"],
  meeting: ["meeting", "Meeting"],
  client_service: ["client_service", "ClientService", "clientService"],
  change_request: ["changeRequest", "change_request", "ChangeRequest"],
  user: ["user", "User"],
};

export async function EntityAudit({
  type,
  id,
  title = "Audit trail",
  take = 25,
}: {
  type: string;
  id: string;
  title?: string;
  take?: number;
}) {
  const kind = normalizeEntityType(type);
  const types = (kind && SPELLINGS[kind]) || [type];
  const [events, role] = await Promise.all([
    prisma.activityEvent.findMany({
      where: { entityType: { in: types }, entityId: id },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      include: { actor: { select: { role: true, opsRole: true } } },
    }),
    currentRole(),
  ]);
  const more = events.length > take;
  const rows: EventRowData[] = (more ? events.slice(0, take) : events).map((event) => ({
    ...event,
    actorRole: event.actor ? (resolveRole(event.actor) ?? null) : null,
  }));
  const auditHref = roleCanOpen(role, "/audit")
    ? `/audit?entity=${encodeURIComponent(types[0]!)}&id=${encodeURIComponent(id)}`
    : null;

  return (
    <Panel
      title={title}
      description="Who changed what, and when — from the persisted audit log"
      action={auditHref ? <PanelLink href={auditHref}>All</PanelLink> : null}
      flush
    >
      {rows.length === 0 ? (
        <p className="px-3 py-6 text-center text-meta text-muted-foreground">
          No recorded changes yet. Every edit made from here on is logged.
        </p>
      ) : (
        <>
          <EventList events={rows} />
          {more && auditHref && (
            <p className="border-t border-border px-3 py-2 text-meta">
              <Link className="text-muted-foreground hover:text-foreground" href={auditHref}>
                Older events in the audit log →
              </Link>
            </p>
          )}
        </>
      )}
    </Panel>
  );
}
