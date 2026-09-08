import { prisma } from "@repo/database";

import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { AuditClient, type AuditRecord } from "./audit-client";

export const dynamic = "force-dynamic";

/** Most recent window. Deep history is a query, not a scroll. */
const WINDOW = 400;

/**
 * The audit log (§12).
 *
 * This page used to be a *projection*: it read `updatedAt` off contracts,
 * proposals, payments and sessions and inferred that something had happened.
 * That can show a row changed and roughly when — it can never show who changed
 * it, or what the value had been, which is the only reason an audit log exists.
 * The nav promised "who changed what, from which value to which value" and the
 * data could not deliver it.
 *
 * It now reads `ActivityEvent`, written at each mutation site with the actor and
 * the changed fields. Events before this shipped do not exist, and the page says
 * so rather than back-filling plausible history.
 */
export default async function AuditPage() {
  // `now` is captured before the queries rather than read during render: a
  // clock read in a render body is impure, and the 24-hour count belongs in the
  // database anyway so it covers every event, not just the rendered window.
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86_400_000);

  const [events, total, actors, todayCount, peopleCount] = await Promise.all([
    prisma.activityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: WINDOW,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.activityEvent.count(),
    prisma.activityEvent.groupBy({
      by: ["actorLabel"],
      _count: { _all: true },
      orderBy: { _count: { actorLabel: "desc" } },
      take: 1,
    }),
    prisma.activityEvent.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.activityEvent.count({ where: { actorKind: "USER" } }),
  ]);

  const records: AuditRecord[] = events.map((event) => ({
    id: event.id,
    action: event.action,
    actorKind: event.actorKind,
    actorLabel: event.actorLabel,
    actorRole: event.actor?.role ?? null,
    entityType: event.entityType,
    entityId: event.entityId,
    entityLabel: event.entityLabel,
    summary: event.summary,
    before: (event.before as Record<string, unknown> | null) ?? null,
    after: (event.after as Record<string, unknown> | null) ?? null,
    metadata: (event.metadata as Record<string, unknown> | null) ?? null,
    timestamp: event.createdAt.toISOString(),
  }));

  const automatic = total - peopleCount;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit log"
        description="Who changed what, from which value to which value. Every entry is written at the moment of the change — nothing here is inferred from a timestamp, and secrets are redacted before they are stored."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Recorded"
          value={total}
          sub={total > WINDOW ? `Showing the latest ${WINDOW}` : "All events"}
        />
        <StatTile label="Last 24 hours" value={todayCount} sub="Across the whole log" />
        <StatTile
          label="By a person"
          value={peopleCount}
          sub={`${automatic} automatic or by a client`}
        />
        <StatTile
          label="Busiest actor"
          value={actors[0]?.actorLabel ?? "—"}
          sub={actors[0] ? `${actors[0]._count._all} events` : "Nothing recorded yet"}
        />
      </div>

      <AuditClient records={records} />
    </div>
  );
}
