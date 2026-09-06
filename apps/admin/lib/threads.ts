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
