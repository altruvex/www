import { MAINTENANCE_PLAN_IDS } from "@repo/pricing-schema";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  createSubscription,
  listSubscriptions,
  REQUEST_STATUSES,
  renewSubscription,
  setAutoRenew,
  setRequestBilling,
  setRequestStatus,
  setSubscriptionStatus,
  SUBSCRIPTION_STATUSES,
} from "@/lib/maintenance-admin";
import { userActor } from "@/lib/activity-log";
import { requireAdminSession } from "@/lib/require-admin";

/** Admin-only management of maintenance retainers and the requests on them. */

export const dynamic = "force-dynamic";

const unauthorized = () =>
  NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request-status"),
    id: z.string().min(1),
    status: z.enum(REQUEST_STATUSES),
  }),
  z.object({
    action: z.literal("request-billing"),
    id: z.string().min(1),
    countsToCap: z.boolean(),
  }),
  z.object({
    action: z.literal("subscription-status"),
    id: z.string().min(1),
    status: z.enum(SUBSCRIPTION_STATUSES),
  }),
  z.object({
    action: z.literal("subscription-renew"),
    id: z.string().min(1),
  }),
  z.object({
    action: z.literal("subscription-auto-renew"),
    id: z.string().min(1),
    autoRenew: z.boolean(),
  }),
]);

const postSchema = z.object({
  clientId: z.string().min(1),
  planId: z.enum(MAINTENANCE_PLAN_IDS),
  billingInterval: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL"]).default("MONTHLY"),
});

export async function GET(request: NextRequest) {
  if (!(await requireAdminSession(request))) return unauthorized();

  try {
    return NextResponse.json({
      success: true,
      subscriptions: await listSubscriptions(),
    });
  } catch (error) {
    console.error("Maintenance list failed", error);
    return NextResponse.json(
      { success: false, message: "Maintenance data could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (!session) return unauthorized();

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Pick a client and a plan." },
      { status: 400 },
    );
  }

  const actor = session.user.email ?? session.user.id ?? null;
  const result = await createSubscription(
    parsed.data.clientId,
    parsed.data.planId,
    actor,
    parsed.data.billingInterval,
    userActor(session),
  );

  return NextResponse.json(
    { success: result.ok, message: result.message, id: result.id },
    { status: result.ok ? 200 : 409 },
  );
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (!session) return unauthorized();

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid update." },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const actor = session.user.email ?? session.user.id ?? null;

  const audit = userActor(session);

  try {
    // A renewal is the one action here that can fail for a *business* reason
    // rather than a missing row, so it returns its own message instead of being
    // flattened into the boolean the others share.
    if (body.action === "subscription-renew") {
      const result = await renewSubscription(body.id, actor, audit);
      return NextResponse.json(
        { success: result.ok, message: result.message },
        { status: result.ok ? 200 : 409 },
      );
    }

    const ok =
      body.action === "request-status"
        ? await setRequestStatus(body.id, body.status, actor, audit)
        : body.action === "request-billing"
          ? await setRequestBilling(body.id, body.countsToCap, actor, audit)
          : body.action === "subscription-auto-renew"
            ? await setAutoRenew(body.id, body.autoRenew, actor, audit)
            : await setSubscriptionStatus(body.id, body.status, actor, audit);

    if (!ok) {
      return NextResponse.json(
        { success: false, message: "That record no longer exists." },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Maintenance update failed", error);
    return NextResponse.json(
      { success: false, message: "The change could not be saved." },
      { status: 500 },
    );
  }
}
