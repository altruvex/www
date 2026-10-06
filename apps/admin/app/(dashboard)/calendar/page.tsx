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
import { currentRole } from "@/lib/authorize";
import { canSeeFinance } from "@/lib/nav";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";

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
  searchParams: Promise<{
    m?: string;
    meeting?: string;
    new?: string;
    client?: string;
  }>;
}) {
  const denied = await gateRoute("/calendar", "the calendar");
  if (denied) return denied;

  const role = await currentRole();
  const finance = canSeeFinance(role);
  const canCreate = can(role, "create", "meeting");
  const canApprove = can(role, "approve", "meeting");
  const canDeleteMeeting = can(role, "delete", "meeting");

  const params = await searchParams;
  const { meeting: openMeetingId, client: prefillClientId } = params;
  const m =
    params.m && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.m) ? params.m : undefined;
  const today = new Date();
  const anchor = m
    ? new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1)
    : new Date(today.getFullYear(), today.getMonth(), 1);

  const closeHref = (() => {
    const keep = new URLSearchParams();
    if (m) keep.set("m", m);
    const qs = keep.toString();
    return qs ? `/calendar?${qs}` : "/calendar";
  })();
  const hrefOf = (e: CalendarEntry) =>
    e.kind === "meeting" && m ? `${e.href}&m=${m}` : e.href;
  const newHref = m ? `/calendar?m=${m}&new=meeting` : "/calendar?new=meeting";
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(
    anchor.getFullYear(),
    anchor.getMonth() + 1,
    0,
    23,
    59,
    59,
  );

  const creating = canCreate && params.new === "meeting" && !openMeetingId;
  const [allEntries, pendingMeetings, clientRows] = await Promise.all([
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
    creating
      ? prisma.client.findMany({
          orderBy: [{ company: "asc" }, { name: "asc" }],
          select: { id: true, name: true, company: true },
        })
      : Promise.resolve([]),
  ]);
  const entries = finance
    ? allEntries
    : allEntries
        .filter((e) => e.kind !== "payment-due")
        .map((e) =>
          e.kind === "proposal-expiry" ? { ...e, detail: undefined } : e,
        );
  const clientOptions = clientRows.map((c) => ({
    id: c.id,
    label: clientLabel(c),
  }));
  const lockedClient = prefillClientId
    ? (clientOptions.find((c) => c.id === prefillClientId) ?? null)
    : null;

  const byDay = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const list = byDay.get(entry.date) ?? [];
    list.push(entry);
    byDay.set(entry.date, list);
  }

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
  const monthOver = dayKey(monthEnd) < todayKey;
  const upcoming = entries.filter((e) => e.date >= todayKey).slice(0, 12);
  const agendaDays = [...byDay.entries()];

  return (
    <div className="space-y-4">
      <PageHeader
        title={monthStart.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}
        crumbs={[{ label: "Calendar" }]}
        description={
          finance
            ? "Meetings plus every date that bites: proposal expiry, launch targets, payment due dates, unsigned contracts."
            : "Meetings plus the delivery dates that bite: proposal expiry, launch targets, unsigned contracts."
        }
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              asChild
              variant="outline"
              className="pointer-coarse:size-11"
            >
              <Link
                href={`/calendar?m=${monthKey(-1)}`}
                aria-label="Previous month"
              >
                ←
              </Link>
            </Button>
            <Button asChild variant="outline" className="pointer-coarse:h-11">
              <Link href="/calendar">Today</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="pointer-coarse:size-11"
            >
              <Link href={`/calendar?m=${monthKey(1)}`} aria-label="Next month">
                →
              </Link>
            </Button>
            {canCreate && (
              <Button asChild variant="brand" className="pointer-coarse:h-11">
                <Link href={newHref}>
                  <Plus className="size-3.5" />
                  New meeting
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {pendingMeetings.length > 0 && (
        <Panel
          title="Meeting requests awaiting a decision"
          description="From the website booking form — every request still waiting, whatever month it falls in"
          flush
        >
          <ul className="rows">
            {pendingMeetings.map((meeting) => (
              <li
                key={meeting.id}
                className="flex flex-wrap items-center gap-3 px-3 py-2.5"
              >
                <StatusPill
                  registry="meetingType"
                  value={meeting.type}
                  variant="dot"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/calendar?meeting=${meeting.id}${m ? `&m=${m}` : ""}`}
                    className="block truncate text-base font-medium hover:underline"
                  >
                    {meeting.title}
                  </Link>
                  <p className="truncate text-meta text-muted-foreground">
                    {fmtDate(meeting.scheduledDate)} at {meeting.scheduledTime}{" "}
                    · {meeting.durationMinutes} min
                    <WithLink who={meetingWith(meeting)} lead="· " />
                    {meeting.guestEmail && ` · ${meeting.guestEmail}`}
                  </p>
                </div>
                <MeetingActions
                  meetingId={meeting.id}
                  title={meeting.title}
                  status="PENDING"
                  canApprove={canApprove}
                  canDelete={canDeleteMeeting}
                />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {agendaDays.length > 0 && (
        <Panel
          title="This month"
          description={`${entries.length} date${entries.length === 1 ? "" : "s"}`}
          flush
          className="sm:hidden"
        >
          <ol className="rows">
            {agendaDays.map(([day, list]) => (
              <li
                key={day}
                className={cn("px-3 py-2", day === todayKey && "bg-brand-soft")}
              >
                <p className="telemetry text-subtle-foreground">
                  {fmtDate(new Date(`${day}T00:00:00`))}
                  {day === todayKey && " · today"}
                </p>
                <ul className="mt-1">
                  {list.map((entry) => (
                    <li
                      key={entry.id}
                      className="relative flex min-h-11 items-center gap-2.5"
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          toneDot[entry.tone],
                        )}
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
                          {entry.time && `${entry.time} · `}
                          {KIND_LABEL[entry.kind]}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel flush className="hidden sm:block">
          <div className="grid grid-cols-7 border-b border-border-subtle bg-surface">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div
                key={day}
                className="telemetry px-2 py-1.5 text-subtle-foreground"
              >
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
                    "min-h-[86px] border-b border-e border-border-subtle p-1.5 last:border-e-0",
                    !day && "bg-surface/40",
                    isToday && "bg-brand-soft",
                  )}
                >
                  {day && (
                    <>
                      <span
                        className={cn(
                          "font-mono text-micro tabular-nums",
                          isToday
                            ? "font-semibold text-brand"
                            : "text-subtle-foreground",
                        )}
                      >
                        {String(day).padStart(2, "0")}
                      </span>
                      <ul className="mt-1 space-y-0.5">
                        {dayEntries.slice(0, 3).map((entry) => (
                          <li key={entry.id}>
                            <Link
                              href={hrefOf(entry)}
                              className="flex items-center gap-1 rounded-xs px-0.5 hover:bg-surface"
                            >
                              <span
                                className={cn(
                                  "size-1 shrink-0 rounded-full",
                                  toneDot[entry.tone],
                                )}
                                aria-hidden
                              />
                              <span className="sr-only">
                                {KIND_LABEL[entry.kind]}:{" "}
                              </span>
                              <span className="min-w-0 truncate text-micro">
                                {entry.title}
                              </span>
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

        <Panel
          title="Coming up"
          description={
            monthOver
              ? "This month is over"
              : "The next twelve dates in this month"
          }
          flush
          className="hidden sm:block"
        >
          {upcoming.length === 0 ? (
            <p className="px-3 py-6 text-base text-muted-foreground">
              {monthOver
                ? "Nothing ahead in a month that has passed. Everything it held is on the grid."
                : "Nothing scheduled for the rest of this month."}
            </p>
          ) : (
            <ul className="rows">
              {upcoming.map((entry) => (
                <li
                  key={entry.id}
                  className="relative flex gap-2.5 px-3 py-2 hover:bg-surface/70"
                >
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      toneDot[entry.tone],
                    )}
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
                      {entry.time && ` ${entry.time}`} ·{" "}
                      {KIND_LABEL[entry.kind]}
                      {entry.kind === "meeting" &&
                        entry.detail &&
                        ` · ${entry.detail}`}
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
          body={`Meetings booked from the website, proposal expiry dates, project launch targets${finance ? " and payment due dates" : ""} land here on their own.${canCreate ? " Schedule a meeting to put the first one on the grid." : ""}`}
          action={
            canCreate ? (
              <Button asChild variant="outline">
                <Link href={newHref}>Schedule a meeting</Link>
              </Button>
            ) : undefined
          }
        />
      )}

      {openMeetingId && (
        <MeetingDetail id={openMeetingId} closeHref={closeHref} />
      )}
      {creating && (
        <SheetShell
          title="New meeting"
          description="Scheduled and agreed — it goes straight on the calendar."
          closeHref={closeHref}
        >
          <NewMeetingForm
            clients={clientOptions}
            lockedClient={lockedClient}
            closeHref={closeHref}
          />
        </SheetShell>
      )}
    </div>
  );
}

function WithLink({
  who,
  lead = "",
}: {
  who: CalendarEntry["with"];
  lead?: string;
}) {
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
