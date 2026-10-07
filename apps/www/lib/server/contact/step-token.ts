import { createHash, randomBytes } from "node:crypto";
import { prisma, type Prisma } from "@repo/database";
import { NextResponse } from "next/server";

// One follow-up token per lead (qualify step, pre-call brief). The raw value
// goes back once in the JSON response, never in a URL; only its sha256 hex is
// stored. It is spent by the first successful step, in the same transaction
// as that step's write, so it cannot be replayed; unused, it expires.

const STEP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const hashStepToken = (raw: string) =>
  createHash("sha256").update(raw).digest("hex");

/** A fresh token: `raw` for the response, the rest for the submission row. */
export function createStepToken() {
  const raw = randomBytes(32).toString("base64url");
  return {
    raw,
    stepTokenHash: hashStepToken(raw),
    stepTokenExpiresAt: new Date(Date.now() + STEP_TOKEN_TTL_MS),
  };
}

/** Thrown inside the transaction to undo the token spend when the step cannot write. */
class StepRefused extends Error {}

/**
 * Spends a live token and runs the step's write in one transaction: the write
 * sees the submission id, and if it returns false (or throws) the token is
 * left unspent. Returns false for an unknown, expired or already-spent token.
 * The conditional clear takes the row lock, so two concurrent uses of one
 * token cannot both succeed.
 */
export async function consumeStepToken(
  raw: string,
  write: (
    tx: Prisma.TransactionClient,
    submissionId: string,
  ) => Promise<boolean>,
): Promise<boolean> {
  const stepTokenHash = hashStepToken(raw);
  try {
    return await prisma.$transaction(async (tx) => {
      const submission = await tx.contactSubmission.findUnique({
        where: { stepTokenHash },
        select: { id: true },
      });
      if (!submission) return false;
      const { count } = await tx.contactSubmission.updateMany({
        where: {
          id: submission.id,
          stepTokenHash,
          stepTokenExpiresAt: { gt: new Date() },
        },
        data: { stepTokenHash: null, stepTokenExpiresAt: null },
      });
      if (count !== 1) return false;
      if (!(await write(tx, submission.id))) throw new StepRefused();
      return true;
    });
  } catch (error) {
    if (error instanceof StepRefused) return false;
    throw error;
  }
}

/** The one refusal for an unknown, expired or malformed token. */
export const invalidStepToken = () =>
  NextResponse.json({ ok: false, code: "invalid_token" }, { status: 404 });
