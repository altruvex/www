import {
  prisma,
  type Client,
  type Contract,
  type Proposal,
  type SignatureMethod,
  type SignVerificationChannel,
} from "@repo/database";
import { clientActor, recordActivity, type Actor } from "./activity-log";
import { proposalContentSchema } from "./proposal-schema";
import { servicesFromProposal } from "./service-lifecycle";
import { sendTemplateMessage } from "./whatsapp-api";

interface HandleContractSignedInput {
  contractId: string;
  signedByName: string;
  signedIp: string | null;
  signatureMethod: SignatureMethod;
  baseUrl: string;
  verification?: { via: SignVerificationChannel; to: string; hint: string };
  recordedBy?: { actor: Actor; summary: string; metadata?: Record<string, unknown> };
}

type ContractForProject = Pick<Contract, "id" | "clientId" | "proposalId"> & {
  client: Pick<Client, "name" | "company">;
  proposal: Pick<Proposal, "projectType" | "paymentSplit" | "totalPrice" | "content" | "currency">;
};

export async function openContractProject(
  contract: ContractForProject,
  createdBy: string,
  options: {
    recreateBilling?: boolean;
  } = {},
) {
  const recreateBilling = options.recreateBilling !== false;
  const split = contract.proposal.paymentSplit as unknown as {
    first: number;
    second: number;
    final: number;
  };
  const openedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        contractId: contract.id,
        clientId: contract.clientId,
        name: `${contract.client.company || contract.client.name || "Client"} — ${contract.proposal.projectType}`,
        phase: "DISCOVERY",
      },
    });

    if (recreateBilling) {
      await tx.payment.createMany({
        data: [
          {
            projectId: created.id,
            milestone: "DEPOSIT_50",
            amount: Math.round((contract.proposal.totalPrice * split.first) / 100),
            dueDate: openedAt,
          },
          {
            projectId: created.id,
            milestone: "MILESTONE_30",
            amount: Math.round((contract.proposal.totalPrice * split.second) / 100),
          },
          {
            projectId: created.id,
            milestone: "FINAL_20",
            amount: Math.round((contract.proposal.totalPrice * split.final) / 100),
          },
        ],
      });
    }

    const parsed = proposalContentSchema.safeParse(contract.proposal.content);
    const services = parsed.success ? parsed.data.services : [];
    if (recreateBilling && services.length > 0) {
      await tx.clientService.createMany({
        data: servicesFromProposal({
          services,
          clientId: contract.clientId,
          projectId: created.id,
          proposalId: contract.proposalId,
          currency: contract.proposal.currency,
          createdBy,
        }),
      });
    }

    return created;
  });
}

export async function findDeletedContractProject(
  contractId: string,
): Promise<{ label: string | null; deletedAt: Date | null } | null> {
  const created = await prisma.activityEvent.findMany({
    where: { action: "project.created", after: { path: ["contractId"], equals: contractId } },
    select: { entityId: true, entityLabel: true },
    orderBy: { createdAt: "desc" },
  });
  const deleted = await prisma.activityEvent.findFirst({
    where: {
      action: "project.deleted",
      OR: [
        { before: { path: ["contractId"], equals: contractId } },
        ...(created.length > 0 ? [{ entityId: { in: created.map((e) => e.entityId) } }] : []),
      ],
    },
    select: { entityLabel: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  if (deleted) return { label: deleted.entityLabel, deletedAt: deleted.createdAt };
  if (created[0]) return { label: created[0].entityLabel, deletedAt: null };
  return null;
}

export async function handleContractSigned(input: HandleContractSignedInput) {
  const contract = await prisma.contract.findUnique({
    where: { id: input.contractId },
    include: { client: true, proposal: true },
  });
  if (!contract) {
    throw new Error("Contract not found");
  }

  let updatedContract = contract;
  if (contract.status !== "SIGNED") {
    updatedContract = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: "SIGNED",
        signedAt: new Date(),
        signedByName: input.signedByName,
        signedIp: input.signedIp,
        signatureMethod: input.signatureMethod,
        ...(input.verification
          ? {
              signerVerifiedVia: input.verification.via,
              signerVerifiedTo: input.verification.to,
            }
          : {}),
      },
      include: { client: true, proposal: true },
    });
  }

  let project = await prisma.project.findUnique({
    where: { contractId: contract.id },
  });

  const isNewProject = project == null;

  if (!project) {
    project = await openContractProject(contract, input.signedByName);
  }

  const signer = input.recordedBy?.actor ?? clientActor(input.signedByName);

  if (contract.status !== "SIGNED") {
    await recordActivity({
      action: "contract.signed",
      actor: signer,
      entityType: "contract",
      entityId: contract.id,
      entityLabel: contract.client.company || contract.client.name || "Client",
      summary: input.recordedBy?.summary ?? `${input.signedByName} signed the contract`,
      before: { status: contract.status },
      after: { status: "SIGNED" },
      metadata: {
        signatureMethod: input.signatureMethod,
        signedByName: input.signedByName,
        clientId: contract.clientId,
        ...(input.recordedBy?.metadata ?? {}),
        ...(input.verification
          ? { verifiedVia: input.verification.via, verifiedTo: input.verification.hint }
          : {}),
      },
    });
  }

  if (isNewProject) {
    await recordActivity({
      action: "project.created",
      actor: signer,
      entityType: "project",
      entityId: project.id,
      entityLabel: project.name,
      summary: `Signing opened ${project.name} with its payment schedule`,
      after: { phase: "DISCOVERY", contractId: contract.id },
      metadata: { clientId: contract.clientId, automatic: true },
    });
  }

  if (!contract.onboardingMessageSentAt) {
    const portalUrl = `${input.baseUrl.replace(/\/$/, "")}/portal/${project.portalToken}`;
    const firstName = (contract.client.name ?? "there").split(" ")[0];

    try {
      await sendTemplateMessage({
        clientId: contract.clientId,
        phone: contract.client.phone,
        templateName: "onboarding_welcome",
        bodyParams: [firstName, portalUrl],
        relatedContractId: contract.id,
      });

      await prisma.contract.update({
        where: { id: contract.id },
        data: { onboardingMessageSentAt: new Date() },
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to send onboarding message:", error);
      }
    }
  }

  return { contract: updatedContract, project };
}
