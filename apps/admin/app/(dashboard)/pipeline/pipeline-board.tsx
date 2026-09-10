"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Board, type BoardColumn } from "@/components/os/board";
import { StatusPill } from "@/components/ui/badge";
import { money, moneyByCurrency, sumByCurrency } from "@/lib/format";
import type { Tone } from "@/lib/status";
import { moveClientStage } from "@/app/(dashboard)/_actions/records";

export interface PipelineCardData {
  id: string;
  stage: string;
  title: string;
  subtitle: string;
  priority: string;
  value: number | null;
  currency: string;
}

/** Stages a human is allowed to set. The rest are computed. */
const WRITABLE = new Set(["NEW", "VIEWED", "CONTACTED", "QUALIFIED", "LOST"]);

/** Said once, in the column that is refusing — not only in a toast after the drop. */
const DERIVED_REASON: Record<string, string> = {
  PROPOSAL_SENT: "Set by sending a proposal",
  PROPOSAL_READ: "Set when the client opens it",
  CONTRACT_SENT: "Set by generating a contract",
  SIGNED: "Set by a signed contract",
};

export function PipelineBoard({
  cards,
  columns,
}: {
  cards: PipelineCardData[];
  columns: { id: string; label: string; tone: Tone }[];
}) {
  const router = useRouter();

  const columnsWithTotals: BoardColumn[] = columns.map((column) => {
    const totals = sumByCurrency(
      cards
        .filter((c) => c.stage === column.id && c.value != null)
        .map((c) => ({ amount: c.value!, currency: c.currency })),
    );
    const summary = moneyByCurrency(totals, true);
    const locked = !WRITABLE.has(column.id);
    return {
      ...column,
      summary: summary === "—" ? undefined : summary,
      locked,
      lockedReason: locked ? DERIVED_REASON[column.id] : undefined,
    };
  });

  async function onMove(cardId: string, toColumnId: string) {
    // A deal whose stage is currently derived cannot be dragged out of it
    // either: setting the status would not change the documents, so the card
    // would reappear where it was on the next refresh.
    const from = cards.find((c) => c.id === cardId)?.stage;
    if (from && !WRITABLE.has(from)) {
      toast.error("This deal's stage is derived", {
        description:
          "It sits where the proposal and contract records put it. Change the documents, not the card.",
      });
      throw new Error("derived stage");
    }
    if (!WRITABLE.has(toColumnId)) {
      toast.error("That stage is derived", {
        description:
          "Proposal, Contract and Signed reflect the documents that exist. Send a proposal or generate a contract instead.",
      });
      throw new Error("derived stage");
    }
    await moveClientStage(cardId, toColumnId);
    toast.success("Stage updated");
    router.refresh();
  }

  return (
    <Board
      columns={columnsWithTotals}
      cards={cards.map((card) => ({
        id: card.id,
        columnId: card.stage,
        title: card.title,
        subtitle: card.subtitle,
        href: `/clients/${card.id}`,
        value: card.value ? money(card.value, card.currency, { compact: true }) : undefined,
        meta: <StatusPill registry="priority" value={card.priority} variant="dot" />,
      }))}
      onMove={onMove}
      emptyColumnLabel="No deals"
      label="Pipeline board, scroll sideways for more stages"
    />
  );
}
