import { clientIpFromHeaders, enforceRateLimit, prisma } from "@repo/database";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { clientActor, recordActivity } from "@/lib/activity-log";
import { quoteAnswerable } from "@/lib/change-requests";

/**
 * The client's answer to a change-request quote (`/quote/[token]`).
 *
 * Public: exempted in `proxy.ts`, authenticated only by the unguessable token,
 * rate limited per IP and per token. It can do exactly three things to exactly
 * one row — note that the quote was opened, approve it, or decline it — and
 * only while `quoteAnswerable` says the quote is live.
 *
 * "Viewed" is posted by the page's script, not stamped when the page renders:
 * mail scanners and WhatsApp link previews fetch a URL without a person behind
 * them, and a viewed date they wrote would be evidence of nothing.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("viewed") }),
  z.object({
    action: z.literal("approve"),
    /** The figure the client was looking at. Refused if the quote moved since. */
    amount: z.number().int(),
    name: z.string().trim().min(2, "Type your name to approve.").max(200),
    note: z.string().trim().max(1000).optional(),
  }),
  z.object({
    action: z.literal("decline"),
    amount: z.number().int(),
    note: z.string().trim().max(1000).optional(),
  }),
]);

const reply = (status: number, body: Record<string, unknown>, headers?: HeadersInit) =>
  NextResponse.json(body, { status, headers });

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  for (const [route, identifier, limit] of [
    ["quote_answer_ip", clientIpFromHeaders(request.headers), 30],
    ["quote_answer_token", token, 20],
  ] as const) {
    const rl = await enforceRateLimit({ scope: "public_api", route, identifier, limit, windowSeconds: 900 });
    if (!rl.ok) {
      return reply(
        429,
        { success: false, message: "Too many attempts. Please wait a few minutes and try again." },
        { "Retry-After": String(rl.retryAfterSeconds) },
      );
    }
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return reply(400, { success: false, message: parsed.error.issues[0]?.message ?? "Invalid request." });
  }
  const body = parsed.data;

  const row = await prisma.changeRequest.findUnique({
    where: { quoteToken: token },
    select: {
      id: true,
      title: true,
      status: true,
      projectId: true,
      quotedAmount: true,
      quoteSentAt: true,
      quoteExpiresAt: true,
      quoteViewedAt: true,
      project: { select: { client: { select: { name: true, company: true } } } },
    },
  });
  if (!row) return reply(404, { success: false, message: "This quote link is not valid." });

  const clientLabel = row.project.client.company || row.project.client.name || "Client";

  if (body.action === "viewed") {
    if (row.quoteSentAt && !row.quoteViewedAt) {
      await prisma.changeRequest.updateMany({
        where: { id: row.id, quoteViewedAt: null },
        data: { quoteViewedAt: new Date() },
      });
    }
    return reply(200, { success: true });
  }

  const live = quoteAnswerable(row);
  if (!live.ok) {
    const message = {
      answered: "This quote has already been answered.",
      revising: "This quote is being revised. You will receive the updated one.",
      expired: "This quote has expired. Reply to Altruvex and we will send a current one.",
      closed: "This request was closed.",
    }[live.reason];
    return reply(409, { success: false, message });
  }
  if (body.amount !== row.quotedAmount) {
    return reply(409, {
      success: false,
      message: "The quote changed while this page was open. Reload to see the current figure.",
    });
  }

  const now = new Date();
  const approved = body.action === "approve";
  // Conditional on the state that was checked, so two clicks (or two tabs)
  // cannot both answer.
  const updated = await prisma.changeRequest.updateMany({
    where: { id: row.id, status: "QUOTED", quotedAmount: row.quotedAmount },
    data: approved
      ? {
          status: "APPROVED",
          approvedAt: now,
          respondedByName: body.name,
          clientResponseNote: body.note || null,
          quoteViewedAt: row.quoteViewedAt ?? now,
        }
      : {
          status: "DECLINED",
          closedAt: now,
          clientResponseNote: body.note || null,
          quoteViewedAt: row.quoteViewedAt ?? now,
        },
  });
  if (updated.count === 0) {
    return reply(409, { success: false, message: "This quote has already been answered." });
  }

  await recordActivity({
    action: approved ? "change_request.approved" : "change_request.declined",
    actor: clientActor(approved ? `${body.name} (${clientLabel})` : clientLabel),
    entityType: "changeRequest",
    entityId: row.id,
    entityLabel: row.title,
    summary: approved
      ? `${body.name} approved the quote on the quote page`
      : "The client declined the quote on the quote page",
    before: { status: "QUOTED" },
    after: { status: approved ? "APPROVED" : "DECLINED" },
    metadata: {
      projectId: row.projectId,
      via: "quote_link",
      quotedAmount: row.quotedAmount,
      ...(body.note ? { note: body.note } : {}),
    },
  });

  return reply(200, { success: true, status: approved ? "APPROVED" : "DECLINED" });
}
