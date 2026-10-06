import { isTrustedOrigin } from "@/lib/utils/origin-check";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import {
  createMeetingRequestSchema,
  createStandaloneMeetingSchema,
} from "@/lib/validations/contact";
import { isBusinessSlot } from "@/lib/config/business-hours";
import { prisma } from "@repo/database";
import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  codeTranslator,
  readJsonBody,
  tooManyRequests,
  unexpectedError,
} from "@/lib/server/api-error";
import { toLocale } from "@/i18n/locale-meta";

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return apiError("forbidden");
    }

    const rl = await enforceRateLimit(request, {
      scope: "public_api",
      route: "schedule",
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
    const standaloneMeetingSchema = createStandaloneMeetingSchema(codeTranslator);
    const meetingRequestSchema = createMeetingRequestSchema(codeTranslator);

    if (body.name && body.phone && body.scheduledDate && body.scheduledTime) {
      const validatedData = standaloneMeetingSchema.parse(body);

      const scheduledDate = new Date(validatedData.scheduledDate);

      // scheduledTime is Cairo wall-clock time (lib/config/business-hours.ts).
      if (!isBusinessSlot(validatedData.scheduledTime)) {
        return apiError("validation", {
          fields: { scheduledTime: "contact.scheduled-time-outside-hours" },
        });
      }

      const now = new Date();
      if (scheduledDate < now) {
        return apiError("validation", {
          fields: { scheduledDate: "contact.preferred-date-future" },
        });
      }

      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      if (scheduledDate > threeMonthsFromNow) {
        return apiError("validation", {
          fields: { scheduledDate: "contact.preferred-date-within-three-months" },
        });
      }

      const userAgent = request.headers.get("user-agent") || undefined;
      const forwardedFor = request.headers.get("x-forwarded-for");
      const ipAddress = forwardedFor
        ? forwardedFor.split(",")[0].trim()
        : undefined;
      const referer = request.headers.get("referer") || undefined;

      const submission = await prisma.contactSubmission.create({
        data: {
          name: validatedData.name,
          phone: validatedData.phone,
          message:
            validatedData.message || "Meeting request from schedule page",
          locale,
          userAgent,
          ipAddress,
          referrer: referer,
          priority: "HIGH",
        },
      });

      const meeting = await prisma.meeting.create({
        data: {
          title: `Meeting with ${validatedData.name}`,
          type: "CONSULTATION",
          scheduledDate,
          scheduledTime: validatedData.scheduledTime,
          guestName: validatedData.name,
          submissionId: submission.id,
          notes: validatedData.message,
        },
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
                  message: `${validatedData.name} scheduled a meeting on ${scheduledDate.toLocaleDateString()} at ${validatedData.scheduledTime}`,
                  userId: admin.id,
                  entityType: "meeting",
                  entityId: meeting.id,
                },
              });
            }),
        ),
      );

      return NextResponse.json(
        { ok: true, code: "scheduled", meetingId: meeting.id },
        { status: 201 },
      );
    } else {
      const validatedData = meetingRequestSchema.parse(body);

      const submission = await prisma.contactSubmission.findUnique({
        where: { id: validatedData.contactSubmissionId },
      });

      if (!submission) {
        return apiError("not_found");
      }

      const dateParts = validatedData.preferredDate.split("-");
      const requestedDate = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        12,
        0,
        0,
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (requestedDate < today) {
        return apiError("validation", {
          fields: { preferredDate: "contact.preferred-date-future" },
        });
      }

      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      threeMonthsFromNow.setHours(23, 59, 59, 999);
      if (requestedDate > threeMonthsFromNow) {
        return apiError("validation", {
          fields: { preferredDate: "contact.preferred-date-within-three-months" },
        });
      }

      const meeting = await prisma.meeting.create({
        data: {
          title: `Meeting with ${submission.name}`,
          type: "CONSULTATION",
          scheduledDate: requestedDate,
          scheduledTime: validatedData.preferredTime,
          guestName: submission.name,
          submissionId: submission.id,
          notes: validatedData.notes,
        },
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
                  message: `${submission.name} requested a meeting on ${requestedDate.toLocaleDateString()}`,
                  userId: admin.id,
                  entityType: "meeting",
                  entityId: meeting.id,
                },
              });
            }),
        ),
      );

      return NextResponse.json(
        { ok: true, code: "scheduled", meetingId: meeting.id },
        { status: 201 },
      );
    }
  } catch (error: unknown) {
    return unexpectedError(error, "Meeting request error");
  }
}
