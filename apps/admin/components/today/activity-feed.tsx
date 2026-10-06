"use client";

import * as React from "react";

import { Panel, PanelLink } from "@/components/os/panel";
import { EmptyInline } from "@/components/os/empty-state";
import { EventList, type EventRowData } from "@/components/os/event-row";
import { domainForEvent, EVENT_DOMAINS, type EventDomain } from "@/lib/activity-icons";
import { cn } from "@/lib/utils";

export function ActivityFeed({
  events,
  auditHref = null,
}: {
  events: EventRowData[];
  auditHref?: string | null;
}) {
  const [domain, setDomain] = React.useState<EventDomain | "all">("all");

  const tagged = React.useMemo(
    () => events.map((e) => ({ event: e, domain: domainForEvent(e.action, e.entityType) })),
    [events],
  );
  const counts = React.useMemo(() => {
    const map = new Map<EventDomain, number>();
    for (const { domain: d } of tagged) if (d) map.set(d, (map.get(d) ?? 0) + 1);
    return map;
  }, [tagged]);
  const chips = EVENT_DOMAINS.filter((d) => (counts.get(d.key) ?? 0) > 0);
  const visible =
    domain === "all" ? events : tagged.filter((t) => t.domain === domain).map((t) => t.event);

  return (
    <Panel
      title="Recent activity"
      description="Who changed what, newest first"
      action={auditHref ? <PanelLink href={auditHref}>Audit log</PanelLink> : null}
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
        <>
          {chips.length > 1 && (
            <div
              role="group"
              aria-label="Filter by domain"
              className="flex flex-wrap items-center gap-1 border-b border-border-subtle px-3 py-1.5"
            >
              <DomainChip active={domain === "all"} onClick={() => setDomain("all")}>
                All <Count n={events.length} />
              </DomainChip>
              {chips.map((d) => (
                <DomainChip
                  key={d.key}
                  active={domain === d.key}
                  onClick={() => setDomain(d.key)}
                >
                  {d.label} <Count n={counts.get(d.key) ?? 0} />
                </DomainChip>
              ))}
            </div>
          )}
          <EventList events={visible} dense />
        </>
      )}
    </Panel>
  );
}

function Count({ n }: { n: number }) {
  return <span className="font-mono text-micro tabular-nums text-subtle-foreground">{n}</span>;
}

function DomainChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-[var(--control-h-sm)] items-center gap-1 rounded-ctl-sm border px-2 text-meta transition-colors duration-[var(--dur-state)]",
        active
          ? "border-foreground/45 bg-surface text-foreground"
          : "border-transparent text-muted-foreground hover:bg-surface hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
