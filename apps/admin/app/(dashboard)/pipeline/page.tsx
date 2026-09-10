import Link from "next/link";
import { prisma } from "@repo/database";
import { KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { AlertBar } from "@/components/os/error-state";
import {
  PIPELINE_STAGES,
  STAGE_PROBABILITY,
  STAGE_TONE,
  deriveClientStage,
} from "@/lib/dashboard-data";
import { moneyByCurrency, percent, sumByCurrency, scaleByCurrency } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { PipelineBoard, type PipelineCardData } from "./pipeline-board";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

/**
 * §5 — the opportunity board.
 *
 * Stages are derived from the records (see lib/dashboard-data.ts). Four of the
 * eight columns are therefore READ-ONLY: you cannot drag a card into "Signed",
 * because being signed means a Contract row exists. The board says so out loud
 * rather than accepting the drag and silently reverting it.
 */
export default async function PipelinePage() {
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
        select: { status: true, readAt: true, totalPrice: true, currency: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      contracts: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const cards: PipelineCardData[] = clients.map((client) => ({
    id: client.id,
    stage: deriveClientStage(client),
    title: client.company || client.name || "Unnamed client",
    subtitle: statusOf("clientSource", client.source).label,
    priority: client.priority,
    value: client.proposals[0]?.totalPrice ?? null,
    currency: client.proposals[0]?.currency ?? "EGP",
  }));

  const live = cards.filter((c) => c.stage !== "LOST" && c.stage !== "SPAM");
  const openCards = live.filter((c) => c.stage !== "SIGNED" && c.value != null);

  // Every total is kept per currency: a USD proposal added to EGP ones would
  // produce a figure that is true in neither.
  const openValue = sumByCurrency(
    openCards.map((c) => ({ amount: c.value!, currency: c.currency })),
  );
  const weighted: Record<string, number> = {};
  for (const card of openCards) {
    const p = STAGE_PROBABILITY[card.stage as (typeof PIPELINE_STAGES)[number]] ?? 0;
    weighted[card.currency] = (weighted[card.currency] ?? 0) + Math.round(card.value! * p);
  }

  const won = cards.filter((c) => c.stage === "SIGNED").length;
  const lost = cards.filter((c) => c.stage === "LOST").length;
  const withValue = live.filter((c) => c.value != null);
  const avgDeal = scaleByCurrency(
    sumByCurrency(withValue.map((c) => ({ amount: c.value!, currency: c.currency }))),
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <StatTile
          label="Win rate"
          value={percent(won + lost ? Math.round((won / (won + lost)) * 100) : 0)}
          sub={`${won} won · ${lost} lost`}
          tone={won >= lost ? "success" : "warning"}
        />
        <StatTile label="Average deal" value={moneyByCurrency(avgDeal, true)} sub="Across proposed work" />
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="The pipeline is empty"
          body="Deals appear here as soon as a client record exists. Convert a website submission into a client, and it will show up in the New column."
          action={
            <Button asChild variant="outline">
              <Link href="/submissions">
                Review submissions
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <AlertBar tone="info" href="/clients" cta="Open a client to send a proposal">
            New, Viewed, Contacted, Qualified and Lost are yours to set — drag a card, or
            use the stage menu on it (the only way on a touch screen). The locked columns
            are computed from the documents themselves: send a proposal or generate a
            contract to move a deal into them.
          </AlertBar>
          <PipelineBoard
            cards={cards}
            columns={[
              ...PIPELINE_STAGES.map((stage) => ({
                id: stage,
                label: statusOf("pipelineStage", stage).label,
                tone: STAGE_TONE[stage],
              })),
              { id: "LOST", label: "Lost", tone: STAGE_TONE.LOST },
            ]}
          />
        </>
      )}
    </div>
  );
}
