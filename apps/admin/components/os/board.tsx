"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toneDot, type Tone } from "@/lib/status";

/**
 * The pipeline board. Drag-and-drop stage movement (§5) using the native HTML5
 * drag API rather than a library — the interaction is one drag, one drop, one
 * server action, and 30kB of dnd-kit would not make it better.
 *
 * Keyboard parity is not optional: every card carries a stage <select> that
 * does the same thing as a drag, so the board is fully operable without a
 * mouse. A board that only works by dragging is an accessibility failure.
 */
export interface BoardColumn {
  id: string;
  label: string;
  tone: Tone;
  /** Shown under the column header — usually a money total. */
  summary?: string;
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
}: {
  columns: BoardColumn[];
  cards: BoardCard[];
  onMove?: (cardId: string, toColumnId: string) => void | Promise<void>;
  emptyColumnLabel?: string;
}) {
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<string | null>(null);
  // Optimistic placement so the card moves on drop, before the server replies.
  const [moved, setMoved] = React.useState<Record<string, string>>({});

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

  async function move(cardId: string, toColumnId: string) {
    const card = cards.find((c) => c.id === cardId);
    if (!card || columnOf(card) === toColumnId) return;
    const previous = columnOf(card);
    setMoved((m) => ({ ...m, [cardId]: toColumnId }));
    try {
      await onMove?.(cardId, toColumnId);
    } catch {
      setMoved((m) => ({ ...m, [cardId]: previous })); // roll back, don't lie
    }
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-3">
        {columns.map((column) => {
          const columnCards = cards.filter((c) => columnOf(c) === column.id);
          return (
            <div
              key={column.id}
              onDragOver={(e) => {
                if (!dragging) return;
                e.preventDefault();
                setOver(column.id);
              }}
              onDragLeave={() => setOver((o) => (o === column.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                if (dragging) void move(dragging, column.id);
                setDragging(null);
              }}
              className={cn(
                "flex w-[248px] shrink-0 flex-col rounded-lg border border-border bg-surface/50",
                "transition-colors duration-[var(--dur-state)]",
                over === column.id && "border-brand bg-brand-soft",
              )}
            >
              <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
                <span className={cn("size-1.5 rounded-full", toneDot[column.tone])} aria-hidden />
                <h3 className="telemetry text-foreground">{column.label}</h3>
                <span className="ms-auto font-mono text-micro tabular-nums text-subtle-foreground">
                  {columnCards.length}
                </span>
              </div>
              {column.summary && (
                <p className="border-b border-border px-2.5 py-1.5 font-mono text-micro tabular-nums text-muted-foreground">
                  {column.summary}
                </p>
              )}

              <div className="flex flex-1 flex-col gap-1.5 p-1.5">
                {columnCards.length === 0 ? (
                  <p className="px-1.5 py-4 text-center text-meta text-subtle-foreground">
                    {emptyColumnLabel}
                  </p>
                ) : (
                  columnCards.map((card) => (
                    <article
                      key={card.id}
                      draggable={Boolean(onMove)}
                      onDragStart={() => setDragging(card.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      className={cn(
                        "group rounded-md border border-border bg-card p-2",
                        onMove && "cursor-grab active:cursor-grabbing",
                        "transition-[opacity,border-color] duration-[var(--dur-state)]",
                        "hover:border-border-mid",
                        dragging === card.id && "opacity-40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {card.href ? (
                          <Link
                            href={card.href}
                            className="min-w-0 truncate text-base font-medium hover:text-brand"
                          >
                            {card.title}
                          </Link>
                        ) : (
                          <span className="min-w-0 truncate text-base font-medium">
                            {card.title}
                          </span>
                        )}
                        {card.value && (
                          <span className="shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
                            {card.value}
                          </span>
                        )}
                      </div>
                      {card.subtitle && (
                        <p className="mt-0.5 truncate text-meta text-muted-foreground">
                          {card.subtitle}
                        </p>
                      )}
                      {card.meta && <div className="mt-1.5">{card.meta}</div>}

                      {onMove && (
                        <label className="mt-1.5 block">
                          <span className="sr-only">Move {card.title} to stage</span>
                          <select
                            value={columnOf(card)}
                            onChange={(e) => void move(card.id, e.target.value)}
                            className={cn(
                              "-mx-1 w-[calc(100%+0.5rem)] rounded-xs border border-transparent bg-transparent px-1 py-0.5",
                              "font-mono text-micro uppercase tracking-[0.06em] text-subtle-foreground",
                              "transition-colors duration-[var(--dur-state)]",
                              "hover:border-border hover:bg-surface hover:text-foreground",
                              "focus-visible:border-ring",
                            )}
                          >
                            {columns.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
