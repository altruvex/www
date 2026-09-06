import { prisma, type SignatureMethod } from "@repo/database";
import { sendTemplateMessage } from "./whatsapp-api";

interface HandleContractSignedInput {
  contractId: string;
  signedByName: string;
  signedIp: string | null;
  signatureMethod: SignatureMethod;
  baseUrl: string;
}

/**
 * The trigger from §6: the instant a contract is signed, create the Project
 * + 50/30/20 Payment rows and fire the onboarding WhatsApp message — every
 * time, automatically, no exceptions. Safe to call more than once for the
 * same contract (double form-submits, retries): signing itself, the
 * project/payments, and the onboarding send are each only performed once.
 */
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
      },
      include: { client: true, proposal: true },
    });
  }

  let project = await prisma.project.findUnique({
    where: { contractId: contract.id },
  });

  if (!project) {
    const split = contract.proposal.paymentSplit as unknown as {
      first: number;
      second: number;
      final: number;
    };
    const signingDate = new Date();

    project = await prisma.project.create({
      data: {
        contractId: contract.id,
        clientId: contract.clientId,
        name: `${contract.client.company || contract.client.name || "Client"} — ${contract.proposal.projectType}`,
        phase: "DISCOVERY",
      },
    });

    await prisma.payment.createMany({
      data: [
        {
          projectId: project.id,
          milestone: "DEPOSIT_50",
          amount: Math.round((contract.proposal.totalPrice * split.first) / 100),
          dueDate: signingDate,
        },
        {
          projectId: project.id,
          milestone: "MILESTONE_30",
          amount: Math.round((contract.proposal.totalPrice * split.second) / 100),
        },
        {
          projectId: project.id,
          milestone: "FINAL_20",
          amount: Math.round((contract.proposal.totalPrice * split.final) / 100),
        },
      ],
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
      // Don't let a WhatsApp failure undo the signing or project creation —
      // both already happened. A null onboardingMessageSentAt is the visible
      // signal this still needs a nudge (and the next call here will retry).
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to send onboarding message:", error);
      }
    }
  }

  return { contract: updatedContract, project };
}
