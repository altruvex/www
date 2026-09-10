import { prisma } from "@repo/database";

import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { AlertBar } from "@/components/os/error-state";
import { incidentStats, listIncidents } from "@/lib/engineering";
import { IncidentsClient, type IncidentRecord } from "./incidents-client";

export const dynamic = "force-dynamic";

/**
 * Incidents (§8) — the answer to "what is broken right now".
 *
 * Ordered by open-first then severity, because this page exists to be scanned
 * during an outage. A resolved incident is history and sorts below anything
 * still live, regardless of how recent it is.
 */
export default async function IncidentsPage() {
  const [incidents, stats, products, users] = await Promise.all([
    listIncidents(),
    incidentStats(),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const records: IncidentRecord[] = incidents.map((incident) => ({
    id: incident.id,
    number: incident.number,
    title: incident.title,
    detail: incident.detail,
    severity: incident.severity,
    status: incident.status,
    productId: incident.product.id,
    productName: incident.product.name,
    clientName:
      incident.product.client.company || incident.product.client.name || "Unnamed client",
    ownerId: incident.owner?.id ?? null,
    ownerName: incident.owner?.name || incident.owner?.email || null,
    deploymentNumber: incident.deployment?.number ?? null,
    detectedAt: incident.detectedAt.toISOString(),
    acknowledgedAt: incident.acknowledgedAt?.toISOString() ?? null,
    resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    resolution: incident.resolution,
    lastUpdate: incident.updates[0]
      ? {
          body: incident.updates[0].body,
          author: incident.updates[0].authorLabel,
          at: incident.updates[0].createdAt.toISOString(),
        }
      : null,
  }));

  const open = records.filter((r) => r.status !== "RESOLVED");
  const critical = open.filter((r) => r.severity === "SEV1" || r.severity === "SEV2");
  const unowned = open.filter((r) => !r.ownerId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Incidents"
        description="What is broken, who owns it, and what has been tried. An incident is a human judgement over machine evidence — it links to the deployment suspected of causing it and the logs around it."
        alert={
          critical.length > 0 ? (
            <AlertBar tone="danger" href="#open-incidents" cta="Review the open incidents">
              {critical.length} critical incident{critical.length === 1 ? "" : "s"} open.
              {unowned.length > 0
                ? ` ${unowned.length} open incident${unowned.length === 1 ? " has" : "s have"} no owner.`
                : ""}
            </AlertBar>
          ) : unowned.length > 0 ? (
            <AlertBar tone="warning" href="#open-incidents" cta="Assign an owner">
              {unowned.length} open incident{unowned.length === 1 ? " has" : "s have"} no
              owner. An unowned incident is one nobody is actually working on.
            </AlertBar>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Open"
          value={open.length}
          sub={open.length ? "Being worked" : "Nothing broken"}
          tone={open.length ? "danger" : "success"}
        />
        <StatTile
          label="Critical"
          value={critical.length}
          sub="SEV1 and SEV2"
          tone={critical.length ? "danger" : "neutral"}
        />
        <StatTile
          label="Unowned"
          value={unowned.length}
          sub="Open with no owner"
          tone={unowned.length ? "warning" : "neutral"}
        />
        <StatTile
          label="Mean time to resolve"
          value={stats.mttrHours != null ? `${stats.mttrHours}h` : "—"}
          sub={
            stats.resolvedCount > 0
              ? `Across ${stats.resolvedCount} resolved in 90 days`
              : "Nothing resolved yet"
          }
        />
      </div>

      <div id="open-incidents" className="scroll-mt-20">
        <IncidentsClient records={records} products={products} users={users} />
      </div>
    </div>
  );
}
