import { z } from "zod";
import { normalizePhone, prisma } from "@repo/database";
import { recordChange } from "@/lib/activity-log";
import { looksLikeAnAddress } from "@/lib/email";
import { badRequest, conflict, notFound, ok, readJson, withAdmin } from "@/lib/with-admin";

/**
 * Designates who may sign a contract through its link. Blank fields fall back
 * to the client record. Changing the signer voids any code already sent, so a
 * code delivered to the previous person cannot be used after the change.
 */
const schema = z.object({
  signerName: z.string().trim().max(200),
  signerPhone: z.string().trim().max(40),
  signerEmail: z.string().trim().max(320),
});

export const PATCH = withAdmin<{ id: string }>(async (request, { actor, params }) => {
  const input = await readJson(request, schema);

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { client: { select: { name: true, company: true } } },
  });
  if (!contract) throw notFound("Contract not found.");
  if (contract.status === "SIGNED") {
    throw conflict("This contract is signed. Who signed it is already on record.");
  }

  let phone: string | null = null;
  if (input.signerPhone) {
    phone = normalizePhone(input.signerPhone);
    if (!phone) throw badRequest("Enter a valid phone number, with the country code.");
  }
  if (input.signerEmail && !looksLikeAnAddress(input.signerEmail)) {
    throw badRequest("Enter a valid email address.");
  }

  const next = {
    signerName: input.signerName || null,
    signerPhone: phone,
    signerEmail: input.signerEmail || null,
  };

  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: {
      ...next,
      signCodeHash: null,
      signCodeExpiresAt: null,
      signCodeAttempts: 0,
    },
  });

  await recordChange({
    action: "contract.signer_updated",
    actor,
    entityType: "contract",
    entityId: contract.id,
    entityLabel: contract.client.company || contract.client.name,
    summary: `Set the authorised signer${next.signerName ? ` to ${next.signerName}` : ""}`,
    before: {
      signerName: contract.signerName,
      signerPhone: contract.signerPhone,
      signerEmail: contract.signerEmail,
    },
    after: next,
  });

  return ok({
    contract: {
      signerName: updated.signerName,
      signerPhone: updated.signerPhone,
      signerEmail: updated.signerEmail,
    },
  });
});
