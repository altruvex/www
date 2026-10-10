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

const EGYPT_LOCAL_MOBILE = /^01[0125]\d{8}$/;
const EGYPT_E164_MOBILE = /^20(1[0125]\d{8})$/;

/**
 * The one stored shape of a client's phone: international digits, no `+`.
 *
 * It agrees with `whatsappNumber` in apps/admin/lib/service-reminder.ts:
 * - spaces, brackets, dots and dashes are ignored;
 * - a leading `+` or `00` is already international — keep its digits
 *   (the `00` is dropped);
 * - `01[0125]` + 8 digits is an Egyptian mobile written locally, the only
 *   local shape that names its own country, so it becomes `20` + the number
 *   without its leading 0;
 * - any other number keeps its digits as typed. A country is never invented.
 *
 * Kept pure and dependency-free: both apps import it, and the admin app's
 * full parser (libphonenumber) must not become a dependency of this package.
 */
export function canonicalPhone(raw: string): string {
  const compact = raw.trim().replace(/[\s().-]/g, "");
  if (EGYPT_LOCAL_MOBILE.test(compact)) return `20${compact.slice(1)}`;
  if (compact.startsWith("+")) return compact.slice(1).replace(/\D/g, "");
  if (compact.startsWith("00")) return compact.slice(2).replace(/\D/g, "");
  return compact.replace(/\D/g, "");
}

/**
 * Every stored shape the same number may already have. Clients created
 * before `canonicalPhone` were stored as the typed digits (`normalizePhone`),
 * so a lead is matched against the canonical form, the plain digits, the
 * `00` form and — for an Egyptian mobile — the local `0` form.
 */
export function phoneMatchKeys(raw: string): string[] {
  const canonical = canonicalPhone(raw);
  if (!canonical) return [];
  const keys = new Set<string>([canonical, normalizePhone(raw), `00${canonical}`]);
  const egypt = EGYPT_E164_MOBILE.exec(canonical);
  if (egypt) keys.add(`0${egypt[1]}`);
  keys.delete("");
  return [...keys];
}

interface LinkClientToLeadInput {
  phone?: string | null;
  name?: string | null;
  email?: string | null;
  source: ClientSource;
  contactSubmissionId?: string;
  transparencyLeadId?: string;
}

/**
 * Finds or creates the client a lead belongs to. A phone is the key when there
 * is one (every stored shape of the number is matched). A lead with no usable
 * phone but an email — an email-only estimate request — matches an existing
 * client by email, case-insensitively, and otherwise becomes a client with no
 * phone. With neither, there is no client. When several clients match, the
 * oldest one is the client; an existing client only gains fields it lacks.
 */
export async function linkClientToLead(input: LinkClientToLeadInput) {
  const phone = input.phone ? canonicalPhone(input.phone) : "";
  const email = input.email?.trim() || null;
  if (!phone && !email) return null;

  const existing = phone
    ? await prisma.client.findFirst({
        where: { phone: { in: phoneMatchKeys(input.phone ?? "") } },
        orderBy: { createdAt: "asc" },
      })
    : await prisma.client.findFirst({
        where: { email: { equals: email ?? "", mode: "insensitive" } },
        orderBy: { createdAt: "asc" },
      });

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
      phone: phone || null,
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
