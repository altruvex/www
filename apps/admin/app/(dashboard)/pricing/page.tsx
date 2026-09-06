import { COMPLEXITY_IDS, ORDERED_TIERS, SERVICE_IDS, pricingCopy } from "@repo/pricing-schema";
import { PageHeader } from "@/components/os/page-header";
import { getPricing, pricingHistory } from "@/lib/pricing-store";
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
  const [pricing, history] = await Promise.all([getPricing(), pricingHistory(25)]);
  const copy = pricingCopy("en");

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
    tiers: ORDERED_TIERS.map((tier) => ({
      id: tier.id,
      buyerLabel: copy.tiers[tier.id].buyerLabel,
      serviceId: tier.serviceId,
      complexityId: tier.complexityId,
      display: tier.display,
    })),
    maintenance: Object.values(pricing.maintenance).map((plan) => ({
      id: plan.id,
      name: copy.maintenance[plan.id].name,
      price: plan.price,
      requestsPerCycle: plan.requestsPerCycle,
      overageHourlyRate: plan.overageHourlyRate,
      internalHourEquivalent: plan.internalHourEquivalent,
      status: plan.status,
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
