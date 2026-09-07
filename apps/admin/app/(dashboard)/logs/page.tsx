import Link from "next/link";
import { ScrollText } from "lucide-react";

import { prisma, type DeployEnvironment, type LogLevel } from "@repo/database";
import { Button } from "@repo/ui";

import { EmptyState } from "@/components/os/empty-state";
import { PageHeader } from "@/components/os/page-header";
import { listLogs } from "@/lib/engineering";
import { LogExplorer, type LogRow } from "./log-explorer";

export const dynamic = "force-dynamic";

const LEVELS = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const;
const ENVIRONMENTS = ["PRODUCTION", "STAGING", "PREVIEW"] as const;

const asLevel = (v?: string): LogLevel | undefined =>
  LEVELS.includes(v as LogLevel) ? (v as LogLevel) : undefined;
const asEnvironment = (v?: string): DeployEnvironment | undefined =>
  ENVIRONMENTS.includes(v as DeployEnvironment) ? (v as DeployEnvironment) : undefined;

/**
 * The log explorer (§7).
 *
 * Filtering, searching and paging all happen in the database and in the URL —
 * not in component state over a preloaded array. That is the only design that
 * survives a product with a hundred thousand log lines, and it makes any view
 * an operator reaches a link they can paste into a message.
 */
export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string;
    level?: string;
    environment?: string;
    q?: string;
    requestId?: string;
    cursor?: string;
  }>;
}) {
  const sp = await searchParams;

  const [products, page] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    listLogs({
      productId: sp.product,
      level: asLevel(sp.level),
      environment: asEnvironment(sp.environment),
      q: sp.q?.trim() || undefined,
      requestId: sp.requestId?.trim() || undefined,
      cursor: sp.cursor,
    }),
  ]);

  const rows: LogRow[] = page.entries.map((entry) => ({
    id: entry.id,
    level: entry.level,
    environment: entry.environment,
    message: entry.message,
    source: entry.source,
    requestId: entry.requestId,
    timestamp: entry.timestamp.toISOString(),
    productId: entry.product.id,
    productName: entry.product.name,
    deploymentNumber: entry.deployment?.number ?? null,
    deploymentId: entry.deployment?.id ?? null,
    buildNumber: entry.build?.number ?? null,
    metadata: entry.metadata ? JSON.stringify(entry.metadata, null, 2) : null,
  }));

  const hasFilters = Boolean(sp.product || sp.level || sp.environment || sp.q || sp.requestId);

  if (products.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Logs"
          description="Operational log lines from every product Altruvex runs."
        />
        <EmptyState
          icon={ScrollText}
          title="No products yet"
          body="Logs belong to a product. Add the sites and apps Altruvex operates, then point their runtime at the ingest endpoint — log lines are posted in batches and are never generated here."
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
        title="Logs"
        description="Everything products report, newest first. Filters and paging run in the database, so a URL from this page is a view someone else can open."
      />
      <LogExplorer
        rows={rows}
        products={products}
        filters={{
          product: sp.product ?? "",
          level: sp.level ?? "",
          environment: sp.environment ?? "",
          q: sp.q ?? "",
          requestId: sp.requestId ?? "",
        }}
        hasFilters={hasFilters}
        nextCursor={page.nextCursor}
        hasMore={page.hasMore}
      />
    </div>
  );
}
