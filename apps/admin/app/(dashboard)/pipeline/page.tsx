import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@repo/database";
import { KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { AlertBar } from "@/components/os/error-state";
import { FilterChip } from "@/components/os/data-table";
import {
  PIPELINE_STAGES,
  STAGE_PROBABILITY,
  STAGE_TONE,
  deriveClientStage,
} from "@/lib/dashboard-data";
import {
  moneyByCurrency,
  percent,
  sumByCurrency,
  scaleByCurrency,
} from "@/lib/format";
import { currentRole } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { statusOf } from "@/lib/status";
import { PipelineBoard, type PipelineCardData } from "./pipeline-board";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const denied = await gateRoute("/pipeline", "the pipeline");
  if (denied) return denied;
  const role = await currentRole();
  const showMoney = can(role, "view", "proposal");
  const canMove = can(role, "edit", "client");

  const { stage: stageParam } = await searchParams;
  if (stageParam?.toUpperCase() === "SPAM") redirect("/clients?stage=SPAM");
  const clients = await prisma.client.findMany({
    where: { status: { notIn: ["SPAM"] } },
    select: {
      id: true,
      name: true,
      company: true,
      status: true,
      priority: true,
      source: true,
      updatedAt: true,
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
    },
    orderBy: { updatedAt: "desc" },
  });

  const columns = [
    ...PIPELINE_STAGES.map((stage) => ({
      id: stage as string,
      label: statusOf("pipelineStage", stage).label,
      tone: STAGE_TONE[stage],
    })),
    { id: "LOST", label: "Lost", tone: STAGE_TONE.LOST },
  ];
  const focus = columns.find((c) => c.id === stageParam);

  const cards: PipelineCardData[] = clients.map((client) => ({
    id: client.id,
    stage: deriveClientStage(client),
    title: client.company || client.name || "Unnamed client",
    subtitle: statusOf("clientSource", client.source).label,
    priority: client.priority,
    value: showMoney ? (client.proposals[0]?.totalPrice ?? null) : null,
    currency: client.proposals[0]?.currency ?? "EGP",
  }));

  const live = cards.filter((c) => c.stage !== "LOST" && c.stage !== "SPAM");
  const openCards = live.filter((c) => c.stage !== "SIGNED" && c.value != null);

  const openValue = sumByCurrency(
    openCards.map((c) => ({ amount: c.value!, currency: c.currency })),
  );
  const weighted: Record<string, number> = {};
  for (const card of openCards) {
    const p =
      STAGE_PROBABILITY[card.stage as (typeof PIPELINE_STAGES)[number]] ?? 0;
    weighted[card.currency] =
      (weighted[card.currency] ?? 0) + Math.round(card.value! * p);
  }

  const proposalOut = cards.filter(
    (c) => c.stage === "PROPOSAL_SENT" || c.stage === "PROPOSAL_READ",
  ).length;
  const qualified = cards.filter((c) => c.stage === "QUALIFIED").length;
  const won = cards.filter((c) => c.stage === "SIGNED").length;
  const lost = cards.filter((c) => c.stage === "LOST").length;
  const withValue = live.filter((c) => c.value != null);
  const avgDeal = scaleByCurrency(
    sumByCurrency(
      withValue.map((c) => ({ amount: c.value!, currency: c.currency })),
    ),
    (currency) => {
      const n = withValue.filter((c) => c.currency === currency).length;
      return n ? 1 / n : 0;
    },
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pipeline"
        description="Every live deal by stage. Stages after Qualified are derived from the proposal and contract records, so they move themselves."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {showMoney ? (
          <>
            <StatTile
              label="Weighted value"
              value={moneyByCurrency(weighted, true)}
              sub="Stage probability × deal size"
            />
            <StatTile
              label="Open value"
              value={moneyByCurrency(openValue, true)}
              sub={`${live.length} live deals`}
            />
          </>
        ) : (
          <>
            <StatTile
              label="Live deals"
              value={live.length}
              sub="Every stage except Lost"
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
            label="Average deal"
            value={moneyByCurrency(avgDeal, true)}
            sub="Across proposed work"
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
            <Button asChild variant="outline">
              <Link href="/submissions">Review submissions</Link>
            </Button>
          }
        />
      ) : (
        <>
          {canMove && (
            <AlertBar
              tone="info"
              href="/clients"
              cta="Open a client to send a proposal"
            >
              New, Viewed, Contacted, Qualified and Lost are yours to set — drag
              a card, or use the stage menu on it (the only way on a touch
              screen). The locked columns are computed from the documents
              themselves: send a proposal or generate a contract to move a deal
              into them.
            </AlertBar>
          )}
          {focus && (
            <FilterChip
              label="Stage"
              value={focus.label}
              clearHref="/pipeline"
            />
          )}
          <PipelineBoard
            cards={cards}
            columns={columns}
            focusColumnId={focus?.id}
            canMove={canMove}
          />
        </>
      )}
    </div>
  );
}
