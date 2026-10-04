import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import {
  prisma,
  type IncidentSeverity,
  type IncidentStatus,
} from "@repo/database";
import { Button } from "@repo/ui";

import { EmptyState } from "@/components/os/empty-state";
import { AlertBar } from "@/components/os/error-state";
import {
  ActiveFilters,
  FilterBar,
  FilterChip,
} from "@/components/os/filter-bar";
import { List, ListRow } from "@/components/os/list-row";
import { PageHeader } from "@/components/os/page-header";
import { Pager } from "@/components/os/pager";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { StatusPill } from "@/components/ui/badge";
import {
  INCIDENT_PAGE_SIZE,
  incidentStats,
  listIncidents,
} from "@/lib/engineering";
import { when } from "@/lib/format";
import { currentRole } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { can, resolveRole } from "@/lib/rbac";
import { statusOf, type Tone } from "@/lib/status";
import {
  IncidentRowActions,
  OpenIncidentButton,
  ProductScope,
} from "./incidents-client";

export const dynamic = "force-dynamic";

const STATUSES = [
  "INVESTIGATING",
  "IDENTIFIED",
  "MONITORING",
  "RESOLVED",
] as const;
const SEVERITIES = ["SEV1", "SEV2", "SEV3", "SEV4"] as const;
const PAGE_SIZES = [25, 50, 100];

type Params = {
  status?: string;
  severity?: string;
  product?: string;
  client?: string;
  deployment?: string;
  new?: string;
  owner?: string;
  q?: string;
  page?: string;
  pageSize?: string;
};

const asStatus = (v?: string): IncidentStatus | "all" | undefined =>
  v === "all"
    ? "all"
    : STATUSES.includes(v as IncidentStatus)
      ? (v as IncidentStatus)
      : undefined;
const asSeverity = (v?: string): IncidentSeverity | undefined =>
  SEVERITIES.includes(v as IncidentSeverity)
    ? (v as IncidentSeverity)
    : undefined;

function hrefWith(
  sp: Params,
  patch: Partial<Record<keyof Params, string | null>>,
): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string" && value && key !== "page" && key !== "new")
      next.set(key, value);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  const qs = next.toString();
  return qs ? `/incidents?${qs}` : "/incidents";
}

