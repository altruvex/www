"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneDot, type Tone } from "@/lib/status";

/**
 * The pipeline board (§5), in two layouts that are the same board.
 *
 * Above md it is columns, because comparing stages side by side is the whole
 * point of a board. Below md it is a stack of stage sections, because a row of
 * nine 248px columns is not a responsive layout — it is a desktop layout with a
 * scrollbar bolted on, and it asks a phone user to scroll sideways through
 * eight stages to find the ninth. Same split, same breakpoint, same reasoning
 * as the data table's table/cards pair.
 *
 * Movement uses the native HTML5 drag API rather than a library — one drag, one
 * drop, one server action, and 30kB of dnd-kit would not make it better. But
 * that API does not fire on touch at all, so every card also carries a stage
 * <select> that does exactly the same thing. On a phone it is the only path,
 * which is why it is sized as a real control rather than a hover-revealed hint.
 */
export interface BoardColumn {
  id: string;
  label: string;
  tone: Tone;
  /** Shown under the column header — usually a money total. */
  summary?: string;
  /**
   * The column is computed from records elsewhere, so nothing can be put into
   * it by hand. Marked in the header, refused before the drop rather than
   * after it, and disabled in every card's stage menu.
   */
  locked?: boolean;
  /** Why it is locked. Rendered as the header hint. */
  lockedReason?: string;
}

export interface BoardCard {
  id: string;
  columnId: string;
  title: string;
  subtitle?: string;
  href?: string;
  /** Right-aligned value on the card, e.g. deal size. */
  value?: string;
  meta?: React.ReactNode;
}

