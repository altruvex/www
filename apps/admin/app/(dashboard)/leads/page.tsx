import type * as React from "react";
import Link from "next/link";
import { prisma } from "@repo/database";
import { CalendarPlus, FilePlus2, Phone, Target } from "lucide-react";
import { MetaList } from "@/components/os/detail-layout";
import { InspectSheet } from "@/components/os/inspect-sheet";
import { PageHeader } from "@/components/os/page-header";
import { StatusPill } from "@/components/ui/badge";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { date, money, phone as fmtPhone, when } from "@/lib/format";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { statusOf } from "@/lib/status";
import { EmptyInline, EmptyState } from "@/components/os/empty-state";
import { ActiveFilters } from "@/components/os/filter-bar";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { bandTone, recommendedAction, scoreBand, scoreLead } from "@/lib/lead-score";
import { ToneBadge } from "@/components/ui/badge";
import { LeadRecordEditor } from "@/components/os/lead-record-editor";
import { getPricing } from "@/lib/pricing-store";
import {
  SCORE_SUBMISSION_SELECT,
  budgetLabel,
  dayString,
  loadOwnerOptions,
  scoreInputFor,
} from "@/lib/precall";
import {
  STAGE_MEETINGS_SELECT,
  deriveClientStage,
  isUncontacted,
} from "@/lib/dashboard-data";
import { IntakeTabs, LEAD_STAGES, LEAD_STATUS_PREFILTER } from "./intake-tabs";
import { LeadInspectorActions } from "./lead-inspector-actions";
import { LeadsTable, type LeadRow } from "./leads-table";
import { projectTypeName } from "@/lib/transparency-lead-labels";
import { Button } from "@repo/ui";
import { PickToOpen } from "@/components/os/pick-to-open";

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
  // Nurture and lost leads sit outside the working list; each has its own filter.
  const parked = stage === "nurture" ? "NURTURE" : stage === "lost" ? "LOST" : null;

  const [clients, unconvertedSubmissions, unconvertedEstimates, owners, pricing] =
    await Promise.all([
      prisma.client.findMany({
        where: { status: { in: parked ? [parked] : LEAD_STATUS_PREFILTER } },
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
          ownerId: true,
          owner: { select: { name: true, email: true } },
          nextActionAt: true,
          nextActionNote: true,
          lostReason: true,
          lostNote: true,
          contactSubmission: {
            select: { ...SCORE_SUBMISSION_SELECT, utmSource: true },
          },
          transparencyLead: {
            select: {
              priceMin: true,
              priceMax: true,
              projectType: true,
              timeline: true,
              situation: true,
              nextStep: true,
              utmSource: true,
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
          ...STAGE_MEETINGS_SELECT,
          messages: { where: { direction: "INBOUND" }, select: { id: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contactSubmission.count({
        where: { client: null, status: { not: "SPAM" } },
      }),
      prisma.transparencyLead.count({ where: { client: null } }),
      canEdit ? loadOwnerOptions() : Promise.resolve([]),
      getPricing(),
    ]);

  const stageFilter: readonly string[] = parked ? [parked] : LEAD_STAGES;

  const rows: LeadRow[] = clients
    .filter((client) =>
      stageFilter.includes(deriveClientStage(client)),
    )
    .map((client) => {
      const { score, reasons } = scoreLead(
        scoreInputFor({ ...client, inboundMessages: client.messages.length }),
      );
      const stage = deriveClientStage(client);
      const band = scoreBand(score, client.contactSubmission?.budget ?? null);

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
        // An estimator-only lead has no stated interest; the project type it
        // chose in the estimator is the nearest true answer.
        serviceInterest: client.contactSubmission?.serviceInterest
          ? statusOf("serviceType", client.contactSubmission.serviceInterest).label
          : client.transparencyLead
            ? projectTypeName(client.transparencyLead.projectType)
            : null,
        utmSource: client.contactSubmission
          ? client.contactSubmission.utmSource
          : (client.transparencyLead?.utmSource ?? null),
        estimateMin: client.transparencyLead?.priceMin ?? null,
        estimateMax: client.transparencyLead?.priceMax ?? null,
        stage,
        score,
        scoreBand: band,
        recommendedAction: recommendedAction(band, stage),
        scoreReasons: reasons,
        messageCount: client._count.messages,
        inboundCount: client.messages.length,
      };
    });

  const inspected = inspect
    ? (rows.find((r) => r.id === inspect) ?? null)
    : null;
  const inspectedClient = inspected
    ? (clients.find((c) => c.id === inspected.id) ?? null)
    : null;
  const inspectedMessage = inspectedClient?.contactSubmission?.message ?? null;

  const uncontacted = rows.filter((r) => isUncontacted(r.stage)).length;
  const qualified = rows.filter((r) => r.stage === "QUALIFIED").length;
  const hot = rows.filter((r) => r.scoreBand === "High intent").length;
  const shown = uncontactedOnly ? rows.filter((r) => isUncontacted(r.stage)) : rows;

  // An empty list offers the submissions waiting to become clients, each
  // opened on its own page where Convert lives.
  const pickSubmissions =
    rows.length === 0 &&
    can(role, "view", "lead") &&
    can(role, "create", "client") &&
    roleCanOpen(role, "/submissions")
      ? (
          await prisma.contactSubmission.findMany({
            where: { client: null, status: { not: "SPAM" } },
            orderBy: { submittedAt: "desc" },
            take: 50,
            select: { id: true, name: true, phone: true, submittedAt: true },
          })
        ).map((s) => ({
          label: s.name || s.phone,
          href: `/submissions/${s.id}`,
          hint: `Submitted ${when(s.submittedAt)}`,
        }))
      : [];

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
          label={parked ? `${statusOf("pipelineStage", parked).label} leads` : "Open leads"}
          value={rows.length}
          sub={parked ? "Outside the working list" : "Pre-proposal"}
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
          label="High intent"
          value={hot}
          sub="Worth calling today"
          tone={hot ? "success" : "neutral"}
        />
      </div>

      <p className="text-meta text-muted-foreground">
        Parked:{" "}
        <Link href="/leads?stage=nurture" className="text-brand hover:underline">
          Nurture
        </Link>{" "}
        ·{" "}
        <Link href="/leads?stage=lost" className="text-brand hover:underline">
          Lost
        </Link>
      </p>

      <ActiveFilters
        labels={{ stage: "Stage" }}
        valueLabels={{
          stage: { new: "Uncontacted", nurture: "Nurture", lost: "Lost" },
        }}
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
            pickSubmissions.length > 0 ? (
              <PickToOpen
                label="Convert a submission"
                options={pickSubmissions}
                footer={{ href: "/submissions", label: "All submissions" }}
                searchPlaceholder="Search submissions"
              />
            ) : can(role, "create", "client") ? (
              <Button asChild variant="outline">
                <Link href="/clients/new">Add a client</Link>
              </Button>
            ) : undefined
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
          budget={
            inspected.budget ? budgetLabel(inspected.budget, pricing) : null
          }
          editor={
            canEdit && inspectedClient ? (
              <LeadRecordEditor
                key={inspectedClient.id}
                clientId={inspectedClient.id}
                admins={owners}
                initial={{
                  ownerId: inspectedClient.ownerId,
                  nextActionAt: dayString(inspectedClient.nextActionAt),
                  nextActionNote: inspectedClient.nextActionNote ?? "",
                }}
              />
            ) : null
          }
          record={
            inspectedClient
              ? {
                  owner: inspectedClient.owner
                    ? inspectedClient.owner.name || inspectedClient.owner.email
                    : null,
                  nextActionAt: inspectedClient.nextActionAt,
                  nextActionNote: inspectedClient.nextActionNote,
                  lostReason: inspectedClient.lostReason,
                  lostNote: inspectedClient.lostNote,
                }
              : null
          }
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
  budget,
  editor,
  record,
  canEdit,
  canSchedule,
  canPropose,
}: {
  row: LeadRow;
  message: string | null;
  budget: string | null;
  editor: React.ReactNode;
  record: {
    owner: string | null;
    nextActionAt: Date | null;
    nextActionNote: string | null;
    lostReason: string | null;
    lostNote: string | null;
  } | null;
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
        <div className="flex flex-wrap items-center gap-2">
          <p className="telemetry text-subtle-foreground">
            Score {row.score} / 100
          </p>
          <ToneBadge tone={bandTone(row.scoreBand)}>{row.scoreBand}</ToneBadge>
        </div>
        <p className="text-base font-medium">{row.recommendedAction}</p>
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
        className="rounded-panel-sm border border-border-subtle"
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
          { label: "Budget", value: budget },
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

      {record && (
        <section aria-label="Lead record" className="space-y-2">
          <p className="telemetry text-subtle-foreground">Lead record</p>
          <MetaList
            className="rounded-panel-sm border border-border-subtle"
            items={[
              { label: "Owner", value: record.owner ?? "Nobody yet" },
              {
                label: "Next action",
                value: record.nextActionAt
                  ? `${date(record.nextActionAt)}${record.nextActionNote ? ` — ${record.nextActionNote}` : ""}`
                  : "None set",
              },
              ...(record.lostReason
                ? [
                    {
                      label: "Lost because",
                      value: `${statusOf("lostReason", record.lostReason).label}${record.lostNote ? ` — ${record.lostNote}` : ""}`,
                    },
                  ]
                : []),
            ]}
          />
          {editor}
        </section>
      )}

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
