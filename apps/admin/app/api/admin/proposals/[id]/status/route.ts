import { z } from "zod";
import { prisma } from "@repo/database";
import { recordChange } from "@/lib/activity-log";
import { badRequest, conflict, notFound, ok, readJson, withAdmin } from "@/lib/with-admin";
import { channelPhrase, manualMetadata, manualRecordFields } from "@/lib/manual-record";

/**
 * Sets a proposal's status by hand — for everything that happened outside the
 * system: handed over in a meeting, sent from a personal inbox, accepted on a
 * call. See `lib/manual-record.ts` for what a manual record may and may not
 * claim.
 *
 * DELIVERED / READ / VIEWED are not settable here. They are transport
 * evidence (a WhatsApp receipt, a portal open), and an operator cannot know
 * them first-hand.
 */
const schema = z.object({
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]),
  ...manualRecordFields,
});

const ACTIONS = {
  DRAFT: "proposal.reverted_to_draft",
  SENT: "proposal.sent",
  ACCEPTED: "proposal.accepted",
  REJECTED: "proposal.rejected",
  EXPIRED: "proposal.expired",
} as const;

export const POST = withAdmin<{ id: string }>(async (request, { actor, params }) => {
  const input = await readJson(request, schema);

  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { name: true, company: true } },
      contract: { select: { id: true } },
    },
  });
  if (!proposal) throw notFound("Proposal not found.");

  if (proposal.status === input.status) {
    throw badRequest("The proposal already has that status.");
  }

  // A contract is generated from an accepted offer. Walking the proposal back
  // underneath it would leave a commitment referencing an offer nobody took.
  if (proposal.contract && input.status !== "ACCEPTED") {
    throw conflict(
      "This proposal already has a contract. Delete the contract first if the client withdrew.",
    );
  }

  const at = input.occurredAt ?? new Date();

  const data =
    input.status === "DRAFT"
      ? { status: input.status, sentAt: null, respondedAt: null }
      : input.status === "SENT"
        ? { status: input.status, sentAt: input.occurredAt ?? proposal.sentAt ?? at, respondedAt: null }
        : input.status === "ACCEPTED" || input.status === "REJECTED"
          ? { status: input.status, sentAt: proposal.sentAt ?? at, respondedAt: at }
          : { status: input.status };

  const updated = await prisma.proposal.update({ where: { id: proposal.id }, data });

  const who = proposal.client.name || proposal.client.company || "the client";
  const summary = {
    DRAFT: "Moved back to draft by hand",
    SENT: `Recorded as sent to ${who} outside the system${channelPhrase(input.channel)}`,
    ACCEPTED: `Recorded as accepted by ${who}${channelPhrase(input.channel)}`,
    REJECTED: `Recorded as rejected by ${who}${channelPhrase(input.channel)}`,
    EXPIRED: "Marked expired by hand",
  }[input.status];

  await recordChange({
    action: ACTIONS[input.status],
    actor,
    entityType: "proposal",
    entityId: proposal.id,
    entityLabel: proposal.client.name || proposal.client.company,
    summary,
    before: { status: proposal.status },
    after: { status: updated.status },
    metadata: { ...manualMetadata(input), clientId: proposal.clientId },
  });

  return ok({ proposal: updated });
});
