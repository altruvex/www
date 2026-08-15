import { normalizePhone, prisma } from "@repo/database";

const GRAPH_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

interface GraphApiResponse {
  messages: { id: string }[];
}

async function callGraphApi(body: unknown): Promise<GraphApiResponse> {
  const accessToken = requireEnv("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = requireEnv("WHATSAPP_PHONE_NUMBER_ID");

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `WhatsApp API error (${res.status}): ${data?.error?.message ?? JSON.stringify(data)}`,
    );
  }
  return data as GraphApiResponse;
}

interface SendResult {
  whatsAppMessageId: string;
  waMessageId: string;
}

interface SendTemplateMessageInput {
  clientId: string;
  phone: string;
  templateName: string;
  bodyParams: string[];
  languageCode?: string;
  relatedProposalId?: string;
  relatedContractId?: string;
}

/**
 * Sends a pre-approved WhatsApp template message. This is the only way to
 * message a client who hasn't messaged in the last 24h — required for the
 * first outbound send (proposal, contract, onboarding). templateName must
 * match a template already approved in the Meta Business Manager.
 */
export async function sendTemplateMessage(
  input: SendTemplateMessageInput,
): Promise<SendResult> {
  const record = await prisma.whatsAppMessage.create({
    data: {
      clientId: input.clientId,
      direction: "OUTBOUND",
      status: "QUEUED",
      templateName: input.templateName,
      body: input.bodyParams.join(" | "),
      relatedProposalId: input.relatedProposalId,
      relatedContractId: input.relatedContractId,
    },
  });

  try {
    const data = await callGraphApi({
      messaging_product: "whatsapp",
      to: normalizePhone(input.phone),
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode ?? "en_US" },
        ...(input.bodyParams.length
          ? {
              components: [
                {
                  type: "body",
                  parameters: input.bodyParams.map((text) => ({
                    type: "text",
                    text,
                  })),
                },
              ],
            }
          : {}),
      },
    });

    const waMessageId = data.messages[0].id;

    await prisma.whatsAppMessage.update({
      where: { id: record.id },
      data: { waMessageId, status: "SENT", sentAt: new Date() },
    });

    return { whatsAppMessageId: record.id, waMessageId };
  } catch (error) {
    await prisma.whatsAppMessage.update({
      where: { id: record.id },
      data: { status: "FAILED" },
    });
    throw error;
  }
}

interface SendTextMessageInput {
  clientId: string;
  phone: string;
  body: string;
  relatedProposalId?: string;
  relatedContractId?: string;
}

/**
 * Sends free-form text. Only deliverable inside the 24h window opened by the
 * client's last inbound message — Meta rejects this outside that window.
 */
export async function sendTextMessage(
  input: SendTextMessageInput,
): Promise<SendResult> {
  const record = await prisma.whatsAppMessage.create({
    data: {
      clientId: input.clientId,
      direction: "OUTBOUND",
      status: "QUEUED",
      body: input.body,
      relatedProposalId: input.relatedProposalId,
      relatedContractId: input.relatedContractId,
    },
  });

  try {
    const data = await callGraphApi({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhone(input.phone),
      type: "text",
      text: { body: input.body },
    });

    const waMessageId = data.messages[0].id;

    await prisma.whatsAppMessage.update({
      where: { id: record.id },
      data: { waMessageId, status: "SENT", sentAt: new Date() },
    });

    return { whatsAppMessageId: record.id, waMessageId };
  } catch (error) {
    await prisma.whatsAppMessage.update({
      where: { id: record.id },
      data: { status: "FAILED" },
    });
    throw error;
  }
}
