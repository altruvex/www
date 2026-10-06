import { dateTime, when } from "@/lib/format";
import { toneClasses, toneDot, type Tone } from "@/lib/status";
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
  iconName?: string;
  tone: Tone;
  title: string;
  detail?: string;
  href?: string;
  meta?: string;
  category?: string;
}

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
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-ctl-sm border border-border-subtle bg-card px-2 py-1.5">
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
        "group relative flex items-start gap-3 rounded-ctl-lg px-2 transition-colors duration-[var(--dur-state)]",
        dense ? "py-1.5" : "py-2",
        interactive && "hover:bg-surface/70",
      )}
    >
      <div className="relative flex w-7 shrink-0 flex-col items-center self-stretch">
        {!isLast && (
          <div
            className={cn(
              "absolute left-1/2 top-7 w-px -translate-x-1/2 bg-border-mid",
              dense ? "-bottom-3" : "-bottom-4",
            )}
            aria-hidden
          />
        )}
        <div
          className={cn(
            "relative z-10 flex size-7 items-center justify-center rounded-ctl-sm border",
            toneClasses[event.tone],
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </div>
      </div>

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
            <span className="inline-flex items-center rounded border border-border-subtle bg-surface px-1.5 py-0.5 font-mono text-micro text-muted-foreground">
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
          className="block rounded-ctl-lg no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
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
