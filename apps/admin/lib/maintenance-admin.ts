import { prisma } from "@repo/database";
import {
  currentBillingCycle,
  daysUntilCycleEnd,
  formatMoney,
  MAINTENANCE_PLAN_IDS,
  pricingCopy,
  type MaintenancePlanId,
} from "@repo/pricing-schema";

import { getPricing } from "@/lib/pricing-store";
import { diffFields, recordChanges } from "@/lib/pricing-store";

/**
 * Admin view of maintenance retainers.
 *
 * The client portal is read-and-submit; this is where the work is actually
 * moved. Cap usage is computed exactly as the portal computes it, from the same
 * cycle logic and the same resolved plan, so the operator and the client are
 * never looking at two different counts of the same thing.
 */

export interface AdminRequest {
  readonly id: string;
  readonly title: string;
  readonly detail: string | null;
  readonly status: string;
  readonly countsToCap: boolean;
  readonly submittedAt: string;
  readonly completedAt: string | null;
  readonly cycleStart: string;
}

export interface AdminSubscription {
  readonly id: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly planId: string;
  readonly planName: string;
  readonly planPriceLabel: string;
  readonly status: string;
  readonly portalToken: string;
  readonly startedAt: string;
  readonly cycleStart: string;
  readonly cycleEnd: string;
  readonly daysUntilRenewal: number;
  /** Null on a quote-only plan, which publishes no cap. */
  readonly requestsPerCycle: number | null;
  readonly requestsUsed: number;
  readonly openRequests: number;
  readonly requests: readonly AdminRequest[];
}

function isPlanId(value: string): value is MaintenancePlanId {
  return (MAINTENANCE_PLAN_IDS as readonly string[]).includes(value);
}

export async function listSubscriptions(
  now: Date = new Date(),
): Promise<readonly AdminSubscription[]> {
  const [subscriptions, pricing] = await Promise.all([
    prisma.maintenanceSubscription.findMany({
      include: {
        client: { select: { id: true, name: true, company: true } },
        requests: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getPricing(),
  ]);

  const copy = pricingCopy("en");
  const tpl = copy.maintenanceTemplates;

  return subscriptions.map((sub) => {
    const cycle = currentBillingCycle(sub.startedAt, now);
    const planId = isPlanId(sub.planId) ? sub.planId : null;
    const plan = planId ? pricing.maintenance[planId] : null;

    const inCycle = sub.requests.filter(
      (r) =>
        r.cycleStart.getTime() >= cycle.start.getTime() &&
        r.cycleStart.getTime() < cycle.end.getTime(),
    );

    return {
      id: sub.id,
      clientId: sub.client.id,
      clientName: sub.client.company || sub.client.name || "Unnamed client",
      planId: sub.planId,
      // A plan id the schema no longer knows about is shown as-is rather than
      // hidden, so a renamed plan surfaces as something to fix.
      planName: planId ? copy.maintenance[planId].name : `${sub.planId} (unknown)`,
      planPriceLabel:
        plan === null || plan.price === null
          ? tpl.customPrice
          : formatMoney(plan.price, "en"),
      status: sub.status,
      portalToken: sub.portalToken,
      startedAt: sub.startedAt.toISOString(),
      cycleStart: cycle.start.toISOString(),
      cycleEnd: cycle.end.toISOString(),
      daysUntilRenewal: daysUntilCycleEnd(cycle, now),
      requestsPerCycle: plan?.requestsPerCycle ?? null,
      requestsUsed: inCycle.filter((r) => r.countsToCap).length,
      openRequests: sub.requests.filter(
        (r) => r.status === "SUBMITTED" || r.status === "IN_PROGRESS",
      ).length,
      requests: sub.requests.map((r) => ({
        id: r.id,
        title: r.title,
        detail: r.detail,
        status: r.status,
        countsToCap: r.countsToCap,
        submittedAt: r.createdAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        cycleStart: r.cycleStart.toISOString(),
      })),
    };
  });
}

export const REQUEST_STATUSES = [
  "SUBMITTED",
  "IN_PROGRESS",
  "COMPLETED",
  "DECLINED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "CANCELLED"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * Moves a request's status.
 *
 * `completedAt` follows the status rather than being set independently, so a
 * request cannot end up marked done with no completion date, or reopened while
 * still carrying one.
 */
export async function setRequestStatus(
  id: string,
  status: RequestStatus,
  actor: string | null,
): Promise<boolean> {
  const before = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!before) return false;

  await prisma.maintenanceRequest.update({
    where: { id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? (before.completedAt ?? new Date()) : null,
    },
  });

  await recordChanges(
    diffFields("maintenance_request", id, { status: before.status }, { status }),
    actor,
  );
  return true;
}

/**
 * Reclassifies a request as counting against the cap, or as billable overage.
 *
 * This changes what a client is charged and what their portal shows as used, so
 * it is written to the same change log as a price edit — an operator moving a
 * request out of someone's allowance should leave a record.
 */
export async function setRequestBilling(
  id: string,
  countsToCap: boolean,
  actor: string | null,
): Promise<boolean> {
  const before = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!before) return false;

  await prisma.maintenanceRequest.update({ where: { id }, data: { countsToCap } });

  await recordChanges(
    diffFields(
      "maintenance_request",
      id,
      { countsToCap: before.countsToCap },
      { countsToCap },
    ),
    actor,
  );
  return true;
}

export async function setSubscriptionStatus(
  id: string,
  status: SubscriptionStatus,
  actor: string | null,
): Promise<boolean> {
  const before = await prisma.maintenanceSubscription.findUnique({ where: { id } });
  if (!before) return false;

  await prisma.maintenanceSubscription.update({
    where: { id },
    data: {
      status,
      cancelledAt: status === "CANCELLED" ? (before.cancelledAt ?? new Date()) : null,
    },
  });

  await recordChanges(
    diffFields("maintenance_subscription", id, { status: before.status }, { status }),
    actor,
  );
  return true;
}

export async function createSubscription(
  clientId: string,
  planId: MaintenancePlanId,
  actor: string | null,
): Promise<{ ok: boolean; message: string; id?: string }> {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, message: "That client no longer exists." };

  // One live retainer per client: two active subscriptions would give the same
  // client two separate allowances and two portal links.
  const existing = await prisma.maintenanceSubscription.findFirst({
    where: { clientId, status: { in: ["ACTIVE", "PAUSED"] } },
  });
  if (existing) {
    return {
      ok: false,
      message: "This client already has a maintenance plan. Cancel it first.",
    };
  }

  const created = await prisma.maintenanceSubscription.create({
    data: { clientId, planId },
  });

  await recordChanges(
    [
      {
        entityType: "maintenance_subscription",
        entityId: created.id,
        field: "created",
        oldValue: null,
        newValue: planId,
      },
    ],
    actor,
  );

  return { ok: true, message: "Maintenance plan started.", id: created.id };
}
