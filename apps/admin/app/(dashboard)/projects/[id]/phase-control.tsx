"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Button } from "@repo/ui";
import { LoadingIcon } from "@repo/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@repo/ui";
import { optionsOf, statusOf } from "@/lib/status";
import { setProjectPhase, setProjectStatus } from "@/app/(dashboard)/_actions/records";

export function PhaseControl({ projectId, phase }: { projectId: string; phase: string }) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy}>
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
            onSelect={() =>
              startTransition(async () => {
                try {
                  await setProjectPhase(projectId, option.value);
                  toast.success(`Moved to ${option.label}`, {
                    description:
                      option.value === "LAUNCHED"
                        ? "Launch date recorded as today."
                        : undefined,
                  });
                  router.refresh();
                } catch (error) {
                  toast.error("Could not change phase", {
                    description: error instanceof Error ? error.message : "Unknown error",
                  });
                }
              })
            }
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProjectStatusControl({ projectId, status }: { projectId: string; status: string }) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy}>
          {busy && <LoadingIcon size="sm" />}
          {statusOf("projectStatus", status).label}
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Set project status</DropdownMenuLabel>
        {/* COMPLETED is reached only through Close project, which checks first. */}
        {optionsOf("projectStatus")
          .filter((option) => option.value !== "COMPLETED" || option.value === status)
          .map((option) => (
          <DropdownMenuItem
            key={option.value}
            disabled={option.value === status}
            destructive={option.value === "CANCELLED"}
            onSelect={() =>
              startTransition(async () => {
                try {
                  await setProjectStatus(projectId, option.value);
                  toast.success(`Status set to ${option.label}`);
                  router.refresh();
                } catch (error) {
                  toast.error("Could not change status", {
                    description: error instanceof Error ? error.message : "Unknown error",
                  });
                }
              })
            }
          >
            {option.label}
            {option.value === status && <span className="ms-auto text-subtle-foreground">current</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
