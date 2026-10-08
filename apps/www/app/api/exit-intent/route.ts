import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ClientSource, linkClientToLead, prisma } from "@repo/database";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { isTrustedOrigin } from "@/lib/utils/origin-check";
import {
  apiError,
  readJsonBody,
  tooManyRequests,
  unexpectedError,
} from "@/lib/server/api-error";
import { toLocale } from "@/i18n/locale-meta";
import { externalReferer, parseAttribution } from "@/lib/validations/attribution";

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
    const locale = toLocale(body.locale);
    const attribution = parseAttribution(body);

    const submission = await prisma.contactSubmission.create({
      data: {
        // The submission row requires a name and this form asks for none; the
        // placeholder stays here and is never passed on to the Client.
        name: "Exit Intent Lead",
        phone,
        message: `Captured via ${source}`,
        priority: "HIGH",
        locale,
        referrer: attribution.referrer ?? externalReferer(request),
        utmSource: attribution.utmSource,
        utmMedium: attribution.utmMedium,
        utmCampaign: attribution.utmCampaign,
        landingPath: attribution.landingPath,
      },
      select: { id: true },
    });

    await linkClientToLead({
      phone,
      source: ClientSource.EXIT_INTENT,
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
