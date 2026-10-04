import { z } from "zod";

import { recordActivity } from "@/lib/activity-log";
import { EmailNotConfiguredError, EmailSendError } from "@/lib/email";
import { ClientHasNoAddressError, sendDocumentEmail } from "@/lib/email-sender";
import { ensureLink } from "@/lib/email-templates";
import { canSeeFinance } from "@/lib/nav";
import { loadPaymentReminder } from "@/lib/payment-reminder";
import { publicBaseUrl } from "@/lib/public-url";
import { badRequest, conflict, HttpError, notFound, ok, readJson, withAdmin } from "@/lib/with-admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  channel: z.enum(["email", "whatsapp-manual"]),
  subject: z.string().max(200).optional(),
  body: z.string().max(20000).optional(),
});

export const POST = withAdmin<{ id: string }>(async (request, { actor, role, params }) => {
  if (!canSeeFinance(role)) throw new HttpError(403, "Your role cannot see billing figures.");
  const input = await readJson(request, bodySchema);

  const target = await loadPaymentReminder(params.id, publicBaseUrl(request));
  if (!target) throw notFound("That payment no longer exists.");
  if (!target.unpaid) throw conflict("Only an unpaid payment has anything to remind about.");
  if (!target.client) throw conflict("This payment has no client left to remind — its retainer was deleted.");
  const client = target.client;
  const clientLabel = client.company || client.name || "the client";

  const subject = input.subject?.trim() || target.draft.subject;
  const edited = input.body?.trim() || target.draft.body;

  let emailId: string | null = null;
  if (input.channel === "email") {
    const text = target.link ? ensureLink(edited, target.link) : edited;
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

  await recordActivity({
    action: "payment.reminder_sent",
    actor,
    entityType: "payment",
    entityId: target.paymentId,
    entityLabel: `${target.label} · ${clientLabel}`,
    summary:
      input.channel === "email"
        ? `Emailed ${client.email} a reminder for ${target.amountLabel} (${target.label})`
        : `Recorded a WhatsApp payment reminder for ${target.amountLabel} (${target.label}), sent outside the system`,
    metadata: {
      clientId: client.id,
      channel: input.channel,
      manual: input.channel === "whatsapp-manual",
      emailId,
      overdue: target.overdue,
      invoiceNumber: target.invoiceNumber,
      dueDate: target.dueDate?.slice(0, 10) ?? null,
    },
  });

  return ok({ paymentId: target.paymentId });
}, { can: ["send", "message"] });
