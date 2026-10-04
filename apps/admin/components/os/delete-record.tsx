"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, MoreHorizontal, Trash2 } from "lucide-react";
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  LoadingIcon,
} from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  deleteRecords,
  describeDeletion,
  type DeletionPreview,
} from "@/app/(dashboard)/_actions/delete";

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

  const open = targets !== null;
  const ids = React.useMemo(() => (targets ?? []).map((t) => t.id), [targets]);
  const idKey = ids.join(",");

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
    preview?.permitted === true &&
    plans.length > 0 &&
    (impact.length > 0 || plans.length > 1 || softBlocked.length > 0);
  const canSubmit = preview?.permitted === true && deletableNow > 0 && !failure;

  async function run() {
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
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={
        plans.length > 1
          ? `Delete ${plans.length} ${noun}?`
          : `Delete ${name || noun}?`
      }
      body="The row leaves the database — the audit trail keeps who deleted it and what it held."
      consequence="This is permanent and cannot be undone."
      confirmLabel={deletableNow > 1 ? `Delete ${deletableNow}` : "Delete"}
      tone="danger"
      requireText={needsTyping ? CONFIRM_WORD : undefined}
      confirmDisabled={!canSubmit}
      width="lg"
      onConfirm={run}
    >
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
          {preview.missing.length > 1 ? "those records are" : "that record is"}{" "}
          already gone.
        </Banner>
      )}

      {impact.length > 0 && (
        <div className="rounded-md border border-danger/25 bg-danger/5 px-2.5 py-2">
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
            <label className="flex items-start gap-2 rounded-md border border-warning/25 bg-surface px-2.5 py-2 text-base">
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
    </ConfirmDialog>
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
      role={tone === "danger" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-2 rounded-md border px-2.5 py-2 text-base",
        tone === "danger" && "border-danger/25 bg-danger/5 text-foreground",
        tone === "warning" && "border-warning/25 bg-warning/5 text-foreground",
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

export function useRecordDelete({
  entity,
  onDeleted,
}: {
  entity: string;
  onDeleted?: (deleted: number) => void;
}) {
  const [targets, setTargets] = React.useState<DeleteTarget[] | null>(null);
  const [instance, setInstance] = React.useState(0);

  const request = React.useCallback((next: DeleteTarget | DeleteTarget[]) => {
    const list = Array.isArray(next) ? next : [next];
    if (list.length === 0) return;
    setTargets(list);
    setInstance((n) => n + 1);
  }, []);

  const dialog = (
    <React.Fragment>
      <DeleteDialog
        key={instance}
        entity={entity}
        targets={targets}
        onClose={() => setTargets(null)}
        onDeleted={onDeleted}
      />
    </React.Fragment>
  );

  return { request, dialog, open: targets !== null };
}

export function RowActions({
  onDelete,
  deleteLabel = "Delete",
  children,
}: {
  onDelete?: () => void;
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
        {onDelete && (
          <DropdownMenuItem destructive onSelect={() => onDelete()}>
            <Trash2 className="size-3.5" />
            {deleteLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DeleteRecordButton({
  entity,
  id,
  label,
  redirectTo,
  variant = "destructive-ghost",
  size = "default",
  children = "Delete",
  className,
  "aria-label": ariaLabel,
}: {
  entity: string;
  id: string;
  label: string;
  redirectTo?: string;
  variant?: "destructive-ghost" | "destructive";
  size?: "sm" | "default" | "icon-sm";
  children?: React.ReactNode;
  className?: string;
  "aria-label"?: string;
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
        className={className}
        aria-label={ariaLabel}
        onClick={() => request({ id, label })}
      >
        <Trash2 className="size-3.5" />
        {children}
      </Button>
      {dialog}
    </>
  );
}
