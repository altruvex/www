import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { linkClientToLead, prisma } from "@repo/database";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { isTrustedOrigin } from "@/lib/utils/origin-check";
import {
  apiError,
  readJsonBody,
  tooManyRequests,
  unexpectedError,
} from "@/lib/server/api-error";

const exitIntentSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7, "contact.phone-min")
    .max(20, "contact.phone-max")
    .regex(/^[+\d][\d\s()-]*$/, "contact.phone-regex"),
  // Article audit forms send `article_audit_cta:<slug>`; the old enum refused
  // those, so every article audit request failed.
  source: z
    .string()
    .max(160)
    .regex(/^(exit_intent_modal|audit_lead_capture|article_audit_cta(:[a-z0-9-]+)?)$/)
    .default("exit_intent_modal"),
});

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return apiError("forbidden");
    }

    const rl = await enforceRateLimit(request, {
      scope: "public_api",
      route: "exit_intent",
      limit: 5,
      windowSeconds: 60 * 60,
    });
    if (!rl.ok) {
      return tooManyRequests(rl.retryAfterSeconds);
    }

    const body = await readJsonBody(request);
    if (!body) return apiError("bad_request");
    const { phone, source } = exitIntentSchema.parse(body);

    const submission = await prisma.contactSubmission.create({
      data: {
        name: "Exit Intent Lead",
        phone,
        message: `Captured via ${source}`,
        priority: "HIGH",
        locale: "en",
      },
      select: { id: true },
    });

    await linkClientToLead({
      phone,
      source: "WEBSITE_CONTACT_FORM",
      contactSubmissionId: submission.id,
    });

    return NextResponse.json(
      { ok: true, code: "captured" },
      { status: 201 },
    );
  } catch (error: unknown) {
    // A bad number is a 400 with a field code; only a real failure is a 500,
    // and neither carries text — the modal localizes the code.
    return unexpectedError(error, "Exit intent error");
  }
}
