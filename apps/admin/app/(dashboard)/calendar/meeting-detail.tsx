import { prisma } from "@repo/database";
import { MetaList } from "@/components/os/detail-layout";
import { EntityAudit } from "@/components/os/entity-audit";
import { EntityLink } from "@/components/os/entity-link";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { clientLabel, dayKey } from "@/lib/calendar-data";
import { date as fmtDate } from "@/lib/format";
import { httpUrl } from "@/lib/http-url";
import { MeetingActions } from "./meeting-actions";
import { AdminNotesForm, LinkClientButton, RescheduleForm } from "./meeting-forms";
import { SheetShell } from "./sheet-shell";

/**
 * One meeting, in the calendar's side panel. Server-rendered so the audit trail
 * (an async server component) can sit inside the client-side sheet shell.
 */
export async function MeetingDetail({ id, closeHref }: { id: string; closeHref: string }) {
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true } },
      contactSubmission: {
        select: {
          id: true,
          name: true,
          client: { select: { id: true, name: true, company: true } },
        },
      },
    },
  });

  if (!meeting) {
    return (
      <SheetShell title="Meeting not found" closeHref={closeHref}>
        <p className="text-base text-muted-foreground">
          This meeting no longer exists. It may have been deleted.
        </p>
      </SheetShell>
    );
  }

  // The link is operator-typed; only http(s) becomes an anchor, anything else
  // is shown as inert text so a stored `javascript:` can never be followed.
  const safeUrl = meeting.meetingUrl && httpUrl.safeParse(meeting.meetingUrl).success ? meeting.meetingUrl : null;

  // A booking from the site arrives with a lead only. Once the lead has become
  // a client, offer to attach the meeting to that client.
  const linkable =
    !meeting.client && meeting.contactSubmission?.client ? meeting.contactSubmission.client : null;

  const day = dayKey(meeting.scheduledDate);
  const items: { label: string; value: React.ReactNode }[] = [
    { label: "Type", value: <StatusPill registry="meetingType" value={meeting.type} variant="dot" /> },
    { label: "When", value: `${fmtDate(meeting.scheduledDate)} at ${meeting.scheduledTime}` },
    { label: "Duration", value: `${meeting.durationMinutes} min` },
    {
      label: "Client",
      value: meeting.client ? (
        <EntityLink type="client" id={meeting.client.id}>
          {clientLabel(meeting.client)}
        </EntityLink>
      ) : (
        "—"
      ),
    },
  ];
  if (meeting.contactSubmission) {
    items.push({
      label: "Lead",
      value: (
        <EntityLink type="submission" id={meeting.contactSubmission.id}>
          {meeting.contactSubmission.name}
        </EntityLink>
      ),
    });
  }
  if (meeting.guestName || meeting.guestEmail) {
    items.push({
      label: "Guest",
      value: [meeting.guestName, meeting.guestEmail].filter(Boolean).join(" · "),
    });
  }
  items.push({
    label: "Link",
    value: safeUrl ? (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all underline-offset-2 hover:underline"
      >
        {safeUrl}
      </a>
    ) : meeting.meetingUrl ? (
      <span className="break-all text-muted-foreground" title="Not an http(s) address, so it is not linked">
        {meeting.meetingUrl}
      </span>
    ) : (
      "—"
    ),
  });

  return (
    <SheetShell
      title={meeting.title}
      description={
        <span className="inline-flex items-center gap-2">
          <StatusPill registry="meetingStatus" value={meeting.status} />
        </span>
      }
      closeHref={closeHref}
    >
      <Panel flush>
        <MetaList items={items} />
      </Panel>

      {linkable && (
        <div className="flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
          <span>This lead is now a client.</span>
          <LinkClientButton
            meetingId={meeting.id}
            clientId={linkable.id}
            clientName={clientLabel(linkable)}
          />
        </div>
      )}

      {(meeting.description || meeting.notes) && (
        <Panel title="From the guest">
          <p className="whitespace-pre-wrap text-base">{meeting.notes ?? meeting.description}</p>
        </Panel>
      )}

      <Panel title="Status">
        <MeetingActions
          meetingId={meeting.id}
          title={meeting.title}
          status={meeting.status}
          afterDeleteHref={closeHref}
        />
      </Panel>

      <Panel title="Reschedule">
        <RescheduleForm
          key={`${day}|${meeting.scheduledTime}|${meeting.durationMinutes}|${meeting.meetingUrl ?? ""}`}
          meetingId={meeting.id}
          date={day}
          time={meeting.scheduledTime}
          duration={meeting.durationMinutes}
          url={meeting.meetingUrl ?? ""}
        />
      </Panel>

      <Panel title="Internal notes">
        <AdminNotesForm key={meeting.adminNotes ?? ""} meetingId={meeting.id} notes={meeting.adminNotes ?? ""} />
      </Panel>

      <EntityAudit type="meeting" id={meeting.id} />
    </SheetShell>
  );
}
