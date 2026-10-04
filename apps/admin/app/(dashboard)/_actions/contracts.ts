"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/database";

import { authorize } from "@/lib/authorize";
import { recordActivity, userActor } from "@/lib/activity-log";
import { findDeletedContractProject, openContractProject } from "@/lib/contract-signing";

export type ContractActionResult = { ok: boolean; message: string };

export async function createProjectFromContract(contractId: string): Promise<ContractActionResult> {
  let session;
  try {
    session = await authorize("create", "project");
  } catch {
    return { ok: false, message: "Your role cannot create projects." };
  }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { client: true, proposal: true, project: { select: { id: true } } },
  });
  if (!contract) return { ok: false, message: "This contract no longer exists." };
  if (contract.status !== "SIGNED") {
    return {
      ok: false,
      message: "Only a signed contract opens a project. Record the signature first.",
    };
  }
  if (contract.project) {
    return { ok: false, message: "This contract already has a project." };
  }

  const actor = userActor(session);
  const prior = await findDeletedContractProject(contract.id);
  const recreateBilling = prior === null;
  let project;
  try {
    project = await openContractProject(contract, actor.label, {
      recreateBilling,
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { ok: false, message: "This contract already has a project." };
    }
    console.error("createProjectFromContract failed", error);
    return { ok: false, message: "The project could not be created. Nothing was saved." };
  }

  await recordActivity({
    action: "project.created",
    actor,
    entityType: "project",
    entityId: project.id,
    entityLabel: project.name,
    summary: recreateBilling
      ? `Opened ${project.name} with its payment schedule from the signed contract`
      : `Reopened ${project.name} from the signed contract without payments or services — a project for this contract was deleted before`,
    after: { phase: "DISCOVERY", contractId: contract.id },
    metadata: {
      clientId: contract.clientId,
      automatic: false,
      paymentSchedule: recreateBilling ? "created" : "skipped_prior_project",
      services: recreateBilling ? "created" : "skipped_prior_project",
      ...(prior
        ? {
            priorProject: prior.label,
            priorProjectDeletedAt: prior.deletedAt?.toISOString() ?? null,
          }
        : {}),
    },
  });

  revalidatePath(`/contracts/${contract.id}`);
  revalidatePath("/contracts");
  revalidatePath("/projects");
  revalidatePath("/payments");
  revalidatePath(`/clients/${contract.clientId}`);

  return {
    ok: true,
    message: recreateBilling
      ? `${project.name} is open, with its payment schedule.`
      : `${project.name} is open with no payments and no services, because a project for this contract was deleted before. Nothing was billed or added twice — add any payments or services still owed by hand.`,
  };
}
