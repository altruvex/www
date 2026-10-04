"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { Checkbox, Field, LoadingIcon, Textarea } from "@repo/ui";

import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { cn } from "@/lib/utils";
import { date } from "@/lib/format";
import { warrantyWindow } from "@/lib/change-requests";
import {
  closeProject,
  describeProjectClosure,
  type ClosurePlan,
} from "@/app/(dashboard)/_actions/change-requests";

export function CloseProjectDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [plan, setPlan] = React.useState<ClosurePlan | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [override, setOverride] = React.useState(false);
  const [note, setNote] = React.useState("");

  const [lastOpen, setLastOpen] = React.useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setPlan(null);
      setLoadError(null);
      setOverride(false);
      setNote("");
    }
  }

  React.useEffect(() => {
    if (!open) return;
    let live = true;
    describeProjectClosure(projectId)
      .then((result) => {
        if (!live) return;
        if (result.ok) setPlan(result.data);
        else setLoadError(result.message);
      })
      .catch(() => live && setLoadError("The checklist could not be loaded. Nothing was changed."));
    return () => {
      live = false;
    };
  }, [open, projectId]);

  const blocked = plan?.blocked ?? false;
  const warrantyEnds = plan
    ? warrantyWindow(plan.actualLaunchDate ? new Date(plan.actualLaunchDate) : null, plan.warrantyDays).endsAt
    : null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Close ${projectName}`}
      confirmLabel={blocked ? "Close with override" : "Close project"}
      consequence="Records today as the close date. Change requests can still be logged afterwards, and the project can be reopened from the status menu."
      onConfirm={async () => {
        if (loadError) return { ok: false, message: loadError };
        if (!plan) return { ok: false, message: "The checklist is still loading." };
        if (blocked && !plan.canOverride) {
          return { ok: false, message: "Settle the items above first, or ask an owner to close it with an override." };
        }
        if (blocked && !override) {
          return { ok: false, message: "Tick “Close anyway” to override the items above, or settle them first." };
        }
        const result = await closeProject(projectId, {
          override: blocked && override,
          ...(note.trim() ? { note: note.trim() } : {}),
        });
        if (!result.ok) return { ok: false, message: `${result.message} Nothing was changed.` };
        router.refresh();
        return { ok: true, message: `${projectName} closed.` };
      }}
      body={
        loadError ? (
          <p className="text-meta text-danger">{loadError}</p>
        ) : plan == null ? (
          <div className="flex items-center gap-2 py-3 text-meta text-muted-foreground" aria-live="polite">
            <LoadingIcon size="sm" /> Checking payments and change requests…
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="divide-y divide-border rounded-ctl border border-border">
              {plan.checks.map((check) => {
                const Icon = check.ok ? CheckCircle2 : check.blocks ? AlertTriangle : Info;
                return (
                  <li key={check.id} className="flex gap-2.5 px-3 py-2">
                    <Icon
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        check.ok ? "text-success" : check.blocks ? "text-warning" : "text-subtle-foreground",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-base font-medium">{check.label}</p>
                      <p className="text-meta text-muted-foreground">{check.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className="text-meta text-muted-foreground">
              {warrantyEnds
                ? `Post-launch warranty (${plan.warrantyDays} days) runs until ${date(warrantyEnds)}, whether or not the project is closed.`
                : "No launch date is recorded, so no warranty window has started."}
            </p>

            {blocked &&
              (plan.canOverride ? (
                <label className="flex min-h-11 items-start gap-2.5 sm:min-h-0">
                  <Checkbox
                    checked={override}
                    onCheckedChange={(value) => setOverride(value === true)}
                    className="mt-0.5 border-foreground/45 hover:border-foreground/70"
                  />
                  <span className="text-base">
                    Close anyway. The override and the reasons above are written into the audit trail.
                  </span>
                </label>
              ) : (
                <p className="text-meta text-warning">
                  Settle the items above first, or ask an owner to close it with an override.
                </p>
              ))}

            <Field label="Note (optional)">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Kept in the audit trail"
              />
            </Field>
          </div>
        )
      }
    />
  );
}
