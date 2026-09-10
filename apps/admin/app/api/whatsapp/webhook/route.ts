import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { linkClientToLead, prisma, type Prisma } from "@repo/database";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function isValidSignature(
  rawBody: string,
  header: string | null,
  appSecret = process.env.WHATSAPP_APP_SECRET,
  isProduction = process.env.NODE_ENV === "production",
): boolean {
  if (!appSecret) {
    // Fails closed in production. This endpoint is exempt from the session
    // guard and writes to the CRM — an unsigned payload accepted here becomes a
    // client row and an inbound message nobody sent. The previous version
    // accepted anything when the secret was absent and left a comment asking
    // for it to be set before real traffic; a comment is not an enforcement,
    // and production ran open on exactly that gap.
    //
    // Local development keeps the tolerance on purpose: Meta cannot reach a
    // laptop, so the only way to exercise this handler there is to post to it
    // by hand.
    if (isProduction) {
      console.error(
        "WhatsApp webhook rejected: WHATSAPP_APP_SECRET is not set, so no payload can be verified.",
      );
      return false;
    }
    return true;
  }
  if (!header?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = header.slice("sha256=".length);
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

interface WebhookStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
}

interface WebhookContact {
  profile?: { name?: string };
  wa_id: string;
}

interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface WebhookValue {
  statuses?: WebhookStatus[];
  messages?: WebhookMessage[];
  contacts?: WebhookContact[];
}

interface WebhookPayload {
  entry?: { changes?: { field: string; value: WebhookValue }[] }[];
}

async function handleStatusUpdate(status: WebhookStatus) {
  const record = await prisma.whatsAppMessage.findUnique({
    where: { waMessageId: status.id },
  });
  if (!record) return;

  const timestamp = new Date(Number(status.timestamp) * 1000);
  const data: Prisma.WhatsAppMessageUpdateInput = {};

  if (status.status === "sent") {
    data.status = "SENT";
    data.sentAt = timestamp;
  } else if (status.status === "delivered") {
    data.status = "DELIVERED";
    data.deliveredAt = timestamp;
  } else if (status.status === "read") {
    data.status = "READ";
    data.readAt = timestamp;
  } else if (status.status === "failed") {
    data.status = "FAILED";
  }

  await prisma.whatsAppMessage.update({ where: { id: record.id }, data });

  if (record.relatedProposalId) {
    const proposalData: Prisma.ProposalUpdateInput = {};
    if (status.status === "delivered") proposalData.deliveredAt = timestamp;
    if (status.status === "read") proposalData.readAt = timestamp;
    if (Object.keys(proposalData).length > 0) {
      await prisma.proposal
        .update({ where: { id: record.relatedProposalId }, data: proposalData })
        .catch(() => null);
    }
  }
}

async function handleInboundMessage(
  message: WebhookMessage,
  contacts: WebhookContact[] | undefined,
) {
  const existing = await prisma.whatsAppMessage.findUnique({
    where: { waMessageId: message.id },
  });
  if (existing) return;

  const name = contacts?.find((c) => c.wa_id === message.from)?.profile?.name;

  const client = await linkClientToLead({
    phone: message.from,
    name,
    source: "WHATSAPP_INBOUND",
  });
  if (!client) return;

  await prisma.whatsAppMessage.create({
    data: {
      clientId: client.id,
      direction: "INBOUND",
      status: "DELIVERED",
      waMessageId: message.id,
      body: message.text?.body ?? `[unsupported message type: ${message.type}]`,
      sentAt: new Date(Number(message.timestamp) * 1000),
    },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;

        for (const status of change.value.statuses ?? []) {
          await handleStatusUpdate(status);
        }
        for (const message of change.value.messages ?? []) {
          await handleInboundMessage(message, change.value.contacts);
        }
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("WhatsApp webhook processing error:", error);
    }
  }

  // Meta requires 200 regardless of internal processing outcome, or it will
  // retry (and eventually disable) the webhook.
  return NextResponse.json({ success: true });
}
