import type * as React from "react";
import Link from "next/link";
import { ClientSource, prisma } from "@repo/database";
import { CalendarPlus, FilePlus2, Phone, Target } from "lucide-react";
import { MetaList } from "@/components/os/detail-layout";
import { InspectSheet } from "@/components/os/inspect-sheet";
import { PageHeader } from "@/components/os/page-header";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { roleCanOpen } from "@/lib/action-center";
import { getOperator } from "@/lib/authorize";
import { contactLabel, date, money, phone as fmtPhone, when } from "@/lib/format";
import { workingDueLabel } from "@/lib/working-days";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { LEAD_STAGES, statusOf } from "@/lib/status";
import { EmptyInline, EmptyState } from "@/components/os/empty-state";
import { ActiveFilters, FilterChip } from "@/components/os/filter-bar";
import { Panel } from "@/components/os/panel";
import { bandTone } from "@/lib/lead-score";
import { LeadRecordEditor } from "@/components/os/lead-record-editor";
import { FollowUpSheet } from "@/components/os/follow-up-sheet";
import { getPricing } from "@/lib/pricing-store";
import { budgetLabel, dayString, loadOwnerOptions } from "@/lib/precall";
import { isUncontacted } from "@/lib/dashboard-data";
import { emailTransport } from "@/lib/email";
import { followUpClosedReason, scheduleLink } from "@/lib/lead-follow-up";
import {
  SALES_GROUPS,
  inSalesGroup,
  isSalesGroup,
  type SalesGroup,
  loadSalesQueue,
  loadSalesRow,
  type SalesQueueRow,
} from "@/lib/sales-signals";
import { IntakeTabs } from "./intake-tabs";
import { LeadInspectorActions } from "./lead-inspector-actions";
import { LeadsTable, type LeadRow, type LeadValue } from "./leads-table";
import { HEALTH_DISPLAY, PRIORITY_DISPLAY, SLA_DISPLAY, WHY_VISIBLE } from "@/components/os/sales-display";
import { WhyList } from "@/components/os/next-steps";
import { isLiveQuote } from "@/lib/quotes";
import { isOverdue } from "@/lib/sales-intel";
import { projectTypeName } from "@/lib/transparency-lead-labels";
import { Button } from "@repo/ui";
import { PickToOpen } from "@/components/os/pick-to-open";

export const dynamic = "force-dynamic";

const CLIENT_SOURCES = Object.values(ClientSource);

/** The queue loads at most this many rows; the page says when it is capped. */
const QUEUE_TAKE = 200;

/** A quote counts as value only while it can still be accepted, or once it was. */
function valueOf(row: SalesQueueRow, now: Date): LeadValue {
  const p = row.client.proposals[0];
  if (p && isLiveQuote(p, now)) return { kind: "quoted", total: p.totalPrice, currency: p.currency };
  const lead = row.client.transparencyLead;
  if (lead?.priceMin != null && lead.priceMax != null)
    return { kind: "estimate", min: lead.priceMin, max: lead.priceMax };
  return null;
}

