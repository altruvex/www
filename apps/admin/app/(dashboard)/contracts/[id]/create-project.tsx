"use client";

import { FolderPlus } from "lucide-react";
import { Button } from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { createProjectFromContract } from "../../_actions/contracts";

export function CreateProjectButton({
  contractId,
  total,
  split,
  priorProject,
}: {
  contractId: string;
  total: string;
  split: string;
  priorProject: { label: string | null; deletedAt: string | null } | null;
}) {
  const earlier = priorProject
    ? `${priorProject.label ? `“${priorProject.label}”` : "A project for this contract"} was deleted${
        priorProject.deletedAt ? ` on ${priorProject.deletedAt}` : " before"
      }. Its payments went with it; its services stayed on the client.`
    : null;
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="brand">
          <FolderPlus className="size-3.5" aria-hidden />
          Create project
        </Button>
      }
      title="Open the project for this contract?"
      body={
        earlier
          ? `${earlier} This opens the project in Discovery. The onboarding message is not sent.`
          : "This opens the project exactly as signing would have: in Discovery, with the services the proposal carried as pending rows. The onboarding message is not sent."
      }
      consequence={
        earlier
          ? `No payments and no services are created, so nothing is billed or added twice. Add any payments still owed on ${total}, or services, by hand.`
          : `Opens the ${split} payment schedule on ${total}, with the deposit due today.`
      }
      confirmLabel="Create project"
      onConfirm={() => createProjectFromContract(contractId)}
    />
  );
}
