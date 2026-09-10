import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { prisma } from "@repo/database";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { EmptyState } from "@/components/os/empty-state";
import { StatusPill } from "@/components/ui/badge";
import { dayKey, getCalendarEntries, type CalendarEntry } from "@/lib/calendar-data";
import { toneDot } from "@/lib/status";
import { cn } from "@/lib/utils";
import { date as fmtDate } from "@/lib/format";
import { MeetingActions } from "./meeting-actions";
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
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const today = new Date();
  const anchor = m ? new Date(`${m}-01T00:00:00Z`) : new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59);

  const [entries, pendingMeetings] = await Promise.all([
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
      },
      orderBy: { scheduledDate: "asc" },
    }),
  ]);

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
          <div className="flex items-center gap-1.5">
            <Button asChild variant="outline">
              <Link href={`/calendar?m=${monthKey(-1)}`}>
                ←
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/calendar">
                Today
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/calendar?m=${monthKey(1)}`}>
                →
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
                  <p className="truncate text-base font-medium">{meeting.title}</p>
                  <p className="truncate text-meta text-muted-foreground">
                    {fmtDate(meeting.scheduledDate)} at {meeting.scheduledTime} ·{" "}
                    {meeting.durationMinutes} min
                    {meeting.guestName && ` · ${meeting.guestName}`}
                    {meeting.guestEmail && ` · ${meeting.guestEmail}`}
                  </p>
                </div>
                <MeetingActions meetingId={meeting.id} title={meeting.title} />
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
                              href={entry.href}
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
                <li key={entry.id}>
                  <Link href={entry.href} className="flex gap-2.5 px-3 py-2 hover:bg-surface/70">
                    <span
                      className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", toneDot[entry.tone])}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base">{entry.title}</span>
                      <span className="block font-mono text-micro text-subtle-foreground">
                        {entry.date}
                        {entry.time && ` ${entry.time}`} · {KIND_LABEL[entry.kind]}
                      </span>
                    </span>
                  </Link>
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
          body="This grid fills itself: meetings booked from the website, proposal expiry dates, project launch targets and payment due dates all land here without anyone entering them twice."
        />
      )}
    </div>
  );
}
