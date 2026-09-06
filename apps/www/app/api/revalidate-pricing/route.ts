import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { PRICING_CACHE_TAG } from "@/lib/server/pricing";

/**
 * Drops the public pricing cache after an admin price change.
 *
 * The two apps are separate deployments, so admin cannot reach into this one's
 * cache directly. Without this, a price change waits out the cache TTL before a
 * visitor sees it — acceptable as a floor, poor as the normal case for a number
 * someone just deliberately changed.
 *
 * This endpoint is not a write path: the worst an attacker gains is forcing a
 * cache miss. It is still authenticated, because unauthenticated cache
 * invalidation is a free way to strip a marketing site of its caching under
 * load. It fails closed — with no secret configured, nothing revalidates.
 */

export const dynamic = "force-dynamic";

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.PRICING_REVALIDATE_SECRET;

  if (!expected) {
    console.error(
      "PRICING_REVALIDATE_SECRET is not set; refusing to revalidate pricing.",
    );
    return NextResponse.json(
      { success: false, message: "Revalidation is not configured." },
      { status: 503 },
    );
  }

  const provided = request.headers.get("x-pricing-revalidate-secret") ?? "";
  if (!secretMatches(provided, expected)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  // Next 16 requires a cache-life profile; "max" is the documented equivalent
  // of the old single-argument behaviour — invalidate the tag outright.
  revalidateTag(PRICING_CACHE_TAG, "max");

  return NextResponse.json({
    success: true,
    revalidated: PRICING_CACHE_TAG,
    at: new Date().toISOString(),
  });
}
