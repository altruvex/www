import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/database";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { isTrustedOrigin } from "@/lib/utils/origin-check";

const exitIntentSchema = z.object({
  phone: z.string(),
  source: z.string().default("exit_intent_modal"),
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
      return NextResponse.json(
        {
          success: false,
          message: "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: { "Retry-After": rl.retryAfterSeconds.toString() },
        },
      );
    }

    const body = await request.json();
    const { phone, source } = exitIntentSchema.parse(body);

    await prisma.contactSubmission.create({
      data: {
        name: "Exit Intent Lead",
        phone,
        message: `Captured via ${source}`,
        priority: "HIGH",
        locale: "en",
      },
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
