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
      signal: AbortSignal.timeout(10_000),
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
  buttonParam?: string;
  recordBody?: string;
  languageCode?: string;
  relatedProposalId?: string;
  relatedContractId?: string;
}

export async function sendTemplateMessage(
  input: SendTemplateMessageInput,
): Promise<SendResult> {
  const record = await prisma.whatsAppMessage.create({
    data: {
      clientId: input.clientId,
      direction: "OUTBOUND",
      status: "QUEUED",
      templateName: input.templateName,
      body: input.recordBody ?? input.bodyParams.join(" | "),
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
        ...(input.bodyParams.length || input.buttonParam
          ? {
              components: [
                ...(input.bodyParams.length
                  ? [
                      {
                        type: "body",
                        parameters: input.bodyParams.map((text) => ({
                          type: "text",
                          text,
                        })),
                      },
                    ]
                  : []),
                ...(input.buttonParam
                  ? [
                      {
                        type: "button",
                        sub_type: "url",
                        index: "0",
                        parameters: [{ type: "text", text: input.buttonParam }],
                      },
                    ]
                  : []),
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
