import { calculateEstimate, formatRange, formatWeeks } from "@repo/pricing-schema";
import { driverId, recommend } from "@/components/sections/transparency-estimator/recommend";
import { situationFromBody } from "@/lib/server/intent";
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
import { externalReferer, parseAttribution } from "@/lib/validations/attribution";

const REFERENCE_ALPHABET = "ACDEFGHJKMNPQRTVWXY2346789";

function newReference() {
  const bytes = randomBytes(6);
  let out = "";
  for (const byte of bytes) {
    out += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  }
  return `AX-${out}`;
}

// First-touch values from the body win; the Referer header fills what is empty.
function readAttribution(request: NextRequest, body: unknown) {
  const first = parseAttribution(body);
  const referer = request.headers.get("referer");
  let fromHeader: {
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  } = {};
  if (referer) {
    try {
      const url = new URL(referer);
      fromHeader = {
        referrer: externalReferer(request),
        utmSource: url.searchParams.get("utm_source")?.slice(0, 120) || undefined,
        utmMedium: url.searchParams.get("utm_medium")?.slice(0, 120) || undefined,
        utmCampaign: url.searchParams.get("utm_campaign")?.slice(0, 120) || undefined,
      };
    } catch {
      // An unparseable Referer adds nothing.
    }
  }
  return {
    referrer: first.referrer ?? fromHeader.referrer,
    utmSource: first.utmSource ?? fromHeader.utmSource,
    utmMedium: first.utmMedium ?? fromHeader.utmMedium,
    utmCampaign: first.utmCampaign ?? fromHeader.utmCampaign,
    landingPath: first.landingPath,
  };
}

// One in-app notification per admin, like a contact submission raises. There
// is no estimate notification type, so it reuses NEW_CONTACT; the entity type
// links it to the estimate lead. It carries no phone, email or name, and a
// failure here never fails the lead it describes (already stored).
async function notifyAdmins({ leadId, message }: { leadId: string; message: string }) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: admins.map((admin: { id: string }) => ({
        type: "NEW_CONTACT" as const,
        title: "New Estimate Lead",
        message,
        userId: admin.id,
        entityType: "transparency_lead",
        entityId: leadId,
      })),
    });
  } catch (error: unknown) {
    console.error("Estimate lead notification failed", error);
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
    const attribution = readAttribution(request, body);

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

    // The preliminary read, recomputed from the validated answers: what the
    // visitor was steered to and why, never taken from the client.
    const read = recommend(
      {
        projectType: validatedData.projectType,
        complexity: validatedData.complexity,
        brandIdentity: validatedData.brandIdentity ?? null,
        contentReadiness: validatedData.contentReadiness ?? null,
        timeline: validatedData.timeline,
      },
      validatedData.scopeNotes,
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
            situation: situationFromBody(body),
            nextStep: read?.nextStep ?? null,
            drivers: read ? read.drivers.map(driverId) : [],
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
      email: validatedData.email,
      source: "TRANSPARENCY_ESTIMATOR",
      transparencyLeadId: lead.id,
    });

    await notifyAdmins({
      leadId: lead.id,
      message: [
        `Estimate ${lead.reference}`,
        `${validatedData.projectType} · ${validatedData.complexity}`,
        formatRange({ min: estimate.minPrice, max: estimate.maxPrice }, "en"),
        `${formatWeeks(estimate.minWeeks, estimate.maxWeeks, "en")} weeks`,
        `timeline ${validatedData.timeline}`,
        read && `next step ${read.nextStep}`,
        attribution.utmSource && `via ${attribution.utmSource}`,
      ]
        .filter(Boolean)
        .join(" · "),
    });

    return NextResponse.json(
      { ok: true, code: "received", reference: lead.reference },
      { status: 201 },
    );
  } catch (error: unknown) {
    return unexpectedError(error, "Transparency lead error");
  }
}
