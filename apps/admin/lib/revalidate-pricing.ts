import { env } from "@/lib/env";

const TIMEOUT_MS = 3_000;

export async function revalidatePublicPricing(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const url = env?.PUBLIC_SITE_URL;
  const secret = env?.PRICING_REVALIDATE_SECRET;

  if (!url || !secret) {
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
