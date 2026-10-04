"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, CircleCheckBig, ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  LoadingIcon,
} from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { useRecordDelete } from "@/components/os/delete-record";
import { optionsOf, statusOf } from "@/lib/status";
import { setProjectPhase, setProjectStatus } from "@/app/(dashboard)/_actions/records";
import { CloseProjectDialog } from "./close-project";

async function attempt(run: () => Promise<unknown>, success: string): Promise<{ ok: boolean; message: string }> {
  try {
    await run();
    return { ok: true, message: success };
  } catch (error) {
    return {
      ok: false,
      message: `${error instanceof Error && error.message ? error.message : "The server refused the change."} Nothing was changed.`,
    };
  }
}

export function PhaseControl({
  projectId,
  phase,
  hasLaunchDate,
}: {
  projectId: string;
  phase: string;
  hasLaunchDate: boolean;
}) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="pointer-coarse:h-11" disabled={busy}>
          {busy && <LoadingIcon size="sm" />}
          {statusOf("projectPhase", phase).label}
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Move to phase</DropdownMenuLabel>
        {optionsOf("projectPhase").map((option) => (
          <DropdownMenuItem
            key={option.value}
            disabled={option.value === phase}
            onSelect={() =>
              startTransition(async () => {
                const result = await attempt(
                  () => setProjectPhase(projectId, option.value),
                  option.value !== "LAUNCHED"
                    ? `Moved to ${option.label}.`
                    : hasLaunchDate
                      ? `Moved to ${option.label}. The launch date already recorded stands.`
                      : `Moved to ${option.label}. Launch date recorded as today.`,
                );
                toast[result.ok ? "success" : "error"](result.message);
                if (result.ok) router.refresh();
              })
            }
          >
            {option.label}
            {option.value === phase && <span className="ms-auto text-subtle-foreground">current</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProjectMoreMenu({
  projectId,
  projectName,
  status,
  portalHref,
  canEdit,
  canDelete,
}: {
  projectId: string;
  projectName: string;
  status: string;
  portalHref: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const del = useRecordDelete({
    entity: "project",
    onDeleted: (deleted) => {
      if (deleted > 0) router.push("/projects");
    },
  });

  const canClose = canEdit && (status === "ACTIVE" || status === "ON_HOLD");
  const statusOptions = optionsOf("projectStatus").filter((o) => o.value !== "COMPLETED");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="pointer-coarse:h-11" disabled={busy} aria-label="More project actions">
            {busy ? <LoadingIcon size="sm" /> : <MoreHorizontal className="size-3.5" />}
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && (
            <>
              <DropdownMenuLabel>Status · {statusOf("projectStatus", status).label}</DropdownMenuLabel>
              {statusOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  disabled={option.value === status}
                  destructive={option.value === "CANCELLED"}
                  onSelect={() => {
                    if (option.value === "CANCELLED") {
                      setConfirmCancel(true);
                      return;
                    }
                    startTransition(async () => {
                      const result = await attempt(
                        () => setProjectStatus(projectId, option.value),
                        `Status set to ${option.label}.`,
                      );
                      toast[result.ok ? "success" : "error"](result.message);
                      if (result.ok) router.refresh();
                    });
                  }}
                >
                  {option.value === "ACTIVE" && status !== "ACTIVE" ? "Resume (Active)" : option.label}
                  {option.value === status && <span className="ms-auto text-subtle-foreground">current</span>}
                </DropdownMenuItem>
              ))}
              {canClose && (
                <DropdownMenuItem onSelect={() => setClosing(true)}>
                  <CircleCheckBig className="size-3.5" />
                  Close project…
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem asChild>
            <a href={portalHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              Open client portal
            </a>
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => del.request({ id: projectId, label: projectName })}>
                <Trash2 className="size-3.5" />
                Delete project…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        tone="danger"
        title={`Cancel ${projectName}?`}
        body="Use this when the engagement stopped before it was finished. Payments, change requests and the audit trail stay as they are."
        consequence="The project leaves the active lists. It can be set back to Active from this menu."
        confirmLabel="Cancel project"
        cancelLabel="Keep it"
        onConfirm={async () => {
          const result = await attempt(() => setProjectStatus(projectId, "CANCELLED"), `${projectName} cancelled.`);
          if (result.ok) router.refresh();
          return result;
        }}
      />

      {canClose && (
        <CloseProjectDialog
          projectId={projectId}
          projectName={projectName}
          open={closing}
          onOpenChange={setClosing}
        />
      )}

      {del.dialog}
    </>
  );
}
