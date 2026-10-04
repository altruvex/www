import { Building2, CalendarPlus, FilePlus2 } from "lucide-react";

import { prisma } from "@repo/database";
import { MetaList } from "@/components/os/detail-layout";
import { EntityAudit } from "@/components/os/entity-audit";
import { EntityLink } from "@/components/os/entity-link";
import { NextSteps, type NextStep } from "@/components/os/next-steps";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { clientLabel, dayKey } from "@/lib/calendar-data";
import { date as fmtDate } from "@/lib/format";
import { httpUrl } from "@/lib/http-url";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { can } from "@/lib/rbac";
import { MeetingActions } from "./meeting-actions";
import {
  AdminNotesForm,
  LinkClientButton,
  RescheduleForm,
} from "./meeting-forms";
import { SheetShell } from "./sheet-shell";

export async function MeetingDetail({
  id,
  closeHref,
}: {
  id: string;
  closeHref: string;
}) {
  const [role, meeting] = await Promise.all([
    currentRole(),
    prisma.meeting.findUnique({
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
    }),
  ]);
  const canApprove = can(role, "approve", "meeting");
  const canEdit = can(role, "edit", "meeting");

  if (!meeting) {
    return (
      <SheetShell title="Meeting not found" closeHref={closeHref}>
        <p className="text-base text-muted-foreground">
          This meeting no longer exists. It may have been deleted.
        </p>
      </SheetShell>
    );
  }

  const safeUrl =
    meeting.meetingUrl && httpUrl.safeParse(meeting.meetingUrl).success
      ? meeting.meetingUrl
      : null;

  const linkable =
    !meeting.client && meeting.contactSubmission?.client
      ? meeting.contactSubmission.client
      : null;

  const nextSteps: NextStep[] = [];
  const agreed =
    meeting.status === "APPROVED" || meeting.status === "RESCHEDULED";
  if (meeting.client && (meeting.status === "COMPLETED" || agreed)) {
    const clientId = meeting.client.id;
    const proposalHref = `/clients/${clientId}/new-proposal`;
    if (can(role, "create", "proposal") && roleCanOpen(role, proposalHref)) {
      nextSteps.push({
        key: "proposal",
        label: "New proposal",
        hint: `For ${clientLabel(meeting.client)}`,
        icon: FilePlus2,
        href: proposalHref,
        primary: meeting.status === "COMPLETED",
      });
    }
    if (can(role, "create", "meeting") && roleCanOpen(role, "/calendar")) {
      nextSteps.push({
        key: "follow-up",
        label: "Follow-up meeting",
        icon: CalendarPlus,
        href: `/calendar?new=meeting&client=${clientId}`,
      });
    }
    if (roleCanOpen(role, `/clients/${clientId}`)) {
      nextSteps.push({
        key: "client",
        label: "Open client",
        icon: Building2,
        href: `/clients/${clientId}`,
      });
    }
  }

  const day = dayKey(meeting.scheduledDate);
  const items: { label: string; value: React.ReactNode }[] = [
    {
      label: "Type",
      value: (
        <StatusPill registry="meetingType" value={meeting.type} variant="dot" />
      ),
    },
    {
      label: "When",
      value: `${fmtDate(meeting.scheduledDate)} at ${meeting.scheduledTime}`,
    },
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
      value: [meeting.guestName, meeting.guestEmail]
        .filter(Boolean)
        .join(" · "),
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
      <span className="break-all text-muted-foreground">
        {meeting.meetingUrl}
        <span className="block text-meta text-subtle-foreground">
          Not an http(s) address, so it is not linked. Correct it under
          Reschedule.
        </span>
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

      <NextSteps steps={nextSteps} />

      {linkable && canEdit && (
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
          <p className="whitespace-pre-wrap text-base">
            {meeting.notes ?? meeting.description}
          </p>
        </Panel>
      )}

      <Panel title="Status">
        <MeetingActions
          meetingId={meeting.id}
          title={meeting.title}
          status={meeting.status}
          afterDeleteHref={closeHref}
          canApprove={canApprove}
          canDelete={can(role, "delete", "meeting")}
        />
        {!canApprove && (
          <p className="text-meta text-subtle-foreground">
            Your role can view this meeting but not change its status.
          </p>
        )}
      </Panel>

      {canEdit && (
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
      )}

      {canEdit ? (
        <Panel title="Internal notes">
          <AdminNotesForm
            key={meeting.adminNotes ?? ""}
            meetingId={meeting.id}
            notes={meeting.adminNotes ?? ""}
          />
        </Panel>
      ) : meeting.adminNotes ? (
        <Panel title="Internal notes">
          <p className="whitespace-pre-wrap text-base">{meeting.adminNotes}</p>
        </Panel>
      ) : null}

      <EntityAudit type="meeting" id={meeting.id} />
    </SheetShell>
  );
}
