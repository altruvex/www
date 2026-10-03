import { prisma } from "@repo/database";

/**
 * §12 — a conversation is not a list of messages, it is a list of messages
 * BOUND TO A BUSINESS ENTITY. Every thread here is keyed by client, and every
 * message carries the proposal or contract it was sent about, so "what did we
 * tell them about the price" is one click from the deal, not a search.
 */
export interface Thread {
  clientId: string;
  clientName: string;
  phone: string;
  lastMessage: string;
  lastAt: Date;
  lastDirection: "INBOUND" | "OUTBOUND";
  unanswered: boolean;
  failed: number;
  total: number;
  stage: string;
}

export async function getThreads(): Promise<Thread[]> {
  const clients = await prisma.client.findMany({
    where: { messages: { some: {} } },
    select: {
      id: true,
      name: true,
      company: true,
      phone: true,
      status: true,
      messages: {
        orderBy: { createdAt: "desc" },
        select: { id: true, body: true, direction: true, createdAt: true, status: true },
      },
    },
  });

  return clients
    .map((client) => {
      const messages = client.messages;
      const last = messages[0];
      const lastInbound = messages.find((m) => m.direction === "INBOUND");
      const lastOutbound = messages.find((m) => m.direction === "OUTBOUND");
      const unanswered = Boolean(
        lastInbound &&
          (!lastOutbound || lastOutbound.createdAt < lastInbound.createdAt),
      );

      return {
        clientId: client.id,
        clientName: client.company || client.name || client.phone,
        phone: client.phone,
        lastMessage: last.body.replace(/\s+/g, " ").trim(),
        lastAt: last.createdAt,
        lastDirection: last.direction as "INBOUND" | "OUTBOUND",
        unanswered,
        failed: messages.filter((m) => m.status === "FAILED").length,
        total: messages.length,
        stage: client.status,
      };
    })
    .sort((a, b) => {
      // Unanswered first: this list exists to stop people being left hanging.
      if (a.unanswered !== b.unanswered) return a.unanswered ? -1 : 1;
      return b.lastAt.getTime() - a.lastAt.getTime();
    });
}

/* -------------------------------------------------------------------------- */
/* Unified conversations (WhatsApp + email)                                    */
/* -------------------------------------------------------------------------- */

export type Channel = "whatsapp" | "email";

/**
 * One row per client across both channels. Email is outbound only today — there
 * is no inbound mail ingestion — so an email can never *be* the thing a client
 * is waiting on; `unanswered` is therefore decided by WhatsApp alone. An email
 * we sent after their WhatsApp question does not clear it: they asked on one
 * channel and nothing on that channel has answered.
 */
export interface ConversationThread extends Thread {
  channels: Channel[];
  lastChannel: Channel;
  /** When the client's oldest still-unanswered WhatsApp message arrived. */
  waitingSince: Date | null;
  /** Where the row opens: the one channel's page, or the merged view when both are used. */
  href: string;
}

export async function getConversationThreads(): Promise<ConversationThread[]> {
  const clients = await prisma.client.findMany({
    where: { OR: [{ messages: { some: {} } }, { emails: { some: {} } }] },
    select: {
      id: true,
      name: true,
      company: true,
      phone: true,
      status: true,
      messages: {
        orderBy: { createdAt: "desc" },
        select: { body: true, direction: true, createdAt: true, status: true },
      },
      // No body: it can be long and the list only needs the subject.
      emails: {
        orderBy: { createdAt: "desc" },
        select: { subject: true, createdAt: true, status: true },
      },
    },
  });

  const threads = clients.map((client): ConversationThread => {
    const wa = client.messages;
    const mail = client.emails;
    const lastWa = wa[0];
    const lastMail = mail[0];

    // The newest message overall, whichever channel carried it.
    const mailIsLast = Boolean(lastMail && (!lastWa || lastMail.createdAt > lastWa.createdAt));
    const lastAt = mailIsLast ? lastMail!.createdAt : lastWa!.createdAt;
    const lastMessage = mailIsLast ? lastMail!.subject : lastWa!.body;

    // WhatsApp is newest-first: walk the run of inbound messages at the top.
    // Its oldest entry is when the client started waiting.
    let waitingSince: Date | null = null;
    for (const message of wa) {
      if (message.direction !== "INBOUND") break;
      waitingSince = message.createdAt;
    }

    const channels: Channel[] = [];
    if (wa.length) channels.push("whatsapp");
    if (mail.length) channels.push("email");

    return {
      clientId: client.id,
      clientName: client.company || client.name || client.phone,
      phone: client.phone,
      lastMessage: lastMessage.replace(/\s+/g, " ").trim(),
      lastAt,
      lastDirection: mailIsLast ? "OUTBOUND" : (lastWa!.direction as "INBOUND" | "OUTBOUND"),
      unanswered: waitingSince !== null,
      failed:
        wa.filter((m) => m.status === "FAILED").length +
        mail.filter((m) => m.status === "FAILED").length,
      total: wa.length + mail.length,
      stage: client.status,
      channels,
      lastChannel: mailIsLast ? "email" : "whatsapp",
      waitingSince,
      href:
        channels.length > 1
          ? `/inbox?client=${client.id}`
          : channels[0] === "whatsapp"
            ? `/whatsapp/${client.id}`
            : `/email?client=${client.id}`,
    };
  });

  return threads.sort((a, b) => {
    if (a.unanswered !== b.unanswered) return a.unanswered ? -1 : 1;
    // Among the unanswered, the longest wait goes first: the thread closest to
    // a missed reply matters more than the one that just arrived, and a newest-
    // first order would keep burying the same neglected client under fresh ones.
    if (a.unanswered && b.unanswered) {
      return a.waitingSince!.getTime() - b.waitingSince!.getTime();
    }
    return b.lastAt.getTime() - a.lastAt.getTime();
  });
}

