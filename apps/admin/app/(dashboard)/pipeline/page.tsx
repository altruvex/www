import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { AlertBar } from "@/components/os/error-state";
import { NewProposalButton } from "@/components/os/new-proposal-button";
import { FilterChip } from "@/components/os/data-table";
import { PIPELINE_STAGES, STAGE_TONE } from "@/lib/dashboard-data";
import {
  SALES_SIGNALS_SELECT,
  loadActivityTimes,
  readSignals,
  toSalesSignals,
} from "@/lib/sales-signals";
import { moneyByCurrency, percent, when } from "@/lib/format";
import { openQuoteMetrics } from "@/lib/pipeline-metrics";
import { roleCanOpen } from "@/lib/action-center";
import { isOverdue } from "@/lib/sales-intel";
import { isLiveQuote } from "@/lib/quotes";
import { getOperator } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { statusOf } from "@/lib/status";
import { PipelineBoard, type PipelineCardData } from "./pipeline-board";
import { Button } from "@repo/ui";
import { PickToOpen } from "@/components/os/pick-to-open";

export const dynamic = "force-dynamic";

/** The board reads at most this many deals, newest activity first. */
const PIPELINE_TAKE = 400;

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; health?: string }>;
}) {
  const denied = await gateRoute("/pipeline", "the pipeline");
  if (denied) return denied;
  const operator = await getOperator();
  const role = operator?.role;
  const viewerId = operator?.session.user.id ?? null;
  const showMoney = can(role, "view", "proposal");
  const canMove = can(role, "edit", "client");

  const { stage: stageParam, health: healthParam } = await searchParams;
  if (stageParam?.toUpperCase() === "SPAM") redirect("/clients?stage=SPAM");
  const healthFilter = healthParam === "risk" ? "risk" : null;
  const now = new Date();
  // Bounded: the most recently touched deals, every contract kept (the stage
  // reads the newest issued one). When more exist the page says so.
  const where = { status: { notIn: ["SPAM" as const] } };
  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      select: SALES_SIGNALS_SELECT,
      orderBy: { updatedAt: "desc" },
      take: PIPELINE_TAKE,
    }),
    prisma.client.count({ where }),
  ]);
  const capped = total > clients.length;
  const times = await loadActivityTimes(clients.map((c) => c.id));

  const columns = [
    ...PIPELINE_STAGES.map((stage) => ({
      id: stage as string,
      label: statusOf("pipelineStage", stage).label,
      tone: STAGE_TONE[stage],
    })),
    { id: "NURTURE", label: "Nurture", tone: STAGE_TONE.NURTURE },
    { id: "LOST", label: "Lost", tone: STAGE_TONE.LOST },
  ];
  const focus = columns.find((c) => c.id === stageParam);

  const cards: PipelineCardData[] = clients.map((client) => {
    const signals = toSalesSignals(client, now, viewerId, times.get(client.id));
    const reading = readSignals(signals, now);
    return {
      id: client.id,
      stage: signals.stage,
      title: client.company || client.name || "Unnamed client",
      subtitle: statusOf("clientSource", client.source).label,
      priority: reading.priority,
      value: showMoney ? (client.proposals[0]?.totalPrice ?? null) : null,
      currency: client.proposals[0]?.currency ?? "EGP",
      health: reading.health,
      next:
        reading.next.kind === "NONE"
          ? null
          : {
              label: reading.next.label,
              due: reading.next.due?.toISOString() ?? null,
              // The engine's business-day rule, decided here so render never reads the clock.
              overdue: isOverdue(reading.next.due, now),
            },
      owner: client.owner ? client.owner.name || client.owner.email : null,
    };
  });
  const atRisk = (c: PipelineCardData) =>
    c.health.state === "AT_RISK" || c.health.state === "STALLED";
  const atRiskCount = cards.filter(atRisk).length;
  const boardCards = healthFilter ? cards.filter(atRisk) : cards;
  const stageQuery = focus ? `?stage=${focus.id}` : "";
  const riskHref = `/pipeline?${new URLSearchParams({
    ...(focus ? { stage: focus.id } : {}),
    health: "risk",
  }).toString()}`;

  // Parked (Nurture) and closed (Lost) deals are not live pipeline.
  const live = cards.filter(
    (c) => c.stage !== "LOST" && c.stage !== "SPAM" && c.stage !== "NURTURE",
  );
  // A rejected, expired or lapsed quote is a decision owed, not money on the table
  // (isLiveQuote, the same rule /leads uses for a row's value).
  const liveQuote = new Set(
    clients.filter((c) => isLiveQuote(c.proposals[0], now)).map((c) => c.id),
  );
  // The "Live deals" tile counts open work only: signed deals are won, not live.
  const openDealCount = live.filter((c) => c.stage !== "SIGNED").length;
  // Quoted and its average read the same active opportunities (lib/pipeline-metrics.ts):
  // open stage, one card per client, its latest live proposal. No stage
  // probability is applied — a forecast would be invented.
  const { open: openCards, quoted, average: avgOpenQuote } = openQuoteMetrics(cards, liveQuote);

  const proposalOut = cards.filter(
    (c) => c.stage === "PROPOSAL_SENT" || c.stage === "PROPOSAL_READ",
  ).length;
  const qualified = cards.filter((c) => c.stage === "QUALIFIED").length;
  const won = cards.filter((c) => c.stage === "SIGNED").length;
  const lost = cards.filter((c) => c.stage === "LOST").length;

  // An empty list offers the submissions waiting to become clients, each
  // opened on its own page where Convert lives.
  const pickSubmissions =
    cards.length === 0 &&
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
    <div className="flex min-h-[calc(100dvh-6.5rem)] flex-col gap-4">
      <PageHeader
        title="Pipeline"
        description="Every live deal by stage. Call, proposal and contract stages are derived from the meeting, proposal and contract records, so they move themselves."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {showMoney ? (
          <>
            <StatTile
              label="Quoted"
              value={moneyByCurrency(quoted, true)}
              sub={`Latest live proposal on ${openCards.length} open ${openCards.length === 1 ? "deal" : "deals"}`}
            />
            <StatTile
              label="Live deals"
              value={openDealCount}
              sub="Every stage except Signed, Nurture and Lost"
            />
          </>
        ) : (
          <>
            <StatTile
              label="Live deals"
              value={openDealCount}
              sub="Every stage except Signed, Nurture and Lost"
            />
            <StatTile
              label="Proposal out"
              value={proposalOut}
              sub="Sent or opened, not yet signed"
              tone={proposalOut ? "progress" : "neutral"}
              href="/pipeline?stage=PROPOSAL_SENT"
            />
          </>
        )}
        <StatTile
          label="Win rate"
          value={percent(
            won + lost ? Math.round((won / (won + lost)) * 100) : 0,
          )}
          sub={`${won} won · ${lost} lost`}
          tone={won >= lost ? "success" : "warning"}
        />
        {showMoney ? (
          <StatTile
            label="Average open quote"
            value={moneyByCurrency(avgOpenQuote, true)}
            sub={`Latest live proposal per open deal · ${openCards.length} ${openCards.length === 1 ? "deal" : "deals"}`}
          />
        ) : (
          <StatTile
            label="Qualified"
            value={qualified}
            sub="Ready for a proposal"
            tone={qualified ? "progress" : "neutral"}
            href="/pipeline?stage=QUALIFIED"
          />
        )}
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="The pipeline is empty"
          body="Deals appear here as soon as a client record exists. Convert a website submission into a client, and it will show up in the New column."
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
        <>
          {canMove && (
            <AlertBar
              tone="info"
              action={
                <NewProposalButton variant="outline">
                  Send a proposal
                </NewProposalButton>
              }
            >
              New, Viewed, Contacted, Qualifying, Qualified, Nurture and Lost
              are yours to set — drag a card, or use the stage menu on it (the
              only way on a touch screen). The locked columns are computed from
              the records themselves: book or complete a call, send a proposal
              or generate a contract to move a deal into them.
            </AlertBar>
          )}
          {capped && (
            <p className="text-meta text-muted-foreground" role="status">
              Showing the {clients.length} most recently updated of {total}{" "}
              deals. The tiles and columns count only those shown.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {focus && (
              <FilterChip
                label="Stage"
                value={focus.label}
                clearHref={healthFilter ? "/pipeline?health=risk" : "/pipeline"}
              />
            )}
            {healthFilter ? (
              <FilterChip
                label="Health"
                value="At risk or stalled"
                clearHref={`/pipeline${stageQuery}`}
              />
            ) : (
              atRiskCount > 0 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={riskHref}>
                    At risk or stalled · {atRiskCount}
                  </Link>
                </Button>
              )
            )}
          </div>
          <PipelineBoard
            cards={boardCards}
            columns={columns}
            focusColumnId={focus?.id}
            canMove={canMove}
          />
        </>
      )}
    </div>
  );
}
