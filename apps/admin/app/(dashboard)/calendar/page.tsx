import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { prisma } from "@repo/database";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { EmptyState } from "@/components/os/empty-state";
import { StatusPill } from "@/components/ui/badge";
import { EntityLink } from "@/components/os/entity-link";
import {
  clientLabel,
  dayKey,
  getCalendarEntries,
  meetingWith,
  type CalendarEntry,
} from "@/lib/calendar-data";
import { toneDot } from "@/lib/status";
import { cn } from "@/lib/utils";
import { date as fmtDate } from "@/lib/format";
import { MeetingActions } from "./meeting-actions";
import { MeetingDetail } from "./meeting-detail";
import { NewMeetingForm } from "./meeting-forms";
import { SheetShell } from "./sheet-shell";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<CalendarEntry["kind"], string> = {
  meeting: "Meeting",
  "proposal-expiry": "Proposal expiry",
  "launch-target": "Launch target",
  "payment-due": "Payment due",
  "contract-sent": "Contract sent",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; meeting?: string; new?: string; client?: string }>;
}) {
  const params = await searchParams;
  const { meeting: openMeetingId, client: prefillClientId } = params;
  // A malformed ?m= falls back to the current month instead of an Invalid Date.
  const m = params.m && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.m) ? params.m : undefined;
  const today = new Date();
  const anchor = m
    ? new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1)
    : new Date(today.getFullYear(), today.getMonth(), 1);

  // Closing a sheet returns to the calendar with every other param kept (the
  // month being viewed); the sheet's own params go.
  const closeHref = (() => {
    const keep = new URLSearchParams();
    if (m) keep.set("m", m);
    const qs = keep.toString();
    return qs ? `/calendar?${qs}` : "/calendar";
  })();
  // A meeting opens in the sheet over the month being viewed, so keep ?m=.
  const hrefOf = (e: CalendarEntry) => (e.kind === "meeting" && m ? `${e.href}&m=${m}` : e.href);
  const newHref = m ? `/calendar?m=${m}&new=meeting` : "/calendar?new=meeting";
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59);

  const creating = params.new === "meeting" && !openMeetingId;
  const [entries, pendingMeetings, clientRows] = await Promise.all([
    getCalendarEntries(monthStart, monthEnd),
    prisma.meeting.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        title: true,
        type: true,
        scheduledDate: true,
        scheduledTime: true,
        durationMinutes: true,
        guestName: true,
        guestEmail: true,
        notes: true,
        contactSubmission: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, company: true } },
      },
      orderBy: { scheduledDate: "asc" },
    }),
    // Only the create sheet needs the client list (and the prefilled client).
    creating
      ? prisma.client.findMany({
          orderBy: [{ company: "asc" }, { name: "asc" }],
          select: { id: true, name: true, company: true },
        })
      : Promise.resolve([]),
  ]);
  const clientOptions = clientRows.map((c) => ({ id: c.id, label: clientLabel(c) }));
  const lockedClient = prefillClientId
    ? (clientOptions.find((c) => c.id === prefillClientId) ?? null)
    : null;

  const byDay = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const list = byDay.get(entry.date) ?? [];
    list.push(entry);
    byDay.set(entry.date, list);
  }

  // Monday-first grid.
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = monthEnd.getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthKey = (offset: number) => {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const todayKey = dayKey(new Date());
  const upcoming = entries.filter((e) => e.date >= todayKey).slice(0, 12);

  return (
    <div className="space-y-4">
      <PageHeader
        title={monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        crumbs={[{ label: "Calendar" }]}
        description="Meetings plus every date that bites: proposal expiry, launch targets, payment due dates, unsigned contracts."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Button asChild variant="outline">
              <Link href={`/calendar?m=${monthKey(-1)}`} aria-label="Previous month">
                ←
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/calendar">Today</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/calendar?m=${monthKey(1)}`} aria-label="Next month">
                →
              </Link>
            </Button>
            <Button asChild variant="brand">
              <Link href={newHref}>
                <Plus className="size-3.5" />
                New meeting
              </Link>
            </Button>
          </div>
        }
      />

      {pendingMeetings.length > 0 && (
        <Panel
          title="Meeting requests awaiting a decision"
          description="These came from the website booking form"
          flush
        >
          <ul className="rows">
            {pendingMeetings.map((meeting) => (
              <li key={meeting.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <StatusPill registry="meetingType" value={meeting.type} variant="dot" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/calendar?meeting=${meeting.id}${m ? `&m=${m}` : ""}`}
                    className="block truncate text-base font-medium hover:underline"
                  >
                    {meeting.title}
                  </Link>
                  <p className="truncate text-meta text-muted-foreground">
                    {fmtDate(meeting.scheduledDate)} at {meeting.scheduledTime} ·{" "}
                    {meeting.durationMinutes} min
                    <WithLink who={meetingWith(meeting)} lead="· " />
                    {meeting.guestEmail && ` · ${meeting.guestEmail}`}
                  </p>
                </div>
                <MeetingActions meetingId={meeting.id} title={meeting.title} status="PENDING" />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel flush>
          <div className="grid grid-cols-7 border-b border-border bg-surface">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="telemetry px-2 py-1.5 text-subtle-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const key = day
                ? `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : null;
              const dayEntries = key ? (byDay.get(key) ?? []) : [];
              const isToday = key === todayKey;
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[86px] border-b border-e border-border p-1.5 last:border-e-0",
                    !day && "bg-surface/40",
                    isToday && "bg-brand-soft",
                  )}
                >
                  {day && (
                    <>
                      <span
                        className={cn(
                          "font-mono text-micro tabular-nums",
                          isToday ? "font-semibold text-brand" : "text-subtle-foreground",
                        )}
                      >
                        {String(day).padStart(2, "0")}
                      </span>
                      <ul className="mt-1 space-y-0.5">
                        {dayEntries.slice(0, 3).map((entry) => (
                          <li key={entry.id}>
                            <Link
                              href={hrefOf(entry)}
                              title={`${KIND_LABEL[entry.kind]} — ${entry.title}`}
                              className="flex items-center gap-1 rounded-xs px-0.5 hover:bg-surface"
                            >
                              <span
                                className={cn("size-1 shrink-0 rounded-full", toneDot[entry.tone])}
                                aria-hidden
                              />
                              <span className="min-w-0 truncate text-micro">{entry.title}</span>
                            </Link>
                          </li>
                        ))}
                        {dayEntries.length > 3 && (
                          <li className="px-0.5 font-mono text-micro text-subtle-foreground">
                            +{dayEntries.length - 3} more
                          </li>
                        )}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Coming up" description="Next twelve dates this month" flush>
          {upcoming.length === 0 ? (
            <p className="px-3 py-6 text-base text-muted-foreground">
              Nothing scheduled for the rest of this month.
            </p>
          ) : (
            <ul className="rows">
              {upcoming.map((entry) => (
                // The row link is stretched over the whole row; the "with" line sits
                // above it (z-10) so a client name stays its own link, not a nested <a>.
                <li key={entry.id} className="relative flex gap-2.5 px-3 py-2 hover:bg-surface/70">
                  <span
                    className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", toneDot[entry.tone])}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <Link
                      href={hrefOf(entry)}
                      className="block truncate text-base after:absolute after:inset-0"
                    >
                      {entry.title}
                    </Link>
                    <span className="block font-mono text-micro text-subtle-foreground">
                      {entry.date}
                      {entry.time && ` ${entry.time}`} · {KIND_LABEL[entry.kind]}
                      {entry.kind === "meeting" && entry.detail && ` · ${entry.detail}`}
                    </span>
                    {entry.with && (
                      <span className="relative z-10 block truncate text-meta text-muted-foreground">
                        <WithLink who={entry.with} />
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {entries.length === 0 && pendingMeetings.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="Nothing on the calendar this month"
          body="Meetings booked from the website, proposal expiry dates, project launch targets and payment due dates land here on their own. Schedule a meeting to put the first one on the grid."
          action={
            <Button asChild variant="outline">
              <Link href={newHref}>Schedule a meeting</Link>
            </Button>
          }
        />
      )}

      {openMeetingId && <MeetingDetail id={openMeetingId} closeHref={closeHref} />}
      {creating && (
        <SheetShell
          title="New meeting"
          description="Scheduled and agreed — it goes straight on the calendar."
          closeHref={closeHref}
        >
          <NewMeetingForm clients={clientOptions} lockedClient={lockedClient} closeHref={closeHref} />
        </SheetShell>
      )}
    </div>
  );
}

/** The "with" of a meeting: a client or lead is a link, a bare guest is text. */
function WithLink({ who, lead = "" }: { who: CalendarEntry["with"]; lead?: string }) {
  if (!who) return null;
  return (
    <>
      {lead && ` ${lead}`}
      {who.type ? (
        <EntityLink type={who.type} id={who.id} muted>
          {who.label}
        </EntityLink>
      ) : (
        who.label
      )}
    </>
  );
}
