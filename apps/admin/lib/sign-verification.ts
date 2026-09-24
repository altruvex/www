import "server-only";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma, type Client, type Contract, type SignVerificationChannel } from "@repo/database";

import { emailTransport, looksLikeAnAddress, sendEmail } from "@/lib/email";
import { sendTemplateMessage } from "@/lib/whatsapp-api";

/**
 * Proving the signer is the designated person, not whoever holds the link.
 *
 * A sign link can be forwarded, left open on a shared screen, or read over a
 * shoulder. So the link alone no longer signs: a six-digit code goes to the
 * signer's own WhatsApp or mailbox, and the signature is accepted only with it.
 * What that proves is control of that number or address — the evidence is
 * recorded on the contract as exactly that, never as proof of identity.
 */

export const CODE_TTL_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

/** Must exist as an approved authentication template in Meta Business Manager. */
export const WHATSAPP_CODE_TEMPLATE = "signature_code";

export type ChannelKey = "whatsapp" | "email";

export interface Signer {
  name: string | null;
  phone: string | null;
  email: string | null;
}

export function effectiveSigner(
  contract: Pick<Contract, "signerName" | "signerPhone" | "signerEmail">,
  client: Pick<Client, "name" | "phone" | "email">,
): Signer {
  return {
    name: contract.signerName?.trim() || client.name?.trim() || null,
    phone: contract.signerPhone?.trim() || client.phone?.trim() || null,
    email: contract.signerEmail?.trim() || client.email?.trim() || null,
  };
}

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Channels a code can actually be delivered on — an address exists and a transport is set up. */
export function availableChannels(signer: Signer): { channel: ChannelKey; hint: string }[] {
  const channels: { channel: ChannelKey; hint: string }[] = [];
  if (signer.phone && whatsappConfigured()) {
    channels.push({ channel: "whatsapp", hint: maskPhone(signer.phone) });
  }
  if (signer.email && looksLikeAnAddress(signer.email) && emailTransport() !== "none") {
    channels.push({ channel: "email", hint: maskEmail(signer.email) });
  }
  return channels;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length <= 4 ? "••••" : `•••• ${digits.slice(-4)}`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, 1)}•••@${domain}`;
}

export const toEnum = (channel: ChannelKey): SignVerificationChannel =>
  channel === "whatsapp" ? "WHATSAPP" : "EMAIL";

function hashCode(contractId: string, code: string): string {
  return createHash("sha256").update(`${contractId}:${code}`).digest("hex");
}

export function codeMatches(contractId: string, code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashCode(contractId, code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

export class CodeDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodeDeliveryError";
  }
}

/**
 * Issues a fresh code and delivers it. The previous code stops working the
 * moment this one is stored, and the attempt counter starts again.
 */
export async function issueSignCode(input: {
  contract: Pick<Contract, "id" | "clientId">;
  client: Pick<Client, "name" | "company">;
  signer: Signer;
  channel: ChannelKey;
}): Promise<{ hint: string; expiresAt: Date }> {
  const { contract, client, signer, channel } = input;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);
  const party = client.company || client.name || "your company";

  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      signCodeHash: hashCode(contract.id, code),
      signCodeExpiresAt: expiresAt,
      signCodeSentAt: new Date(),
      signCodeAttempts: 0,
      signCodeChannel: toEnum(channel),
    },
  });

  try {
    if (channel === "whatsapp") {
      if (!signer.phone || !whatsappConfigured()) {
        throw new CodeDeliveryError("WhatsApp is not available for this signer.");
      }
      await sendTemplateMessage({
        clientId: contract.clientId,
        phone: signer.phone,
        templateName: WHATSAPP_CODE_TEMPLATE,
        bodyParams: [code],
        buttonParam: code,
        recordBody: "Signing verification code (not stored)",
        relatedContractId: contract.id,
      });
      return { hint: maskPhone(signer.phone), expiresAt };
    }

    if (!signer.email || !looksLikeAnAddress(signer.email) || emailTransport() === "none") {
      throw new CodeDeliveryError("Email is not available for this signer.");
    }
    await sendCodeEmail({
      clientId: contract.clientId,
      contractId: contract.id,
      to: signer.email,
      party,
      code,
    });
    return { hint: maskEmail(signer.email), expiresAt };
  } catch (error) {
    // A code nobody received must not stay valid.
    await prisma.contract.update({
      where: { id: contract.id },
      data: { signCodeHash: null, signCodeExpiresAt: null },
    });
    throw error instanceof CodeDeliveryError
      ? error
      : new CodeDeliveryError(
          channel === "whatsapp"
            ? "The code could not be sent on WhatsApp. Try email instead, or contact Altruvex."
            : "The code could not be sent by email. Try WhatsApp instead, or contact Altruvex.",
        );
  }
}

async function sendCodeEmail(input: {
  clientId: string;
  contractId: string;
  to: string;
  party: string;
  code: string;
}) {
  const subject = "Your Altruvex signing code";
  const text = (code: string) =>
    [
      `Your code to sign the agreement for ${input.party}:`,
      "",
      code,
      "",
      `It expires in ${CODE_TTL_MINUTES} minutes.`,
      "",
      "If you did not ask for this code, someone else has your signing link. Do not share the",
      "code — reply to this email and tell us.",
      "",
      "Altruvex",
    ].join("\n");

  const record = await prisma.emailMessage.create({
    data: {
      clientId: input.clientId,
      status: "QUEUED",
      transport: emailTransport(),
      toAddress: input.to,
      subject,
      body: text("•••••• (not stored)"),
      relatedContractId: input.contractId,
    },
  });

  try {
    const result = await sendEmail({ to: input.to, subject, text: text(input.code) });
    await prisma.emailMessage.update({
      where: { id: record.id },
      data: {
        status: "SENT",
        providerMessageId: result.messageId,
        transport: result.transport,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.emailMessage.update({
      where: { id: record.id },
      data: {
        status: "FAILED",
        failureReason: (error instanceof Error ? error.message : String(error)).slice(0, 500),
      },
    });
    throw error;
  }
}
