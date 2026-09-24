import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { linkClientToLead, prisma } from "@repo/database";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { isTrustedOrigin } from "@/lib/utils/origin-check";
import { tooManyRequests } from "@/lib/server/too-many-requests";

/**
 * Both fields come from a modal on a public page, so both are bounded here.
 * `source` used to be any string of any length and was interpolated straight
 * into the CRM row's message; it is a fixed set of places this modal appears.
 */
const exitIntentSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[+\d][\d\s()-]*$/, "phone must be a phone number"),
  source: z.enum(["exit_intent_modal", "audit_lead_capture"]).default("exit_intent_modal"),
});

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json(
        { success: false, message: "Invalid request origin" },
        { status: 403 },
      );
    }

    const rl = await enforceRateLimit(request, {
      scope: "public_api",
      route: "exit_intent",
      limit: 5,
      windowSeconds: 60 * 60,
    });
    if (!rl.ok) {
      return tooManyRequests(request, rl.retryAfterSeconds);
    }

    const body = await request.json();
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

    // The same unification every other inbound channel does. Without it this
    // capture never reaches the pipeline the operator actually works from.
    await linkClientToLead({
      phone,
      source: "WEBSITE_CONTACT_FORM",
      contactSubmissionId: submission.id,
    });

    return NextResponse.json(
      { success: true, message: "Contact captured" },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Exit intent error:", error);
    }
    return NextResponse.json(
      { success: false, message: "Failed to capture email" },
      { status: 500 },
    );
  }
}
