"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/database";
import { authorize } from "@/lib/authorize";
import { recordActivity, userActor } from "@/lib/activity-log";
import {
  bulkSetClientStatus,
  convertEstimateToClient,
  convertSubmissionToClient,
  moveClientStage,
  setClientPriority,
  setClientStatus,
  type LostDetails,
} from "./records";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const MAX_BODY = 5000;

async function permitted() {
  try {
    return await authorize("edit", "client");
  } catch {
    return null;
  }
}

function clientLabel(client: {
  company: string | null;
  name: string | null;
  phone: string;
}) {
  return client.company || client.name || client.phone;
}

export async function addClientNote(
  clientId: string,
  rawBody: string,
): Promise<Result> {
  const session = await permitted();
  if (!session)
    return { ok: false, message: "Your role cannot add notes to a client." };

  const body = rawBody.trim();
  if (!body) return { ok: false, message: "Write the note first." };
  if (body.length > MAX_BODY) {
    return {
      ok: false,
      message: `A note can be at most ${MAX_BODY} characters.`,
    };
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

export async function editClientNote(
  noteId: string,
  rawBody: string,
): Promise<Result> {
  const session = await permitted();
  if (!session)
    return { ok: false, message: "Your role cannot edit client notes." };

  const body = rawBody.trim();
  if (!body)
    return { ok: false, message: "A note cannot be empty. Delete it instead." };
  if (body.length > MAX_BODY) {
    return {
      ok: false,
      message: `A note can be at most ${MAX_BODY} characters.`,
    };
  }

  const note = await prisma.clientNote.findUnique({
    where: { id: noteId },
    include: {
      client: { select: { id: true, company: true, name: true, phone: true } },
    },
  });
  if (!note) return { ok: false, message: "That note no longer exists." };
  if (note.body === body) return { ok: true, message: "Nothing changed." };

  await prisma.clientNote.update({ where: { id: noteId }, data: { body } });

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

export async function setClientNotePinned(
  noteId: string,
  pinned: boolean,
): Promise<Result> {
  const session = await permitted();
  if (!session)
    return { ok: false, message: "Your role cannot pin client notes." };

  const note = await prisma.clientNote.findUnique({
    where: { id: noteId },
    include: {
      client: { select: { id: true, company: true, name: true, phone: true } },
    },
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

const STATUS_WORDS: Record<string, string> = {
  NEW: "new",
  VIEWED: "viewed",
  CONTACTED: "contacted",
  QUALIFYING: "qualifying",
  QUALIFIED: "qualified",
  NURTURE: "nurture",
  PROPOSAL_SENT: "proposal sent",
  WON: "won",
  LOST: "lost",
  SPAM: "spam",
};

function refusal(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : "";
  if (message.startsWith("Not permitted:")) {
    const [, action = "change", subject = "record"] = message
      .replace("Not permitted:", "")
      .trim()
      .split(" ");
    return `Your role cannot ${action} a ${subject}.`;
  }
  return message || fallback;
}

function statusWord(status: string) {
  return STATUS_WORDS[status] ?? status.replace(/_/g, " ").toLowerCase();
}

export async function changeClientStatus(
  clientId: string,
  status: string,
  lost?: LostDetails,
): Promise<Result> {
  try {
    await setClientStatus(clientId, status, lost);
    return { ok: true, message: `Marked ${statusWord(status)}.` };
  } catch (err) {
    return { ok: false, message: refusal(err, "The status did not change.") };
  }
}

export async function changeClientPriority(
  clientId: string,
  priority: string,
): Promise<Result> {
  try {
    await setClientPriority(clientId, priority);
    return { ok: true, message: `Priority set to ${priority.toLowerCase()}.` };
  } catch (err) {
    return { ok: false, message: refusal(err, "The priority did not change.") };
  }
}

export async function bulkChangeClientStatus(
  clientIds: string[],
  status: string,
  lost?: LostDetails,
): Promise<Result> {
  if (clientIds.length === 0)
    return { ok: false, message: "Select at least one record first." };
  try {
    const n = await bulkSetClientStatus(clientIds, status, lost);
    if (n === 0)
      return {
        ok: false,
        message:
          "None of the selected records exist any more. Nothing was changed.",
      };
    return {
      ok: true,
      message: `${n} record${n === 1 ? "" : "s"} marked ${statusWord(status)}.`,
    };
  } catch (err) {
    return { ok: false, message: refusal(err, "Nothing was changed.") };
  }
}

export async function moveClientOnBoard(
  clientId: string,
  stage: string,
  lost?: LostDetails,
): Promise<Result> {
  try {
    await moveClientStage(clientId, stage, lost);
    return { ok: true, message: `Moved to ${statusWord(stage)}.` };
  } catch (err) {
    return { ok: false, message: refusal(err, "The card did not move.") };
  }
}

type ConvertResult =
  | {
      ok: true;
      message: string;
      clientId: string;
      created: boolean;
      linked: boolean;
    }
  | { ok: false; message: string };

function convertMessage(
  kind: "submission" | "estimate",
  created: boolean,
  linked: boolean,
): string {
  if (created)
    return `Client record created from this ${kind}. The ${kind} itself is unchanged.`;
  if (linked)
    return `This contact already had a client record — this ${kind} is linked to it, unchanged.`;
  return `This contact already has a client record, which is tied to another ${kind} — this one was not linked.`;
}

export async function convertSubmission(
  submissionId: string,
): Promise<ConvertResult> {
  try {
    const { clientId, created, linked } =
      await convertSubmissionToClient(submissionId);
    return {
      ok: true,
      clientId,
      created,
      linked,
      message: convertMessage("submission", created, linked),
    };
  } catch (err) {
    return {
      ok: false,
      message: refusal(err, "The submission was not converted."),
    };
  }
}

export async function convertEstimate(leadId: string): Promise<ConvertResult> {
  try {
    const { clientId, created, linked } = await convertEstimateToClient(leadId);
    return {
      ok: true,
      clientId,
      created,
      linked,
      message: convertMessage("estimate", created, linked),
    };
  } catch (err) {
    return {
      ok: false,
      message: refusal(err, "The estimate was not converted."),
    };
  }
}
