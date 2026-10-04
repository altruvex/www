"use server";

import { revalidatePath } from "next/cache";
import { prisma, type Prisma } from "@repo/database";

import { authorize } from "@/lib/authorize";
import { recordChange, userActor } from "@/lib/activity-log";
import { date } from "@/lib/format";
import { proposalContentSchema, validUntilDate } from "@/lib/proposal-schema";
import { canExtendValidity, VALIDITY_EXTENSIONS } from "../proposals/reissue";

export type ProposalActionResult = { ok: boolean; message: string };

const DAY_MS = 86_400_000;

export async function extendProposalValidity(
  proposalId: string,
  days: number,
): Promise<ProposalActionResult> {
  let session;
  try {
    session = await authorize("edit", "proposal");
  } catch {
    return { ok: false, message: "Your role cannot edit proposals." };
  }

  if (!(VALIDITY_EXTENSIONS as readonly number[]).includes(days)) {
    return { ok: false, message: "Pick 7, 14 or 30 days." };
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      client: { select: { name: true, company: true } },
      contract: { select: { id: true } },
    },
  });
  if (!proposal) return { ok: false, message: "This proposal no longer exists." };

  if (!canExtendValidity(proposal.status, proposal.validUntil, proposal.contract != null)) {
    return {
      ok: false,
      message: proposal.contract
        ? "This proposal already has a contract, so its validity no longer applies."
        : "Only a proposal that is out with the client and has expired, or expires within a week, can be extended. Otherwise issue a new version.",
    };
  }

  const now = Date.now();
  const target = new Date(Math.max(now, proposal.validUntil.getTime()) + days * DAY_MS);

  let validUntil = target;
  let content: Prisma.InputJsonValue | undefined;
  const parsed = proposalContentSchema.safeParse(proposal.content);
  if (parsed.success) {
    const start = validUntilDate({ proposalDate: parsed.data.meta.proposalDate, validityDays: 0 });
    if (!Number.isNaN(start.getTime())) {
      const validityDays = Math.ceil((target.getTime() - start.getTime()) / DAY_MS);
      if (validityDays > 365) {
        return {
          ok: false,
          message:
            "That would hold this price for more than a year from the proposal date. Issue a new version instead.",
        };
      }
      validUntil = validUntilDate({ proposalDate: parsed.data.meta.proposalDate, validityDays });
      const raw = proposal.content as Record<string, unknown>;
      content = {
        ...raw,
        meta: { ...(raw.meta as Record<string, unknown>), validityDays },
      } as Prisma.InputJsonValue;
    }
  }

  const { count } = await prisma.proposal.updateMany({
    where: {
      id: proposal.id,
      validUntil: proposal.validUntil,
      status: proposal.status,
      contract: { is: null },
    },
    data: { validUntil, ...(content !== undefined ? { content } : {}) },
  });
  if (count === 0) {
    return {
      ok: false,
      message: "This proposal changed while the dialog was open. Reload it and try again.",
    };
  }

  const clientName = proposal.client.company || proposal.client.name || "Unnamed client";
  await recordChange({
    action: "proposal.validity_extended",
    actor: userActor(session),
    entityType: "proposal",
    entityId: proposal.id,
    entityLabel: `${proposal.projectType} · ${clientName}`,
    summary: `Extended validity to ${date(validUntil)} (+${days} days)`,
    before: { validUntil: proposal.validUntil.toISOString() },
    after: { validUntil: validUntil.toISOString() },
    metadata: { clientId: proposal.clientId, days, documentRegenerated: false },
  });

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${proposal.id}`);
  revalidatePath(`/clients/${proposal.clientId}`);

  return {
    ok: true,
    message: `Valid until ${date(validUntil)}. The PDF the client has still prints the old date — tell them.`,
  };
}
