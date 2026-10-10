"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Board, type BoardColumn } from "@/components/os/board";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { LostReasonFields, useLostInput } from "@/components/os/lost-reason-fields";
import { NurtureReasonFields, useNurtureInput } from "@/components/os/nurture-reason-fields";
import { ToneBadge } from "@/components/ui/badge";
import { money, moneyByCurrency, sumByCurrency } from "@/lib/format";
import { workingDueLabel } from "@/lib/working-days";
import { WRITABLE_STATUSES, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { HealthState, Priority } from "@/lib/sales-intel";
import { moveClientOnBoard } from "@/app/(dashboard)/_actions/clients";
import { HEALTH_DISPLAY, PRIORITY_DISPLAY } from "@/components/os/sales-display";
import { WhyHint } from "@/components/os/why-hint";

export interface PipelineCardData {
  id: string;
  stage: string;
  title: string;
  subtitle: string;
  /** The engine's priority (the same one /leads and the client page show). */
  priority: { level: Priority; why: string[] };
  value: number | null;
  currency: string;
  /** The sales engine's reading, computed on the server. */
  health: { state: HealthState; why: string[] };
  /** `overdue` is the engine's business-day rule, decided on the server. */
  next: { label: string; due: string | null; overdue: boolean } | null;
  owner: string | null;
}

/** Health and priority words on chips; each opens its reasons (WhyHint). */
function HealthChip({ health }: { health: PipelineCardData["health"] }) {
  const h = HEALTH_DISPLAY[health.state] ?? HEALTH_DISPLAY.HEALTHY;
  return (
    <WhyHint title={h.label} why={health.why}>
      <ToneBadge tone={h.tone}>{h.label}</ToneBadge>
    </WhyHint>
  );
}

function PriorityChip({ priority }: { priority: PipelineCardData["priority"] }) {
  const p = PRIORITY_DISPLAY[priority.level] ?? PRIORITY_DISPLAY.LOW;
  return (
    <WhyHint title={`${p.label} priority`} why={priority.why}>
      <ToneBadge tone={p.tone}>{p.label}</ToneBadge>
    </WhyHint>
  );
}

function CardMeta({ card }: { card: PipelineCardData }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {card.health.state !== "CLOSED" && <HealthChip health={card.health} />}
        <PriorityChip priority={card.priority} />
      </div>
      {card.next && (
        <p className="flex min-w-0 flex-col text-meta">
          <span className="truncate">{card.next.label}</span>
          {card.next.due && (
            <span
              className={cn(
                "font-mono text-micro tabular-nums",
                card.next.overdue ? "text-danger" : "text-muted-foreground",
              )}
            >
              {workingDueLabel(card.next.due)}
            </span>
          )}
        </p>
      )}
      <p className="truncate text-micro text-subtle-foreground">
        {card.owner ? `Owner: ${card.owner}` : "Unassigned"}
      </p>
    </div>
  );
}

// Spam is set from the client page, not dragged to: the board has no Spam column.
const WRITABLE = new Set([...WRITABLE_STATUSES].filter((s) => s !== "SPAM"));

const DERIVED_REASON: Record<string, string> = {
  CALL_BOOKED: "Set by a booked call that has not happened yet",
  CALL_COMPLETED: "Set by a completed call, until a proposal goes out",
  PROPOSAL_SENT: "Set by sending a proposal",
  PROPOSAL_READ: "Set when the client opens the proposal, or when a proposal or contract needs your decision",
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
  const [parking, setParking] = React.useState<{
    cardId: string;
    title: string;
    settle: (go: boolean) => void;
  } | null>(null);
  const nurture = useNurtureInput();

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
    if (toColumnId === "NURTURE" && from !== "NURTURE") {
      const title = cards.find((c) => c.id === cardId)?.title ?? "this deal";
      nurture.reset();
      const go = await new Promise<boolean>((settle) =>
        setParking({ cardId, title, settle }),
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
          meta: <CardMeta card={card} />,
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
      <ConfirmDialog
        open={parking !== null}
        onOpenChange={(open) => {
          if (!open && parking) {
            parking.settle(false);
            setParking(null);
          }
        }}
        title={`Move ${parking?.title ?? "this deal"} to nurture?`}
        consequence="The deal is parked until the review date, when it comes back as a follow-up. It can be dragged back at any time."
        confirmLabel="Move to nurture"
        confirmDisabled={!nurture.ready}
        onConfirm={async () => {
          if (!parking) return;
          const pending = parking;
          const result = await moveClientOnBoard(
            pending.cardId,
            "NURTURE",
            undefined,
            nurture.value,
          );
          if (result.ok) {
            pending.settle(true);
            setParking(null);
            router.refresh();
          }
          return result;
        }}
      >
        <NurtureReasonFields value={nurture.value} onChange={nurture.setValue} />
      </ConfirmDialog>
    </>
  );
}
