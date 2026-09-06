import { clientIpFromHeaders, enforceRateLimit } from "@repo/database";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { loadPortal, submitRequest } from "@/lib/client-portal";

/**
 * The client portal's public endpoints.
 *
 * Access is the portal token in the URL — the same posture as the existing
 * project portal and signing links: one unguessable link, one client, no
 * password. That means both handlers are unauthenticated by design, so both are
 * rate limited: the audit found no public write endpoint in this app had a
 * limit, and this adds one.
 *
 * Reads are limited per IP. Writes are limited per token as well, so one
 * client's leaked or shared link cannot be used to flood the queue, and a
 * shared office IP cannot lock out an unrelated client.
 */

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

/** Deliberately identical for an unknown and a cancelled token: a 404 that
 *  distinguished them would confirm which tokens exist. */
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

  // Per-token as well as per-IP: a leaked link must not become a queue flood,
  // and one office's shared IP must not lock out a different client.
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
    // Same shape and wording as the read path: never confirm whether a token
    // exists, and never spread internal result fields into the response.
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
