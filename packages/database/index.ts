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

// ---------------------------------------------------------------------------
// Rate limiting
//
// Lives here because both apps need it and it is backed by a table in this
// schema. It takes an opaque `identifier` rather than a request object so it
// stays free of any framework dependency; each app derives that from its own
// request type.
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Broad bucket, e.g. "public_api". */
  scope: string;
  /** The specific endpoint, e.g. "portal_request". */
  route: string;
  /** Caller identity — usually a client IP, or a token for per-link limits. */
  identifier: string;
  limit: number;
  windowSeconds: number;
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

/**
 * Fixed-window rate limit.
 *
 * Fails **open**: if the limiter's own table is unavailable the request is
 * allowed. Losing the limiter should not also take down lead capture or lock a
 * paying client out of their portal — the limiter protects against abuse, and
 * trading availability for it during an outage is the wrong way round.
 */
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

/** Best-effort caller IP from the usual proxy headers. */
export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return (
    headers.get("x-real-ip")?.trim() ??
    headers.get("cf-connecting-ip")?.trim() ??
    "unknown"
  );
}
