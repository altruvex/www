"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, MoreHorizontal, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  LoadingIcon,
} from "@repo/ui";
import { cn } from "@/lib/utils";
import {
  deleteRecords,
  describeDeletion,
  type DeletionPreview,
} from "@/app/(dashboard)/_actions/delete";

/* --------------------------------------------------------------------------
   Deleting a record, everywhere in the app.

   One dialog, one shape: what goes, what it takes with it, what it will not
   take, and a typed confirmation when the answer to the second question is not
   "nothing". The preview is fetched from the server rather than assembled from
   whatever the table happens to have loaded — a row's `_count` is not a cascade
   plan, and an operator who deletes a client is entitled to see the six records
   that go with it before they click.

   Tables mount ONE dialog via `useRecordDelete` and point every row at it;
   nesting an AlertDialog inside a DropdownMenuItem per row is both heavier and
   a focus-management trap.
   -------------------------------------------------------------------------- */

export interface DeleteTarget {
  id: string;
  label: string;
}

const CONFIRM_WORD = "delete";

function DeleteDialog({
  entity,
  targets,
  onClose,
  onDeleted,
}: {
  entity: string;
  targets: DeleteTarget[] | null;
  onClose: () => void;
  onDeleted?: (deleted: number) => void;
}) {
  const router = useRouter();
  const [preview, setPreview] = React.useState<DeletionPreview | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [override, setOverride] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const open = targets !== null;
  const ids = React.useMemo(() => (targets ?? []).map((t) => t.id), [targets]);
  const idKey = ids.join(",");

  // No state is reset here: `useRecordDelete` remounts this component on every
  // open (see the key below), so each request starts from a clean slate without
  // a cascade of setState calls inside the effect.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    describeDeletion(entity, idKey.split(","))
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFailure(
            error instanceof Error
              ? error.message
              : "Could not read this record",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [entity, idKey, open]);

  const plans = React.useMemo(() => preview?.plans ?? [], [preview]);
  const single = plans.length === 1 ? plans[0] : null;
  const name = single?.label ?? targets?.[0]?.label ?? "";
  const noun =
    plans.length === 1
      ? (preview?.noun ?? "record")
      : (preview?.plural ?? "records");

  // Impact and notes are merged across every selected row: "3 clients" that
  // between them own 5 proposals must say 5, not three separate lists.
  const impact = React.useMemo(() => {
    const totals = new Map<string, number>();
    for (const plan of plans) {
      for (const entry of plan.impact) {
        totals.set(entry.label, (totals.get(entry.label) ?? 0) + entry.count);
      }
    }
    return [...totals.entries()].map(([label, count]) => ({ label, count }));
  }, [plans]);

  const notes = React.useMemo(
    () => [...new Set(plans.flatMap((p) => p.notes))],
    [plans],
  );

  const blocked = plans.filter((p) => p.block);
  const hardBlocked = blocked.filter((p) => p.block?.hard);
  const softBlocked = blocked.filter((p) => !p.block?.hard);
  const deletableNow =
    plans.length -
    hardBlocked.length -
    (preview?.canOverride && override ? 0 : softBlocked.length);

  const needsTyping =
    impact.length > 0 || plans.length > 1 || softBlocked.length > 0;
  const confirmed = !needsTyping || typed.trim().toLowerCase() === CONFIRM_WORD;
  const canSubmit =
    !busy &&
    preview?.permitted === true &&
    deletableNow > 0 &&
    confirmed &&
    !failure;

  async function run() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const result = await deleteRecords(entity, ids, { override });
      if (result.deleted > 0) {
        toast.success(
          `Deleted ${result.deleted} ${result.deleted === 1 ? (preview?.noun ?? "record") : (preview?.plural ?? "records")}`,
          result.refused.length > 0
            ? { description: `${result.refused.length} kept — see below` }
            : undefined,
        );
      }
      for (const refusal of result.refused) {
        toast.error(`Kept ${refusal.label}`, { description: refusal.reason });
      }
      onDeleted?.(result.deleted);
      router.refresh();
      onClose();
    } catch (error) {
      toast.error("Could not delete", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => !next && !busy && onClose()}
    >
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {plans.length > 1
              ? `Delete ${plans.length} ${noun}?`
              : `Delete ${name || noun}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This is permanent. The row leaves the database — the audit trail
            keeps who deleted it and what it held.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!preview && !failure && (
          <p className="flex items-center gap-2 text-base text-muted-foreground">
            <LoadingIcon size="sm" /> Working out what this takes with it…
          </p>
        )}

        {failure && <Banner tone="danger">{failure}</Banner>}

        {preview && !preview.permitted && (
          <Banner tone="danger">
            Your role cannot delete {preview.plural}. Ask an owner.
          </Banner>
        )}

        {preview?.permitted && plans.length === 0 && (
          <Banner tone="muted">
            Nothing left to delete —{" "}
            {preview.missing.length > 1
              ? "those records are"
              : "that record is"}{" "}
            already gone.
          </Banner>
        )}

        {impact.length > 0 && (
          <div className="rounded-md border border-danger/30 bg-surface p-3">
            <p className="telemetry text-subtle-foreground">Also deleted</p>
            <ul className="mt-1.5 space-y-1">
              {impact.map((entry) => (
                <li
                  key={entry.label}
                  className="flex items-baseline justify-between gap-3 text-base"
                >
                  <span className="text-foreground">{entry.label}</span>
                  <span className="font-mono text-meta tabular-nums text-danger">
                    {entry.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {notes.length > 0 && (
          <ul className="space-y-1 text-meta text-muted-foreground">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}

        {hardBlocked.map((plan) => (
          <Banner key={plan.id} tone="danger" icon>
            <span className="font-medium">{plan.label}</span> cannot be deleted.{" "}
            {plan.block?.reason}
          </Banner>
        ))}

        {softBlocked.length > 0 && (
          <div className="space-y-2">
            {softBlocked.map((plan) => (
              <Banner key={plan.id} tone="warning" icon>
                <span className="font-medium">{plan.label}</span> —{" "}
                {plan.block?.reason}
              </Banner>
            ))}
            {preview?.canOverride ? (
              <label className="flex items-start gap-2 rounded-md border border-warning/40 bg-surface p-2.5 text-base">
                <Checkbox
                  className="mt-0.5"
                  checked={override}
                  onCheckedChange={(checked) => setOverride(checked === true)}
                />
                <span>
                  Delete it anyway.
                  <span className="block text-meta text-muted-foreground">
                    Recorded in the audit trail as an owner override.
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-meta text-muted-foreground">
                Only an owner can override this.
              </p>
            )}
          </div>
        )}

        {preview?.permitted && plans.length > 0 && needsTyping && (
          <div className="space-y-1.5">
            <label htmlFor="confirm-delete" className="block text-base">
              Type{" "}
              <span className="font-mono font-medium text-danger">
                {CONFIRM_WORD}
              </span>{" "}
              to confirm
            </label>
            <Input
              id="confirm-delete"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label={`Type ${CONFIRM_WORD} to confirm`}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canSubmit}
            onClick={(event) => {
              event.preventDefault();
              void run();
            }}
          >
            {busy ? <LoadingIcon size="sm" /> : <Trash2 className="size-3.5" />}
            {deletableNow > 1 ? `Delete ${deletableNow}` : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: "danger" | "warning" | "muted";
  icon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-md border p-2.5 text-base",
        tone === "danger" && "border-danger/40 bg-danger/8 text-foreground",
        tone === "warning" && "border-warning/40 bg-warning/8 text-foreground",
        tone === "muted" && "border-border bg-surface text-muted-foreground",
      )}
    >
      {icon && (
        <AlertTriangle
          className={cn(
            "mt-0.5 size-3.5 shrink-0",
            tone === "danger" ? "text-danger" : "text-warning",
          )}
          aria-hidden
        />
      )}
      <span>{children}</span>
    </p>
  );
}

/**
 * Mount once per screen. `request(targets)` opens the shared dialog — from a
 * row menu, a bulk action, or a detail-page button.
 */
export function useRecordDelete({
  entity,
  onDeleted,
}: {
  entity: string;
  onDeleted?: (deleted: number) => void;
}) {
  const [targets, setTargets] = React.useState<DeleteTarget[] | null>(null);
  // Bumped on every open so the dialog remounts with fresh state. Closing does
  // not bump it, which leaves the exit animation something to animate.
  const [instance, setInstance] = React.useState(0);

  const request = React.useCallback((next: DeleteTarget | DeleteTarget[]) => {
    const list = Array.isArray(next) ? next : [next];
    if (list.length === 0) return;
    setTargets(list);
    setInstance((n) => n + 1);
  }, []);

  const dialog = (
    <DeleteDialog
      key={instance}
      entity={entity}
      targets={targets}
      onClose={() => setTargets(null)}
      onDeleted={onDeleted}
    />
  );

  return { request, dialog, open: targets !== null };
}

/**
 * The trailing "…" menu on a table row. Extra items render above the divider;
 * Delete is always last and always destructive.
 */
export function RowActions({
  onDelete,
  deleteLabel = "Delete",
  children,
}: {
  onDelete: () => void;
  deleteLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Row actions"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
        <DropdownMenuItem destructive onSelect={() => onDelete()}>
          <Trash2 className="size-3.5" />
          {deleteLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Self-contained delete for a detail page — button plus its own dialog.
 * `redirectTo` is where the operator lands once the record they were looking at
 * no longer exists.
 */
export function DeleteRecordButton({
  entity,
  id,
  label,
  redirectTo,
  variant = "outline",
  size = "default",
  children = "Delete",
  className,
}: {
  entity: string;
  id: string;
  label: string;
  redirectTo?: string;
  variant?: "outline" | "ghost" | "destructive";
  size?: "sm" | "default" | "icon-sm";
  children?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const { request, dialog } = useRecordDelete({
    entity,
    onDeleted: (deleted) => {
      if (deleted > 0 && redirectTo) router.push(redirectTo);
    },
  });

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn(
          variant !== "destructive" && "text-danger hover:text-danger",
          className,
        )}
        onClick={() => request({ id, label })}
      >
        <Trash2 className="size-3.5" />
        {children}
      </Button>
      {dialog}
    </>
  );
}
