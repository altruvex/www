import Link from "next/link";
import { Rocket } from "lucide-react";

import { Button } from "@repo/ui";

import { EmptyState } from "@/components/os/empty-state";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { TabNav } from "@/components/os/tab-nav";
import { getEngineeringSummary, listBuilds, listDeployments } from "@/lib/engineering";
import { BuildsTable, type BuildRow } from "./builds-table";
import { DeploymentsTable, type DeploymentRow } from "./deployments-table";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "deployments", label: "Deployments" },
  { id: "builds", label: "Builds" },
] as const;

/**
 * Deployments and builds across every product (§7).
 *
 * Two tabs rather than two nav entries: an operator asking "did it ship" and an
 * operator asking "did it compile" are the same person thirty seconds apart,
 * and splitting them across the sidebar makes that a navigation problem.
 *
 * Nothing on this page is writable. Deployment state arrives from CI, and a
 * "Deploy" button here would be a claim rather than a cause — see §18.
 */
export default async function DeploymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; product?: string }>;
}) {
  const { tab: rawTab, product: productId } = await searchParams;
  const tab = TABS.some((t) => t.id === rawTab) ? rawTab! : "deployments";

  const [summary, deployments, builds] = await Promise.all([
    getEngineeringSummary(),
    listDeployments({ productId }),
    listBuilds({ productId }),
  ]);

  const deploymentRows: DeploymentRow[] = deployments.map((d) => ({
    id: d.id,
    number: d.number,
    productId: d.product.id,
    productName: d.product.name,
    clientName: d.product.client.company || d.product.client.name || "Unnamed client",
    environment: d.environment,
    status: d.status,
    version: d.version,
    commitSha: d.commitSha,
    triggeredBy: d.triggeredBy,
    buildNumber: d.build?.number ?? null,
    rolledBackByNumber: d.rolledBackBy?.number ?? null,
    failureReason: d.failureReason,
    url: d.url,
    at: (d.finishedAt ?? d.createdAt).toISOString(),
  }));

  const buildRows: BuildRow[] = builds.map((b) => ({
    id: b.id,
    number: b.number,
    productId: b.product.id,
    productName: b.product.name,
    clientName: b.product.client.company || b.product.client.name || "Unnamed client",
    environment: b.environment,
    status: b.status,
    branch: b.branch,
    commitSha: b.commitSha,
    commitMessage: b.commitMessage,
    triggeredBy: b.triggeredBy,
    durationMs: b.durationMs,
    failureReason: b.failureReason,
    deploymentCount: b._count.deployments,
    at: (b.finishedAt ?? b.createdAt).toISOString(),
  }));

  const failedDeploys = deploymentRows.filter((d) => d.status === "FAILED").length;
  const production = deploymentRows.filter(
    (d) => d.environment === "PRODUCTION" && d.status === "SUCCEEDED",
  ).length;

  // The whole engineering side is empty until a pipeline is connected. Saying so
  // once, plainly, beats four tables each rendering their own "no rows".
  if (summary.isEmpty || (deploymentRows.length === 0 && buildRows.length === 0)) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Deployments"
          description="Build and deployment history for every product Altruvex operates."
        />
        <EmptyState
          icon={Rocket}
          title={summary.isEmpty ? "No products yet" : "Nothing has been reported"}
          body={
            summary.isEmpty
              ? "Deployments belong to a product. Add the sites and apps Altruvex operates, then point their pipelines at the ingest endpoint."
              : "No build or deployment has reached the ingest endpoint. This page is deliberately read-only: rows appear because CI reported them, never because someone filled in a form — so it stays empty until a pipeline posts. Issue an ingest token on a product to connect one."
          }
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
      <PageHeader
        title="Deployments"
        description="Reported by CI through the ingest endpoint. Nothing here is entered by hand, which is why it can be trusted as a record of what actually shipped."
        tabs={<TabNav tabs={[...TABS]} active={tab} basePath="/deployments" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="To production"
          value={production}
          sub="Successful, in this window"
          tone={production > 0 ? "success" : "neutral"}
        />
        <StatTile
          label="Failed deploys"
          value={failedDeploys}
          sub="In this window"
          tone={failedDeploys > 0 ? "danger" : "neutral"}
        />
        <StatTile
          label="Failed builds"
          value={buildRows.filter((b) => b.status === "FAILED").length}
          sub="In this window"
          tone={buildRows.some((b) => b.status === "FAILED") ? "warning" : "neutral"}
        />
        <StatTile
          label="Open incidents"
          value={summary.openIncidents}
          sub="Across all products"
          tone={summary.openIncidents > 0 ? "danger" : "success"}
          href={summary.openIncidents > 0 ? "/incidents" : undefined}
        />
      </div>

      {tab === "deployments" ? (
        <DeploymentsTable rows={deploymentRows} />
      ) : (
        <BuildsTable rows={buildRows} />
      )}
    </div>
  );
}
