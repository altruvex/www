import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { PRICING_CACHE_TAG } from "@/lib/server/pricing";

export const dynamic = "force-dynamic";

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
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

  revalidateTag(PRICING_CACHE_TAG, "max");

  return NextResponse.json({
    success: true,
    revalidated: PRICING_CACHE_TAG,
    at: new Date().toISOString(),
  });
}
