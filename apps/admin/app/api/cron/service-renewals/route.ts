import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { sweepServiceRenewals } from "@/lib/client-services";

/**
 * The scheduled renewal sweep (apps/admin/vercel.json runs it daily).
 *
 * Exempt from the session guard in proxy.ts — a scheduler holds no session —
 * so the bearer check below is the whole of its authentication. Vercel Cron
 * sends `Authorization: Bearer $CRON_SECRET` when that variable is set.
 *
 * Fails closed: with no CRON_SECRET configured it refuses every call rather
 * than running for anyone who finds the URL. The sweep is idempotent, so the
 * harm of an open endpoint would be load and Slack noise rather than duplicate
 * alerts — but "harmless if abused" is a claim, and a refusal is not.
 */

export const dynamic = "force-dynamic";

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sweepServiceRenewals();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Service renewal sweep failed", error);
    return NextResponse.json(
      { success: false, message: "The renewal sweep failed. The error has been logged." },
      { status: 500 },
    );
  }
}
