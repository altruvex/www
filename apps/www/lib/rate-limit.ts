import { prisma } from "@repo/database";
import { NextRequest } from "next/server";

type RateLimitConfig = {
  scope: string;
  route: string;
  limit: number;
  windowSeconds: number;
};

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "unknown";
}

export async function enforceRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
): Promise<
  { ok: true; remaining: number } | { ok: false; retryAfterSeconds: number }
> {
  const ip = getClientIp(req);
  const key = `${config.scope}:${config.route}:${ip}`;
  const now = new Date();
  const windowStartMs =
    now.getTime() - (now.getTime() % (config.windowSeconds * 1000));
  const windowStart = new Date(windowStartMs);

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
    // Fail-open: don't take down lead capture if the limiter table is unavailable.
    return { ok: true, remaining: 0 };
  }
}
