import { prisma } from "@repo/database";
import { Gauge } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/os/page-header";
import { Button } from "@repo/ui";
import { Panel } from "@/components/os/panel";
import { MetaList } from "@/components/os/detail-layout";
import { EntityLink } from "@/components/os/entity-link";
import { IntakeTabs } from "../leads/intake-tabs";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { dateTime, money, percent, phone as fmtPhone } from "@/lib/format";
import { brandLabel, contentLabel, scopeNoteNames } from "@/lib/transparency-lead-labels";
import { TransparencyTable, type EstimateRow } from "./transparency-table";

export const dynamic = "force-dynamic";

/**
 * §17 — the public transparency surface, from the inside.
 *
 * Altruvex publishes its prices, so the estimator is a real lead source AND a
 * public commitment. This page separates the two: what the public was quoted
 * (immutable, and what a client will quote back at you) from what happened next.
 */
export default async function TransparencyPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { lead: leadParam } = await searchParams;
  const leads = await prisma.transparencyLead.findMany({
    include: { client: { select: { id: true, name: true, company: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows: EstimateRow[] = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    projectType: lead.projectType,
    complexity: lead.complexity,
    timeline: lead.timeline,
    // Older rows predate these fields and carry null / []: shown as nothing.
    brand: brandLabel(lead.brandIdentity),
    content: contentLabel(lead.contentReadiness),
    scopeNotes: scopeNoteNames(lead.scopeNotes),
    note: lead.note,
    priceMin: lead.priceMin,
    priceMax: lead.priceMax,
    weeksMin: lead.weeksMin,
    weeksMax: lead.weeksMax,
    createdAt: lead.createdAt.toISOString(),
    convertedAt: lead.convertedAt?.toISOString() ?? null,
    clientId: lead.client?.id ?? null,
    clientName: lead.client ? lead.client.company || lead.client.name || "Unnamed client" : null,
  }));

  // /transparency?lead=<id> is where entityHref("transparencyLead") points.
  const target = leadParam ? (rows.find((r) => r.id === leadParam) ?? null) : null;

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
        title="Estimator"
        tabs={<IntakeTabs active="estimator" />}
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

      {leadParam && !target && (
        <Panel title="Estimate not found">
          <p className="text-base text-muted-foreground">
            No estimate has the id <span className="font-mono text-meta">{leadParam}</span>. It may
            have been deleted, or the link is out of date.{" "}
            <Link href="/transparency" className="text-foreground underline underline-offset-2">
              Show every estimate
            </Link>
          </p>
        </Panel>
      )}

      {target && (
        <Panel
          title={target.name || fmtPhone(target.phone)}
          description={`Estimate completed ${dateTime(target.createdAt)}`}
          action={
            <Link
              href="/transparency"
              className="text-meta text-muted-foreground hover:text-foreground"
            >
              Clear
            </Link>
          }
          flush
        >
          <MetaList
            items={[
              { label: "Project", value: `${target.projectType} · ${target.complexity}` },
              { label: "Quoted", value: `${money(target.priceMin)} – ${money(target.priceMax)}` },
              { label: "Weeks", value: `${target.weeksMin}–${target.weeksMax}` },
              { label: "Urgency", value: target.timeline },
              { label: "Brand", value: target.brand ?? "—" },
              { label: "Content", value: target.content ?? "—" },
              {
                label: "Scope notes",
                value: target.scopeNotes.length ? target.scopeNotes.join(", ") : "—",
              },
              {
                label: "Note",
                value: target.note ? (
                  <span className="whitespace-pre-wrap">{target.note}</span>
                ) : (
                  "—"
                ),
              },
              {
                label: "Client",
                value: target.clientId ? (
                  <EntityLink type="client" id={target.clientId}>
                    {target.clientName ?? "Client"}
                  </EntityLink>
                ) : (
                  "Not converted yet. Convert it from the row below."
                ),
              },
            ]}
          />
        </Panel>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Gauge}
          title="No estimates yet"
          body="The public estimator on /transparency writes a row here every time someone completes it — including the exact price range and timeline they were shown. That record is what keeps the published price and the sent proposal honest with each other."
          action={
            <Button asChild variant="outline">
              <Link href="/submissions">Review form submissions</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
          <TransparencyTable rows={rows} focusId={target?.id} />
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