/**
 * The numbers on the channel tabs. Cheap on purpose — two grouped maxima and one
 * count instead of loading every message — because every Inbox/WhatsApp/Email
 * page renders them.
 */
export async function getChannelCounts(): Promise<{ unanswered: number; failedEmails: number }> {
  const [inbound, outbound, failedEmails] = await Promise.all([
    prisma.whatsAppMessage.groupBy({
      by: ["clientId"],
      where: { direction: "INBOUND" },
      _max: { createdAt: true },
    }),
    prisma.whatsAppMessage.groupBy({
      by: ["clientId"],
      where: { direction: "OUTBOUND" },
      _max: { createdAt: true },
    }),
    prisma.emailMessage.count({ where: { status: "FAILED" } }),
  ]);
  const lastOutbound = new Map(outbound.map((row) => [row.clientId, row._max.createdAt]));
  const unanswered = inbound.filter((row) => {
    const out = lastOutbound.get(row.clientId);
    return row._max.createdAt && (!out || out < row._max.createdAt);
  }).length;
  return { unanswered, failedEmails };
}

export interface ConversationItem {
  id: string;
  channel: Channel;
  direction: "INBOUND" | "OUTBOUND";
  at: Date;
  /** Email only. */
  subject: string | null;
  body: string;
  status: string;
  failed: boolean;
  failureReason: string | null;
  /** Email only: the address it went to. */
  toAddress: string | null;
  templateName: string | null;
  relatedProposalId: string | null;
  relatedContractId: string | null;
}

/** A client's whole conversation, oldest first, both channels merged. */
export async function getClientConversation(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      company: true,
      phone: true,
      email: true,
      status: true,
      messages: { orderBy: { createdAt: "asc" } },
      emails: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!client) return null;

  const items: ConversationItem[] = [
    ...client.messages.map(
      (m): ConversationItem => ({
        id: m.id,
        channel: "whatsapp",
        direction: m.direction,
        at: m.createdAt,
        subject: null,
        body: m.body,
        status: m.status,
        failed: m.status === "FAILED",
        failureReason: null,
        toAddress: null,
        templateName: m.templateName,
        relatedProposalId: m.relatedProposalId,
        relatedContractId: m.relatedContractId,
      }),
    ),
    ...client.emails.map(
      (m): ConversationItem => ({
        id: m.id,
        channel: "email",
        direction: "OUTBOUND",
        at: m.createdAt,
        subject: m.subject,
        body: m.body,
        status: m.status,
        failed: m.status === "FAILED",
        failureReason: m.failureReason,
        toAddress: m.toAddress,
        templateName: null,
        relatedProposalId: m.relatedProposalId,
        relatedContractId: m.relatedContractId,
      }),
    ),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    client: {
      id: client.id,
      name: client.company || client.name || client.phone,
      phone: client.phone,
      status: client.status,
    },
    items,
    whatsappCount: client.messages.length,
    emailCount: client.emails.length,
  };
}
