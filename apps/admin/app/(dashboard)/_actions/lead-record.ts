"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/database";
import { authorize } from "@/lib/authorize";
import { recordChange, userActor } from "@/lib/activity-log";
import { clearFollowUpAlerts } from "../clients/[id]/follow-up-alerts";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const MAX_NOTE = 500;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface LeadRecordInput {
  /** Admin user id, or null to clear the owner. */
  ownerId: string | null;
  /** "YYYY-MM-DD", or null to clear the next action. */
  nextActionAt: string | null;
  nextActionNote: string | null;
}

/**
 * Owner and next action on a client. The owner is any ADMIN/SUPERADMIN user;
 * a new owner gets an ASSIGNMENT notification. Nothing is sent outside the
 * admin app — the follow-up only surfaces in the action centre on its date.
 */
export async function updateLeadRecord(
  clientId: string,
  input: LeadRecordInput,
): Promise<Result> {
  let session;
  try {
    session = await authorize("edit", "client");
  } catch {
    return { ok: false, message: "Your role cannot edit a client." };
  }

  const ownerId = input.ownerId?.trim() || null;
  const dateText = input.nextActionAt?.trim() || null;
  const note = input.nextActionNote?.trim() || null;

  if (dateText && !DATE_RE.test(dateText))
    return { ok: false, message: "Pick a valid date for the next action." };
  const nextActionAt = dateText ? new Date(`${dateText}T00:00:00`) : null;
  if (nextActionAt && Number.isNaN(nextActionAt.getTime()))
    return { ok: false, message: "Pick a valid date for the next action." };
  if (note && note.length > MAX_NOTE)
    return { ok: false, message: `The note can be at most ${MAX_NOTE} characters.` };
  if (note && !nextActionAt)
    return { ok: false, message: "Give the next action a date, or clear the note." };

  const before = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      name: true,
      company: true,
      phone: true,
      ownerId: true,
      nextActionAt: true,
      nextActionNote: true,
    },
  });
  if (!before) return { ok: false, message: "That client no longer exists." };

  let owner: { id: string; name: string | null; email: string } | null = null;
  if (ownerId) {
    owner = await prisma.user.findFirst({
      where: { id: ownerId, role: { in: ["ADMIN", "SUPERADMIN"] } },
      select: { id: true, name: true, email: true },
    });
    if (!owner) return { ok: false, message: "The owner must be an admin user." };
  }

  const sameDate =
    (before.nextActionAt?.getTime() ?? null) === (nextActionAt?.getTime() ?? null);
  if (before.ownerId === ownerId && sameDate && (before.nextActionNote ?? null) === note)
    return { ok: true, message: "Nothing changed." };

  await prisma.client.update({
    where: { id: clientId },
    data: { ownerId, nextActionAt, nextActionNote: note },
  });

  const label = before.company || before.name || before.phone || "Unnamed client";
  const ownerChanged = before.ownerId !== ownerId;
  await recordChange({
    action: "client.lead_record_updated",
    actor: userActor(session),
    entityType: "client",
    entityId: clientId,
    entityLabel: label,
    summary: ownerChanged
      ? owner
        ? `Owner set to ${owner.name || owner.email}`
        : "Owner cleared"
      : nextActionAt
        ? `Next action set for ${dateText}`
        : "Next action cleared",
    before: {
      ownerId: before.ownerId,
      nextActionAt: before.nextActionAt?.toISOString() ?? null,
      nextActionNote: before.nextActionNote,
    },
    after: {
      ownerId,
      nextActionAt: nextActionAt?.toISOString() ?? null,
      nextActionNote: note,
    },
  });

  // A notification must never break the mutation it describes.
  if (ownerChanged && owner && owner.id !== session.user.id) {
    try {
      await prisma.notification.create({
        data: {
          type: "ASSIGNMENT",
          title: `You own ${label}`,
          message: `${session.user.name || session.user.email || "An admin"} made you the owner of this lead.`,
          userId: owner.id,
          entityType: "client",
          entityId: clientId,
        },
      });
    } catch (err) {
      console.error("[lead-record] owner notification failed", err);
    }
  }

  // A moved or cleared date answers the chase that was due; the sweep re-arms
  // it on the new date. Best-effort, like the notification above.
  if (!sameDate) await clearFollowUpAlerts(clientId, "lead-record");

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/leads");
  revalidatePath("/");
  return { ok: true, message: "Lead record saved." };
}
