import { dateTime, when } from "@/lib/format";
import { toneDot, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileSignature,
  FileText,
  Flag,
  Globe,
  Handshake,
  MessageCircle,
  PenLine,
  Rocket,
  Send,
  UserPlus,
  Wallet,
} from "lucide-react";
import Link from "next/link";

export const ICON_MAP: Record<string, LucideIcon> = {
  CalendarDays,
  CheckCircle2,
  Eye,
  FileSignature,
  FileText,
  Flag,
  Globe,
  Handshake,
  MessageCircle,
  PenLine,
  Rocket,
  Send,
  UserPlus,
  Wallet,
  Activity,
};

export interface TimelineEvent {
  id: string;
  at: Date | string;
  /** Resolved at render time via ICON_MAP. Falls back to Activity icon. */
  iconName?: string;
  tone: Tone;
  title: string;
  detail?: string;
  href?: string;
  /** Rendered as mono metadata under the title. */
  meta?: string;
  /** Activity taxonomy for category filtering */
  category?: string;
}

export const toneBadgeStyles: Record<Tone, string> = {
  neutral: "bg-muted/60 text-muted-foreground border-border/60",
  info: "bg-info/10 text-info border-info/20",
  progress: "bg-progress/10 text-progress border-progress/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  success: "bg-success/10 text-success border-success/20",
};

export function Timeline({
  events,
  emptyLabel = "Nothing has happened yet.",
  dense = false,
  groupByDate = true,
}: {
  events: TimelineEvent[];
  emptyLabel?: string;
  dense?: boolean;
  groupByDate?: boolean;
}) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-base text-muted-foreground max-w-sm">{emptyLabel}</p>
      </div>
    );
  }

  // If date grouping is turned off or dense view requested, render flat list.
  // Rows sit flush against each other — the connector spine is only continuous
  // if there is no gap for it to fall into.
  if (!groupByDate || dense) {
    return (
      <ol>
        {events.map((event, idx) => (
          <TimelineItem
            key={event.id}
            event={event}
            dense={dense}
            isLast={idx === events.length - 1}
          />
        ))}
      </ol>
    );
  }

  // Group events by date label
  const groups: { label: string; events: TimelineEvent[] }[] = [];
  const groupMap = new Map<string, TimelineEvent[]>();

  for (const event of events) {
    const d = new Date(event.at);
    let label = "Older";
    if (isToday(d)) {
      label = "Today";
    } else if (isYesterday(d)) {
      label = "Yesterday";
    } else if (!isNaN(d.getTime())) {
      label = format(d, "MMMM d, yyyy");
    }

    if (!groupMap.has(label)) {
      const list: TimelineEvent[] = [];
      groupMap.set(label, list);
      groups.push({ label, events: list });
    }
    groupMap.get(label)!.push(event);
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.label} className="space-y-2">
          {/* Section Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-md border border-border bg-card/90 px-2 py-1.5 backdrop-blur-md">
            <span className="telemetry text-muted-foreground">{group.label}</span>
            <span className="font-mono text-micro tabular-nums text-subtle-foreground">
              {group.events.length} event{group.events.length === 1 ? "" : "s"}
            </span>
          </div>

          <ol className="pt-1">
            {group.events.map((event, idx) => (
              <TimelineItem
                key={event.id}
                event={event}
                dense={dense}
                isLast={idx === group.events.length - 1}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/**
 * One event, as a ROW — not a card. §31: a Panel is a flat plane, and a feed
 * inside one is a list of rows on that plane, so nothing here lifts, scales or
 * carries its own shadow.
 *
 * Three things are fixed on purpose:
 *   · the spine runs INTO the next row (no gap), so a run of events reads as
 *     one thread rather than a stack of separate cards;
 *   · the chevron is visible at rest, because "this row goes somewhere" is
 *     information, and hover does not exist on a phone;
 *   · a dense row stays ONE line high — meta joins the timestamp instead of
 *     opening a second line, so eight events fit where five did.
 */
function TimelineItem({
  event,
  dense = false,
  isLast = false,
}: {
  event: TimelineEvent;
  dense?: boolean;
  isLast?: boolean;
}) {
  const Icon = (event.iconName ? ICON_MAP[event.iconName] : undefined) ?? Activity;
  const interactive = Boolean(event.href);

  const content = (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-md px-2 transition-colors duration-[var(--dur-state)]",
        dense ? "py-1.5" : "py-2",
        interactive && "hover:bg-surface/70",
      )}
    >
      {/* Spine and icon */}
      <div className="relative flex w-7 shrink-0 flex-col items-center self-stretch">
        {!isLast && (
          <div
            className={cn(
              // Reaches the next row's badge: its own bottom padding plus the
              // next row's top padding. Short of that it is a tick, not a line.
              "absolute left-1/2 top-7 w-px -translate-x-1/2 bg-border-mid",
              dense ? "-bottom-3" : "-bottom-4",
            )}
            aria-hidden
          />
        )}
        <div
          className={cn(
            "relative z-10 flex size-7 items-center justify-center rounded-md border",
            toneBadgeStyles[event.tone],
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </div>
      </div>

      {/* What happened, when, and where it goes */}
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="min-w-0 text-base leading-snug">
            <span className="font-medium text-foreground">{event.title}</span>
            {event.detail && (
              <span className="font-normal text-muted-foreground"> · {event.detail}</span>
            )}
          </p>
          <div className="ms-auto flex shrink-0 items-center gap-2">
            {dense && event.meta && (
              <span className="font-mono text-micro text-subtle-foreground">{event.meta}</span>
            )}
            <time
              dateTime={new Date(event.at).toISOString()}
              title={dateTime(event.at)}
              className="font-mono text-micro tabular-nums text-subtle-foreground"
            >
              {when(event.at)}
            </time>
            {interactive && (
              <ChevronRight
                className="size-3.5 text-subtle-foreground transition-colors duration-[var(--dur-state)] group-hover:text-brand"
                aria-hidden
              />
            )}
          </div>
        </div>

        {!dense && event.meta && (
          <p className="mt-1">
            <span className="inline-flex items-center rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-micro text-muted-foreground">
              {event.meta}
            </span>
          </p>
        )}
      </div>
    </div>
  );

  return (
    <li>
      {event.href ? (
        <Link
          href={event.href}
          className="block rounded-md no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  );
}

export { toneDot };
