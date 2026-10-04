import { prisma, type BillingInterval } from "@repo/database";
import { MAINTENANCE_PLAN_IDS, pricingCopy } from "@repo/pricing-schema";
import { headers } from "next/headers";

import { FilterChip } from "@/components/os/data-table";
import { PageHeader } from "@/components/os/page-header";
import { currentRole } from "@/lib/authorize";
import {
  BILLING_INTERVAL_LABEL,
  intervalPriceLabel,
} from "@/lib/billing-interval";
import { roleCanOpen } from "@/lib/action-center";
import { listSubscriptions } from "@/lib/maintenance-admin";
import { canSeeFinance } from "@/lib/nav";
import { gateRoute } from "@/lib/page-gate";
import { getPricing } from "@/lib/pricing-store";
import { publicBaseUrlFromHeaders } from "@/lib/public-url";
import { can } from "@/lib/rbac";
import { MaintenanceClient } from "./maintenance-client";
import { RenewalsPanel } from "./renewals-panel";
import { toSubscriptionView } from "./subscription-view";

export const dynamic = "force-dynamic";

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; new?: string }>;
}) {
  const denied = await gateRoute("/maintenance");
  if (denied) return denied;

  const copy = pricingCopy("en");
  const { client: clientParam, new: newParam } = await searchParams;
  const clientId = clientParam?.trim() || null;

  const [allSubscriptions, clients, pricing, requestHeaders, role] =
    await Promise.all([
      listSubscriptions(),
      prisma.client.findMany({
        select: { id: true, name: true, company: true },
        orderBy: { createdAt: "desc" },
      }),
      getPricing(),
      headers(),
      currentRole(),
    ]);
  const showMoney = canSeeFinance(role);
  const canCreate = can(role, "create", "payment");
  const canEdit = can(role, "edit", "payment");
  const canDelete = can(role, "delete", "client");
  const canOpenClient =
    can(role, "view", "client") && roleCanOpen(role, "/clients");

  const subscriptions = (
    clientId
      ? allSubscriptions.filter((sub) => sub.clientId === clientId)
      : allSubscriptions
  ).map((sub) => toSubscriptionView(sub, pricing, showMoney));
  const scopeClient = clientId ? clients.find((c) => c.id === clientId) : null;
  const scopeName = scopeClient
    ? scopeClient.company || scopeClient.name || "Unnamed client"
    : "Unknown client";

  const portalBase = publicBaseUrlFromHeaders(requestHeaders);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Maintenance"
        description="Retainers, renewals, this cycle's allowance, and every request a client has sent. Lifecycle status is derived from the billing period, so a retainer that lapsed this morning reads as past due without anyone touching it."
      />

      {clientId && (
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="Client"
            value={scopeName}
            clearHref="/maintenance"
          />
        </div>
      )}

      <RenewalsPanel
        subscriptions={subscriptions}
        showMoney={showMoney}
        canEdit={canEdit}
      />

      <MaintenanceClient
        subscriptions={subscriptions}
        portalBase={portalBase}
        showMoney={showMoney}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canOpenClient={canOpenClient}
        defaultClientId={clientId ?? undefined}
        focusNew={canCreate && newParam === "retainer"}
        clients={clients.map((c) => ({
          id: c.id,
          label: c.company || c.name || "Unnamed client",
        }))}
        plans={MAINTENANCE_PLAN_IDS.map((id) => ({
          id,
          name: copy.maintenance[id].name,
          quoteOnly: pricing.maintenance[id].price === null,
          intervals: (
            Object.keys(BILLING_INTERVAL_LABEL) as BillingInterval[]
          ).map((interval) => {
            const price = intervalPriceLabel(pricing.maintenance[id], interval);
            return {
              value: interval,
              label: BILLING_INTERVAL_LABEL[interval],
              price: showMoney
                ? [price.price, price.suffix].filter(Boolean).join(" ")
                : null,
            };
          }),
        }))}
      />
    </div>
  );
}
