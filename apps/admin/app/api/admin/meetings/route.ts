import type { NextRequest } from "next/server";
import { prisma, Prisma, MeetingStatus, MeetingType } from "@repo/database";
import { z } from "zod";
import { recordActivity, recordChange } from "@/lib/activity-log";
import { deleteRecords } from "@/app/(dashboard)/_actions/delete";
import { dayKey, localDay } from "@/lib/calendar-data";
import { httpUrl } from "@/lib/http-url";
import { notFound, ok, readJson, withAdmin, HttpError } from "@/lib/with-admin";
import { NextResponse } from "next/server";

export const GET = withAdmin(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");

  const where: Prisma.MeetingWhereInput = {};

  if (status && status !== "all") {
    where.status = status as MeetingStatus;
  }

  if (type && type !== "all") {
    where.type = type as MeetingType;
  }

  if (dateFrom || dateTo) {
    const scheduledDateFilter: Prisma.DateTimeFilter = {};
    if (dateFrom) {
      scheduledDateFilter.gte = new Date(dateFrom);
    }
    if (dateTo) {
      scheduledDateFilter.lte = new Date(dateTo);
    }
    where.scheduledDate = scheduledDateFilter;
  }

  const [meetings, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, company: true } },
        contactSubmission: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            client: { select: { id: true } },
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.meeting.count({ where }),
  ]);

  return ok({ meetings, total, page, pageSize });
}, { can: ["view", "meeting"] });

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .refine((value) => dayKey(localDay(value)) === value, "That is not a real date.");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour).");
const duration = z.number().int().min(5).max(480);

const createMeetingSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(MeetingType),
  scheduledDate: ymd,
  scheduledTime: hhmm,
  durationMinutes: duration.default(30),
  clientId: z.string().uuid().optional(),
  submissionId: z.string().uuid().optional(),
  meetingUrl: httpUrl.optional(),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * An operator-created meeting is one the operator has already agreed, so it is
 * written APPROVED (with approvedAt) rather than PENDING — PENDING is the state
 * of a website booking request awaiting a decision, and lands in the "requests"
 * panel. No invitation is sent: meetings have no mail sender.
 */
export const POST = withAdmin(async (request, { session, actor }) => {
  const input = await readJson(request, createMeetingSchema);

  let clientId = input.clientId;
  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) throw new HttpError(400, "That client does not exist.");
  }
  if (input.submissionId) {
    const submission = await prisma.contactSubmission.findUnique({
      where: { id: input.submissionId },
      select: { id: true, client: { select: { id: true } } },
    });
    if (!submission) throw new HttpError(400, "That lead does not exist.");
    // A meeting with a lead who is already a client belongs on the client hub.
    if (!clientId && submission.client) clientId = submission.client.id;
  }

  const meeting = await prisma.meeting.create({
    data: {
      title: input.title,
      type: input.type,
      status: "APPROVED",
      approvedAt: new Date(),
      scheduledDate: localDay(input.scheduledDate),
      scheduledTime: input.scheduledTime,
      durationMinutes: input.durationMinutes,
      meetingUrl: input.meetingUrl ?? null,
      notes: input.notes || null,
      clientId: clientId ?? null,
      submissionId: input.submissionId ?? null,
      requestedById: session.user.id,
    },
    select: { id: true },
  });

  await recordActivity({
    action: "meeting.created",
    actor,
    entityType: "meeting",
    entityId: meeting.id,
    entityLabel: input.title,
    summary: `Scheduled "${input.title}" for ${input.scheduledDate} ${input.scheduledTime}`,
    after: {
      title: input.title,
      type: input.type,
      status: "APPROVED",
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime,
      durationMinutes: input.durationMinutes,
      meetingUrl: input.meetingUrl,
      notes: input.notes || undefined,
      submissionId: input.submissionId,
    },
    metadata: { clientId: clientId ?? null },
  });

  return NextResponse.json({ success: true, meeting }, { status: 201 });
}, { can: ["create", "meeting"] });

const updateMeetingSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(MeetingStatus).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  meetingUrl: httpUrl.nullable().optional(),
  adminNotes: z.string().max(1000).nullable().optional(),
  scheduledDate: ymd.optional(),
  scheduledTime: hhmm.optional(),
  durationMinutes: duration.optional(),
  /** Link only — a meeting is unlinked by deleting the client, not from here. */
  clientId: z.string().uuid().optional(),
});

