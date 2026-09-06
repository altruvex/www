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

  // If date grouping is turned off or dense view requested, render flat list
  if (!groupByDate || dense) {
    return (
      <ol className="space-y-1">
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
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 py-1.5 px-2 bg-card/90 backdrop-blur-md rounded-md border border-border/40">
            <span className="font-mono text-micro font-semibold uppercase tracking-wider text-foreground/80">
              {group.label}
            </span>
            <span className="font-mono text-micro text-subtle-foreground tabular-nums">
              {group.events.length} event{group.events.length === 1 ? "" : "s"}
            </span>
          </div>

          <ol className="space-y-1 pt-1">
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

  const content = (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-lg transition-colors group",
        dense ? "p-1.5" : "p-2",
        event.href ? "hover:bg-surface/80 hover:border-border/40" : "",
      )}
    >
      {/* Spine & Icon Badge Column */}
      <div className="relative flex flex-col items-center shrink-0 w-7 self-stretch">
        {!isLast && (
          <div
            className="absolute top-7 bottom-0 w-px bg-border/60 left-1/2 -translate-x-1/2"
            aria-hidden
          />
        )}
        <div
          className={cn(
            "relative z-10 flex size-7 items-center justify-center rounded-lg border transition-transform duration-150 group-hover:scale-105",
            toneBadgeStyles[event.tone],
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </div>
      </div>

      {/* Content Column */}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="min-w-0 text-base leading-snug">
            <span className="font-semibold text-foreground">{event.title}</span>
            {event.detail && (
              <span className="text-muted-foreground font-normal"> · {event.detail}</span>
            )}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <time
              dateTime={new Date(event.at).toISOString()}
              title={dateTime(event.at)}
              className="font-mono text-micro tabular-nums text-subtle-foreground"
            >
              {when(event.at)}
            </time>
            {event.href && (
              <ChevronRight
                className="size-3.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-hidden
              />
            )}
          </div>
        </div>

        {event.meta && (
          <div className="mt-1 flex flex-wrap gap-1.5 items-center">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-micro font-mono bg-muted/60 text-muted-foreground border border-border/40">
              {event.meta}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <li>
      {event.href ? (
        <Link href={event.href} className="block no-underline">
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  );
}

export { toneDot };
