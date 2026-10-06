import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type ClientSource } from "./generated/prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

function assertVerifiedTls(connectionString: string | undefined): void {
  if (process.env.NODE_ENV !== "production" || !connectionString) {
    return;
  }

  const sslmode = /[?&]sslmode=([^&]*)/.exec(connectionString)?.[1];

  if (sslmode !== "verify-full") {
    throw new Error(
      `DATABASE_URL must set sslmode=verify-full in production; it ${
        sslmode ? `sets sslmode=${sslmode}` : "sets no sslmode"
      }. Every other value stops verifying the server's certificate once pg ` +
        `drops the verify-full aliases, and stops without saying so.`,
    );
  }
}

function createPrismaClient(): PrismaClient {
  assertVerifiedTls(process.env.DATABASE_URL);

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export * from "./generated/prisma/client";

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

interface LinkClientToLeadInput {
  phone: string;
  name?: string | null;
  email?: string | null;
  source: ClientSource;
  contactSubmissionId?: string;
  transparencyLeadId?: string;
}

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
    if (!existing.email && input.email) {
      data.email = input.email;
    }
    if (Object.keys(data).length === 0) return existing;
    return prisma.client.update({ where: { id: existing.id }, data });
  }

  return prisma.client.create({
    data: {
      phone,
      name: input.name ?? undefined,
      email: input.email ?? undefined,
      source: input.source,
      contactSubmissionId: input.contactSubmissionId,
      transparencyLeadId: input.transparencyLeadId,
    },
  });
}

export interface RateLimitConfig {
  scope: string;
  route: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

export async function enforceRateLimit(
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const key = `${config.scope}:${config.route}:${config.identifier}`;
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - (now.getTime() % (config.windowSeconds * 1000)),
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.rateLimitBucket.findUnique({ where: { key } });

      if (!existing || existing.windowSeconds !== config.windowSeconds) {
        const created = await tx.rateLimitBucket.upsert({
          where: { key },
          create: {
            key,
            windowStart,
            windowSeconds: config.windowSeconds,
            count: 1,
          },
          update: {
            windowStart,
            windowSeconds: config.windowSeconds,
            count: 1,
          },
        });
        return { allowed: true as const, count: created.count };
      }

      const windowEnd = new Date(
        existing.windowStart.getTime() + existing.windowSeconds * 1000,
      );

      if (now >= windowEnd) {
        const reset = await tx.rateLimitBucket.update({
          where: { key },
          data: { windowStart, windowSeconds: config.windowSeconds, count: 1 },
        });
        return { allowed: true as const, count: reset.count };
      }

      if (existing.count >= config.limit) {
        return {
          allowed: false as const,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((windowEnd.getTime() - now.getTime()) / 1000),
          ),
        };
      }

      const updated = await tx.rateLimitBucket.update({
        where: { key },
        data: { count: { increment: 1 } },
      });
      return { allowed: true as const, count: updated.count };
    });

    if (!result.allowed) {
      return { ok: false, retryAfterSeconds: result.retryAfterSeconds };
    }
    return { ok: true, remaining: Math.max(0, config.limit - result.count) };
  } catch {
    return { ok: true, remaining: 0 };
  }
}

export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return (
    headers.get("x-real-ip")?.trim() ??
    headers.get("cf-connecting-ip")?.trim() ??
    "unknown"
  );
}