export const PATCH = withAdmin(async (request, { actor }) => {
  const input = await readJson(request, updateMeetingSchema);

  const before = await prisma.meeting.findUnique({ where: { id: input.id } });
  if (!before) throw notFound("Meeting not found.");

  let linkedClientName: string | null = null;
  if (input.clientId !== undefined) {
    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
      select: { name: true, company: true },
    });
    if (!client) throw new HttpError(400, "That client does not exist.");
    linkedClientName = client.company || client.name || "client";
  }

  const data: Prisma.MeetingUpdateInput = {};

  if (input.status) {
    data.status = input.status;
    if (input.status === "APPROVED" && !before.approvedAt) data.approvedAt = new Date();
    if (input.status === "COMPLETED" && !before.completedAt) data.completedAt = new Date();
  }
  if (input.assignedToId !== undefined) {
    data.assignedTo = input.assignedToId
      ? { connect: { id: input.assignedToId } }
      : { disconnect: true };
  }
  if (input.meetingUrl !== undefined) data.meetingUrl = input.meetingUrl;
  if (input.adminNotes !== undefined) data.adminNotes = input.adminNotes;
  if (input.scheduledDate !== undefined) data.scheduledDate = localDay(input.scheduledDate);
  if (input.scheduledTime !== undefined) data.scheduledTime = input.scheduledTime;
  if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
  if (input.clientId !== undefined) data.client = { connect: { id: input.clientId } };

  const updated = await prisma.meeting.update({
    where: { id: input.id },
    data,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      contactSubmission: { select: { id: true, name: true, phone: true } },
    },
  });

  // Only the fields the caller sent, compared against the stored value; the
  // diff inside recordChange then drops any that did not actually move.
  const was = {
    status: before.status,
    assignedToId: before.assignedToId,
    meetingUrl: before.meetingUrl,
    adminNotes: before.adminNotes,
    scheduledDate: dayKey(before.scheduledDate),
    scheduledTime: before.scheduledTime,
    durationMinutes: before.durationMinutes,
    clientId: before.clientId,
  };
  const sent = {
    status: input.status,
    assignedToId: input.assignedToId,
    meetingUrl: input.meetingUrl,
    adminNotes: input.adminNotes,
    scheduledDate: input.scheduledDate,
    scheduledTime: input.scheduledTime,
    durationMinutes: input.durationMinutes,
    clientId: input.clientId,
  };
  const keys = (Object.keys(sent) as (keyof typeof sent)[]).filter((k) => sent[k] !== undefined);
  const pick = (source: Record<string, unknown>) =>
    Object.fromEntries(keys.map((k) => [k, source[k]]));

  const rescheduled =
    (input.scheduledDate !== undefined && input.scheduledDate !== was.scheduledDate) ||
    (input.scheduledTime !== undefined && input.scheduledTime !== was.scheduledTime);

  await recordChange({
    action: input.status
      ? "meeting.status_changed"
      : rescheduled
        ? "meeting.rescheduled"
        : "meeting.updated",
    actor,
    entityType: "meeting",
    entityId: input.id,
    entityLabel: before.title,
    summary: input.status
      ? `Status moved to ${input.status.toLowerCase()}`
      : rescheduled
        ? `Rescheduled "${before.title}" to ${input.scheduledDate ?? was.scheduledDate} ${input.scheduledTime ?? was.scheduledTime}`
        : linkedClientName && input.clientId !== was.clientId
          ? `Linked "${before.title}" to ${linkedClientName}`
          : `Updated "${before.title}"`,
    before: pick(was),
    after: pick(sent),
    metadata: linkedClientName && input.clientId !== was.clientId ? { clientId: input.clientId } : null,
  });

  return ok({ meeting: updated });
}, { can: ["edit", "meeting"] });

/**
 * Deleting a meeting goes through the same registry every other delete uses.
 *
 * It used to call `prisma.meeting.delete` here, which quietly granted ADMIN a
 * permission the role matrix does not (`rbac.ts` gives `meeting.delete` to
 * OWNER only) and wrote a thinner audit snapshot than the registry's.
 */
export const DELETE = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, message: "Meeting ID is required" },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await deleteRecords("meeting", [id]);
  } catch (error) {
    // `deleteRecords` throws when the role matrix refuses the subject.
    if (error instanceof Error && error.message.startsWith("Your role cannot delete")) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  if (result.deleted === 0) {
    const refusal = result.refused[0];
    const gone = refusal?.reason === "Already gone.";
    return NextResponse.json(
      { success: false, message: gone ? "Meeting not found" : (refusal?.reason ?? "Meeting was not deleted") },
      { status: gone ? 404 : 409 },
    );
  }

  return ok({ message: "Meeting deleted successfully" });
}, { can: ["delete", "meeting"] });
