import { z } from "zod";

import { prisma } from "@repo/database";

import { recordActivity } from "@/lib/activity-log";
import { clientLabel, SERVICE_INCLUDE, toServiceRow } from "@/lib/client-services";
import { EmailNotConfiguredError, EmailSendError } from "@/lib/email";
import { ClientHasNoAddressError, sendDocumentEmail } from "@/lib/email-sender";
import { reminderDraftFor } from "@/lib/service-reminder";
import { badRequest, conflict, HttpError, notFound, ok, readJson, withAdmin } from "@/lib/with-admin";

/**
 * Telling a client their service is about to renew — the notice the contract
 * promises before each renewal date.
 *
 * Sent by a person, never on a timer. A reminder carries a price and a date
 * to a client; an automated one that went out after the operator had already
 * agreed a different price on the phone is worse than none. The renewal alerts
 * are what make sure the person remembers.
 *
 * Two channels, and they claim different things:
 *   email            sent through the mail transport, recorded as an EmailMessage.
 *   whatsapp-manual  the operator sent it from their own WhatsApp (the Business
 *                    API has no renewal template). Recorded as a manual record —
 *                    no WhatsAppMessage row, because this app sent nothing.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  channel: z.enum(["email", "whatsapp-manual"]),
  subject: z.string().max(200).optional(),
  body: z.string().max(20000).optional(),
});

export const POST = withAdmin<{ id: string }>(async (request, { actor, params }) => {
  const input = await readJson(request, bodySchema);

  const service = await prisma.clientService.findUnique({
    where: { id: params.id },
    include: { ...SERVICE_INCLUDE, client: { select: { id: true, name: true, company: true, email: true, phone: true } } },
  });
  if (!service) throw notFound("That service no longer exists.");
  if (service.status !== "ACTIVE" || !service.expiresAt) {
    throw conflict("Only a registered service with an expiry date has a renewal to remind about.");
  }

  const draft = reminderDraftFor({ ...service, expiresAt: service.expiresAt, clientName: service.client.name });
  const subject = input.subject?.trim() || draft.subject;
  const text = input.body?.trim() || draft.body;

  let emailId: string | null = null;
  if (input.channel === "email") {
    try {
      const sent = await sendDocumentEmail({ client: service.client, subject, body: text });
      emailId = sent.id;
    } catch (error) {
      if (error instanceof ClientHasNoAddressError) throw badRequest(error.message);
      if (error instanceof EmailNotConfiguredError) throw new HttpError(503, error.message);
      if (error instanceof EmailSendError) throw new HttpError(502, error.message);
      throw error;
    }
  }

  const now = new Date();
  const updated = await prisma.clientService.update({
    where: { id: service.id },
    data: { reminderSentFor: service.expiresAt, reminderSentAt: now },
    include: SERVICE_INCLUDE,
  });

  await recordActivity({
    action: "service.reminder_sent",
    actor,
    entityType: "client_service",
    entityId: service.id,
    entityLabel: `${service.name} · ${clientLabel(service.client)}`,
    summary:
      input.channel === "email"
        ? `Emailed ${service.client.email} that ${service.name} renews on ${service.expiresAt.toISOString().slice(0, 10)}`
        : `Recorded a WhatsApp renewal reminder for ${service.name}, sent outside the system`,
    metadata: {
      clientId: service.clientId,
      channel: input.channel,
      manual: input.channel === "whatsapp-manual",
      emailId,
      expiresAt: service.expiresAt.toISOString().slice(0, 10),
    },
  });

  return ok({ service: toServiceRow(updated) });
});
