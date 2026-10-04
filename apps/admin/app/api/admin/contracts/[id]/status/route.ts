import { z } from "zod";
import { prisma } from "@repo/database";
import { recordChange } from "@/lib/activity-log";
import { handleContractSigned } from "@/lib/contract-signing";
import { publicBaseUrl } from "@/lib/public-url";
import { signLinkExpiry } from "@/lib/sign-window";
import { badRequest, conflict, notFound, ok, readJson, withAdmin } from "@/lib/with-admin";
import { channelPhrase, manualMetadata, manualRecordFields } from "@/lib/manual-record";

const schema = z
  .object({
    status: z.enum(["DRAFT", "SENT", "SIGNED", "DECLINED", "EXPIRED"]),
    signedByName: z.string().trim().max(200).optional(),
    ...manualRecordFields,
  })
  .refine((value) => value.status !== "SIGNED" || Boolean(value.signedByName), {
    message: "Enter the name of the person who signed.",
    path: ["signedByName"],
  });

const ACTIONS = {
  DRAFT: "contract.reverted_to_draft",
  SENT: "contract.sent",
  DECLINED: "contract.declined",
  EXPIRED: "contract.expired",
} as const;

export const POST = withAdmin<{ id: string }>(async (request, { actor, params }) => {
  const input = await readJson(request, schema);

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { client: { select: { name: true, company: true } } },
  });
  if (!contract) throw notFound("Contract not found.");

  if (contract.status === "SIGNED") {
    throw conflict(
      "This contract is signed. A signature is a record of something that happened and cannot be changed by hand.",
    );
  }
  if (contract.status === input.status) {
    throw badRequest("The contract already has that status.");
  }

  const label = contract.client.name || contract.client.company;
  const who = label || "the client";

  if (input.status === "SIGNED") {
    const { contract: updated } = await handleContractSigned({
      contractId: contract.id,
      signedByName: input.signedByName!,
      signedIp: null,
      signatureMethod: "UPLOADED_PDF",
      baseUrl: publicBaseUrl(request),
      recordedBy: {
        actor,
        summary: `Recorded ${input.signedByName}'s signature by hand${channelPhrase(input.channel)}`,
        metadata: manualMetadata(input),
      },
    });

    return ok({ contract: updated });
  }

  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: input.status,
      ...(input.status === "SENT" ? { signTokenExpiresAt: signLinkExpiry() } : {}),
    },
  });

  const summary = {
    DRAFT: "Moved back to draft by hand",
    SENT: `Recorded as sent to ${who} outside the system${channelPhrase(input.channel)}`,
    DECLINED: `Recorded as declined by ${who}${channelPhrase(input.channel)}`,
    EXPIRED: "Marked expired by hand",
  }[input.status];

  await recordChange({
    action: ACTIONS[input.status],
    actor,
    entityType: "contract",
    entityId: contract.id,
    entityLabel: label,
    summary,
    before: { status: contract.status },
    after: { status: updated.status },
    metadata: { ...manualMetadata(input), clientId: contract.clientId },
  });

  return ok({ contract: updated });
}, { can: ["edit", "contract"] });
