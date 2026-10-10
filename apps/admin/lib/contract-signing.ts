import {
  prisma,
  type Client,
  type Contract,
  type Proposal,
  type SignatureMethod,
  type SignVerificationChannel,
} from "@repo/database";
import { clientActor, recordActivity, type Actor } from "./activity-log";
import { markClientWon } from "./client-won";
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
    /** Who opened it, for the client's WON audit event; defaults to the signer as a client. */
    actor?: Actor;
  } = {},
) {
  const recreateBilling = options.recreateBilling !== false;
  const actor = options.actor ?? clientActor(createdBy);
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

    // A live project means the deal is won (docs/sales-os.md R1) — same transaction.
    await markClientWon(tx, contract.clientId, actor, {
      cause: "project_linked",
      projectId: created.id,
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

  const signer = input.recordedBy?.actor ?? clientActor(input.signedByName);

  let updatedContract = contract;
  if (contract.status !== "SIGNED") {
    // The signature and the client's move to WON are one write (docs/sales-os.md
    // R1): a signed contract on a LOST or NURTURE client is a contradiction, so
    // neither lands without the other.
    updatedContract = await prisma.$transaction(async (tx) => {
      const signed = await tx.contract.update({
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
      await markClientWon(tx, contract.clientId, signer, {
        cause: "contract_signed",
        contractId: contract.id,
      });
      return signed;
    });
  }

  let project = await prisma.project.findUnique({
    where: { contractId: contract.id },
  });

  const isNewProject = project == null;

  if (!project) {
    project = await openContractProject(contract, input.signedByName, { actor: signer });
  }

  // Signing ends the sales chase (docs/sales-os.md R4): the follow-up date and
  // note go, and any unread "follow up" alert for this client is marked read.
  // Best effort — a failure here must never undo or block the signature.
  let clearedFollowUp = false;
  if (contract.status !== "SIGNED") {
    try {
      if (contract.client.nextActionAt || contract.client.nextActionNote) {
        await prisma.client.update({
          where: { id: contract.clientId },
          data: { nextActionAt: null, nextActionNote: null },
        });
        clearedFollowUp = true;
      }
      await prisma.notification.updateMany({
        where: {
          type: "FOLLOW_UP_DUE",
          entityType: "client",
          entityId: contract.clientId,
          read: false,
        },
        data: { read: true, readAt: new Date() },
      });
    } catch (error) {
      console.error("[contract-signing] clearing the follow-up failed", error);
    }
  }

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
        ...(clearedFollowUp
          ? {
              clearedFollowUp: {
                nextActionAt: contract.client.nextActionAt?.toISOString() ?? null,
                nextActionNote: contract.client.nextActionNote,
              },
            }
          : {}),
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

  // A client reached by email only has no number to welcome on WhatsApp.
  if (!contract.onboardingMessageSentAt && contract.client.phone) {
    const phone = contract.client.phone;
    const portalUrl = `${input.baseUrl.replace(/\/$/, "")}/portal/${project.portalToken}`;
    const firstName = (contract.client.name ?? "there").split(" ")[0];

    try {
      await sendTemplateMessage({
        clientId: contract.clientId,
        phone,
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
