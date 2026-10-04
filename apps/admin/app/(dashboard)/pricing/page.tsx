import { prisma } from "@repo/database";
import {
  COMPLEXITY_IDS,
  SERVICE_IDS,
  investmentMatrixView,
  pricingCopy,
} from "@repo/pricing-schema";
import { PageHeader } from "@/components/os/page-header";
import { currentRole } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { getPricing, pricingHistory } from "@/lib/pricing-store";
import { deriveStatus, REVENUE_BEARING } from "@/lib/subscription-lifecycle";
import { PricingClient, type PricingSnapshot } from "./pricing-client";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const denied = await gateRoute("/pricing");
  if (denied) return denied;

  const canEdit = can(await currentRole(), "edit", "settings");

  const now = new Date();
  const [pricing, history, subscriptions] = await Promise.all([
    getPricing(),
    pricingHistory(25),
    prisma.maintenanceSubscription.findMany({
      select: {
        planId: true,
        status: true,
        currentPeriodEnd: true,
        autoRenew: true,
        trialEndsAt: true,
        cancelledAt: true,
        quotedMonthlyPrice: true,
      },
    }),
  ]);
  const copy = pricingCopy("en");

  const activeByPlan = new Map<string, { count: number; unquoted: number }>();
  for (const sub of subscriptions) {
    if (!REVENUE_BEARING.has(deriveStatus(sub, now))) continue;
    const entry = activeByPlan.get(sub.planId) ?? { count: 0, unquoted: 0 };
    entry.count += 1;
    if (sub.quotedMonthlyPrice === null) entry.unquoted += 1;
    activeByPlan.set(sub.planId, entry);
  }

  const repriceNote = (planId: string, price: number | null) => {
    const active = activeByPlan.get(planId) ?? { count: 0, unquoted: 0 };
    const retainers = `${active.count} active retainer${active.count === 1 ? "" : "s"}`;
    if (price === null) {
      const unquoted = active.unquoted
        ? ` ${active.unquoted} of them have no quoted price and cannot renew until one is set.`
        : "";
      return `${retainers}. Custom quote: each bills its own quoted monthly price, so changing this plan's other fields re-prices none of them.${unquoted}`;
    }
    return `${retainers}. The published price is what each one's next renewal invoice charges (their quoted price is ignored while a price is published). Payments already opened keep their amount.`;
  };

  const snapshot: PricingSnapshot = {
    cells: SERVICE_IDS.flatMap((serviceId) =>
      COMPLEXITY_IDS.map((complexityId) => ({
        serviceId,
        complexityId,
        serviceName: copy.services[serviceId].documentName,
        bandName: copy.bands[complexityId],
        priceMin: pricing.services[serviceId].price[complexityId].min,
        priceMax: pricing.services[serviceId].price[complexityId].max,
        weeksMin: pricing.services[serviceId].weeks[complexityId].min,
        weeksMax: pricing.services[serviceId].weeks[complexityId].max,
      })),
    ),
    publishedRanges: investmentMatrixView("en", pricing).cellCount,
    maintenance: Object.values(pricing.maintenance).map((plan) => ({
      id: plan.id,
      name: copy.maintenance[plan.id].name,
      price: plan.price,
      requestsPerCycle: plan.requestsPerCycle,
      overageHourlyRate: plan.overageHourlyRate,
      internalHourEquivalent: plan.internalHourEquivalent,
      status: plan.status,
      activeRetainers: activeByPlan.get(plan.id)?.count ?? 0,
      repriceNote: repriceNote(plan.id, plan.price),
    })),
    consulting: Object.values(pricing.consulting).map((pkg) => ({
      id: pkg.id,
      name: copy.consulting[pkg.id].name,
      price: pkg.price,
      durationBusinessDays: pkg.durationBusinessDays,
      status: pkg.status,
    })),
    addons: Object.values(pricing.addons).map((addon) => ({
      id: addon.id,
      name: copy.addons[addon.id].name,
      category: addon.category,
      costBasis: addon.costBasis,
      markupType: addon.markupType,
      markupValue: addon.markupValue,
      billingCycle: addon.billingCycle,
      status: addon.status,
      bundles: [...addon.bundles],
    })),
    terms: {
      vatRate: pricing.terms.vatRate,
      revisionHourlyRate: pricing.terms.revisionHourlyRate,
      revisionHourlyRateUsd: pricing.terms.revisionHourlyRateUsd,
      includedRevisionRounds: pricing.terms.includedRevisionRounds,
      paymentSplitFirst: pricing.terms.paymentSplit[0],
      paymentSplitSecond: pricing.terms.paymentSplit[1],
      paymentSplitFinal: pricing.terms.paymentSplit[2],
      proposalValidityDays: pricing.terms.proposalValidityDays,
      postLaunchWarrantyDays: pricing.terms.postLaunchWarrantyDays,
      usdEgpRate: pricing.exchangeRate.egpPerUsd,
      usdRateReviewedOn: pricing.exchangeRate.reviewedOn,
    },
    overridden: pricing.overridden,
    history: history.map((h) => ({
      id: h.id,
      entityType: h.entityType,
      entityId: h.entityId,
      field: h.field,
      oldValue: h.oldValue,
      newValue: h.newValue,
      changedBy: h.changedBy,
      createdAt: h.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pricing"
        description="The only place a price is edited. Every public page, proposal and contract resolves to what this screen writes."
      />
      <PricingClient snapshot={snapshot} canEdit={canEdit} />
    </div>
  );
}