export function Board({
  columns,
  cards,
  onMove,
  emptyColumnLabel = "Nothing here",
  label = "Board",
}: {
  columns: BoardColumn[];
  cards: BoardCard[];
  onMove?: (cardId: string, toColumnId: string) => void | Promise<void>;
  emptyColumnLabel?: string;
  /** Names the horizontal scroll region for screen readers and keyboard users. */
  label?: string;
}) {
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<string | null>(null);
  // Optimistic placement so the card moves on drop, before the server replies.
  const [moved, setMoved] = React.useState<Record<string, string>>({});
  // Stack layout only. Absent = the default (open when the stage holds deals).
  const [openStages, setOpenStages] = React.useState<Record<string, boolean>>({});

  const locked = React.useMemo(
    () => new Set(columns.filter((c) => c.locked).map((c) => c.id)),
    [columns],
  );

  // Derived, not synced: an override is only meaningful while the server still
  // disagrees with it. Once the refreshed data matches, the entry is a no-op and
  // is dropped, so a card can never be pinned to a column the records left.
  const serverStages = cards.map((c) => `${c.id}:${c.columnId}`).join("|");
  const pending = React.useMemo(() => {
    const byId = new Map(cards.map((c) => [c.id, c.columnId]));
    return Object.fromEntries(
      Object.entries(moved).filter(([id, stage]) => byId.get(id) !== stage),
    );
    // serverStages is the value-identity of `cards` — the array itself is a new
    // reference on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moved, serverStages]);

  const columnOf = React.useCallback(
    (card: BoardCard) => pending[card.id] ?? card.columnId,
    [pending],
  );

  const move = React.useCallback(
    async function move(cardId: string, toColumnId: string) {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      const from = pending[card.id] ?? card.columnId;
      if (from === toColumnId) return;

      // A refused target is never placed optimistically. Showing the card land
      // and then snap back reads as a bug; the caller explains the refusal.
      if (locked.has(toColumnId) || locked.has(from)) {
        try {
          await onMove?.(cardId, toColumnId);
        } catch {
          /* the caller has already said why */
        }
        return;
      }

      setMoved((m) => ({ ...m, [cardId]: toColumnId }));
      try {
        await onMove?.(cardId, toColumnId);
      } catch {
        setMoved((m) => ({ ...m, [cardId]: from })); // roll back, don't lie
      }
    },
    [cards, pending, locked, onMove],
  );

  const cardsIn = React.useCallback(
    (columnId: string) => cards.filter((c) => columnOf(c) === columnId),
    [cards, columnOf],
  );

  function renderCard(card: BoardCard) {
    const cardLocked = locked.has(columnOf(card));
    const draggable = Boolean(onMove) && !cardLocked;
    return (
      <article
        key={card.id}
        draggable={draggable}
        onDragStart={(e) => {
          // A drag begun on the stage menu or the client link is a mis-grab.
          if ((e.target as HTMLElement).closest("select, a, option")) {
            e.preventDefault();
            return;
          }
          setDragging(card.id);
        }}
        onDragEnd={() => {
          setDragging(null);
          setOver(null);
        }}
        className={cn(
          "group min-w-0 rounded-md border border-border bg-card p-2 pointer-coarse:p-2.5",
          draggable && "cursor-grab active:cursor-grabbing",
          "transition-[opacity,border-color] duration-[var(--dur-state)]",
          "hover:border-border-mid",
          dragging === card.id && "opacity-40",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          {card.href ? (
            <Link
              href={card.href}
              className="min-w-0 truncate text-base font-medium hover:text-brand pointer-coarse:py-1"
            >
              {card.title}
            </Link>
          ) : (
            <span className="min-w-0 truncate text-base font-medium">{card.title}</span>
          )}
          {card.value && (
            <span className="shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
              {card.value}
            </span>
          )}
        </div>
        {card.subtitle && (
          <p className="mt-0.5 truncate text-meta text-muted-foreground">{card.subtitle}</p>
        )}
        {card.meta && <div className="mt-1.5">{card.meta}</div>}

        {onMove && (
          <div className="mt-1.5">
            <select
              value={columnOf(card)}
              disabled={cardLocked}
              aria-label={
                cardLocked ? `Stage of ${card.title}` : `Move ${card.title} to stage`
              }
              title={
                cardLocked
                  ? "This stage is computed from the records, so it cannot be set by hand."
                  : undefined
              }
              onChange={(e) => void move(card.id, e.target.value)}
              className={cn(
                "-mx-1 w-[calc(100%+0.5rem)] max-w-[calc(100%+0.5rem)] rounded-xs border border-transparent bg-transparent",
                // 44px on a touch screen, where the stage menu is the only way
                // to move a card at all.
                "min-h-7 px-1 py-0.5 pointer-coarse:min-h-11 pointer-coarse:px-2 pointer-coarse:py-2",
                "font-mono text-micro uppercase tracking-[0.06em] text-subtle-foreground",
                "transition-colors duration-[var(--dur-state)]",
                // No hover on touch, so the control is visible at rest there.
                "pointer-coarse:border-border pointer-coarse:bg-surface pointer-coarse:text-foreground",
                "hover:border-border hover:bg-surface hover:text-foreground",
                "focus-visible:border-ring",
                "disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:border-transparent disabled:hover:bg-transparent",
              )}
            >
              {columns.map((c) => {
                // The suffix explains why an option cannot be chosen. On the
                // card's own stage it explains nothing and just adds noise.
                const unreachable = Boolean(c.locked) && c.id !== columnOf(card);
                return (
                  <option key={c.id} value={c.id} disabled={unreachable}>
                    {c.label}
                    {unreachable ? " · derived" : ""}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </article>
    );
  }

  return (
    <>
      {/* ---- phones and small tablets: one stage per row, no sideways scroll -- */}
      <div className="space-y-2 md:hidden">
        {columns.map((column) => {
          const columnCards = cardsIn(column.id);
          const open = openStages[column.id] ?? columnCards.length > 0;
          const panelId = `board-stage-${column.id}`;
          return (
            <section
              key={column.id}
              className="overflow-hidden rounded-lg border border-border bg-surface/50"
            >
              <h3>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() =>
                    setOpenStages((s) => ({ ...s, [column.id]: !open }))
                  }
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 px-3 py-2 text-start",
                    "transition-colors duration-[var(--dur-state)] hover:bg-surface",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                  )}
                >
                  <ChevronRight
                    className={cn(
                      "size-3.5 shrink-0 text-subtle-foreground transition-transform duration-[var(--dur-state)]",
                      open && "rotate-90",
                    )}
                    aria-hidden
                  />
                  <span className={cn("size-1.5 shrink-0 rounded-full", toneDot[column.tone])} aria-hidden />
                  <span className="telemetry min-w-0 truncate text-foreground">{column.label}</span>
                  {column.locked && (
                    <Lock className="size-3 shrink-0 text-subtle-foreground" aria-hidden />
                  )}
                  <span className="ms-auto flex shrink-0 items-center gap-2">
                    {column.summary && (
                      <span className="font-mono text-micro tabular-nums text-muted-foreground">
                        {column.summary}
                      </span>
                    )}
                    <span className="font-mono text-micro tabular-nums text-subtle-foreground">
                      {columnCards.length}
                    </span>
                  </span>
                </button>
              </h3>
              <div id={panelId} hidden={!open} className="border-t border-border p-2">
                {column.lockedReason && (
                  <p className="mb-2 px-1 text-micro text-subtle-foreground">
                    {column.lockedReason}
                  </p>
                )}
                {columnCards.length === 0 ? (
                  <p className="px-1.5 py-3 text-meta text-subtle-foreground">
                    {emptyColumnLabel}
                  </p>
                ) : (
                  <div className="space-y-1.5">{columnCards.map(renderCard)}</div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* ---- md and up: the board proper ------------------------------------- */}
      <div
        // The bleed matches the shell's own padding at this breakpoint (sm:p-4).
        // Four pixels of mismatch here is four pixels of horizontal scroll on
        // the whole document, which is the one scroll direction a page must
        // never have.
        className={cn(
          "hidden md:block",
          "-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-2",
          "snap-x snap-proximity scroll-px-4",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
        )}
        // A scrollable region that cannot be reached by keyboard fails WCAG 2.1.1.
        tabIndex={0}
        role="region"
        aria-label={label}
      >
        <div className="flex min-w-max items-stretch gap-3">
          {columns.map((column) => {
            const columnCards = cardsIn(column.id);
            const refusing = over === column.id && column.locked;
            return (
              <section
                key={column.id}
                aria-label={`${column.label}, ${columnCards.length} ${
                  columnCards.length === 1 ? "card" : "cards"
                }`}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = column.locked ? "none" : "move";
                  setOver(column.id);
                }}
                onDragLeave={(e) => {
                  // Moving onto a child fires dragleave on the parent too, which
                  // makes the highlight flicker. Only a real exit counts.
                  if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                  setOver((o) => (o === column.id ? null : o));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  if (dragging) void move(dragging, column.id);
                  setDragging(null);
                }}
                className={cn(
                  "flex w-[248px] shrink-0 snap-start flex-col rounded-lg border border-border bg-surface/50",
                  "transition-colors duration-[var(--dur-state)]",
                  over === column.id && !column.locked && "border-brand bg-brand-soft",
                  refusing && "border-danger/40 bg-danger/[0.05]",
                )}
              >
                <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
                  <span
                    className={cn("size-1.5 shrink-0 rounded-full", toneDot[column.tone])}
                    aria-hidden
                  />
                  <h3 className="telemetry min-w-0 truncate text-foreground">{column.label}</h3>
                  {column.locked && (
                    <Lock className="size-3 shrink-0 text-subtle-foreground" aria-hidden />
                  )}
                  <span className="ms-auto shrink-0 font-mono text-micro tabular-nums text-subtle-foreground">
                    {columnCards.length}
                  </span>
                </div>
                {(column.summary || column.lockedReason) && (
                  <div className="border-b border-border px-2.5 py-1.5">
                    {column.summary && (
                      <p className="font-mono text-micro tabular-nums text-muted-foreground">
                        {column.summary}
                      </p>
                    )}
                    {column.lockedReason && (
                      <p
                        className={cn(
                          "text-micro text-subtle-foreground",
                          column.summary && "mt-0.5",
                        )}
                      >
                        {column.lockedReason}
                      </p>
                    )}
                  </div>
                )}

                {/* The column scrolls, not the page: a busy stage must not push
                    the board's own headers off the screen. */}
                <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain p-1.5 [max-height:min(68dvh,760px)]">
                  {columnCards.length === 0 ? (
                    <p
                      className={cn(
                        "flex flex-1 items-center justify-center rounded-md border border-dashed border-border",
                        "px-1.5 py-6 text-center text-meta text-subtle-foreground",
                      )}
                    >
                      {emptyColumnLabel}
                    </p>
                  ) : (
                    columnCards.map(renderCard)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
