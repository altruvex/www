import { PrismaClient, type ClientSource } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export * from "@prisma/client";

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

interface LinkClientToLeadInput {
  phone: string;
  name?: string | null;
  source: ClientSource;
  contactSubmissionId?: string;
  transparencyLeadId?: string;
}

/**
 * Finds or creates the unified Client row for an inbound lead, so every
 * auto-captured submission lands in the same pipeline as manually-entered
 * clients. Matches on normalized phone; cross-links a source relation onto
 * an existing Client rather than creating a duplicate when the same phone
 * has already come in through the other channel.
 */
export async function linkClientToLead(input: LinkClientToLeadInput) {
  const phone = normalizePhone(input.phone);
  if (!phone) return null;

  const existing = await prisma.client.findFirst({ where: { phone } });

  if (existing) {
    const data: Record<string, unknown> = {};
    if (input.contactSubmissionId && !existing.contactSubmissionId) {
      data.contactSubmissionId = input.contactSubmissionId;
    }
    if (input.transparencyLeadId && !existing.transparencyLeadId) {
      data.transparencyLeadId = input.transparencyLeadId;
    }
    if (!existing.name && input.name) {
      data.name = input.name;
    }
    if (Object.keys(data).length === 0) return existing;
    return prisma.client.update({ where: { id: existing.id }, data });
  }

  return prisma.client.create({
    data: {
      phone,
      name: input.name ?? undefined,
      source: input.source,
      contactSubmissionId: input.contactSubmissionId,
      transparencyLeadId: input.transparencyLeadId,
    },
  });
}
