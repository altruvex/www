import type { NextRequest } from "next/server";

export interface OptionalDraft {
  subject?: string;
  body?: string;
}

const MAX_SUBJECT = 200;
const MAX_BODY_CHARS = 20_000;

export async function readOptionalDraft(request: NextRequest): Promise<OptionalDraft> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object") return {};

  const { subject, body } = raw as Record<string, unknown>;
  return {
    subject: typeof subject === "string" ? subject.slice(0, MAX_SUBJECT) : undefined,
    body: typeof body === "string" ? body.slice(0, MAX_BODY_CHARS) : undefined,
  };
}
