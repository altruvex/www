import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@repo/database";
import { NextResponse } from "next/server";

// One follow-up token per lead (qualify step, pre-call brief). The raw value
// goes back once in the JSON response, never in a URL; only its sha256 hex is
// stored. It stays usable until it expires, so a visitor can correct once.

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

/** The submission id a live token belongs to, or null (unknown or expired). */
export async function submissionIdForStepToken(
  raw: string,
): Promise<string | null> {
  const submission = await prisma.contactSubmission.findUnique({
    where: { stepTokenHash: hashStepToken(raw) },
    select: { id: true, stepTokenExpiresAt: true },
  });
  if (
    !submission?.stepTokenExpiresAt ||
    submission.stepTokenExpiresAt.getTime() <= Date.now()
  ) {
    return null;
  }
  return submission.id;
}

/** The one refusal for an unknown, expired or malformed token. */
export const invalidStepToken = () =>
  NextResponse.json({ ok: false, code: "invalid_token" }, { status: 404 });
