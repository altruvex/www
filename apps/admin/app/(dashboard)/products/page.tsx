import Link from "next/link";
import { Boxes } from "lucide-react";

import { prisma } from "@repo/database";
import { Button } from "@repo/ui";

import {
  ActiveFilters,
  FilterBar,
  FilterChip,
} from "@/components/os/filter-bar";
import { EmptyState } from "@/components/os/empty-state";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { listProducts } from "@/lib/engineering";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { statusOf } from "@/lib/status";
import { NewProductSheet } from "./new-product-sheet";
import { ProductsTable, type ProductRow } from "./products-table";

export const dynamic = "force-dynamic";

const STATUSES = [
  "LIVE",
  "IN_DEVELOPMENT",
  "MAINTENANCE",
  "PLANNED",
  "SUNSET",
] as const;

type Params = { client?: string; status?: string; ci?: string };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const denied = await gateRoute("/products");
  if (denied) return denied;

  const sp = await searchParams;
  const role = await currentRole();
  const canCreate = can(role, "create", "project");
  const canDelete = can(role, "delete", "project");
  const links = {
    incident:
      can(role, "create", "incident") && roleCanOpen(role, "/incidents"),
    project: can(role, "view", "project") && roleCanOpen(role, "/projects"),
    deployments:
      can(role, "view", "deployment") && roleCanOpen(role, "/deployments"),
    logs: can(role, "view", "log") && roleCanOpen(role, "/logs"),
  };
  const clientId = sp.client || undefined;
  const status = STATUSES.find((s) => s === sp.status);
  const unmonitoredOnly = sp.ci === "none";

  const [products, clients, projects] = await Promise.all([
    listProducts({ clientId }),
    prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, company: true },
    }),
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, clientId: true },
    }),
  ]);

  const clientOptions = clients.map((c) => ({
    id: c.id,
    label: c.company || c.name || "Unnamed client",
  }));
  const filterClient = clientId
    ? clientOptions.find((c) => c.id === clientId)
    : null;

  const all: ProductRow[] = products.map((p) => {
    const production = p.lastProductionDeployment;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      kind: p.kind,
      status: p.status,
      clientId: p.client.id,
      clientName: p.client.company || p.client.name || "Unnamed client",
      projectId: p.project?.id ?? null,
      projectName: p.project?.name ?? null,
      productionUrl: p.productionUrl,
      stagingUrl: p.stagingUrl,
      repositoryUrl: p.repositoryUrl,
      framework: p.framework,
      hostingProvider: p.hostingProvider,
      lastProductionId: production?.id ?? null,
      lastProductionAt: production
        ? (production.finishedAt ?? production.createdAt).toISOString()
        : null,
      lastProductionNumber: production?.number ?? null,
      lastProductionVersion: production?.version ?? null,
      openIncidents: p.openIncidents,
      deploymentCount: p._count.deployments,
      reporting:
        p.ingestTokenHash != null || p._count.deployments + p._count.builds > 0,
    };
  });

  const isBlind = (r: ProductRow) => !r.reporting;
  const live = all.filter((r) => r.status === "LIVE").length;
  const withIncidents = all.filter((r) => r.openIncidents > 0).length;
  const unmonitored = all.filter(
    (r) => r.status === "LIVE" && isBlind(r),
  ).length;

  const rows = all.filter(
    (r) => (!status || r.status === status) && (!unmonitoredOnly || isBlind(r)),
  );
  const scoped = (patch: Record<string, string>) =>
    `/products?${new URLSearchParams({ ...(clientId ? { client: clientId } : {}), ...patch })}`;

  const narrowed = Boolean(status || unmonitoredOnly || clientId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description="Every site and app Altruvex runs for a client. Deployment state on this page is reported by CI, never typed in — a product says it is live because something deployed it."
        actions={
          <>
            <Button asChild variant="outline" className="max-sm:hidden">
              <Link href="/deployments">Deployment history</Link>
            </Button>
            {canCreate && clientOptions.length > 0 && (
              <NewProductSheet clients={clientOptions} projects={projects} />
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="Live"
          value={live}
          sub={`of ${all.length} product${all.length === 1 ? "" : "s"}`}
          tone={live > 0 ? "success" : "neutral"}
          href={live > 0 ? scoped({ status: "LIVE" }) : undefined}
        />
        <StatTile
          label="With incidents"
          value={withIncidents}
          sub="Something is open against them"
          tone={withIncidents > 0 ? "danger" : "neutral"}
          href={
            withIncidents > 0
              ? `/incidents${clientId ? `?client=${clientId}` : ""}`
              : undefined
          }
        />
        <StatTile
          label="Unmonitored"
          value={unmonitored}
          sub="Live, but nothing has ever reported"
          tone={unmonitored > 0 ? "warning" : "neutral"}
          href={
            unmonitored > 0 ? scoped({ status: "LIVE", ci: "none" }) : undefined
          }
        />
        <StatTile
          label="Deployments"
          value={all.reduce((sum, r) => sum + r.deploymentCount, 0)}
          sub={
            clientId
              ? "Recorded for this client's products"
              : "Recorded across all products"
          }
          href={clientId ? `/deployments?client=${clientId}` : "/deployments"}
        />
      </div>

      {all.length > 0 && (
        <div className="space-y-2">
          <FilterBar label="Filter products">
            <FilterChip param="status" label="All" />
            {STATUSES.map((s) => (
              <FilterChip
                key={s}
                param="status"
                value={s}
                label={statusOf("productStatus", s).label}
                count={all.filter((r) => r.status === s).length}
              />
            ))}
            <FilterChip
              param="ci"
              value="none"
              label="Nothing reporting"
              count={all.filter(isBlind).length}
            />
          </FilterBar>
          <ActiveFilters
            labels={{ client: "Client" }}
            valueLabels={{
              client: Object.fromEntries(
                clientOptions.map((c) => [c.id, c.label]),
              ),
            }}
          />
        </div>
      )}

      {all.length === 0 && clientId ? (
        <EmptyState
          icon={Boxes}
          title={
            filterClient
              ? `No products for ${filterClient.label}`
              : "Client not found"
          }
          body={
            filterClient
              ? "Altruvex does not operate a site or app for this client yet. Add one when a build goes live, or clear the filter to see every product."
              : "The client in this link no longer exists. Clear the filter to see every product."
          }
          action={
            <Button asChild variant="outline">
              <Link href="/products">Show all products</Link>
            </Button>
          }
        />
      ) : all.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={
            clientOptions.length === 0
              ? "No clients to operate for"
              : "No products yet"
          }
          body={
            clientOptions.length === 0
              ? "A product belongs to a client — it is a site or app Altruvex runs on their behalf. Add a client first, then the product they own."
              : "A product is a site or app Altruvex operates for a client — the thing that keeps running after the project that built it is closed. Add one, then connect its pipeline (a GitHub webhook or an ingest token, both on the product's page) so builds and deployments record themselves."
          }
          action={
            clientOptions.length === 0 ? (
              <Button asChild variant="outline">
                <Link href="/clients">Open clients</Link>
              </Button>
            ) : canCreate ? (
              <NewProductSheet clients={clientOptions} projects={projects} />
            ) : undefined
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No product matches"
          body={
            unmonitoredOnly
              ? "Every product in this view has reported at least once — there is no blind spot here."
              : "Nothing fits these filters. Clear one to widen the list."
          }
          action={
            narrowed ? (
              <Button asChild variant="outline">
                <Link href="/products">Clear filters</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ProductsTable rows={rows} canDelete={canDelete} links={links} />
      )}
    </div>
  );
}
