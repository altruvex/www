import { CopyPlus, FolderKanban, ListPlus, ReceiptText } from "lucide-react";
import type { NextStep } from "@/components/os/next-steps";

export type ContractStepPermissions = {
  openProject: boolean;
  addTask: boolean;
  charge: boolean;
  quote: boolean;
};

export function contractNextSteps(
  contract: {
    status: string;
    clientId: string;
    proposalId: string;
    project: { id: string; status: string } | null;
  },
  allowed: ContractStepPermissions,
): NextStep[] {
  const steps: NextStep[] = [];
  const project = contract.status === "SIGNED" ? contract.project : null;
  if (project && allowed.openProject) {
    steps.push({
      key: "project",
      label: "Open the project",
      icon: FolderKanban,
      href: `/projects/${project.id}`,
    });
  }
  if (project?.status === "ACTIVE") {
    if (allowed.addTask) {
      steps.push({
        key: "task",
        label: "Add a task",
        hint: "On this project",
        icon: ListPlus,
        href: `/tasks?project=${encodeURIComponent(project.id)}&new=task`,
      });
    }
    if (allowed.charge) {
      steps.push({
        key: "charge",
        label: "New charge",
        hint: "Billed to this client and project",
        icon: ReceiptText,
        href: `/payments?new=charge&client=${encodeURIComponent(contract.clientId)}&project=${encodeURIComponent(project.id)}`,
      });
    }
  }
  if (
    (contract.status === "DECLINED" || contract.status === "EXPIRED") &&
    allowed.quote
  ) {
    steps.push({
      key: "quote",
      label: "Quote again",
      hint: "A new proposal, starting from this one",
      icon: CopyPlus,
      href: `/clients/${contract.clientId}/new-proposal?from=${encodeURIComponent(contract.proposalId)}`,
      primary: true,
    });
  }
  return steps;
}
