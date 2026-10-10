import { prisma } from "@repo/database";
import Link from "next/link";
import { ArrowIcon } from "@repo/ui";
import { Panel, PanelLink } from "@/components/os/panel";
import { EventList, type EventRowData } from "@/components/os/event-row";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { normalizeEntityType } from "@/lib/entity-links";
import { resolveRole } from "@/lib/rbac";
import { SPELLINGS } from "@/lib/entity-spellings";

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
            <p className="border-t border-border-subtle px-3 py-2 text-meta">
              <Link className="text-muted-foreground hover:text-foreground" href={auditHref}>
                Older events in the audit log <ArrowIcon motion="none" className="ms-1 inline size-3.5 align-[-0.15em]" />
              </Link>
            </p>
          )}
        </>
      )}
    </Panel>
  );
}
