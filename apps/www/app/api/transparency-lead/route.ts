import { calculateEstimate } from "@repo/pricing-schema";
import { getPublicPricing } from "@/lib/server/pricing";
import { isTrustedOrigin } from "@/lib/utils/origin-check";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { createTransparencyLeadSchema } from "@/lib/validations/transparency-lead";
import { linkClientToLead, prisma } from "@repo/database";
import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  apiError,
  codeTranslator,
  readJsonBody,
  tooManyRequests,
  unexpectedError,
} from "@/lib/server/api-error";
import { toLocale } from "@/i18n/locale-meta";

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
      return apiError("forbidden");
    }

    const body = await readJsonBody(request);
    if (!body) return apiError("bad_request");

    const locale = toLocale(body.locale);
    // Issue messages are validation keys; the form localizes them.
    const transparencyLeadSchema = createTransparencyLeadSchema(codeTranslator);

    const rl = await enforceRateLimit(request, {
      scope: "public_api",
      route: "transparency_lead",
      limit: 5,
      windowSeconds: 60 * 60,
    });
    if (!rl.ok) {
      return tooManyRequests(rl.retryAfterSeconds);
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
      { ok: true, code: "received", reference: lead.reference },
      { status: 201 },
    );
  } catch (error: unknown) {
    return unexpectedError(error, "Transparency lead error");
  }
}
