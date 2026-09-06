import { prisma } from "@repo/database";
import { Gauge } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { money, percent } from "@/lib/format";
import { TransparencyTable, type EstimateRow } from "./transparency-table";

export const dynamic = "force-dynamic";

/**
 * §17 — the public transparency surface, from the inside.
 *
 * Altruvex publishes its prices, so the estimator is a real lead source AND a
 * public commitment. This page separates the two: what the public was quoted
 * (immutable, and what a client will quote back at you) from what happened next.
 */
export default async function TransparencyPage() {
  const leads = await prisma.transparencyLead.findMany({
    include: { client: { select: { id: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows: EstimateRow[] = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    projectType: lead.projectType,
    complexity: lead.complexity,
    timeline: lead.timeline,
    priceMin: lead.priceMin,
    priceMax: lead.priceMax,
    weeksMin: lead.weeksMin,
    weeksMax: lead.weeksMax,
    createdAt: lead.createdAt.toISOString(),
    convertedAt: lead.convertedAt?.toISOString() ?? null,
    clientId: lead.client?.id ?? null,
  }));

  const converted = rows.filter((r) => r.clientId).length;
  const avgQuote = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.priceMin + r.priceMax) / 2, 0) / rows.length)
    : 0;

  const byType = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.projectType] = (acc[row.projectType] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transparency"
        description="Every quote the public estimator has given. These numbers are a published commitment — a client can and will read them back to you, so proposals are priced from the same table."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Estimates given" value={rows.length} sub="Completions on the public site" />
        <StatTile
          label="Converted"
          value={percent(rows.length ? Math.round((converted / rows.length) * 100) : 0)}
          sub={`${converted} became client records`}
          tone={converted ? "success" : "neutral"}
        />
        <StatTile label="Average quote" value={money(avgQuote, "EGP", { compact: true })} sub="Midpoint of the range" />
        <StatTile
          label="Unconverted"
          value={rows.length - converted}
          sub={rows.length - converted ? "Quoted, never followed up" : "All followed up"}
          tone={rows.length - converted ? "warning" : "success"}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Gauge}
          title="No estimates yet"
          body="The public estimator on /transparency writes a row here every time someone completes it — including the exact price range and timeline they were shown. That record is what keeps the published price and the sent proposal honest with each other."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
          <TransparencyTable rows={rows} />
          <Panel title="What people price" description="Project types requested">
            <ul className="space-y-2">
              {byType.map(([type, count]) => (
                <li key={type} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-base text-muted-foreground">{type}</span>
                  <span className="h-1 w-12 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${(count / byType[0][1]) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-end font-mono text-micro tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}
