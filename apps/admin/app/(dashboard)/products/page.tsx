import Link from "next/link";
import { Boxes } from "lucide-react";

import { Button } from "@repo/ui";

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
export default async function ProductsPage() {
  const [products, clients, projects] = await Promise.all([
    listProducts(),
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

  const rows: ProductRow[] = products.map((p) => ({
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
    lastDeployedAt: p.lastDeployment?.finishedAt?.toISOString() ?? null,
    lastDeploymentNumber: p.lastDeployment?.number ?? null,
    lastDeploymentVersion: p.lastDeployment?.version ?? null,
    openIncidents: p.openIncidents,
    deploymentCount: p._count.deployments,
    hasIngestToken: p.ingestTokenHash != null,
  }));

  const live = rows.filter((r) => r.status === "LIVE").length;
  const withIncidents = rows.filter((r) => r.openIncidents > 0).length;
  // A live product nothing reports on is a blind spot, and worth counting
  // separately from one that simply has not shipped.
  const unmonitored = rows.filter((r) => r.status === "LIVE" && !r.hasIngestToken).length;

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
          href={withIncidents > 0 ? "/incidents" : undefined}
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
          sub="Recorded across all products"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={clientOptions.length === 0 ? "No clients to operate for" : "No products yet"}
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
