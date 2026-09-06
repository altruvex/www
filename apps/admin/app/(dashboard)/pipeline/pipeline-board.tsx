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
    return { ...column, summary: summary === "—" ? undefined : summary };
  });

  async function onMove(cardId: string, toColumnId: string) {
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
    />
  );
}
