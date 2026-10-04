import { prisma, type Client } from "@repo/database";

import {
  EmailNotConfiguredError,
  EmailSendError,
  emailTransport,
  looksLikeAnAddress,
  sendEmail,
} from "@/lib/email";

export class ClientHasNoAddressError extends Error {
  constructor(label: string) {
    super(`${label} has no email address on file.`);
    this.name = "ClientHasNoAddressError";
  }
}

export interface SendDocumentInput {
  client: Pick<Client, "id" | "name" | "company" | "email">;
  subject: string;
  body: string;
  relatedProposalId?: string;
  relatedContractId?: string;
}

export interface SentEmail {
  id: string;
  providerMessageId: string;
  transport: string;
}

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
