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
import { toast } from "sonner";
import { ConfirmDialog, type ConfirmResult } from "@/components/os/confirm-dialog";
import { cn } from "@/lib/utils";

export interface DockConfirm {
  title: React.ReactNode;
  description?: React.ReactNode;
  consequence?: React.ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "default";
}

export interface DockAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  confirm?: DockConfirm;
  onRun: () => ConfirmResult | Promise<ConfirmResult>;
}

export interface SelectionDockProps {
  count: number;
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
  const [confirming, setConfirming] = React.useState<DockAction | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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
    if (action.confirm) {
      setConfirming(action);
      return;
    }
    setRunning(action.label);
    try {
      const result = await action.onRun();
      if (result && result.ok === false) {
        toast.error(result.message ?? "That did not go through. Nothing was reported back.");
      } else if (result && result.message) {
        toast.success(result.message);
      }
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "The request failed before the server answered. Check your connection and try again.",
      );
    } finally {
      setRunning(null);
    }
  }, []);

  if (!mounted) return null;

  const dialog = confirming?.confirm ? (
    <ConfirmDialog
      open
      onOpenChange={(next) => {
        if (!next) setConfirming(null);
      }}
      title={confirming.confirm.title}
      body={confirming.confirm.description}
      consequence={confirming.confirm.consequence}
      confirmLabel={confirming.confirm.confirmLabel ?? confirming.label}
      tone={confirming.confirm.tone ?? (confirming.destructive ? "danger" : "default")}
      onConfirm={() => confirming.onRun()}
    />
  ) : null;

  if (count === 0 || actions.length === 0) return dialog;

  const busy = running !== null;

  return (
    <>
      {dialog}
      {createPortal(
        <div
          className={cn(
            "pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3",
            "bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] lg:bottom-5",
          )}
        >
          <div
            role="region"
            aria-label="Selection actions"
            className={cn(
              "liquid-glass-toolbar pointer-events-auto flex w-full max-w-xl items-center gap-2",
              "rounded-panel-md p-1.5 ps-3 motion-safe:animate-dock-in",
            )}
          >
            <p
              aria-live="polite"
              className="telemetry flex min-w-0 items-center gap-2 whitespace-nowrap"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
              <span className="truncate">
                {count} {noun}
                {count === 1 ? "" : "s"} selected
              </span>
            </p>

            <span className="ms-auto h-5 w-px shrink-0 bg-border" aria-hidden />

            <div className="sm:hidden">
              {/* Not modal: a modal menu that opens a modal dialog leaves body pointer-events stuck at none. */}
              <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
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
                  variant={action.destructive ? "destructive-ghost" : "ghost"}
                  loading={running === action.label}
                  disabled={busy && running !== action.label}
                  onClick={() => void run(action)}
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
      )}
    </>
  );
}
