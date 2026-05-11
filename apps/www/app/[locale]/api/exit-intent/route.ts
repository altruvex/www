import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/database";
import { enforceRateLimit } from "@/lib/rate-limit";

const exitIntentSchema = z.object({
  phone: z.string(),
  source: z.string().default("exit_intent_modal"),
});

export async function POST(request: NextRequest) {
  try {
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
    console.error("Exit intent error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to capture email" },
      { status: 500 },
    );
  }
}
