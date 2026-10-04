import { clientIpFromHeaders, enforceRateLimit } from "@repo/database";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { loadPortal, submitRequest } from "@/lib/client-portal";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  title: z.string().trim().min(4).max(200),
  detail: z.string().trim().max(4000).optional().nullable(),
});

function tooMany(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      success: false,
      message: "Too many requests. Please try again shortly.",
      retryAfterSeconds,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

const notFound = () =>
  NextResponse.json(
    { success: false, message: "This portal link is not valid." },
    { status: 404 },
  );

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const rl = await enforceRateLimit({
    scope: "public_api",
    route: "client_portal_read",
    identifier: clientIpFromHeaders(request.headers),
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.ok) return tooMany(rl.retryAfterSeconds);

  try {
    const locale = request.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en";
    const portal = await loadPortal(token, locale);
    if (!portal) return notFound();
    return NextResponse.json({ success: true, portal });
  } catch (error) {
    console.error("Client portal read failed", error);
    return NextResponse.json(
      { success: false, message: "The portal could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  for (const [route, identifier, limit] of [
    ["client_portal_submit_ip", clientIpFromHeaders(request.headers), 20],
    ["client_portal_submit_token", token, 10],
  ] as const) {
    const rl = await enforceRateLimit({
      scope: "public_api",
      route,
      identifier,
      limit,
      windowSeconds: 3600,
    });
    if (!rl.ok) return tooMany(rl.retryAfterSeconds);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Please give the request a short title (at least 4 characters).",
      },
      { status: 400 },
    );
  }

  try {
    const outcome = await submitRequest(
      token,
      parsed.data.title,
      parsed.data.detail?.trim() || null,
    );
    if (!outcome.ok) return notFound();

    return NextResponse.json({
      success: true,
      message: outcome.message,
      overCap: outcome.overCap,
    });
  } catch (error) {
    console.error("Client portal submission failed", error);
    return NextResponse.json(
      { success: false, message: "The request could not be submitted." },
      { status: 500 },
    );
  }
}
