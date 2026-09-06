import { prisma } from "@repo/database";
import { MAINTENANCE_PLAN_IDS, pricingCopy } from "@repo/pricing-schema";

import { PageHeader } from "@/components/os/page-header";
import { listSubscriptions } from "@/lib/maintenance-admin";
import { MaintenanceClient } from "./maintenance-client";

export const dynamic = "force-dynamic";

/**
 * §— Maintenance.
 *
 * The other half of the client portal. Clients submit requests there; this is
 * where they are worked, and where a request is reclassified as billable
 * overage rather than against the client's included allowance.
 */
export default async function MaintenancePage() {
  const copy = pricingCopy("en");

  const [subscriptions, clients] = await Promise.all([
    listSubscriptions(),
    prisma.client.findMany({
      select: { id: true, name: true, company: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Maintenance"
        description="Retainers, this cycle's allowance, and every request a client has sent."
      />
      <MaintenanceClient
        subscriptions={subscriptions}
        clients={clients.map((c) => ({
          id: c.id,
          label: c.company || c.name || "Unnamed client",
        }))}
        plans={MAINTENANCE_PLAN_IDS.map((id) => ({
          id,
          name: copy.maintenance[id].name,
        }))}
      />
    </div>
  );
}
