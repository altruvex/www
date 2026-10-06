"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
} from "@repo/ui";
import { cn } from "@/lib/utils";

export type ConfirmResult = { ok: boolean; message?: string } | void;

export interface ConfirmDialogProps {
  trigger?: React.ReactElement<{ onClick?: React.MouseEventHandler }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: React.ReactNode;
  body?: React.ReactNode;
  consequence?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => Promise<ConfirmResult> | ConfirmResult;
  requireText?: string;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
  width?: "md" | "lg";
}

export function ConfirmDialog({
  trigger,
  open: openProp,
  onOpenChange,
  title,
  body,
  consequence,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  requireText,
  children,
  confirmDisabled = false,
  width = "md",
}: ConfirmDialogProps) {
  const [openState, setOpenState] = React.useState(false);
  const open = openProp ?? openState;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [typed, setTyped] = React.useState("");
  const errorId = React.useId();
  const typedId = React.useId();

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOpenState(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  const [lastOpen, setLastOpen] = React.useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setError(null);
      setTyped("");
    }
  }

  const textOk = !requireText || typed.trim() === requireText;

  async function confirm() {
    if (pending || !textOk || confirmDisabled) return;
    setPending(true);
    setError(null);
    try {
      const result = await onConfirm();
      if (result && result.ok === false) {
        setError(result.message ?? "That did not go through. Nothing was reported back.");
        return;
      }
      setOpen(false);
      if (result && result.message) toast.success(result.message);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "The request failed before the server answered. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  const triggerElement =
    trigger &&
    React.cloneElement(trigger, {
      onClick: (event: React.MouseEvent) => {
        trigger.props.onClick?.(event);
        if (!event.defaultPrevented) setOpen(true);
      },
      "aria-haspopup": "dialog",
    } as React.HTMLAttributes<HTMLElement>);

  return (
    <>
      {triggerElement}
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (pending && !next) return;
          setOpen(next);
        }}
      >
        <AlertDialogContent
          className={width === "lg" ? "max-w-lg" : undefined}
          aria-busy={pending || undefined}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {body ? (
              <AlertDialogDescription asChild>
                <div>{body}</div>
              </AlertDialogDescription>
            ) : (
              <AlertDialogDescription className="sr-only">{title}</AlertDialogDescription>
            )}
          </AlertDialogHeader>

          {consequence && (
            <p
              className={cn(
                "flex items-start gap-2 rounded-ctl-lg border px-2.5 py-2 text-base",
                tone === "danger"
                  ? "border-danger/25 bg-danger/5 text-foreground"
                  : "border-border-subtle bg-surface text-foreground",
              )}
            >
              {tone === "danger" && (
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden />
              )}
              <span className="min-w-0">{consequence}</span>
            </p>
          )}

          {children}

          {requireText && (
            <div className="space-y-1.5">
              <label htmlFor={typedId} className="block text-meta text-muted-foreground">
                Type <span className="font-mono font-medium text-foreground">{requireText}</span> to
                confirm
              </label>
              <Input
                id={typedId}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={pending}
                aria-describedby={error ? errorId : undefined}
              />
            </div>
          )}

          {error && (
            <p
              id={errorId}
              role="alert"
              className="rounded-ctl-lg border border-danger/25 bg-danger/5 px-2.5 py-2 text-base text-danger"
            >
              {error}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
            <Button
              type="button"
              data-slot="alert-dialog-action"
              variant={tone === "danger" ? "destructive" : "brand"}
              loading={pending}
              disabled={!textOk || confirmDisabled}
              onClick={() => void confirm()}
            >
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
