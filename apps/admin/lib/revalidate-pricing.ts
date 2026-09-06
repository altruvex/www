import { env } from "@/lib/env";

/**
 * Tells the public site to drop its pricing cache.
 *
 * Deliberately best-effort. The price is already committed by the time this
 * runs, and the public site expires its own cache on a timer regardless — so a
 * failure here costs latency, never correctness. Coupling a saved price to a
 * network call to a separate deployment would turn someone else's outage into
 * a failed write, which is a far worse trade.
 *
 * Never throws, and never blocks the response for long.
 */

const TIMEOUT_MS = 3_000;

export async function revalidatePublicPricing(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const url = env?.PUBLIC_SITE_URL;
  const secret = env?.PRICING_REVALIDATE_SECRET;

  if (!url || !secret) {
    // Not configured is a normal state in development and in any environment
    // that has not wired the two apps together yet.
    return { ok: false, reason: "not configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      new URL("/api/revalidate-pricing", url).toString(),
      {
        method: "POST",
        headers: { "x-pricing-revalidate-secret": secret },
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return { ok: false, reason: `public site returned ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}
