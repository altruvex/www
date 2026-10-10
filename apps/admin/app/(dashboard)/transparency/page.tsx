import { prisma } from "@repo/database";
import { Gauge } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/os/page-header";
import { Button } from "@repo/ui";
import { Panel } from "@/components/os/panel";
import { MetaList } from "@/components/os/detail-layout";
import { EntityLink } from "@/components/os/entity-link";
import { InspectSheet } from "@/components/os/inspect-sheet";
import { NextSteps } from "@/components/os/next-steps";
import { currentRole } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { IntakeTabs } from "../leads/intake-tabs";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { dateTime, money, percent, phone as fmtPhone } from "@/lib/format";
import {
  brandLabel,
  contentLabel,
  scopeNoteNames,
} from "@/lib/transparency-lead-labels";
import { leadStepPermissions } from "../submissions/lead-permissions";
import { convertedLeadSteps } from "../submissions/lead-steps";
import { ConvertEstimateButton } from "./convert-estimate-button";
import { TransparencyTable, type EstimateRow } from "./transparency-table";

export const dynamic = "force-dynamic";

export default async function TransparencyPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; inspect?: string }>;
}) {
  const denied = await gateRoute("/transparency", "estimator leads");
  if (denied) return denied;
  const { lead: legacyLead, inspect: leadParam } = await searchParams;
  if (legacyLead && !leadParam) {
    redirect(`/transparency?inspect=${encodeURIComponent(legacyLead)}`);
  }
  const role = await currentRole();
  const canConvert = can(role, "create", "client");
  const canDelete = can(role, "delete", "lead");
  const allowed = leadStepPermissions(role);
  const leads = await prisma.transparencyLead.findMany({
    include: {
      client: { select: { id: true, name: true, company: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: EstimateRow[] = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    projectType: lead.projectType,
    complexity: lead.complexity,
    timeline: lead.timeline,
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
    clientName: lead.client
      ? lead.client.company || lead.client.name || "Unnamed client"
      : null,
  }));

  const target = leadParam
    ? (rows.find((r) => r.id === leadParam) ?? null)
    : null;

  const converted = rows.filter((r) => r.clientId).length;
  const avgQuote = rows.length
    ? Math.round(
        rows.reduce((s, r) => s + (r.priceMin + r.priceMax) / 2, 0) /
          rows.length,
      )
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
        <StatTile
          label="Estimates given"
          value={rows.length}
          sub="Completions on the public site"
        />
        <StatTile
          label="Converted"
          value={percent(
            rows.length ? Math.round((converted / rows.length) * 100) : 0,
          )}
          sub={`${converted} became client records`}
          tone={converted ? "success" : "neutral"}
        />
        <StatTile
          label="Average quote"
          value={money(avgQuote, "EGP", { compact: true })}
          sub="Midpoint of the range"
        />
        <StatTile
          label="Unconverted"
          value={rows.length - converted}
          sub={
            rows.length - converted
              ? "Quoted, never followed up"
              : "All followed up"
          }
          tone={rows.length - converted ? "warning" : "success"}
        />
      </div>

      {leadParam && !target && (
        <Panel title="Estimate not found">
          <p className="text-base text-muted-foreground">
            No estimate has the id{" "}
            <span className="font-mono text-meta">{leadParam}</span>. It may
            have been deleted, or the link is out of date.{" "}
            <Link
              href="/transparency"
              className="text-foreground underline underline-offset-2"
            >
              Show every estimate
            </Link>
          </p>
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
          <TransparencyTable
            rows={rows}
            focusId={target?.id}
            canConvert={canConvert}
            canDelete={canDelete}
            canOpenClient={allowed.openClient}
            canPropose={allowed.propose}
            canSchedule={allowed.schedule}
          />
          <Panel
            title="What people price"
            description="Project types requested"
          >
            <ul className="space-y-2">
              {byType.map(([type, count]) => (
                <li key={type} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-base text-muted-foreground">
                    {type}
                  </span>
                  <span className="h-1 w-12 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${(count / byType[0][1]) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-end font-mono text-micro tabular-nums">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {target && (
        <EstimateInspector
          target={target}
          canConvert={canConvert}
          allowed={allowed}
        />
      )}
    </div>
  );
}

function EstimateInspector({
  target,
  canConvert,
  allowed,
}: {
  target: EstimateRow;
  canConvert: boolean;
  allowed: { propose: boolean; schedule: boolean };
}) {
  return (
    <InspectSheet
      open
      title={target.name || target.email || fmtPhone(target.phone)}
      subtitle={`Estimate completed ${dateTime(target.createdAt)}`}
      fullHref={target.clientId ? `/clients/${target.clientId}` : undefined}
      footer={
        target.clientId ? (
          <Button asChild variant="outline">
            <Link href={`/clients/${target.clientId}`}>Open client</Link>
          </Button>
        ) : canConvert ? (
          <ConvertEstimateButton leadId={target.id} variant="brand" />
        ) : undefined
      }
    >
      <MetaList
        className="rounded-panel-sm border border-border-subtle"
        items={[
          {
            label: "Phone",
            value: (
              <span className="font-mono tabular-nums">
                {fmtPhone(target.phone)}
              </span>
            ),
          },
          ...(target.email ? [{ label: "Email", value: target.email }] : []),
          {
            label: "Project",
            value: `${target.projectType} · ${target.complexity}`,
          },
          {
            label: "Quoted",
            value: (
              <span className="font-mono tabular-nums">
                {money(target.priceMin)} – {money(target.priceMax)}
              </span>
            ),
          },
          { label: "Weeks", value: `${target.weeksMin}–${target.weeksMax}` },
          { label: "Urgency", value: target.timeline },
          { label: "Brand", value: target.brand },
          { label: "Content", value: target.content },
          {
            label: "Scope notes",
            value: target.scopeNotes.length
              ? target.scopeNotes.join(", ")
              : null,
          },
          {
            label: "Client",
            value: target.clientId ? (
              <EntityLink type="client" id={target.clientId}>
                {target.clientName ?? "Client"}
              </EntityLink>
            ) : (
              "Not converted yet"
            ),
          },
        ]}
      />
      {target.note && (
        <section aria-label="Their note" className="space-y-1.5">
          <p className="telemetry text-subtle-foreground">Their note</p>
          <p className="whitespace-pre-wrap text-base text-muted-foreground">
            {target.note}
          </p>
        </section>
      )}
      {target.clientId && (
        <NextSteps steps={convertedLeadSteps(target.clientId, allowed)} />
      )}
    </InspectSheet>
  );
}
