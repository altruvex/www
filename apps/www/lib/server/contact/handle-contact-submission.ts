import { isTrustedOrigin } from "@/lib/utils/origin-check";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { createContactFormSchema } from "@/lib/validations/contact";
import {
  BudgetRange,
  linkClientToLead,
  prisma,
  ProjectTimeline,
  ServiceType,
  type Prisma,
} from "@repo/database";
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
import { createStepToken } from "@/lib/server/contact/step-token";
import { situationFromBody } from "@/lib/server/intent";

// Plain-English labels for the admin notification (admin is English-only).
const SERVICE_INTEREST_LABEL: Record<string, string> = {
  "web-development": "web development",
  ecommerce: "e-commerce",
  multilingual: "multilingual site",
  "ui-ux": "interface design",
  "technical-audit": "technical audit",
  maintenance: "maintenance",
  other: "other service",
};

/** "Contact form · web development · timeline soon · via google": ids the form sent, no contact details. */
function contactNotificationDetails(input: {
  serviceInterest?: string;
  projectTimeline?: string;
  utmSource?: string;
}) {
  return [
    "Contact form",
    input.serviceInterest && SERVICE_INTEREST_LABEL[input.serviceInterest],
    input.projectTimeline && `timeline ${input.projectTimeline}`,
    input.utmSource && `via ${input.utmSource}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

const SERVICE_TYPE_MAP: Record<
  NonNullable<Prisma.ContactSubmissionCreateInput["serviceInterest"]>,
  ServiceType
> = {
  WEB_DEVELOPMENT: ServiceType.WEB_DEVELOPMENT,
  ECOMMERCE: ServiceType.ECOMMERCE,
  MULTILINGUAL: ServiceType.MULTILINGUAL,
  UI_UX: ServiceType.UI_UX,
  TECHNICAL_AUDIT: ServiceType.TECHNICAL_AUDIT,
  MAINTENANCE: ServiceType.MAINTENANCE,
  OTHER: ServiceType.OTHER,
};

const PROJECT_TIMELINE_MAP: Record<
  NonNullable<Prisma.ContactSubmissionCreateInput["projectTimeline"]>,
  ProjectTimeline
> = {
  IMMEDIATE: ProjectTimeline.IMMEDIATE,
  SOON: ProjectTimeline.SOON,
  PLANNING: ProjectTimeline.PLANNING,
  EXPLORING: ProjectTimeline.EXPLORING,
};

const BUDGET_RANGE_MAP: Record<
  NonNullable<Prisma.ContactSubmissionCreateInput["budget"]>,
  BudgetRange
> = {
  UNDER_10K: BudgetRange.UNDER_10K,
  B_10K_25K: BudgetRange.B_10K_25K,
  B_25K_50K: BudgetRange.B_25K_50K,
  OVER_50K: BudgetRange.OVER_50K,
  FLOOR_TO_2X: BudgetRange.FLOOR_TO_2X,
  X2_TO_5X: BudgetRange.X2_TO_5X,
  X5_TO_10X: BudgetRange.X5_TO_10X,
  OVER_10X: BudgetRange.OVER_10X,
  UNSURE: BudgetRange.UNSURE,
};

export async function handleContactSubmission(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return apiError("forbidden");
    }

    const rl = await enforceRateLimit(request, {
      scope: "public_api",
      route: "contact",
      limit: 3,
      windowSeconds: 10 * 60,
    });
    if (!rl.ok) {
      return tooManyRequests(rl.retryAfterSeconds);
    }

    const body = await readJsonBody(request);
    if (!body) return apiError("bad_request");

    const locale = toLocale(body.locale);
    // Issue messages are validation keys; the form localizes them.
    const contactFormSchema = createContactFormSchema(codeTranslator);
    const validatedData = contactFormSchema.parse(body);

    if (validatedData.website && validatedData.website.length > 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Honeypot triggered on contact form", {
          ip:
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
            "unknown",
          userAgent: request.headers.get("user-agent") ?? undefined,
        });
      }
      // Same shape as a real success, so a bot learns nothing.
      return NextResponse.json({ ok: true, code: "received" }, { status: 200 });
    }

    const userAgent = request.headers.get("user-agent") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : undefined;
    const referer = externalReferer(request);
    const attribution = parseAttribution(body);

    const serviceInterestKey = validatedData.serviceInterest
      ?.toUpperCase()
      .replace(/-/g, "_") as keyof typeof SERVICE_TYPE_MAP | undefined;
    const projectTimelineKey = validatedData.projectTimeline?.toUpperCase() as
      | keyof typeof PROJECT_TIMELINE_MAP
      | undefined;
    const budgetKey = validatedData.budget?.toUpperCase() as
      | keyof typeof BUDGET_RANGE_MAP
      | undefined;

    const submissionData: Prisma.ContactSubmissionCreateInput = {
      name: validatedData.name,
      phone: validatedData.phone,
      email: validatedData.email,
      message: validatedData.message,
      serviceInterest: serviceInterestKey
        ? SERVICE_TYPE_MAP[serviceInterestKey]
        : undefined,
      projectTimeline: projectTimelineKey
        ? PROJECT_TIMELINE_MAP[projectTimelineKey]
        : undefined,
      budget: budgetKey ? BUDGET_RANGE_MAP[budgetKey] : undefined,
      locale,
      userAgent,
      ipAddress,
      referrer: attribution.referrer ?? referer,
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      utmCampaign: attribution.utmCampaign,
      landingPath: attribution.landingPath,
      // The visitor's stated intent; the optional qualify step overwrites it
      // later when answered, so the qualify answer wins.
      situation: situationFromBody(body),
      priority:
        validatedData.projectTimeline === "immediate"
          ? "URGENT"
          : validatedData.projectTimeline === "soon"
            ? "HIGH"
            : "MEDIUM",
    };

    const { raw: stepToken, ...stepTokenFields } = createStepToken();
    const submission = await prisma.contactSubmission.create({
      data: { ...submissionData, ...stepTokenFields },
    });

    const client = await linkClientToLead({
      phone: validatedData.phone,
      name: validatedData.name,
      email: validatedData.email,
      source: "WEBSITE_CONTACT_FORM",
      contactSubmissionId: submission.id,
    });

    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin: { id: string }) =>
        prisma.notification
          .findFirst({
            where: {
              userId: admin.id,
              type: "NEW_CONTACT",
              entityType: "contact",
              entityId: submission.id,
            },
            select: { id: true },
          })
          .then((existing) => {
            if (existing) return null;
            return prisma.notification.create({
              data: {
                type: "NEW_CONTACT",
                title: "New Contact Submission",
                message: `${validatedData.name} submitted a contact form (${validatedData.email}). ${contactNotificationDetails(
                  {
                    serviceInterest: validatedData.serviceInterest,
                    projectTimeline: validatedData.projectTimeline,
                    utmSource: attribution.utmSource,
                  },
                )}`,
                userId: admin.id,
                entityType: "contact",
                entityId: submission.id,
              },
            });
          }),
      ),
    );

    if (
      validatedData.requestMeeting &&
      validatedData.preferredDate &&
      validatedData.preferredTime
    ) {
      const dateParts = validatedData.preferredDate.split("-");
      const scheduledDate = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        12,
        0,
        0,
      );

      const meeting = await prisma.meeting.create({
        data: {
          title: `Discovery Call - ${validatedData.name}`,
          type: "DISCOVERY",
          scheduledDate,
          scheduledTime: validatedData.preferredTime,
          guestName: validatedData.name,
          submissionId: submission.id,
          clientId: client?.id,
          notes: validatedData.message,
        },
      });

      await Promise.all(
        admins.map((admin: { id: string }) =>
          prisma.notification
            .findFirst({
              where: {
                userId: admin.id,
                type: "NEW_MEETING",
                entityType: "meeting",
                entityId: meeting.id,
              },
              select: { id: true },
            })
            .then((existing) => {
              if (existing) return null;
              return prisma.notification.create({
                data: {
                  type: "NEW_MEETING",
                  title: "New Meeting Request",
                  message: `${validatedData.name} requested a meeting`,
                  userId: admin.id,
                  entityType: "meeting",
                  entityId: meeting.id,
                },
              });
            }),
        ),
      );
    }

    return NextResponse.json(
      // The visitor-facing confirmation is the localized receipt on the form.
      // stepToken unlocks the optional qualify step (POST /api/contact/qualify).
      { ok: true, code: "received", submissionId: submission.id, stepToken },
      { status: 201 },
    );
  } catch (error: unknown) {
    return unexpectedError(error, "Contact submission error");
  }
}
