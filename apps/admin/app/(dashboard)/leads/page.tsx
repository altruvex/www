import Link from "next/link";
import { prisma } from "@repo/database";
import { CalendarPlus, FilePlus2, Phone, Target } from "lucide-react";
import { MetaList } from "@/components/os/detail-layout";
import { InspectSheet } from "@/components/os/inspect-sheet";
import { PageHeader } from "@/components/os/page-header";
import { StatusPill } from "@/components/ui/badge";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { money, phone as fmtPhone, when } from "@/lib/format";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { statusOf } from "@/lib/status";
import { EmptyInline, EmptyState } from "@/components/os/empty-state";
import { ActiveFilters } from "@/components/os/filter-bar";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { scoreLead } from "@/lib/lead-score";
import { deriveClientStage, isUncontacted } from "@/lib/dashboard-data";
import { IntakeTabs, LEAD_STAGES, LEAD_STATUS_PREFILTER } from "./intake-tabs";
import { LeadInspectorActions } from "./lead-inspector-actions";
import { LeadsTable, type LeadRow } from "./leads-table";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ inspect?: string; stage?: string }>;
}) {
  const denied = await gateRoute("/leads", "leads");
  if (denied) return denied;
  const role = await currentRole();
  const canEdit = can(role, "edit", "client");
  const canDelete = can(role, "delete", "client");
  const shortcuts = {
    canSchedule:
      can(role, "create", "meeting") && roleCanOpen(role, "/calendar"),
    canPropose: can(role, "create", "proposal"),
    canOpenClient: roleCanOpen(role, "/clients"),
  };
  const { inspect, stage } = await searchParams;
  const uncontactedOnly = stage === "new";

  const [clients, unconvertedSubmissions, unconvertedEstimates] =
    await Promise.all([
      prisma.client.findMany({
        where: { status: { in: LEAD_STATUS_PREFILTER } },
        select: {
          id: true,
          name: true,
          company: true,
          phone: true,
          email: true,
          industry: true,
          source: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          contactSubmission: {
            select: {
              budget: true,
              projectTimeline: true,
              serviceInterest: true,
              message: true,
              utmSource: true,
            },
          },
          transparencyLead: {
            select: {
              priceMin: true,
              priceMax: true,
              projectType: true,
              timeline: true,
            },
          },
          proposals: {
            select: {
              status: true,
              readAt: true,
              totalPrice: true,
              currency: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          projects: { select: { id: true }, take: 1 },
          contracts: {
            select: { status: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          messages: { where: { direction: "INBOUND" }, select: { id: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contactSubmission.count({
        where: { client: null, status: { not: "SPAM" } },
      }),
      prisma.transparencyLead.count({ where: { client: null } }),
    ]);

  const rows: LeadRow[] = clients
    .filter((client) =>
      (LEAD_STAGES as readonly string[]).includes(deriveClientStage(client)),
    )
    .map((client) => {
      const { score, reasons } = scoreLead({
        budget: client.contactSubmission?.budget ?? null,
        timeline:
          client.contactSubmission?.projectTimeline ??
          client.transparencyLead?.timeline ??
          null,
        source: client.source,
        serviceInterest: client.contactSubmission?.serviceInterest ?? null,
        hasCompany: Boolean(client.company),
        hasEmail: Boolean(client.email),
        messageLength: client.contactSubmission?.message?.length ?? 0,
        estimatorPriceMax: client.transparencyLead?.priceMax ?? null,
        proposalCount: client.proposals.length,
        readProposal: Boolean(client.proposals[0]?.readAt),
        inboundMessages: client.messages.length,
      });

      return {
        id: client.id,
        name: client.name,
        company: client.company,
        phone: client.phone,
        email: client.email,
        industry: client.industry,
        source: client.source,
        status: client.status,
        priority: client.priority,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
        budget: client.contactSubmission?.budget ?? null,
        timeline:
          client.contactSubmission?.projectTimeline ??
          client.transparencyLead?.timeline ??
          null,
        serviceInterest: client.contactSubmission?.serviceInterest ?? null,
        utmSource: client.contactSubmission?.utmSource ?? null,
        estimateMin: client.transparencyLead?.priceMin ?? null,
        estimateMax: client.transparencyLead?.priceMax ?? null,
        stage: deriveClientStage(client),
        score,
        scoreReasons: reasons,
        messageCount: client._count.messages,
        inboundCount: client.messages.length,
      };
    });

  const inspected = inspect
    ? (rows.find((r) => r.id === inspect) ?? null)
    : null;
  const inspectedMessage = inspected
    ? (clients.find((c) => c.id === inspected.id)?.contactSubmission?.message ??
      null)
    : null;

  const uncontacted = rows.filter((r) => isUncontacted(r.stage)).length;
  const qualified = rows.filter((r) => r.stage === "QUALIFIED").length;
  const hot = rows.filter((r) => r.score >= 65).length;
  const shown = uncontactedOnly ? rows.filter((r) => isUncontacted(r.stage)) : rows;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leads"
        tabs={<IntakeTabs active="leads" />}
        description="Demand that has not become an opportunity yet. A lead leaves this list the moment a proposal is sent."
        meta={
          unconvertedSubmissions + unconvertedEstimates > 0 ? (
            <span>
              {unconvertedSubmissions + unconvertedEstimates} website submission
              {unconvertedSubmissions + unconvertedEstimates === 1
                ? ""
                : "s"}{" "}
              not yet converted into a lead ·{" "}
              <Link href="/submissions" className="text-brand hover:underline">
                review them
              </Link>
            </span>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Open leads"
          value={rows.length}
          sub="Pre-proposal"
          href="/pipeline"
        />
        <StatTile
          label="Uncontacted"
          value={uncontacted}
          sub={uncontacted ? "Nobody has replied yet" : "All contacted"}
          tone={uncontacted > 0 ? "danger" : "success"}
          href={uncontacted > 0 ? "/leads?stage=new" : undefined}
        />
        <StatTile
          label="Qualified"
          value={qualified}
          sub="Ready for a proposal"
          tone={qualified ? "progress" : "neutral"}
        />
        <StatTile
          label="Score ≥ 65"
          value={hot}
          sub="Worth calling today"
          tone={hot ? "success" : "neutral"}
        />
      </div>

      <ActiveFilters
        labels={{ stage: "Stage" }}
        valueLabels={{ stage: { new: "Uncontacted" } }}
      />

      {rows.length > 0 && shown.length === 0 ? (
        <Panel>
          <EmptyInline
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/leads">Show all leads</Link>
              </Button>
            }
          >
            Every open lead has been contacted.
          </EmptyInline>
        </Panel>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No open leads"
          body={
            <>
              Every lead has either been qualified into an opportunity or closed
              out. New leads land here automatically when a website submission
              is converted into a client record.
            </>
          }
          action={
            <Button asChild variant="outline">
              <Link href="/submissions">Review website submissions</Link>
            </Button>
          }
        />
      ) : (
        <LeadsTable
          rows={shown}
          canEdit={canEdit}
          canDelete={canDelete}
          {...shortcuts}
        />
      )}

      {inspected && (
        <LeadInspector
          row={inspected}
          message={inspectedMessage}
          canEdit={canEdit}
          canSchedule={shortcuts.canSchedule}
          canPropose={shortcuts.canPropose}
        />
      )}
    </div>
  );
}

function LeadInspector({
  row,
  message,
  canEdit,
  canSchedule,
  canPropose,
}: {
  row: LeadRow;
  message: string | null;
  canEdit: boolean;
  canSchedule: boolean;
  canPropose: boolean;
}) {
  const label = row.company || row.name || fmtPhone(row.phone);
  return (
    <InspectSheet
      open
      title={label}
      subtitle={
        row.company && row.name
          ? row.name
          : statusOf("clientSource", row.source).label
      }
      status={
        <StatusPill registry="pipelineStage" value={row.stage} variant="dot" />
      }
      fullHref={`/clients/${row.id}`}
      footer={
        <>
          <Button asChild variant="outline">
            <a href={`tel:${row.phone}`}>
              <Phone className="size-3.5" aria-hidden />
              Call
            </a>
          </Button>
          {canSchedule && (
            <Button asChild variant="outline">
              <Link href={`/calendar?new=meeting&client=${row.id}`}>
                <CalendarPlus className="size-3.5" aria-hidden />
                Schedule a meeting
              </Link>
            </Button>
          )}
          {canPropose && (
            <Button asChild variant="outline">
              <Link href={`/clients/${row.id}/new-proposal`}>
                <FilePlus2 className="size-3.5" aria-hidden />
                New proposal
              </Link>
            </Button>
          )}
          {canEdit && (
            <LeadInspectorActions clientId={row.id} status={row.status} />
          )}
        </>
      }
    >
      <section aria-label="Score" className="space-y-1.5">
        <p className="telemetry text-subtle-foreground">
          Score {row.score} / 100
        </p>
        {row.scoreReasons.length > 0 ? (
          <ul className="space-y-0.5">
            {row.scoreReasons.map((reason) => (
              <li
                key={reason}
                className="font-mono text-meta text-muted-foreground"
              >
                {reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base text-muted-foreground">
            Nothing has moved the score yet.
          </p>
        )}
      </section>

      <MetaList
        className="rounded-md border border-border"
        items={[
          {
            label: "Phone",
            value: (
              <span className="font-mono tabular-nums">
                {fmtPhone(row.phone)}
              </span>
            ),
          },
          {
            label: "Email",
            value: row.email ? (
              <a
                href={`mailto:${row.email}`}
                className="break-all text-brand hover:underline"
              >
                {row.email}
              </a>
            ) : null,
          },
          { label: "Industry", value: row.industry },
          {
            label: "Source",
            value: `${statusOf("clientSource", row.source).label}${row.utmSource ? ` · ${row.utmSource}` : ""}`,
          },
          {
            label: "Priority",
            value: (
              <StatusPill
                registry="priority"
                value={row.priority}
                variant="dot"
              />
            ),
          },
          {
            label: "Budget",
            value: row.budget
              ? statusOf("budgetRange", row.budget).label
              : null,
          },
          {
            label: "Timeline",
            value: row.timeline
              ? statusOf("projectTimeline", row.timeline).label
              : null,
          },
          {
            label: "Estimator range",
            hint: "What the public estimator showed this visitor, not a stated budget",
            value:
              row.estimateMin != null && row.estimateMax != null ? (
                <span className="font-mono tabular-nums">
                  {money(row.estimateMin, "EGP", { compact: true })}–
                  {money(row.estimateMax, "EGP", { compact: true })}
                </span>
              ) : null,
          },
          { label: "Interested in", value: row.serviceInterest },
          {
            label: "Replies",
            value: `${row.inboundCount} from them · ${row.messageCount} total`,
          },
          { label: "Arrived", value: when(row.createdAt) },
        ]}
      />

      {message && (
        <section aria-label="Their message" className="space-y-1.5">
          <p className="telemetry text-subtle-foreground">Their message</p>
          <p className="whitespace-pre-wrap text-base text-muted-foreground">
            {message}
          </p>
        </section>
      )}
    </InspectSheet>
  );
}
