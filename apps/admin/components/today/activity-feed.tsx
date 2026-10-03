import { when } from "@/lib/format";
import { Panel, PanelLink } from "@/components/os/panel";
import { EntityLink } from "@/components/os/entity-link";
import { EmptyInline } from "@/components/os/empty-state";

type Event = {
  id: string;
  actorLabel: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  summary: string;
  createdAt: Date;
};

/**
 * Today → what happened. Read from the persisted audit trail (ActivityEvent),
 * not reconstructed from record timestamps, so it shows who did it and the
 * record it happened to — the same rows /audit shows in full.
 */
export function ActivityFeed({ events }: { events: Event[] }) {
  return (
    <Panel
      title="Recent activity"
      description="Who changed what, newest first"
      action={<PanelLink href="/audit">Audit log</PanelLink>}
      flush
    >
      {events.length === 0 ? (
        <div className="p-3">
          <EmptyInline>
            Nothing has been recorded yet. Every change made in the OS, by a person or by CI,
            is written here as it happens.
          </EmptyInline>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex flex-col gap-0.5 px-3 py-2 text-base sm:flex-row sm:items-baseline sm:gap-3"
            >
              <span className="shrink-0 text-meta text-subtle-foreground sm:w-28">
                {when(e.createdAt)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-muted-foreground">{e.actorLabel}</span>{" "}
                <span>{e.summary}</span>
              </span>
              {e.entityLabel && (
                <EntityLink
                  type={e.entityType}
                  id={e.entityId}
                  muted
                  className="min-w-0 shrink-0 truncate text-meta sm:max-w-[16rem]"
                >
                  {e.entityLabel}
                </EntityLink>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
