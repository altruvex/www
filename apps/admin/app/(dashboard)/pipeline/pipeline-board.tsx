"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Board, type BoardColumn } from "@/components/os/board";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { LostReasonFields, useLostInput } from "@/components/os/lost-reason-fields";
import { StatusPill } from "@/components/ui/badge";
import { money, moneyByCurrency, sumByCurrency } from "@/lib/format";
import type { Tone } from "@/lib/status";
import { moveClientOnBoard } from "@/app/(dashboard)/_actions/clients";

export interface PipelineCardData {
  id: string;
  stage: string;
  title: string;
  subtitle: string;
  priority: string;
  value: number | null;
  currency: string;
}

const WRITABLE = new Set([
  "NEW",
  "VIEWED",
  "CONTACTED",
  "QUALIFYING",
  "QUALIFIED",
  "NURTURE",
  "LOST",
]);

const DERIVED_REASON: Record<string, string> = {
  CALL_BOOKED: "Set by a booked call that has not happened yet",
  CALL_COMPLETED: "Set by a completed call, until a proposal goes out",
  PROPOSAL_SENT: "Set by sending a proposal",
  PROPOSAL_READ: "Set when the client opens it",
  CONTRACT_SENT: "Set by generating a contract",
  SIGNED: "Set by a signed contract",
};

export function PipelineBoard({
  cards,
  columns,
  focusColumnId,
  canMove,
}: {
  cards: PipelineCardData[];
  columns: { id: string; label: string; tone: Tone }[];
  focusColumnId?: string;
  canMove: boolean;
}) {
  const router = useRouter();
  const [losing, setLosing] = React.useState<{
    cardId: string;
    title: string;
    settle: (go: boolean) => void;
  } | null>(null);
  const lost = useLostInput();

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
    const from = cards.find((c) => c.id === cardId)?.stage;
    if (from && !WRITABLE.has(from)) {
      toast.error("This deal's stage is derived", {
        description:
          "It sits where the meeting, proposal and contract records put it. Change those records, not the card.",
      });
      throw new Error("derived stage");
    }
    if (!WRITABLE.has(toColumnId)) {
      toast.error("That stage is derived", {
        description:
          "Call, Proposal, Contract and Signed reflect the records that exist. Book the call, send a proposal or generate a contract instead.",
      });
      throw new Error("derived stage");
    }
    if (toColumnId === "LOST") {
      const title = cards.find((c) => c.id === cardId)?.title ?? "this deal";
      lost.reset();
      const go = await new Promise<boolean>((settle) =>
        setLosing({ cardId, title, settle }),
      );
      if (!go) throw new Error("cancelled");
      return;
    }
    const result = await moveClientOnBoard(cardId, toColumnId);
    if (!result.ok) {
      toast.error("The card did not move", { description: result.message });
      throw new Error(result.message);
    }
    toast.success(result.message);
    router.refresh();
  }

  return (
    <>
      <Board
        columns={columnsWithTotals}
        cards={cards.map((card) => ({
          id: card.id,
          columnId: card.stage,
          title: card.title,
          subtitle: card.subtitle,
          href: `/clients/${card.id}`,
          value: card.value
            ? money(card.value, card.currency, { compact: true })
            : undefined,
          meta: (
            <StatusPill
              registry="priority"
              value={card.priority}
              variant="dot"
            />
          ),
        }))}
        onMove={canMove ? onMove : undefined}
        focusColumnId={focusColumnId}
        emptyColumnLabel="No deals"
        label="Pipeline board, scroll sideways for more stages"
      />
      <ConfirmDialog
        open={losing !== null}
        onOpenChange={(open) => {
          if (!open && losing) {
            losing.settle(false);
            setLosing(null);
          }
        }}
        tone="danger"
        title={`Mark ${losing?.title ?? "this deal"} lost?`}
        consequence="The deal leaves the live pipeline. Its proposals, contracts and history stay, and it can be dragged back."
        confirmLabel="Mark lost"
        confirmDisabled={!lost.ready}
        onConfirm={async () => {
          if (!losing) return;
          const pendingLoss = losing;
          const result = await moveClientOnBoard(
            pendingLoss.cardId,
            "LOST",
            lost.value,
          );
          if (result.ok) {
            pendingLoss.settle(true);
            setLosing(null);
            router.refresh();
          }
          return result;
        }}
      >
        <LostReasonFields value={lost.value} onChange={lost.setValue} />
      </ConfirmDialog>
    </>
  );
}
