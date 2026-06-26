import { isTrustedOrigin } from "@/lib/utils/origin-check";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import {
  createMeetingRequestSchema,
  createStandaloneMeetingSchema,
} from "@/lib/validations/contact";
import { prisma } from "@repo/database";
import { getTranslations } from "next-intl/server";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

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
      route: "schedule",
      limit: 3,
      windowSeconds: 10 * 60,
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
    const locale =
      typeof body.locale === "string" &&
      (body.locale === "ar" || body.locale === "en")
        ? body.locale
        : "en";
    const t = await getTranslations({ locale, namespace: "validations" });
    const standaloneMeetingSchema = createStandaloneMeetingSchema(t);
    const meetingRequestSchema = createMeetingRequestSchema(t);

    if (body.name && body.phone && body.scheduledDate && body.scheduledTime) {
      const validatedData = standaloneMeetingSchema.parse(body);

      const scheduledDate = new Date(validatedData.scheduledDate);

      const now = new Date();
      if (scheduledDate < now) {
        return NextResponse.json(
          { success: false, message: "Cannot schedule meetings in the past" },
          { status: 400 },
        );
      }

      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      if (scheduledDate > threeMonthsFromNow) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select a date within the next 3 months",
          },
          { status: 400 },
        );
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
        {
          success: true,
          meetingId: meeting.id,
          message:
            "Meeting scheduled successfully. We'll confirm the details shortly.",
        },
        { status: 201 },
      );
    } else {
      const validatedData = meetingRequestSchema.parse(body);

      const submission = await prisma.contactSubmission.findUnique({
        where: { id: validatedData.contactSubmissionId },
      });

      if (!submission) {
        return NextResponse.json(
          { success: false, message: "Contact submission not found" },
          { status: 404 },
        );
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
        return NextResponse.json(
          { success: false, message: "Cannot schedule meetings in the past" },
          { status: 400 },
        );
      }

      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      threeMonthsFromNow.setHours(23, 59, 59, 999);
      if (requestedDate > threeMonthsFromNow) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select a date within the next 3 months",
          },
          { status: 400 },
        );
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
        {
          success: true,
          meetingId: meeting.id,
          message:
            "Meeting request submitted successfully. We'll confirm the details shortly.",
        },
        { status: 201 },
      );
    }
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Meeting request error:", error);
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: error.issues.reduce((acc: Record<string, string>, err) => {
            const field = String(err.path[0] ?? "form");
            acc[field] = err.message;
            return acc;
          }, {}),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 },
    );
  }
}
