import { calculateEstimate } from "@repo/pricing-schema";
import { getPublicPricing } from "@/lib/server/pricing";
import { isTrustedOrigin } from "@/lib/utils/origin-check";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { createTransparencyLeadSchema } from "@/lib/validations/transparency-lead";
import { linkClientToLead, prisma } from "@repo/database";
import { randomBytes } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { tooManyRequests } from "@/lib/server/too-many-requests";

const REFERENCE_ALPHABET = "ACDEFGHJKMNPQRTVWXY2346789";

function newReference() {
  const bytes = randomBytes(6);
  let out = "";
  for (const byte of bytes) {
    out += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  }
  return `AX-${out}`;
}

function readAttribution(request: NextRequest) {
  const referer = request.headers.get("referer");
  if (!referer) return {};

  try {
    const url = new URL(referer);
    return {
      referrer: referer.slice(0, 500),
      utmSource: url.searchParams.get("utm_source")?.slice(0, 120) ?? null,
      utmMedium: url.searchParams.get("utm_medium")?.slice(0, 120) ?? null,
      utmCampaign: url.searchParams.get("utm_campaign")?.slice(0, 120) ?? null,
    };
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json(
        { success: false, message: "Invalid request origin" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const locale =
      typeof body.locale === "string" &&
      (body.locale === "ar" || body.locale === "en")
        ? body.locale
        : "en";
    const t = await getTranslations({ locale, namespace: "validations" });
    const transparencyLeadSchema = createTransparencyLeadSchema(t);

    const rl = await enforceRateLimit(request, {
      scope: "public_api",
      route: "transparency_lead",
      limit: 5,
      windowSeconds: 60 * 60,
    });
    if (!rl.ok) {
      return tooManyRequests(request, rl.retryAfterSeconds, locale);
    }

    const validatedData = transparencyLeadSchema.parse(body);
    const attribution = readAttribution(request);

    const pricing = await getPublicPricing();
    const estimate = calculateEstimate(
      {
        serviceId: validatedData.projectType,
        complexityId: validatedData.complexity,
        timeline: validatedData.timeline,
        brandIdentity: validatedData.brandIdentity,
        contentReadiness: validatedData.contentReadiness,
      },
      pricing,
    );

    let lead: { id: string; reference: string } | null = null;
    for (let attempt = 0; attempt < 3 && !lead; attempt++) {
      try {
        lead = await prisma.transparencyLead.create({
          data: {
            reference: newReference(),
            phone: validatedData.phone,
            name: validatedData.name,
            email: validatedData.email,
            company: validatedData.company,
            projectType: validatedData.projectType,
            complexity: validatedData.complexity,
            timeline: validatedData.timeline,
            brandIdentity: validatedData.brandIdentity,
            contentReadiness: validatedData.contentReadiness,
            scopeNotes: validatedData.scopeNotes,
            note: validatedData.note,
            priceMin: estimate.minPrice,
            priceMax: estimate.maxPrice,
            weeksMin: estimate.minWeeks,
            weeksMax: estimate.maxWeeks,
            locale,
            ...attribution,
          },
          select: { id: true, reference: true },
        });
      } catch (error: unknown) {
        const code = (error as { code?: string } | null)?.code;
        if (code !== "P2002" || attempt === 2) throw error;
      }
    }

    if (!lead) throw new Error("Could not allocate an estimate reference");

    await linkClientToLead({
      phone: validatedData.phone,
      name: validatedData.name,
      source: "TRANSPARENCY_ESTIMATOR",
      transparencyLeadId: lead.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Estimate generated",
        reference: lead.reference,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: error.issues.reduce((acc: Record<string, string>, err) => {
            const path = err.path[0] as string;
            if (path) acc[path] = err.message;
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
