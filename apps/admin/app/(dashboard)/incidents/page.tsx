import { prisma, type IncidentSeverity, type IncidentStatus } from "@repo/database";

import { FilterChip } from "@/components/os/data-table";
import { EntityLink } from "@/components/os/entity-link";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { AlertBar } from "@/components/os/error-state";
import { incidentStats, listIncidents } from "@/lib/engineering";
import { statusOf } from "@/lib/status";
import { IncidentsClient, type IncidentRecord } from "./incidents-client";

export const dynamic = "force-dynamic";

const STATUSES = ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"] as const;
const SEVERITIES = ["SEV1", "SEV2", "SEV3", "SEV4"] as const;

type Params = {
  status?: string;
  severity?: string;
  product?: string;
  client?: string;
};

/**
 * `status` is one of the four incident states, "all", or absent. Absent means
 * open only — this page exists to be scanned during an outage, so history is
 * one click away rather than in the way.
 */
const asStatus = (v?: string): IncidentStatus | "all" | undefined =>
  v === "all" ? "all" : STATUSES.includes(v as IncidentStatus) ? (v as IncidentStatus) : undefined;
const asSeverity = (v?: string): IncidentSeverity | undefined =>
  SEVERITIES.includes(v as IncidentSeverity) ? (v as IncidentSeverity) : undefined;

function hrefWith(sp: Params, patch: Partial<Record<keyof Params, string | null>>): string {
  const next = new URLSearchParams();
  for (const key of ["status", "severity", "product", "client"] as const) {
    const value = key in patch ? patch[key] : sp[key];
    if (value) next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `/incidents?${qs}` : "/incidents";
}

/**
 * Incidents (§8) — the answer to "what is broken right now".
 *
 * Ordered by open-first then severity, because this page exists to be scanned
 * during an outage. A resolved incident is history and sorts below anything
 * still live, regardless of how recent it is.
 */
export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;
  const status = asStatus(sp.status);
  const severity = asSeverity(sp.severity);

  const [incidents, openAll, stats, products, users, client] = await Promise.all([
    listIncidents(status === undefined, {
      status: status && status !== "all" ? status : undefined,
      severity,
      productId: sp.product || undefined,
      clientId: sp.client || undefined,
    }),
    // The tiles and the alert describe the whole estate, never the filtered
    // view: "0 critical" under a SEV4 filter would be a lie by omission.
    prisma.incident.findMany({
      where: { status: { not: "RESOLVED" } },
      select: { severity: true, ownerId: true },
    }),
    incidentStats(),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        // The create form offers the product's recent deploys as the suspected
        // cause; ten is enough to reach "the one before last night's".
        deployments: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, number: true, environment: true, status: true, createdAt: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    sp.client
      ? prisma.client.findUnique({
          where: { id: sp.client },
          select: { id: true, name: true, company: true },
        })
      : null,
  ]);

  const records: IncidentRecord[] = incidents.map((incident) => ({
    id: incident.id,
    number: incident.number,
    title: incident.title,
    severity: incident.severity,
    status: incident.status,
    productId: incident.product.id,
    productName: incident.product.name,
    clientId: incident.product.client.id,
    clientName:
      incident.product.client.company || incident.product.client.name || "Unnamed client",
    ownerName: incident.owner?.name || incident.owner?.email || null,
    deploymentId: incident.deployment?.id ?? null,
    deploymentNumber: incident.deployment?.number ?? null,
    detectedAt: incident.detectedAt.toISOString(),
    lastUpdate: incident.updates[0]
      ? {
          body: incident.updates[0].body,
          author: incident.updates[0].authorLabel,
          at: incident.updates[0].createdAt.toISOString(),
        }
      : null,
  }));

  const critical = openAll.filter((r) => r.severity === "SEV1" || r.severity === "SEV2");
  const unowned = openAll.filter((r) => !r.ownerId);

  const productName = products.find((p) => p.id === sp.product)?.name;
  const clientName = client ? client.company || client.name || "Unnamed client" : null;

  const chips: React.ReactNode[] = [];
  if (status) {
    chips.push(
      <FilterChip
        key="status"
        label="Status"
        value={status === "all" ? "All, including resolved" : statusOf("incidentStatus", status).label}
        clearHref={hrefWith(sp, { status: null })}
      />,
    );
  }
  if (severity) {
    chips.push(
      <FilterChip
        key="severity"
        label="Severity"
        value={severity}
        clearHref={hrefWith(sp, { severity: null })}
      />,
    );
  }
  if (sp.product) {
    chips.push(
      <FilterChip
        key="product"
        label="Product"
        value={
          productName ? (
            <EntityLink type="product" id={sp.product}>
              {productName}
            </EntityLink>
          ) : (
            "Deleted product"
          )
        }
        clearHref={hrefWith(sp, { product: null })}
      />,
    );
  }
  if (sp.client) {
    chips.push(
      <FilterChip
        key="client"
        label="Client"
        value={
          client ? (
            <EntityLink type="client" id={client.id}>
              {clientName}
            </EntityLink>
          ) : (
            "Deleted client"
          )
        }
        clearHref={hrefWith(sp, { client: null })}
      />,
    );
  }
  const filtered = Boolean(severity || sp.product || sp.client || (status && status !== "all"));

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
          value={openAll.length}
          sub={openAll.length ? "Across every product" : "Nothing broken"}
          tone={openAll.length ? "danger" : "success"}
        />
        <StatTile
          label="Critical"
          value={critical.length}
          sub="Open SEV1 and SEV2"
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
        <IncidentsClient
          records={records}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            deployments: p.deployments.map((d) => ({
              id: d.id,
              number: d.number,
              environment: d.environment,
              status: d.status,
              createdAt: d.createdAt.toISOString(),
            })),
          }))}
          users={users}
          filters={{
            status: status ?? "",
            severity: severity ?? "",
            product: sp.product ?? "",
          }}
          chips={chips.length ? chips : null}
          filtered={filtered}
          // Tiles above count every product; when the list is narrowed it says
          // so itself, so the two numbers never read as a contradiction.
          clearHref={chips.length ? "/incidents" : null}
          defaultProductId={sp.product || undefined}
        />
      </div>
    </div>
  );
}
