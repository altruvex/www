import * as React from "react";
import { ChevronRight } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ArrowIcon, Hint } from "@repo/ui";

import { EntityLink } from "@/components/os/entity-link";
import { iconForEvent, labelForAction, toneForEvent } from "@/lib/activity-icons";
import { entityHref, entityNoun } from "@/lib/entity-links";
import { dateTime, when } from "@/lib/format";
import { titleCase, toneClasses } from "@/lib/status";
import { cn } from "@/lib/utils";

export interface EventRowData {
  id: string;
  action: string;
  actorLabel: string;
  actorKind?: string | null;
  actorRole?: string | null;
  entityType: string;
  entityId: string;
  entityLabel?: string | null;
  linkable?: boolean;
  summary: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  createdAt: Date | string;
}

export function fieldList(value: unknown): string[] {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [];
}

export function show(value: unknown, max = 120): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value.length > max ? `${value.slice(0, max)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const json = JSON.stringify(value);
  return json.length > max ? `${json.slice(0, max)}…` : json;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** liveUrl → "Live URL", actualLaunchDate → "Actual launch date". */
function humanField(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (/^(url|id|api|sla|vat|ip)$/i.test(w) ? w.toUpperCase() : w.toLowerCase()));
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/** A value as the operator reads it: dates as dates, empty lists as "None". */
function readable(value: unknown, max = 120): string {
  if (typeof value === "string" && ISO_DATE.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return format(d, "d MMM yyyy");
  }
  if ((Array.isArray(value) && value.length === 0) || value === "[]") return "None";
  return show(value, max);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function EventRow({
  event,
  aside,
  dense = false,
  defaultOpen = false,
}: {
  event: EventRowData;
  aside?: React.ReactNode;
  dense?: boolean;
  defaultOpen?: boolean;
}) {
  const tone = toneForEvent(event.action);
  const before = asRecord(event.before);
  const after = asRecord(event.after);
  const fields = Array.from(new Set([...fieldList(event.before), ...fieldList(event.after)]));
  const metadata = asRecord(event.metadata);
  const metaKeys = Object.keys(metadata);
  const expandable = fields.length > 0 || metaKeys.length > 0;
  const linked = entityHref(event.entityType, event.entityId) !== null;
  const noun = entityNoun(event.entityType);
  const who = event.actorRole
    ? titleCase(String(event.actorRole))
    : event.actorKind
      ? titleCase(event.actorKind)
      : null;

  return (
    <li className={cn("flex items-start gap-3 px-3", dense ? "py-1.5" : "py-2")}>
      <Hint label={labelForAction(event.action)}>
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-ctl-sm border",
            toneClasses[tone],
          )}
        >
          {React.createElement(iconForEvent(event.action, event.entityType), {
            className: "size-3.5",
            "aria-hidden": true,
          })}
        </span>
      </Hint>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="min-w-0 flex-1 text-base leading-snug">
            <span className="font-medium text-foreground">{event.actorLabel}</span>{" "}
            <span className="text-muted-foreground">{labelForAction(event.action)}</span>{" "}
            {event.linkable === false ? (
              <span className="text-muted-foreground">{event.entityLabel ?? noun}</span>
            ) : (
              <EntityLink type={event.entityType} id={event.entityId} muted={!linked}>
                {event.entityLabel ?? noun}
              </EntityLink>
            )}
          </p>
          <Hint label={dateTime(event.createdAt)}>
            <time
              dateTime={new Date(event.createdAt).toISOString()}
              className="ms-auto shrink-0 font-mono text-micro tabular-nums text-subtle-foreground"
            >
              {when(event.createdAt)}
            </time>
          </Hint>
        </div>

        {!dense && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-meta text-subtle-foreground">
            <span className="min-w-0 truncate text-muted-foreground">{event.summary}</span>
            {who && (
              <>
                <span aria-hidden>·</span>
                <span>{who}</span>
              </>
            )}
            {!linked && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono text-micro">{event.entityType}</span>
              </>
            )}
            {aside}
          </p>
        )}

        {expandable && (
          <details className="group mt-1" open={defaultOpen || undefined}>
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-xs text-meta text-subtle-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
              <ChevronRight
                className="size-3 transition-transform duration-[var(--dur-state)] group-open:rotate-90"
                aria-hidden
              />
              {fields.length > 0 ? (
                <>
                  {fields.length} field{fields.length === 1 ? "" : "s"} changed
                  <span>
                    {" · "}
                    {fields.slice(0, 4).map(humanField).join(", ")}
                    {fields.length > 4 ? "…" : ""}
                  </span>
                </>
              ) : (
                <>Details</>
              )}
            </summary>

            <div className="mt-2 divide-y divide-border-subtle overflow-hidden rounded-ctl-xl border border-border-subtle text-meta">
              {fields.map((field) => {
                const was = before[field];
                const now = after[field];
                return (
                  <div
                    key={field}
                    className="grid gap-x-4 gap-y-0.5 px-3 py-2 sm:grid-cols-[minmax(7rem,11rem)_1fr]"
                  >
                    <dt className="text-subtle-foreground">{humanField(field)}</dt>
                    <dd className="min-w-0 break-words">
                      {!isEmpty(was) && (
                        <>
                          <span className="text-muted-foreground line-through decoration-foreground/30">
                            {readable(was)}
                          </span>
                          <ArrowIcon motion="none" className="mx-2 inline size-3.5 align-[-0.15em] text-subtle-foreground" />
                        </>
                      )}
                      <span className={cn(isEmpty(now) ? "text-subtle-foreground" : "text-foreground")}>
                        {readable(now)}
                      </span>
                    </dd>
                  </div>
                );
              })}
              {metaKeys.map((key) => (
                <div
                  key={key}
                  className="grid gap-x-4 gap-y-0.5 bg-surface/40 px-3 py-2 sm:grid-cols-[minmax(7rem,11rem)_1fr]"
                >
                  <dt className="text-subtle-foreground">{humanField(key)}</dt>
                  <dd className="min-w-0 break-words text-muted-foreground">
                    {readable(metadata[key], 240)}
                  </dd>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </li>
  );
}

function dayLabel(value: Date | string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Older";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d MMMM yyyy");
}

export function EventList({
  events,
  groupByDate = false,
  dense = false,
  renderAside,
  className,
}: {
  events: EventRowData[];
  groupByDate?: boolean;
  dense?: boolean;
  renderAside?: (event: EventRowData) => React.ReactNode;
  className?: string;
}) {
  if (!groupByDate) {
    return (
      <ol className={cn("divide-y divide-border-subtle", className)}>
        {events.map((event) => (
          <EventRow key={event.id} event={event} dense={dense} aside={renderAside?.(event)} />
        ))}
      </ol>
    );
  }

  const groups: { label: string; events: EventRowData[] }[] = [];
  for (const event of events) {
    const label = dayLabel(event.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.events.push(event);
    else groups.push({ label, events: [event] });
  }

  return (
    <div className={className}>
      {groups.map((group) => (
        <section key={group.label}>
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-y border-border-subtle bg-card px-3 py-1 first:border-t-0">
            <span className="telemetry text-muted-foreground">{group.label}</span>
            <span className="font-mono text-micro tabular-nums text-subtle-foreground">
              {group.events.length} event{group.events.length === 1 ? "" : "s"}
            </span>
          </div>
          <ol className="divide-y divide-border-subtle">
            {group.events.map((event) => (
              <EventRow key={event.id} event={event} dense={dense} aside={renderAside?.(event)} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