function toLeadRow(row: SalesQueueRow, order: number, now: Date): LeadRow {
  const { client, signals, reading } = row;
  return {
    id: client.id,
    name: client.name,
    company: client.company,
    phone: client.phone,
    email: client.email,
    source: client.source,
    utmSource: client.contactSubmission
      ? client.contactSubmission.utmSource
      : (client.transparencyLead?.utmSource ?? null),
    status: client.status,
    stage: signals.stage,
    isLead: (LEAD_STAGES as readonly string[]).includes(signals.stage),
    score: row.score.score,
    scoreBand: row.score.band,
    scoreReasons: row.score.reasons,
    priority: reading.priority,
    health: reading.health,
    next: {
      kind: reading.next.kind,
      label: reading.next.label,
      due: reading.next.due?.toISOString() ?? null,
      // The engine's business-day rule, decided here so render never reads the clock.
      overdue: isOverdue(reading.next.due, now),
    },
    sla: {
      state: reading.replySla.state,
      dueAt: reading.replySla.dueAt?.toISOString() ?? null,
    },
    owner: client.owner ? client.owner.name || client.owner.email : null,
    value: valueOf(row, now),
    lastActivityAt: signals.lastMeaningfulActivityAt?.toISOString() ?? null,
    createdAt: client.createdAt.toISOString(),
    order,
  };
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    inspect?: string;
    stage?: string;
    group?: string;
    source?: string;
    owner?: string;
  }>;
}) {
  const denied = await gateRoute("/leads", "leads");
  if (denied) return denied;
  const operator = await getOperator();
  const role = operator?.role;
  const viewerId = operator?.session.user.id ?? null;
  const canEdit = can(role, "edit", "client");
  const canDelete = can(role, "delete", "client");
  const canFollowUp = canEdit && can(role, "send", "message");
  const shortcuts = {
    canSchedule:
      can(role, "create", "meeting") && roleCanOpen(role, "/calendar"),
    canPropose: can(role, "create", "proposal"),
    canOpenClient: roleCanOpen(role, "/clients"),
  };
  const params = await searchParams;
  const { inspect, stage } = params;
  const group = isSalesGroup(params.group) ? params.group : null;
  const source = CLIENT_SOURCES.find((v) => v === params.source) ?? null;
  // owner=mine = the viewer's leads only; owner=unassigned = leads nobody owns;
  // any other value is a user id (ownerWhere in lib/sales-signals.ts).
  const owner = params.owner || null;
  const uncontactedOnly = stage === "new";
  // Nurture and lost leads sit outside the working queue; each has its own filter.
  const parked = stage === "nurture" ? "NURTURE" : stage === "lost" ? "LOST" : null;
  const now = new Date();

  const [queue, unconvertedSubmissions, unconvertedEstimates, owners, pricing] =
    await Promise.all([
      loadSalesQueue({
        // stage=new narrows after the load, so the group is applied below over
        // the narrowed rows and every group count is recounted over them.
        group: uncontactedOnly && group !== "won" ? null : group,
        owner,
        viewerId,
        take: QUEUE_TAKE,
        now,
        scope: parked ?? "open",
        where: source ? { source } : undefined,
      }),
      prisma.contactSubmission.count({
        where: { client: null, status: { not: "SPAM" } },
      }),
      prisma.transparencyLead.count({ where: { client: null } }),
      loadOwnerOptions(),
      getPricing(),
    ]);

  const narrowed = uncontactedOnly
    ? queue.rows.filter((r) => isUncontacted(r.signals.stage))
    : queue.rows;
  const visible =
    uncontactedOnly && group && group !== "won"
      ? narrowed.filter((r) => inSalesGroup(r, group, now))
      : narrowed;
  // Chip counts: the loader's counts, or with stage=new a recount over the narrowed rows.
  const groupCounts: Record<SalesGroup, number> = uncontactedOnly
    ? (Object.fromEntries(
        SALES_GROUPS.map((g) => [g.id, narrowed.filter((r) => inSalesGroup(r, g.id, now)).length]),
      ) as Record<SalesGroup, number>)
    : queue.counts;
  // "All open work": the true total of the scope; with stage=new, the narrowed rows.
  // In the "Recently won" view the loader returns the won total, not the open one, so no count.
  const allCount = uncontactedOnly ? narrowed.length : group === "won" ? undefined : queue.total;
  const rows = visible.map((r, i) => toLeadRow(r, i, now));

  // The inspected lead comes from the rows already loaded; only a lead outside
  // them (a deep link, a filtered-out row) costs one more single-row read.
  const inspectedRow = inspect
    ? (queue.rows.find((r) => r.client.id === inspect) ??
      (await loadSalesRow(inspect, viewerId, now)))
    : null;

  // An empty queue offers the submissions waiting to become clients, each
  // opened on its own page where Convert lives.
  const pickSubmissions =
    queue.total === 0 &&
    !group &&
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

  // The owner filter already decides these two groups, so their chip would read 0 by
  // construction: Unassigned under any owner but "unassigned", Mine under "unassigned"
  // or another person's id.
  const emptyByOwner = (id: SalesGroup) =>
    (id === "unassigned" && owner != null && owner !== "unassigned") ||
    (id === "mine" && owner != null && owner !== "mine" && owner !== viewerId);
  const groupLabel = SALES_GROUPS.find((g) => g.id === group)?.label;
  const ownerLabels = Object.fromEntries(owners.map((o) => [o.id, o.label]));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leads"
        tabs={<IntakeTabs active="leads" />}
        description="The sales work queue: every open lead and deal, ranked by what needs doing first. Signed, spam and lost leave it; a nurture lead returns on its review date."
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

      <nav aria-label="Work queue groups" className="flex flex-wrap gap-1.5">
        <FilterChip param="group" label="All open work" count={allCount} />
        {SALES_GROUPS.filter((g) => !emptyByOwner(g.id)).map((g) => (
          <FilterChip
            key={g.id}
            param="group"
            value={g.id}
            label={g.label}
            count={groupCounts[g.id]}
          />
        ))}
      </nav>

      <p className="text-meta text-muted-foreground" aria-live="polite">
        {queue.capped
          ? `Showing ${queue.loaded} of ${queue.total}${group === "won" ? "" : " — group counts cover the rows shown; narrow by owner or source to see the rest"}.`
          : `${queue.total} ${group === "won" ? "won recently" : parked ? statusOf("pipelineStage", parked).label.toLowerCase() : "open"}.`}{" "}
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
        labels={{ stage: "Stage", source: "Source", owner: "Owner" }}
        valueLabels={{
          stage: { new: "Uncontacted", nurture: "Nurture", lost: "Lost" },
          source: source ? { [source]: statusOf("clientSource", source).label } : {},
          owner: { ...ownerLabels, mine: "Mine", unassigned: "Unassigned" },
        }}
      />

      {queue.total === 0 && !group && !uncontactedOnly ? (
        <EmptyState
          icon={Target}
          title={parked ? `No ${statusOf("pipelineStage", parked).label.toLowerCase()} leads` : "No open work"}
          body={
            <>
              Every lead has either signed or been closed out. New leads land
              here automatically when a website submission is converted into a
              client record.
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
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyInline
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/leads">Show all open work</Link>
              </Button>
            }
          >
            {uncontactedOnly
              ? "Every lead here has been contacted."
              : `Nothing in ${groupLabel ?? "this view"}.`}
          </EmptyInline>
        </Panel>
      ) : (
        <LeadsTable
          rows={rows}
          canEdit={canEdit}
          canDelete={canDelete}
          {...shortcuts}
        />
      )}

      {inspectedRow && (
        <LeadInspector
          row={inspectedRow}
          now={now}
          budget={
            inspectedRow.client.contactSubmission?.budget
              ? budgetLabel(inspectedRow.client.contactSubmission.budget, pricing)
              : null
          }
          followUp={
            canFollowUp && !followUpClosedReason(inspectedRow.client) ? (
              <FollowUpSheet
                lead={{
                  id: inspectedRow.client.id,
                  label: contactLabel(inspectedRow.client),
                  name: inspectedRow.client.name,
                  email: inspectedRow.client.email,
                  phone: inspectedRow.client.phone,
                  stage: inspectedRow.signals.stage,
                }}
                emailConfigured={emailTransport() !== "none"}
                scheduleLink={scheduleLink()}
              />
            ) : null
          }
          editor={
            canEdit ? (
              <LeadRecordEditor
                // Keyed on the stored values so a save from elsewhere resets the form.
                key={`${inspectedRow.client.id}:${inspectedRow.client.ownerId ?? ""}:${dayString(inspectedRow.client.nextActionAt)}:${inspectedRow.client.nextActionNote ?? ""}`}
                clientId={inspectedRow.client.id}
                admins={owners}
                initial={{
                  ownerId: inspectedRow.client.ownerId,
                  nextActionAt: dayString(inspectedRow.client.nextActionAt),
                  nextActionNote: inspectedRow.client.nextActionNote ?? "",
                }}
              />
            ) : null
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
  now,
  budget,
  followUp,
  editor,
  canEdit,
  canSchedule,
  canPropose,
}: {
  row: SalesQueueRow;
  now: Date;
  budget: string | null;
  followUp: React.ReactNode;
  editor: React.ReactNode;
  canEdit: boolean;
  canSchedule: boolean;
  canPropose: boolean;
}) {
  const { client, signals, reading } = row;
  const label = client.company || client.name || client.email || fmtPhone(client.phone);
  const p = PRIORITY_DISPLAY[reading.priority.level] ?? PRIORITY_DISPLAY.LOW;
  const h = HEALTH_DISPLAY[reading.health.state] ?? HEALTH_DISPLAY.HEALTHY;
  const sla = SLA_DISPLAY[reading.replySla.state];
  const value = valueOf(row, now);
  const lead = client.transparencyLead;
  const sub = client.contactSubmission;
  const interest = sub?.serviceInterest
    ? statusOf("serviceType", sub.serviceInterest).label
    : lead
      ? projectTypeName(lead.projectType)
      : null;
  const isLead = (LEAD_STAGES as readonly string[]).includes(signals.stage);

  return (
    <InspectSheet
      open
      title={label}
      subtitle={
        client.company && client.name
          ? client.name
          : statusOf("clientSource", client.source).label
      }
      status={
        <StatusPill registry="pipelineStage" value={signals.stage} variant="dot" />
      }
      fullHref={`/clients/${client.id}`}
      footer={
        <>
          {client.phone && (
            <Button asChild variant="outline">
              <a href={`tel:${client.phone}`}>
                <Phone className="size-3.5" aria-hidden />
                Call
              </a>
            </Button>
          )}
          {followUp}
          {canSchedule && (
            <Button asChild variant="outline">
              <Link href={`/calendar?new=meeting&client=${client.id}`}>
                <CalendarPlus className="size-3.5" aria-hidden />
                Schedule a meeting
              </Link>
            </Button>
          )}
          {canPropose && (
            <Button asChild variant="outline">
              <Link href={`/clients/${client.id}/new-proposal`}>
                <FilePlus2 className="size-3.5" aria-hidden />
                New proposal
              </Link>
            </Button>
          )}
          {canEdit && isLead && (
            <LeadInspectorActions clientId={client.id} status={client.status} />
          )}
        </>
      }
    >
      <section aria-label="Next action" className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="telemetry text-subtle-foreground">Next action</p>
          <ToneBadge tone={p.tone}>{p.label} priority</ToneBadge>
          {sla && <ToneBadge tone={sla.tone}>{sla.label}</ToneBadge>}
        </div>
        <p className="text-base font-medium">
          {reading.next.kind === "NONE" ? "Nothing to do right now" : reading.next.label}
          {reading.next.due && (
            <span className="ms-2 font-mono text-meta tabular-nums text-muted-foreground">
              {workingDueLabel(reading.next.due)}
            </span>
          )}
        </p>
        <WhyList label="Why this is next" why={reading.next.why} visible={WHY_VISIBLE} />
        {reading.priority.why.length > 0 && (
          <>
            <p className="text-meta font-medium text-muted-foreground">Why {p.label.toLowerCase()} priority</p>
            <WhyList label="Why this priority" why={reading.priority.why} visible={WHY_VISIBLE} />
          </>
        )}
      </section>

      <section aria-label="Health" className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="telemetry text-subtle-foreground">Health</p>
          <ToneBadge tone={h.tone}>{h.label}</ToneBadge>
        </div>
        <WhyList label="Why this health" why={reading.health.why} visible={WHY_VISIBLE} />
      </section>

      {reading.blockers.length > 0 && (
        <section aria-label="Blockers" className="space-y-1.5">
          <p className="telemetry text-subtle-foreground">Blockers</p>
          <WhyList label="Blockers" why={reading.blockers} visible={WHY_VISIBLE} />
        </section>
      )}

      {isLead && (
        <section aria-label="Proposal readiness" className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="telemetry text-subtle-foreground">Proposal readiness</p>
            <ToneBadge tone={reading.readiness.ready ? "success" : "warning"}>
              {reading.readiness.ready ? "Ready" : "Not ready"}
            </ToneBadge>
          </div>
          {!reading.readiness.ready && (
            <WhyList label="Missing before a proposal" why={reading.readiness.missing} visible={WHY_VISIBLE} />
          )}
        </section>
      )}

      <section aria-label="Score" className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="telemetry text-subtle-foreground">
            Score {row.score.score} / 100
          </p>
          <ToneBadge tone={bandTone(row.score.band)}>{row.score.band}</ToneBadge>
        </div>
        {row.score.reasons.length > 0 ? (
          <ul className="space-y-0.5">
            {row.score.reasons.map((reason) => (
              <li key={reason} className="font-mono text-meta text-muted-foreground">
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
              <span className="font-mono tabular-nums">{fmtPhone(client.phone)}</span>
            ),
          },
          {
            label: "Email",
            value: client.email ? (
              <a href={`mailto:${client.email}`} className="break-all text-brand hover:underline">
                {client.email}
              </a>
            ) : null,
          },
          { label: "Industry", value: client.industry },
          {
            label: "Source",
            value: `${statusOf("clientSource", client.source).label}${
              (sub ? sub.utmSource : lead?.utmSource) ? ` · ${sub ? sub.utmSource : lead?.utmSource}` : ""
            }`,
          },
          {
            label: "Manual priority",
            hint: "Set by hand on the client record; the queue ranks by the engine above",
            value: <StatusPill registry="priority" value={client.priority} variant="dot" />,
          },
          { label: "Budget", value: budget },
          {
            label: "Timeline",
            value: signals.timeline ? statusOf("projectTimeline", signals.timeline).label : null,
          },
          {
            label: value?.kind === "quoted" ? "Quoted" : "Estimate",
            hint:
              value?.kind === "quoted"
                ? "The latest proposal still open or accepted"
                : "What the public estimator showed this visitor, not a stated budget",
            value:
              value?.kind === "quoted" ? (
                <span className="font-mono tabular-nums">{money(value.total, value.currency)}</span>
              ) : value?.kind === "estimate" ? (
                <span className="font-mono tabular-nums">
                  {money(value.min, "EGP", { compact: true })}–
                  {money(value.max, "EGP", { compact: true })}
                </span>
              ) : null,
          },
          { label: "Interested in", value: interest },
          {
            label: "Replies",
            value: `${row.times.inboundCount} from them · ${row.times.messageCount} total`,
          },
          {
            label: "Last activity",
            value: signals.lastMeaningfulActivityAt
              ? when(signals.lastMeaningfulActivityAt)
              : "None yet",
          },
          { label: "Arrived", value: when(client.createdAt) },
        ]}
      />

      <section aria-label="Lead record" className="space-y-2">
        <p className="telemetry text-subtle-foreground">Lead record</p>
        <MetaList
          className="rounded-panel-sm border border-border-subtle"
          items={[
            {
              label: "Owner",
              value: client.owner ? client.owner.name || client.owner.email : "Nobody yet",
            },
            {
              label: "Next action",
              value: client.nextActionAt
                ? `${date(client.nextActionAt)}${client.nextActionNote ? ` — ${client.nextActionNote}` : ""}`
                : "None set",
            },
            ...(client.nurtureReason
              ? [
                  {
                    label: "Nurturing because",
                    value: statusOf("lostReason", client.nurtureReason).label,
                  },
                ]
              : []),
            ...(client.lostReason
              ? [
                  {
                    label: "Lost because",
                    value: `${statusOf("lostReason", client.lostReason).label}${client.lostNote ? ` — ${client.lostNote}` : ""}`,
                  },
                ]
              : []),
          ]}
        />
        {editor}
      </section>

      {sub?.message && (
        <section aria-label="Their message" className="space-y-1.5">
          <p className="telemetry text-subtle-foreground">Their message</p>
          <p className="whitespace-pre-wrap text-base text-muted-foreground">{sub.message}</p>
        </section>
      )}
    </InspectSheet>
  );
}
