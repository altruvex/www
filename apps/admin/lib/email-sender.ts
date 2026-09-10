import { prisma, type Client } from "@repo/database";

import {
  EmailNotConfiguredError,
  EmailSendError,
  emailTransport,
  looksLikeAnAddress,
  sendEmail,
} from "@/lib/email";

/**
 * Sending a document to a client by mail, recorded (§26).
 *
 * The row is written before the send and updated after, the same shape
 * `sendTemplateMessage` uses for WhatsApp: a message that failed is still
 * something that was attempted, and a client's history that only contains
 * successes cannot answer "did we ever try".
 */

export class ClientHasNoAddressError extends Error {
  constructor(label: string) {
    super(`${label} has no email address on file.`);
    this.name = "ClientHasNoAddressError";
  }
}

export interface SendDocumentInput {
  client: Pick<Client, "id" | "name" | "company" | "email">;
  subject: string;
  /** Plain text. The only body — see below. */
  body: string;
  relatedProposalId?: string;
  relatedContractId?: string;
}

export interface SentEmail {
  id: string;
  providerMessageId: string;
  transport: string;
}

/**
 * Plain text, no HTML.
 *
 * A studio sending a proposal is not sending a newsletter. Plain text arrives
 * in the inbox rather than the promotions tab, renders identically everywhere,
 * cannot break, and reads as a person writing to a person — which is what this
 * actually is. An HTML template would be a second design system to keep in step
 * with the deck for no gain the client can see.
 */
export async function sendDocumentEmail(input: SendDocumentInput): Promise<SentEmail> {
  const label = input.client.name || input.client.company || "This client";
  const to = input.client.email?.trim();
  if (!to || !looksLikeAnAddress(to)) throw new ClientHasNoAddressError(label);
  if (emailTransport() === "none") throw new EmailNotConfiguredError();

  const record = await prisma.emailMessage.create({
    data: {
      clientId: input.client.id,
      status: "QUEUED",
      transport: emailTransport(),
      toAddress: to,
      subject: input.subject,
      body: input.body,
      relatedProposalId: input.relatedProposalId,
      relatedContractId: input.relatedContractId,
    },
  });

  try {
    const result = await sendEmail({ to, subject: input.subject, text: input.body });
    await prisma.emailMessage.update({
      where: { id: record.id },
      data: {
        status: "SENT",
        providerMessageId: result.messageId,
        transport: result.transport,
        sentAt: new Date(),
      },
    });
    return { id: record.id, providerMessageId: result.messageId, transport: result.transport };
  } catch (error) {
    // The attempt is kept. A row that vanishes on failure makes a client's
    // history read as though nobody ever tried to reach them.
    await prisma.emailMessage.update({
      where: { id: record.id },
      data: {
        status: "FAILED",
        failureReason:
          error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
      },
    });
    throw error instanceof EmailSendError || error instanceof EmailNotConfiguredError
      ? error
      : new EmailSendError(error instanceof Error ? error.message : String(error));
  }
}
