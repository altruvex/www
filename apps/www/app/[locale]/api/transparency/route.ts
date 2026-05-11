import { prisma } from "@repo/database";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";

const transparencyLeadSchema = z.object({
  phone: z.string().regex(/^\+?\d{8,15}$/, "Invalid phone number"),
  name: z.string().max(120).optional(),
  projectType: z.enum(["ecommerce", "corporate", "custom", "performance"]),
  complexity: z.enum(["small", "medium", "large", "enterprise"]),
  timeline: z.enum(["urgent", "soon", "flexible"]),
  priceMin: z.number().positive(),
  priceMax: z.number().positive(),
  weeksMin: z.number().positive(),
  weeksMax: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const rl = await enforceRateLimit(request, {
      scope: "public_api",
      route: "transparency",
      limit: 10,
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
    const data = transparencyLeadSchema.parse(body);

    await prisma.transparencyLead.create({
      data: {
        phone: data.phone,
        name: data.name,
        projectType: data.projectType,
        complexity: data.complexity,
        timeline: data.timeline,
        priceMin: data.priceMin,
        priceMax: data.priceMax,
        weeksMin: data.weeksMin,
        weeksMax: data.weeksMax,
      },
    });

    return NextResponse.json(
      { success: true, message: "Lead captured" },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: error.issues.reduce((acc: Record<string, string>, e) => {
            const k = e.path[0] as string;
            if (k) acc[k] = e.message;
            return acc;
          }, {}),
        },
        { status: 400 },
      );
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Transparency lead error:", error);
    }
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
