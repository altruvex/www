import type { NextRequest } from "next/server";

/**
 * The subject and body an operator edited before sending, if they edited any.
 *
 * Both optional and both bounded. A send with no JSON body is the untouched
 * default — the WhatsApp path posts nothing at all, and must keep working
 * exactly as it did.
 */
export interface OptionalDraft {
  subject?: string;
  body?: string;
}

const MAX_SUBJECT = 200;
const MAX_BODY = 20_000;

export async function readOptionalDraft(request: NextRequest): Promise<OptionalDraft> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    // No body, or not JSON. Both mean "send the default", which is what every
    // caller did before this existed.
    return {};
  }
  if (!raw || typeof raw !== "object") return {};

  const { subject, body } = raw as Record<string, unknown>;
  return {
    subject: typeof subject === "string" ? subject.slice(0, MAX_SUBJECT) : undefined,
    // Truncated rather than refused: an operator who pasted something enormous
    // wants it sent, and a hard failure at this point loses whatever they wrote.
    body: typeof body === "string" ? body.slice(0, MAX_BODY) : undefined,
  };
}
