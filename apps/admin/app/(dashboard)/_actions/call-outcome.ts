"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/database";
import { getOperator } from "@/lib/authorize";
import { recordChange, userActor } from "@/lib/activity-log";
import { CLOSED_FIELDS, followUpClosedReason } from "@/lib/lead-follow-up";
import { startOfBusinessDay } from "@/lib/payment-overdue";
import { can } from "@/lib/rbac";
import { businessDayKey, startOfBusinessDayKey } from "@/lib/working-days";
import {
  CALL_OUTCOME_LABELS,
  CALL_OUTCOMES,
  isLostReason,
  type CallOutcomeValue,
  type ClientStatusValue,
  type LostReasonValue,
} from "@/lib/status";

export interface CallOutcomeInput {
  meetingId: string;
  outcome: string;
  /** What was said on the call; appended to the meeting's internal notes. */
  notes?: string;
  /** "YYYY-MM-DD": the next action, or the nurture review date. */
  nextActionAt?: string | null;
  nextActionNote?: string | null;
  lostReason?: string | null;
  lostNote?: string | null;
  nurtureReason?: string | null;
}

export type CallOutcomeResult = { ok: boolean; message: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Matches the cap the internal-notes editor enforces (api/admin/meetings). */
const ADMIN_NOTES_MAX = 1000;
/** A meeting that was agreed and may now have taken place. */
const RECORDABLE = new Set(["APPROVED", "RESCHEDULED", "COMPLETED"]);
/** Stored statuses a "proposal required" call moves up to QUALIFIED. */
const BEFORE_QUALIFIED = new Set(["NEW", "VIEWED", "CONTACTED", "QUALIFYING", "NURTURE", "LOST"]);
/** Outcomes that change the client, so the meeting needs one linked. */
const NEEDS_CLIENT = new Set<CallOutcomeValue>(["PROPOSAL_REQUIRED", "FOLLOW_UP", "NURTURE", "LOST"]);

const refuse = (message: string): CallOutcomeResult => ({ ok: false, message });

/**
 * A picked "YYYY-MM-DD" as the start of that business day — never the server's
 * own midnight, so the engine reads back the day that was picked. A Friday or
 * Saturday is kept as picked; the working-day rule (lib/working-days.ts) makes
 * it due on the next working day.
 */
function parseDay(day: string | null | undefined): Date | null {
  if (!day || !DATE_RE.test(day)) return null;
  if (Number.isNaN(new Date(`${day}T00:00:00Z`).getTime())) return null;
  return startOfBusinessDayKey(day);
}

/** Local "YYYY-MM-DD", the same day key the calendar uses. */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Records what a call decided (docs/sales-os.md R7/R8). The meeting becomes
 * COMPLETED with its outcome; the linked client moves as the outcome says. A
 * signed or spam client keeps its record — the outcome is still kept on the
 * meeting, and the message says the client was left alone. Refusals come back
 * as `{ ok: false }`, never as a throw.
 */
export async function recordCallOutcome(input: CallOutcomeInput): Promise<CallOutcomeResult> {
  const operator = await getOperator();
  if (!operator || !can(operator.role, "approve", "meeting")) {
    return refuse("Your role cannot record a call outcome.");
  }
  if (!CALL_OUTCOMES.includes(input.outcome as CallOutcomeValue)) {
    return refuse("Pick what the call decided.");
  }
  const outcome = input.outcome as CallOutcomeValue;

  const meeting = await prisma.meeting.findUnique({
    where: { id: input.meetingId },
    select: {
      id: true,
      title: true,
      status: true,
      scheduledDate: true,
      completedAt: true,
      adminNotes: true,
      outcome: true,
      outcomeAt: true,
      clientId: true,
      client: {
        select: {
          id: true,
          name: true,
          company: true,
          phone: true,
          nextActionAt: true,
          nextActionNote: true,
          lostReason: true,
          lostNote: true,
          nurtureReason: true,
          ...CLOSED_FIELDS,
        },
      },
    },
  });
  if (!meeting) return refuse("This meeting no longer exists.");
  if (!RECORDABLE.has(meeting.status)) {
    return refuse("Only an approved or completed meeting can have a call outcome.");
  }
  // Business days, not the server's zone: a call earlier today stays recordable at 01:00.
  const today = startOfBusinessDay(new Date());
  if (startOfBusinessDay(meeting.scheduledDate).getTime() > today.getTime()) {
    return refuse("This call has not happened yet.");
  }

  const client = meeting.client;
  if (NEEDS_CLIENT.has(outcome) && !client) {
    return refuse("Link a client to this meeting first — this outcome moves the client.");
  }
  const closed = client ? followUpClosedReason(client) : null;
  const touchClient = Boolean(client) && !closed;
  if (touchClient && !can(operator.role, "edit", "client")) {
    return refuse("Your role cannot change the client this outcome moves.");
  }

  // The client fields this outcome writes; validated only when they apply.
  let clientData: {
    status: ClientStatusValue;
    nextActionAt: Date | null;
    nextActionNote: string | null;
    lostReason: LostReasonValue | null;
    lostNote: string | null;
    nurtureReason: LostReasonValue | null;
  } | null = null;
  if (client && touchClient) {
    const day = parseDay(input.nextActionAt);
    // The follow-up / review date may be today or later, never in the past —
    // compared as business-day keys, the same calendar the picker uses.
    if (day && businessDayKey(day) < businessDayKey(new Date())) {
      return refuse("Pick today or a later date.");
    }
    const note = input.nextActionNote?.trim().slice(0, 500) || null;
    let status = client.status as ClientStatusValue;
    let nextActionAt: Date | null = client.nextActionAt;
    let nextActionNote: string | null = client.nextActionNote;
    let lostReason = client.lostReason as LostReasonValue | null;
    let lostNote = client.lostNote;
    let nurtureReason = client.nurtureReason as LostReasonValue | null;

    switch (outcome) {
      case "PROPOSAL_REQUIRED":
        if (!day) return refuse("Pick the date the proposal should go out.");
        if (BEFORE_QUALIFIED.has(status)) status = "QUALIFIED";
        nextActionAt = day;
        nextActionNote = note ?? "Send proposal";
        break;
      case "FOLLOW_UP":
        if (!day) return refuse("Pick the date to follow up.");
        nextActionAt = day;
        nextActionNote = note;
        break;
      case "NURTURE":
        if (!isLostReason(input.nurtureReason)) {
          return refuse("Pick why this lead is parked.");
        }
        if (!day) return refuse("Pick the date to review this lead again.");
        status = "NURTURE";
        nurtureReason = input.nurtureReason;
        nextActionAt = day;
        nextActionNote = note ?? "Review nurture";
        break;
      case "LOST":
        if (!isLostReason(input.lostReason)) {
          return refuse("Pick a reason before marking this lost.");
        }
        status = "LOST";
        lostReason = input.lostReason;
        lostNote = input.lostNote?.trim().slice(0, 1000) || null;
        nextActionAt = null;
        nextActionNote = null;
        break;
      case "NO_FURTHER_ACTION":
        nextActionAt = null;
        nextActionNote = null;
        break;
    }
    // A status away from LOST never keeps a lost reason; away from NURTURE, no nurture reason.
    if (status !== "LOST") {
      lostReason = null;
      lostNote = null;
    }
    if (status !== "NURTURE") nurtureReason = null;
    clientData = { status, nextActionAt, nextActionNote, lostReason, lostNote, nurtureReason };
  }

  const now = new Date();
  const callNotes = input.notes?.trim();
  let adminNotes = meeting.adminNotes;
  if (callNotes) {
    const entry = `Call notes (${dayKey(now)}): ${callNotes}`;
    adminNotes = meeting.adminNotes ? `${meeting.adminNotes}\n\n${entry}` : entry;
    if (adminNotes.length > ADMIN_NOTES_MAX) {
      const room = ADMIN_NOTES_MAX - (adminNotes.length - callNotes.length);
      return refuse(
        room > 0
          ? `The call notes are too long for this meeting's internal notes; keep them under ${room} characters.`
          : "This meeting's internal notes are full. Shorten them before adding call notes.",
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.meeting.update({
      where: { id: meeting.id },
      data: {
        status: "COMPLETED",
        // A meeting already marked completed keeps the moment it was first completed.
        ...(meeting.completedAt ? {} : { completedAt: now }),
        outcome,
        outcomeAt: now,
        adminNotes,
      },
    });
    if (client && clientData) {
      await tx.client.update({ where: { id: client.id }, data: clientData });
    }
  });

  const actor = userActor(operator.session);
  const label = CALL_OUTCOME_LABELS[outcome].label;
  await recordChange({
    action: "meeting.outcome_recorded",
    actor,
    entityType: "meeting",
    entityId: meeting.id,
    entityLabel: meeting.title,
    summary: `Call outcome recorded: ${label.toLowerCase()}`,
    before: {
      status: meeting.status,
      outcome: meeting.outcome,
      outcomeAt: meeting.outcomeAt?.toISOString() ?? null,
      adminNotes: meeting.adminNotes,
    },
    after: { status: "COMPLETED", outcome, outcomeAt: now.toISOString(), adminNotes },
    ...(meeting.clientId ? { metadata: { clientId: meeting.clientId } } : {}),
  });

  if (client && clientData) {
    await recordChange({
      action: "client.call_outcome_applied",
      actor,
      entityType: "client",
      entityId: client.id,
      entityLabel: client.company || client.name || client.phone || "Unnamed client",
      summary: `After the call: ${label.toLowerCase()}`,
      before: {
        status: client.status,
        nextActionAt: client.nextActionAt?.toISOString() ?? null,
        nextActionNote: client.nextActionNote,
        lostReason: client.lostReason,
        lostNote: client.lostNote,
        nurtureReason: client.nurtureReason,
      },
      after: { ...clientData, nextActionAt: clientData.nextActionAt?.toISOString() ?? null },
      metadata: { meetingId: meeting.id, outcome },
    });

    // The alert for the old date is answered once the date moves. Notifications
    // never break the mutation they follow.
    if (client.nextActionAt?.getTime() !== clientData.nextActionAt?.getTime()) {
      try {
        await prisma.notification.updateMany({
          where: { type: "FOLLOW_UP_DUE", entityType: "client", entityId: client.id, read: false },
          data: { read: true, readAt: now },
        });
      } catch (error) {
        console.error("[call-outcome] clearing the follow-up alert failed", error);
      }
    }
  }

  revalidatePath("/calendar");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/clients");
  revalidatePath("/");
  if (meeting.clientId) revalidatePath(`/clients/${meeting.clientId}`);

  if (closed) return { ok: true, message: `Outcome recorded. ${closed} The client was left as it is.` };
  return { ok: true, message: `Outcome recorded: ${label}.` };
}
