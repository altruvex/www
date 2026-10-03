import Link from "next/link";
import { Boxes } from "lucide-react";

import { Button } from "@repo/ui";

import { FilterChip } from "@/components/os/data-table";
import { EmptyState } from "@/components/os/empty-state";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { prisma } from "@repo/database";

import { listProducts } from "@/lib/engineering";
import { NewProductSheet } from "./new-product-sheet";
import { ProductsTable, type ProductRow } from "./products-table";

export const dynamic = "force-dynamic";

/**
 * Products — the sites and apps Altruvex operates (§6).
 *
 * A Project is the engagement; a Product is the thing that stays alive after it
 * ends. Keeping them apart is what lets this screen answer "what is deployed
 * right now" — a question `Project.liveUrl` could never answer, because a
 * project has an end date and a live site does not.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client: clientParam } = await searchParams;
  const clientId = clientParam || undefined;

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

  // The latest successful PRODUCTION deploy per product, with its id so the
  // column can link to it. Same ordering as `lastProductionDeployment()` — a
  // deploy CI never marked finished sorts last rather than first.
  const productionDeploys = await prisma.deployment.findMany({
    where: {
      productId: { in: products.map((p) => p.id) },
      environment: "PRODUCTION",
      status: "SUCCEEDED",
    },
    orderBy: [
      { productId: "asc" },
      { finishedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    distinct: ["productId"],
    select: {
      id: true,
      productId: true,
      number: true,
      version: true,
      finishedAt: true,
      createdAt: true,
    },
  });
  const productionByProduct = new Map(
    productionDeploys.map((d) => [d.productId, d]),
  );

  const rows: ProductRow[] = products.map((p) => {
    const production = productionByProduct.get(p.id);
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
      hasIngestToken: p.ingestTokenHash != null,
    };
  });

  const live = rows.filter((r) => r.status === "LIVE").length;
  const withIncidents = rows.filter((r) => r.openIncidents > 0).length;
  // A live product nothing reports on is a blind spot, and worth counting
  // separately from one that simply has not shipped.
  const unmonitored = rows.filter(
    (r) => r.status === "LIVE" && !r.hasIngestToken,
  ).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description="Every site and app Altruvex runs for a client. Deployment state on this page is reported by CI, never typed in — a product says it is live because something deployed it."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/deployments">Deployment history</Link>
            </Button>
            {clientOptions.length > 0 && (
              <NewProductSheet clients={clientOptions} projects={projects} />
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Live"
          value={live}
          sub={`of ${rows.length} product${rows.length === 1 ? "" : "s"}`}
          tone={live > 0 ? "success" : "neutral"}
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
          sub="Live, but no CI reporting in"
          tone={unmonitored > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Deployments"
          value={rows.reduce((sum, r) => sum + r.deploymentCount, 0)}
          sub={
            clientId
              ? "Recorded for this client's products"
              : "Recorded across all products"
          }
          href={clientId ? `/deployments?client=${clientId}` : "/deployments"}
        />
      </div>

      {clientId && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            label="Client"
            value={filterClient?.label ?? "Unknown client"}
            clearHref="/products"
          />
        </div>
      )}

      {rows.length === 0 && clientId ? (
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
      ) : rows.length === 0 ? (
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
              : "A product is a site or app Altruvex operates for a client — the thing that keeps running after the project that built it is closed. Add one, then point its CI pipeline at the ingest endpoint so builds and deployments record themselves."
          }
          action={
            clientOptions.length === 0 ? (
              <Button asChild variant="outline">
                <Link href="/clients">Open clients</Link>
              </Button>
            ) : (
              <NewProductSheet clients={clientOptions} projects={projects} />
            )
          }
        />
      ) : (
        <ProductsTable rows={rows} />
      )}
    </div>
  );
}