function rowTone(status: string, severity: string): Tone {
  if (status === "RESOLVED") return "neutral";
  return severity === "SEV1" || severity === "SEV2" ? "danger" : "warning";
}

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const denied = await gateRoute("/incidents");
  if (denied) return denied;

  const sp = await searchParams;
  const role = await currentRole();
  const canCreate = can(role, "create", "incident");
  const canEdit = can(role, "edit", "incident");
  const canDelete = can(role, "delete", "project");
  const status = asStatus(sp.status);
  const severity = asSeverity(sp.severity);
  const unowned = sp.owner === "none";
  const q = sp.q?.trim() || undefined;
  const pageSize = PAGE_SIZES.includes(Number(sp.pageSize))
    ? Number(sp.pageSize)
    : INCIDENT_PAGE_SIZE;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [list, openAll, stats, products, users, client, deployment] =
    await Promise.all([
      listIncidents(
        status === undefined,
        {
          status: status && status !== "all" ? status : undefined,
          severity,
          productId: sp.product || undefined,
          clientId: sp.client || undefined,
          deploymentId: sp.deployment || undefined,
          unowned,
          q,
        },
        { page, pageSize },
      ),
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
          deployments: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              number: true,
              environment: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          opsRole: true,
        },
        orderBy: { name: "asc" },
      }),
      sp.client
        ? prisma.client.findUnique({
            where: { id: sp.client },
            select: { id: true, name: true, company: true },
          })
        : null,
      sp.deployment
        ? prisma.deployment.findUnique({
            where: { id: sp.deployment },
            select: {
              id: true,
              number: true,
              environment: true,
              status: true,
              createdAt: true,
              productId: true,
              product: { select: { name: true } },
            },
          })
        : null,
    ]);

  const owners = users
    .filter((u) => can(resolveRole(u), "edit", "incident"))
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));

  const critical = openAll.filter(
    (r) => r.severity === "SEV1" || r.severity === "SEV2",
  );
  const unownedOpen = openAll.filter((r) => !r.ownerId);

  const defaultProductId = sp.product || deployment?.productId || undefined;
  const productOptions = products.map((p) => {
    const deployments = p.deployments.map((d) => ({
      id: d.id,
      number: d.number,
      environment: d.environment,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
    }));
    if (
      deployment &&
      deployment.productId === p.id &&
      !deployments.some((d) => d.id === deployment.id)
    ) {
      deployments.push({
        id: deployment.id,
        number: deployment.number,
        environment: deployment.environment,
        status: deployment.status,
        createdAt: deployment.createdAt.toISOString(),
      });
    }
    return { id: p.id, name: p.name, status: p.status, deployments };
  });

  const productName = sp.product
    ? (products.find((p) => p.id === sp.product)?.name ?? "Deleted product")
    : null;
  const clientName = sp.client
    ? client
      ? client.company || client.name || "Unnamed client"
      : "Deleted client"
    : null;

  const filtered = Boolean(
    severity ||
    sp.product ||
    sp.client ||
    sp.deployment ||
    unowned ||
    q ||
    (status && status !== "all"),
  );
  const title =
    status === "all"
      ? "All incidents"
      : status
        ? `${statusOf("incidentStatus", status).label} incidents`
        : "Open incidents";

  const header = (
    <PageHeader
      title="Incidents"
      description="What is broken, who owns it, and what has been tried. An incident is a human judgement over machine evidence — it links to the deployment suspected of causing it and the logs around it."
      actions={
        canCreate && products.length > 0 ? (
          <OpenIncidentButton
            products={productOptions}
            users={owners}
            defaultProductId={defaultProductId}
            defaultDeploymentId={deployment?.id}
            defaultOpen={sp.new === "incident"}
          />
        ) : undefined
      }
      alert={
        critical.length > 0 ? (
          <AlertBar
            tone="danger"
            href="#open-incidents"
            cta="Review the open incidents"
          >
            {critical.length} critical incident
            {critical.length === 1 ? "" : "s"} open.
            {unownedOpen.length > 0
              ? ` ${unownedOpen.length} open incident${unownedOpen.length === 1 ? " has" : "s have"} no owner.`
              : ""}
          </AlertBar>
        ) : unownedOpen.length > 0 ? (
          <AlertBar
            tone="warning"
            href="/incidents?owner=none"
            cta="Assign an owner"
          >
            {unownedOpen.length} open incident
            {unownedOpen.length === 1 ? " has" : "s have"} no owner. An unowned
            incident is one nobody is actually working on.
          </AlertBar>
        ) : null
      }
    />
  );

  if (products.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          icon={ShieldAlert}
          title="No products to raise an incident against"
          body="An incident is always about a product Altruvex operates — that is what makes it actionable rather than a note. Add a product first; its pipeline can then report the deployments and logs an incident points at."
          action={
            <Button asChild variant="outline">
              <Link href="/products">Open products</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
          value={unownedOpen.length}
          sub="Open with no owner"
          tone={unownedOpen.length ? "warning" : "neutral"}
          href={unownedOpen.length ? "/incidents?owner=none" : undefined}
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

      <div className="space-y-2">
        <FilterBar
          label="Filter incidents"
          search={{ placeholder: "Search titles…" }}
          trailing={<ProductScope products={products} />}
        >
          <FilterChip param="status" label="Open" />
          {STATUSES.map((value) => (
            <FilterChip
              key={value}
              param="status"
              value={value}
              label={statusOf("incidentStatus", value).label}
            />
          ))}
          <FilterChip param="status" value="all" label="All" />
          <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
          {SEVERITIES.map((value) => (
            <FilterChip
              key={value}
              param="severity"
              value={value}
              label={value}
            />
          ))}
          <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
          <FilterChip param="owner" value="none" label="Unowned" />
        </FilterBar>
        <ActiveFilters
          labels={{
            product: "Product",
            client: "Client",
            deployment: "Deployment",
          }}
          valueLabels={{
            product:
              sp.product && productName ? { [sp.product]: productName } : {},
            client: sp.client && clientName ? { [sp.client]: clientName } : {},
            deployment: sp.deployment
              ? {
                  [sp.deployment]: deployment
                    ? `#${deployment.number} · ${deployment.product.name}`
                    : "Deleted deployment",
                }
              : {},
          }}
        />
      </div>

      <div id="open-incidents" className="scroll-mt-20">
        <Panel
          title={title}
          description={
            filtered
              ? `${list.total} matching · the tiles above count every product`
              : `${list.total} ${status === "all" ? "in total" : "open"}`
          }
          flush
        >
          {list.incidents.length === 0 ? (
            filtered || status === "all" ? (
              <div className="px-3 py-10 text-center">
                <p className="text-md font-semibold">No incident matches</p>
                <p className="mt-1 text-base text-muted-foreground">
                  Nothing fits every filter. Widen the search or clear the
                  filters.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/incidents">Clear filters</Link>
                </Button>
              </div>
            ) : (
              <div className="px-3 py-10 text-center">
                <p className="text-md font-semibold">Nothing is broken</p>
                <p className="mt-1 text-base text-muted-foreground">
                  No open incident on any product. Open one when something needs
                  a name, an owner and a timeline.
                </p>
                <Button asChild variant="ghost" size="sm" className="mt-3">
                  <Link href="/incidents?status=all">See past incidents</Link>
                </Button>
              </div>
            )
          ) : (
            <List label={title}>
              {list.incidents.map((incident) => {
                const owner =
                  incident.owner?.name || incident.owner?.email || "Unowned";
                const clientLabel =
                  incident.product.client.company ||
                  incident.product.client.name ||
                  "Unnamed client";
                const update = incident.updates[0];
                return (
                  <ListRow
                    key={incident.id}
                    tone={rowTone(incident.status, incident.severity)}
                    icon={<ShieldAlert />}
                    href={`/incidents/${incident.id}`}
                    title={
                      <>
                        <span className="font-mono text-meta text-subtle-foreground">
                          #{incident.number}
                        </span>{" "}
                        {incident.title}
                      </>
                    }
                    meta={
                      <>
                        {[
                          incident.product.name,
                          clientLabel,
                          owner,
                          `detected ${when(incident.detectedAt)}`,
                          incident.deployment
                            ? `after deploy #${incident.deployment.number}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        {update && (
                          <span className="block truncate text-muted-foreground">
                            {update.authorLabel}: {update.body}
                          </span>
                        )}
                      </>
                    }
                    trailing={
                      <StatusPill
                        registry="incidentSeverity"
                        value={incident.severity}
                      />
                    }
                    actions={
                      canEdit || canDelete ? (
                        <IncidentRowActions
                          id={incident.id}
                          number={incident.number}
                          title={incident.title}
                          status={incident.status}
                          canEdit={canEdit}
                          canDelete={canDelete}
                        />
                      ) : undefined
                    }
                  />
                );
              })}
            </List>
          )}
          <Pager
            className="border-t border-border px-3 py-2"
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            noun="incidents"
            hrefFor={(n) => hrefWith(sp, { page: String(n) })}
            pageSizes={PAGE_SIZES}
            pageSizeHref={(size) => hrefWith(sp, { pageSize: String(size) })}
          />
        </Panel>
      </div>
    </div>
  );
}
