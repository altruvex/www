"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/database";
import { authorize } from "@/lib/authorize";
import { recordActivity, userActor } from "@/lib/activity-log";

/**
 * Notes on a client — the operator's own running record of a company.
 *
 * Every write lands in the audit trail, but the note body never goes into the
 * event summary or metadata: summaries are what the activity feed and Slack
 * show, and a note can hold things that were never meant to leave the admin
 * (a negotiation position, a personal detail). The trail records that a note
 * was added or changed and by whom; the note itself stays on the client.
 *
 * Deleting goes through `deleteRecords` with the `clientNote` entry in
 * `lib/deletable.ts`, like every other delete.
 */

type Result = { ok: true; message?: string } | { ok: false; message: string };

const MAX_BODY = 5000;

async function permitted() {
  try {
    return await authorize("edit", "client");
  } catch {
    return null;
  }
}

function clientLabel(client: { company: string | null; name: string | null; phone: string }) {
  return client.company || client.name || client.phone;
}

export async function addClientNote(clientId: string, rawBody: string): Promise<Result> {
  const session = await permitted();
  if (!session) return { ok: false, message: "Your role cannot add notes to a client." };

  const body = rawBody.trim();
  if (!body) return { ok: false, message: "Write the note first." };
  if (body.length > MAX_BODY) {
    return { ok: false, message: `A note can be at most ${MAX_BODY} characters.` };
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, company: true, name: true, phone: true },
  });
  if (!client) return { ok: false, message: "That client no longer exists." };

  const authorLabel = session.user.name || session.user.email || "Unknown user";
  const note = await prisma.clientNote.create({
    data: { clientId, body, authorId: session.user.id, authorLabel },
  });

  await recordActivity({
    action: "client.note_added",
    actor: userActor(session),
    entityType: "client",
    entityId: client.id,
    entityLabel: clientLabel(client),
    summary: `Added a note to ${clientLabel(client)}`,
    metadata: { noteId: note.id },
  });

  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

export async function editClientNote(noteId: string, rawBody: string): Promise<Result> {
  const session = await permitted();
  if (!session) return { ok: false, message: "Your role cannot edit client notes." };

  const body = rawBody.trim();
  if (!body) return { ok: false, message: "A note cannot be empty. Delete it instead." };
  if (body.length > MAX_BODY) {
    return { ok: false, message: `A note can be at most ${MAX_BODY} characters.` };
  }

  const note = await prisma.clientNote.findUnique({
    where: { id: noteId },
    include: { client: { select: { id: true, company: true, name: true, phone: true } } },
  });
  if (!note) return { ok: false, message: "That note no longer exists." };
  if (note.body === body) return { ok: true, message: "Nothing changed." };

  await prisma.clientNote.update({ where: { id: noteId }, data: { body } });

  // Lengths rather than the text: enough to see that a note was rewritten
  // rather than touched up, without copying its contents into the trail.
  await recordActivity({
    action: "client.note_edited",
    actor: userActor(session),
    entityType: "client",
    entityId: note.client.id,
    entityLabel: clientLabel(note.client),
    summary: `Edited a note on ${clientLabel(note.client)}`,
    before: { length: note.body.length },
    after: { length: body.length },
    metadata: { noteId },
  });

  revalidatePath(`/clients/${note.client.id}`);
  return { ok: true };
}

export async function setClientNotePinned(noteId: string, pinned: boolean): Promise<Result> {
  const session = await permitted();
  if (!session) return { ok: false, message: "Your role cannot pin client notes." };

  const note = await prisma.clientNote.findUnique({
    where: { id: noteId },
    include: { client: { select: { id: true, company: true, name: true, phone: true } } },
  });
  if (!note) return { ok: false, message: "That note no longer exists." };
  if (note.pinned === pinned) return { ok: true, message: "Nothing changed." };

  await prisma.clientNote.update({ where: { id: noteId }, data: { pinned } });

  await recordActivity({
    action: pinned ? "client.note_pinned" : "client.note_unpinned",
    actor: userActor(session),
    entityType: "client",
    entityId: note.client.id,
    entityLabel: clientLabel(note.client),
    summary: `${pinned ? "Pinned" : "Unpinned"} a note on ${clientLabel(note.client)}`,
    before: { pinned: note.pinned },
    after: { pinned },
    metadata: { noteId },
  });

  revalidatePath(`/clients/${note.client.id}`);
  return { ok: true };
}
