import { z } from "zod";

import { prisma } from "@repo/database";

import { recordActivity, recordChange } from "@/lib/activity-log";
import { EmailNotConfiguredError, EmailSendError } from "@/lib/email";
import { ClientHasNoAddressError, sendDocumentEmail } from "@/lib/email-sender";
import { leadFollowUpDraft } from "@/lib/email-templates";
import { scheduleLink } from "@/lib/lead-follow-up";
import { can } from "@/lib/rbac";
import { badRequest, HttpError, notFound, ok, readJson, withAdmin } from "@/lib/with-admin";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const bodySchema = z.object({
  template: z.enum(["first-reply", "after-call", "check-in"]),
  channel: z.enum(["email", "whatsapp-manual"]),
  subject: z.string().max(200).optional(),
  body: z.string().max(20000).optional(),
  /** "YYYY-MM-DD" for the next follow-up, or null to clear it. */
  nextActionAt: z.string().regex(DATE_RE).nullable(),
  nextActionNote: z.string().max(500).nullable().optional(),
});

/** Stored stages a sent follow-up moves on; every other stage is left alone. */
const NOT_YET_CONTACTED = new Set(["NEW", "VIEWED"]);

/**
 * A follow-up a person chose to send: email through the configured transport,
 * or WhatsApp from their own phone recorded by hand. Sending moves a lead that
 * nobody had contacted to CONTACTED and rolls the next follow-up date, so the
 * alert that prompted it does not stay overdue.
 */
export const POST = withAdmin<{ id: string }>(async (request, { actor, role, params }) => {
  if (!can(role, "edit", "client")) throw new HttpError(403, "Your role cannot edit a client.");
  const input = await readJson(request, bodySchema);

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      company: true,
      email: true,
      phone: true,
      status: true,
      nextActionAt: true,
      nextActionNote: true,
    },
  });
  if (!client) throw notFound("That client no longer exists.");

  const nextActionAt = input.nextActionAt ? new Date(`${input.nextActionAt}T00:00:00`) : null;
  if (nextActionAt && Number.isNaN(nextActionAt.getTime()))
    throw badRequest("Pick a valid date for the next follow-up.");
  const note = nextActionAt ? input.nextActionNote?.trim() || null : null;

  const draft = leadFollowUpDraft(input.template, {
    clientName: client.name,
    scheduleLink: scheduleLink(),
  });
  const subject = input.subject?.trim() || draft.subject;
  const text = input.body?.trim() || draft.body;

  let emailId: string | null = null;
  if (input.channel === "email") {
    try {
      const sent = await sendDocumentEmail({ client, subject, body: text });
      emailId = sent.id;
    } catch (error) {
      if (error instanceof ClientHasNoAddressError) throw badRequest(error.message);
      if (error instanceof EmailNotConfiguredError) throw new HttpError(503, error.message);
      if (error instanceof EmailSendError) throw new HttpError(502, error.message);
      throw error;
    }
  }

  const status = NOT_YET_CONTACTED.has(client.status) ? "CONTACTED" : client.status;
  await prisma.client.update({
    where: { id: client.id },
    data: { status, nextActionAt, nextActionNote: note },
  });

  const label = client.company || client.name || client.phone;
  await recordActivity({
    action: "lead.follow_up_sent",
    actor,
    entityType: "client",
    entityId: client.id,
    entityLabel: label,
    summary:
      input.channel === "email"
        ? `Emailed ${client.email} "${subject}"`
        : `Recorded a WhatsApp follow-up "${subject}", sent outside the system`,
    metadata: {
      template: input.template,
      channel: input.channel,
      manual: input.channel === "whatsapp-manual",
      emailId,
    },
  });
  await recordChange({
    action: "client.lead_record_updated",
    actor,
    entityType: "client",
    entityId: client.id,
    entityLabel: label,
    summary: nextActionAt
      ? `Followed up; next follow-up set for ${input.nextActionAt}`
      : "Followed up; next follow-up cleared",
    before: {
      status: client.status,
      nextActionAt: client.nextActionAt?.toISOString() ?? null,
      nextActionNote: client.nextActionNote,
    },
    after: {
      status,
      nextActionAt: nextActionAt?.toISOString() ?? null,
      nextActionNote: note,
    },
  });

  return ok({ status, nextActionAt: nextActionAt?.toISOString() ?? null });
}, { can: ["send", "message"] });
