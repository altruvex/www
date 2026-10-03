import { MAINTENANCE_PLAN_IDS } from "@repo/pricing-schema";
import { z } from "zod";

import {
  REQUEST_STATUSES,
  SUBSCRIPTION_STATUSES,
  changeBillingInterval,
  changePlan,
  createSubscription,
  listSubscriptions,
  recordPeriodInvoice,
  renewSubscription,
  setAutoRenew,
  setQuotedMonthlyPrice,
  setRequestBilling,
  setRequestStatus,
  setSubscriptionStatus,
} from "@/lib/maintenance-admin";
import { badRequest, conflict, notFound, ok, readJson, withAdmin } from "@/lib/with-admin";

/** Admin-only management of maintenance retainers and the requests on them. */

export const dynamic = "force-dynamic";

const billingInterval = z.enum(["MONTHLY", "QUARTERLY", "ANNUAL"]);

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
    action: z.literal("subscription-record-invoice"),
    id: z.string().min(1),
  }),
  z.object({
    action: z.literal("subscription-quote"),
    id: z.string().min(1),
    /** Null clears the quote; the retainer then cannot be invoiced until one is set. */
    quotedMonthlyPrice: z.number().int().positive().nullable(),
  }),
  z.object({
    action: z.literal("subscription-auto-renew"),
    id: z.string().min(1),
    autoRenew: z.boolean(),
  }),
  z.object({
    action: z.literal("subscription-interval"),
    id: z.string().min(1),
    billingInterval,
  }),
  z.object({
    action: z.literal("subscription-plan"),
    id: z.string().min(1),
    planId: z.enum(MAINTENANCE_PLAN_IDS),
  }),
]);

const postSchema = z.object({
  clientId: z.string().min(1),
  planId: z.enum(MAINTENANCE_PLAN_IDS),
  billingInterval: billingInterval.default("MONTHLY"),
  quotedMonthlyPrice: z.number().int().positive().optional(),
});

export const GET = withAdmin(async () => ok({ subscriptions: await listSubscriptions() }), {
  can: ["view", "payment"],
});

export const POST = withAdmin(async (request, { session, actor }) => {
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw badRequest("Pick a client and a plan.");

  const by = session.user.email ?? session.user.id ?? null;
  const result = await createSubscription(
    parsed.data.clientId,
    parsed.data.planId,
    by,
    parsed.data.billingInterval,
    actor,
    { quotedMonthlyPrice: parsed.data.quotedMonthlyPrice },
  );
  if (!result.ok) throw conflict(result.message);
  return ok({ message: result.message, id: result.id });
}, { can: ["create", "payment"] });

export const PATCH = withAdmin(async (request, { session, actor }) => {
  // A body that fails the schema is answered 400 by `withAdmin`.
  const body = await readJson(request, patchSchema);
  const by = session.user.email ?? session.user.id ?? null;

  // A renewal, a plan or interval change and a quote can fail for a *business*
  // reason rather than a missing row, so they return their own message instead
  // of being flattened into the boolean the others share.
  switch (body.action) {
    case "subscription-renew":
    case "subscription-record-invoice":
    case "subscription-quote":
    case "subscription-interval":
    case "subscription-plan": {
      const result =
        body.action === "subscription-renew"
          ? await renewSubscription(body.id, by, actor, new Date())
          : body.action === "subscription-record-invoice"
            ? await recordPeriodInvoice(body.id, by, actor)
            : body.action === "subscription-quote"
              ? await setQuotedMonthlyPrice(body.id, body.quotedMonthlyPrice, by, actor)
              : body.action === "subscription-interval"
                ? await changeBillingInterval(body.id, body.billingInterval, by, actor)
                : await changePlan(body.id, body.planId, by, actor);
      if (!result.ok) throw conflict(result.message);
      return ok({ message: result.message });
    }
    default: {
      const found =
        body.action === "request-status"
          ? await setRequestStatus(body.id, body.status, by, actor)
          : body.action === "request-billing"
            ? await setRequestBilling(body.id, body.countsToCap, by, actor)
            : body.action === "subscription-auto-renew"
              ? await setAutoRenew(body.id, body.autoRenew, by, actor)
              : await setSubscriptionStatus(body.id, body.status, by, actor);
      if (!found) throw notFound("That record no longer exists.");
      return ok({});
    }
  }
}, { can: ["edit", "payment"] });
