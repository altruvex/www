"use client";

import { createContext, useContext } from "react";
import type { SourceKey } from "@/lib/board-sources";
import { BOARD_SOURCES } from "@/lib/board-sources";
import { cn } from "@/lib/cn";

/*
 * The board's widget kit. A widget is one small, believable piece of a screen built only from
 * the system's own components, so the canvas reads like a product rather than a catalogue.
 * With notes switched on, each widget also names the components it is made of, links their
 * source, and says when to use them and when not. Notes stay in English; only the widget
 * follows the language switch.
 */

export type Direction = "ltr" | "rtl";

interface BoardState {
  dir: Direction;
  notes: boolean;
  hrefs: Record<SourceKey, string>;
}

const BoardContext = createContext<BoardState | null>(null);

export function BoardProvider({ value, children }: { value: BoardState; children: React.ReactNode }): React.ReactElement {
  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

function useBoard(): BoardState {
  const state = useContext(BoardContext);
  if (!state) throw new Error("board: a widget must sit inside <BoardProvider>");
  return state;
}

/** The board's direction, for portalled overlays that render outside the widget. */
export function useDir(): Direction {
  return useBoard().dir;
}

/** Sample copy in the board's current direction. Figures stay Latin in both. */
export function useT(): (en: string, ar: string) => string {
  const { dir } = useBoard();
  return (en, ar) => (dir === "rtl" ? ar : en);
}

/** The shared label voice (`telemetry`, packages/ui/src/styles/surfaces.css). */
export const LABEL = "telemetry text-muted-foreground";

export function Widget({
  title,
  description,
  action,
  footer,
  flush = false,
  uses,
  use,
  avoid,
  className,
  children,
}: {
  title?: string;
  description?: string;
  /** Sits at the end of the header row: a badge, an icon button, a small action. */
  action?: React.ReactNode;
  footer?: React.ReactNode;
  /** Drops the body padding for content that runs edge to edge (rows, tables). */
  flush?: boolean;
  uses: SourceKey[];
  use: string;
  avoid?: string;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  const { dir, notes, hrefs } = useBoard();
  return (
    <figure data-uses={uses.join(" ")} className={cn("min-w-0 scroll-m-10 rounded-panel-sm outline-offset-8 data-[flash=true]:outline-2 data-[flash=true]:outline-brand", className)}>
      <article
        dir={dir}
        lang={dir === "rtl" ? "ar" : "en"}
        className="flex flex-col overflow-clip rounded-panel-sm border border-border-subtle bg-card text-card-foreground"
      >
        {(title || action) && (
          <header className="flex items-start justify-between gap-3 px-5 pt-5">
            <div className="min-w-0">
              {title && <h2 className="text-md font-medium tracking-tight">{title}</h2>}
              {description && <p className="mt-0.5 text-meta text-muted-foreground">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </header>
        )}
        <div className={cn(!flush && "p-5", flush && title && "pt-3")}>{children}</div>
        {footer && <footer className="border-t border-border-subtle bg-surface/60 px-5 py-3">{footer}</footer>}
      </article>
      {notes && (
        <figcaption className="mt-3 grid gap-2 px-1 text-meta">
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            {uses.map((key) => (
              <a
                key={key}
                href={hrefs[key]}
                title={BOARD_SOURCES[key]}
                className="text-foreground underline decoration-border-mid underline-offset-2 hover:decoration-foreground"
              >
                {BOARD_SOURCES[key].split("/").pop()}
              </a>
            ))}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Use </span>
            {use}
          </p>
          {avoid && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Avoid </span>
              {avoid}
            </p>
          )}
        </figcaption>
      )}
    </figure>
  );
}

/** A labelled cell inside a widget — one state or one variant. */
export function Cell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn("flex min-w-0 flex-col items-start gap-2", className)}>
      {children}
      <span className={LABEL}>{label}</span>
    </div>
  );
}
