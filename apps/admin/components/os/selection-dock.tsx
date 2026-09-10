"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronUp, X } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import { cn } from "@/lib/utils";

/* --------------------------------------------------------------------------
   SelectionDock — where a bulk action is taken.

   It used to be a banner rendered above the table: it pushed every row down
   the moment a checkbox was ticked, it wrapped into three ragged lines on a
   phone, and by the time an operator had scrolled to row forty the actions for
   their selection were off screen.

   So the dock floats over the content instead of displacing it, stays put
   while the table scrolls, and collapses to one line + a menu below `sm`.
   It is portalled to <body> because `.liquid-glass*` sets `translateZ(0)`,
   and a transformed ancestor would make `position: fixed` resolve against the
   card rather than the viewport.
   -------------------------------------------------------------------------- */

export interface DockAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  onRun: () => void | Promise<void>;
}

export interface SelectionDockProps {
  count: number;
  /** Singular noun for the record type: "lead", "payment", "row". */
  noun?: string;
  actions: DockAction[];
  onClear: () => void;
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

export function SelectionDock({ count, noun = "row", actions, onClear }: SelectionDockProps) {
  const [mounted, setMounted] = React.useState(false);
  const [running, setRunning] = React.useState<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Escape drops the selection — but not while a menu is open (Escape closes
  // that first) and not while the operator is typing in the search box.
  React.useEffect(() => {
    if (count === 0) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || menuOpen || isTyping(event.target)) return;
      onClear();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [count, menuOpen, onClear]);

  const run = React.useCallback(async (action: DockAction) => {
    setRunning(action.label);
    try {
      await action.onRun();
    } finally {
      setRunning(null);
    }
  }, []);

  if (!mounted || count === 0 || actions.length === 0) return null;

  const busy = running !== null;

  return createPortal(
    <div
      // Clears the mobile bottom bar (52px + safe area) on small screens; sits
      // on the content edge once that bar is gone at lg.
      className={cn(
        "pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3",
        "bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] lg:bottom-5",
      )}
    >
      <div
        role="region"
        aria-label="Selection actions"
        className={cn(
          "dock-glass pointer-events-auto flex w-full max-w-xl items-center gap-2",
          "rounded-2xl p-1.5 ps-3 motion-safe:animate-dock-in",
        )}
      >
        <p aria-live="polite" className="telemetry flex min-w-0 items-center gap-2 whitespace-nowrap">
          <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
          <span className="truncate">
            {count} {noun}
            {count === 1 ? "" : "s"} selected
          </span>
        </p>

        <span className="ms-auto h-5 w-px shrink-0 bg-border" aria-hidden />

        {/* Below sm the actions collapse into one menu, so the dock is always a
            single line — no wrapping, no destructive button under a thumb. */}
        <div className="sm:hidden">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" loading={busy}>
                Actions
                {!busy && <ChevronUp className="size-3.5" aria-hidden />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="min-w-48">
              <DropdownMenuLabel>
                {count} {noun}
                {count === 1 ? "" : "s"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {actions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  destructive={action.destructive}
                  onSelect={() => void run(action)}
                >
                  {action.icon && <action.icon className="size-3.5" />}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          {actions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant="ghost"
              loading={running === action.label}
              disabled={busy && running !== action.label}
              onClick={() => void run(action)}
              className={cn(
                action.destructive &&
                  "text-danger hover:bg-danger/10 hover:text-danger active:bg-danger/15",
              )}
            >
              {action.icon && running !== action.label && <action.icon className="size-3.5" />}
              {action.label}
            </Button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          disabled={busy}
          aria-label="Clear selection"
          className="shrink-0 text-subtle-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>,
    document.body,
  );
}
