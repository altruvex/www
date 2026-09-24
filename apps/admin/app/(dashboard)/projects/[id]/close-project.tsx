"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, CircleCheckBig, Info } from "lucide-react";

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
  LoadingIcon,
} from "@repo/ui";

import { cn } from "@/lib/utils";
import { date } from "@/lib/format";
import { warrantyWindow } from "@/lib/change-requests";
import {
  closeProject,
  describeProjectClosure,
  type ClosurePlan,
} from "@/app/(dashboard)/_actions/change-requests";

/**
 * Closing a project is a checklist read from the server, not a status in a
 * dropdown. Unpaid payments and open change requests hold the close back; an
 * owner may override them, and the override is written into the audit event.
 */
export function CloseProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CircleCheckBig className="size-3.5 text-subtle-foreground" />
        Close project
      </Button>
      {open && (
        <CloseProjectDialog projectId={projectId} projectName={projectName} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function CloseProjectDialog({
  projectId,
  projectName,
  onClose,
}: {
  projectId: string;
  projectName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [plan, setPlan] = React.useState<ClosurePlan | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [override, setOverride] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    describeProjectClosure(projectId)
      .then((result) => {
        if (!live) return;
        if (result.ok) setPlan(result.data);
        else setLoadError(result.message);
      })
      .catch(() => live && setLoadError("The checklist could not be loaded."));
    return () => {
      live = false;
    };
  }, [projectId]);

  const blocked = plan?.blocked ?? false;
  const canSubmit = !busy && plan != null && (!blocked || (plan.canOverride && override));

  async function run() {
    setBusy(true);
    try {
      const result = await closeProject(projectId, {
        override: blocked && override,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      if (!result.ok) throw new Error(result.message);
      toast.success("Project closed", { description: projectName });
      router.refresh();
      onClose();
    } catch (error) {
      toast.error("Could not close the project", {
        description:
          error instanceof Error ? `${error.message} Nothing was changed.` : "Unknown error. Nothing was changed.",
      });
    } finally {
      setBusy(false);
    }
  }

  const warrantyEnds = plan
    ? warrantyWindow(plan.actualLaunchDate ? new Date(plan.actualLaunchDate) : null, plan.warrantyDays).endsAt
    : null;

  return (
    <AlertDialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Close {projectName}</AlertDialogTitle>
          <AlertDialogDescription>
            Marks the engagement finished and records today as the close date. Change requests
            can still be logged afterwards, and the project can be reopened from the status menu.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {loadError ? (
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
                <label className="flex items-start gap-2.5">
                  <Checkbox
                    checked={override}
                    onCheckedChange={(value) => setOverride(value === true)}
                    className="mt-0.5 border-foreground/45 hover:border-foreground/70"
                  />
                  <span className="text-base">
                    Close anyway. The override and the reasons above are written into the audit
                    trail.
                  </span>
                </label>
              ) : (
                <p className="text-meta text-warning">
                  Settle the items above first, or ask an owner to close it with an override.
                </p>
              ))}

            <label className="block space-y-1.5">
              <span className="block text-meta font-medium text-muted-foreground">Note (optional)</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Kept in the audit trail"
                className={cn(
                  "w-full rounded-ctl border border-border bg-background px-3 py-2 text-base",
                  "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                )}
              />
            </label>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="brand"
            disabled={!canSubmit}
            onClick={(event) => {
              event.preventDefault();
              void run();
            }}
          >
            {busy && <LoadingIcon size="sm" />}
            {blocked ? "Close with override" : "Close project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
