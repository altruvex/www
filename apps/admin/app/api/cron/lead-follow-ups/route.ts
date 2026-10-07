import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { sweepLeadFollowUps } from "@/lib/lead-follow-up";

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
    const result = await sweepLeadFollowUps();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Lead follow-up sweep failed", error);
    return NextResponse.json(
      { success: false, message: "The follow-up sweep failed. The error has been logged." },
      { status: 500 },
    );
  }
}
