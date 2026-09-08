import { prisma, type SignatureMethod } from "@repo/database";
import { clientActor, recordActivity } from "./activity-log";
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

  const isNewProject = project == null;

  if (!project) {
    const split = contract.proposal.paymentSplit as unknown as {
      first: number;
      second: number;
      final: number;
    };
    const signingDate = new Date();

    // One transaction, deliberately.
    //
    // These used to be two awaited calls. If `createMany` threw after `create`
    // committed, the Project existed with zero Payments — and because the
    // idempotency guard above finds that Project on every later call, the
    // payment block was never re-entered. The result was a signed client
    // contract that could never be invoiced, invisible until someone noticed.
    project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          contractId: contract.id,
          clientId: contract.clientId,
          name: `${contract.client.company || contract.client.name || "Client"} — ${contract.proposal.projectType}`,
          phase: "DISCOVERY",
        },
      });

      await tx.payment.createMany({
        data: [
          {
            projectId: created.id,
            milestone: "DEPOSIT_50",
            amount: Math.round((contract.proposal.totalPrice * split.first) / 100),
            dueDate: signingDate,
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

      return created;
    });
  }

  // The actor is the client, not an operator: nobody at Altruvex is signed in
  // when this runs. Recording it as SYSTEM would lose who actually signed.
  const signer = clientActor(input.signedByName);

  if (contract.status !== "SIGNED") {
    await recordActivity({
      action: "contract.signed",
      actor: signer,
      entityType: "contract",
      entityId: contract.id,
      entityLabel: contract.client.company || contract.client.name || "Client",
      summary: `${input.signedByName} signed the contract`,
      before: { status: contract.status },
      after: { status: "SIGNED" },
      metadata: { signatureMethod: input.signatureMethod, clientId: contract.clientId },
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
