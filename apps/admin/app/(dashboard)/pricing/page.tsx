import { prisma } from "@repo/database";
import {
  COMPLEXITY_IDS,
  SERVICE_IDS,
  investmentMatrixView,
  pricingCopy,
} from "@repo/pricing-schema";
import { PageHeader } from "@/components/os/page-header";
import { getPricing, pricingHistory } from "@/lib/pricing-store";
import { deriveStatus, REVENUE_BEARING } from "@/lib/subscription-lifecycle";
import { PricingClient, type PricingSnapshot } from "./pricing-client";

export const dynamic = "force-dynamic";

/**
 * §—  Pricing.
 *
 * The only place a price is edited. Every public surface — /pricing,
 * /services/maintenance, /services/consulting, /transparency — and every
 * generated proposal and contract resolves to what this screen writes.
 *
 * What it renders is `override ?? shipped default`, so a row that has never
 * been touched shows the value the last deploy carried, clearly marked as
 * such. Nothing here invents a number.
 */
export default async function PricingPage() {
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

  // Retainers whose derived status still bills (trialing, active, past due,
  // grace), per plan — the rows a price change here will actually reach.
  const activeByPlan = new Map<string, { count: number; unquoted: number }>();
  for (const sub of subscriptions) {
    if (!REVENUE_BEARING.has(deriveStatus(sub, now))) continue;
    const entry = activeByPlan.get(sub.planId) ?? { count: 0, unquoted: 0 };
    entry.count += 1;
    if (sub.quotedMonthlyPrice === null) entry.unquoted += 1;
    activeByPlan.set(sub.planId, entry);
  }

  // The rule `periodAmount` in lib/maintenance-admin.ts bills by: a published
  // plan price is what every retainer's next renewal invoice charges, and a
  // retainer's own quoted monthly price is used only while the plan has no
  // published price. Payments already opened keep their amount either way.
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
    // The public site publishes every cell unnamed; the count comes from the
    // same view /pricing renders, so this tile cannot drift from that grid.
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
      <PricingClient snapshot={snapshot} />
    </div>
  );
}
