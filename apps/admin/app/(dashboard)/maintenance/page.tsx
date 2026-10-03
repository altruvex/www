import { prisma, type BillingInterval } from "@repo/database";
import { MAINTENANCE_PLAN_IDS, pricingCopy } from "@repo/pricing-schema";
import { headers } from "next/headers";

import { FilterChip } from "@/components/os/data-table";
import { PageHeader } from "@/components/os/page-header";
import { BILLING_INTERVAL_LABEL, intervalPriceLabel } from "@/lib/billing-interval";
import { listSubscriptions } from "@/lib/maintenance-admin";
import { getPricing } from "@/lib/pricing-store";
import { publicBaseUrlFromHeaders } from "@/lib/public-url";
import { MaintenanceClient } from "./maintenance-client";
import { RenewalsPanel } from "./renewals-panel";

export const dynamic = "force-dynamic";

/**
 * §— Maintenance.
 *
 * The other half of the client portal. Clients submit requests there; this is
 * where they are worked, and where a request is reclassified as billable
 * overage rather than against the client's included allowance.
 */
export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const copy = pricingCopy("en");
  const { client: clientParam } = await searchParams;
  const clientId = clientParam?.trim() || null;

  const [allSubscriptions, clients, pricing, requestHeaders] = await Promise.all([
    listSubscriptions(),
    prisma.client.findMany({
      select: { id: true, name: true, company: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    getPricing(),
    headers(),
  ]);

  // `?client=` arrives from a client hub: that client's retainers only, named
  // by the chip. The scope is applied here rather than in the query because
  // the list is small and the "new retainer" form still needs every client.
  const subscriptions = clientId
    ? allSubscriptions.filter((sub) => sub.clientId === clientId)
    : allSubscriptions;
  const scopeClient = clientId ? clients.find((c) => c.id === clientId) : null;
  const scopeName = scopeClient
    ? scopeClient.company || scopeClient.name || "Unnamed client"
    : "Unknown client";

  // The portal link a client follows is built from BETTER_AUTH_URL, never from
  // the host this request happened to arrive on.
  const portalBase = publicBaseUrlFromHeaders(requestHeaders);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Maintenance"
        description="Retainers, renewals, this cycle's allowance, and every request a client has sent. Lifecycle status is derived from the billing period, so a retainer that lapsed this morning reads as past due without anyone touching it."
      />

      {clientId && (
        <div className="flex flex-wrap gap-2">
          <FilterChip label="Client" value={scopeName} clearHref="/maintenance" />
        </div>
      )}

      {/* Renewals first: this is the part with a deadline attached. */}
      <RenewalsPanel subscriptions={subscriptions} />

      <MaintenanceClient
        subscriptions={subscriptions}
        portalBase={portalBase}
        clients={clients.map((c) => ({
          id: c.id,
          label: c.company || c.name || "Unnamed client",
        }))}
        plans={MAINTENANCE_PLAN_IDS.map((id) => ({
          id,
          name: copy.maintenance[id].name,
          quoteOnly: pricing.maintenance[id].price === null,
          // Priced here, against the resolved (override-aware) plan, so the
          // form shows a figure without ever multiplying one.
          intervals: (Object.keys(BILLING_INTERVAL_LABEL) as BillingInterval[]).map(
            (interval) => {
              const price = intervalPriceLabel(pricing.maintenance[id], interval);
              return {
                value: interval,
                label: BILLING_INTERVAL_LABEL[interval],
                price: [price.price, price.suffix].filter(Boolean).join(" "),
              };
            },
          ),
        }))}
      />
    </div>
  );
}
