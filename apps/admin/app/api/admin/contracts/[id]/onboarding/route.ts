import { z } from "zod";
import { prisma } from "@repo/database";
import { recordActivity } from "@/lib/activity-log";
import { badRequest, notFound, ok, readJson, withAdmin } from "@/lib/with-admin";
import { channelPhrase, manualMetadata, manualRecordFields } from "@/lib/manual-record";

/**
 * Records that the client was told what happens next, when that happened
 * outside the automated WhatsApp onboarding message — a call, a personal
 * message, the kickoff meeting. Without it the contract page warns forever on
 * an instance where WhatsApp is not configured.
 */
const schema = z.object(manualRecordFields);

export const POST = withAdmin<{ id: string }>(async (request, { actor, params }) => {
  const input = await readJson(request, schema);

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { client: { select: { name: true, company: true } } },
  });
  if (!contract) throw notFound("Contract not found.");
  if (contract.status !== "SIGNED") {
    throw badRequest("Onboarding follows a signature. This contract is not signed.");
  }
  if (contract.onboardingMessageSentAt) {
    throw badRequest("Onboarding is already recorded for this contract.");
  }

  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: { onboardingMessageSentAt: input.occurredAt ?? new Date() },
  });

  await recordActivity({
    action: "contract.onboarding_recorded",
    actor,
    entityType: "contract",
    entityId: contract.id,
    entityLabel: contract.client.name || contract.client.company,
    summary: `Recorded the onboarding conversation by hand${channelPhrase(input.channel)}`,
    metadata: { ...manualMetadata(input), clientId: contract.clientId },
  });

  return ok({ contract: updated });
});
