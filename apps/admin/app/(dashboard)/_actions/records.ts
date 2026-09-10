"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@repo/database";
import { auth } from "@/lib/auth";
import { toProductRole, can, type Subject, type Action } from "@/lib/rbac";
import { recordActivity, recordChange, userActor } from "@/lib/activity-log";

async function authorize(action: Action, subject: Subject) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = toProductRole((session?.user as { role?: string } | undefined)?.role);
  if (!can(role, action, subject)) {
    throw new Error(`Not permitted: ${action} ${subject}`);
  }
  return session;
}

const CLIENT_STATUSES = [
  "NEW",
  "VIEWED",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "WON",
  "LOST",
  "SPAM",
] as const;
type ClientStatus = (typeof CLIENT_STATUSES)[number];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
type PriorityValue = (typeof PRIORITIES)[number];

export async function setClientStatus(clientId: string, status: string) {
  const session = await authorize("edit", "client");
  if (!CLIENT_STATUSES.includes(status as ClientStatus)) {
    throw new Error(`Unknown status: ${status}`);
  }
  const before = await prisma.client.findUnique({
    where: { id: clientId },
    select: { status: true, name: true, company: true },
  });
  await prisma.client.update({
    where: { id: clientId },
    data: { status: status as ClientStatus },
  });
  await recordChange({
    action: "client.status_changed",
    actor: userActor(session),
    entityType: "client",
    entityId: clientId,
    entityLabel: before?.company || before?.name,
    summary: `Status moved to ${status.replace("_", " ").toLowerCase()}`,
    before: { status: before?.status },
    after: { status },
  });
  revalidatePath("/clients");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath(`/clients/${clientId}`);
}

export async function setClientPriority(clientId: string, priority: string) {
  const session = await authorize("edit", "client");
  if (!PRIORITIES.includes(priority as PriorityValue)) {
    throw new Error(`Unknown priority: ${priority}`);
  }
  const before = await prisma.client.findUnique({
    where: { id: clientId },
    select: { priority: true, name: true, company: true },
  });
  await prisma.client.update({
    where: { id: clientId },
    data: { priority: priority as PriorityValue },
  });
  await recordChange({
    action: "client.priority_changed",
    actor: userActor(session),
    entityType: "client",
    entityId: clientId,
    entityLabel: before?.company || before?.name,
    summary: `Priority set to ${priority.toLowerCase()}`,
    before: { priority: before?.priority },
    after: { priority },
  });
  revalidatePath("/leads");
  revalidatePath(`/clients/${clientId}`);
}

export async function bulkSetClientStatus(clientIds: string[], status: string) {
  const session = await authorize("edit", "client");
  if (!CLIENT_STATUSES.includes(status as ClientStatus)) {
    throw new Error(`Unknown status: ${status}`);
  }
  const before = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, status: true, name: true, company: true },
  });
  await prisma.client.updateMany({
    where: { id: { in: clientIds } },
    data: { status: status as ClientStatus },
  });
  const actor = userActor(session);
  await Promise.all(
    before.map((client) =>
      recordChange({
        action: "client.status_changed",
        actor,
        entityType: "client",
        entityId: client.id,
        entityLabel: client.company || client.name,
        summary: `Status moved to ${status.replace("_", " ").toLowerCase()} (bulk)`,
        before: { status: client.status },
        after: { status },
      }),
    ),
  );
  revalidatePath("/clients");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
}

/**
 * Board drag-and-drop. The board's stages are DERIVED (a signed contract wins
 * over the status column), so only the pre-proposal stages are writable here —
 * dragging a card into "Signed" would be a lie the records contradict. The UI
 * disables those columns; this is the server-side half of that rule.
 */
const WRITABLE_STAGES = new Set(["NEW", "VIEWED", "CONTACTED", "QUALIFIED", "LOST", "SPAM"]);

export async function moveClientStage(clientId: string, stage: string) {
  const session = await authorize("edit", "client");
  if (!WRITABLE_STAGES.has(stage)) {
    throw new Error(
      `“${stage}” is derived from proposals and contracts and cannot be set directly. ` +
      `Send a proposal or generate a contract instead.`,
    );
  }
  const before = await prisma.client.findUnique({
    where: { id: clientId },
    select: { status: true, name: true, company: true },
  });
  await prisma.client.update({
    where: { id: clientId },
    data: { status: stage as ClientStatus },
  });
  await recordChange({
    action: "client.stage_moved",
    actor: userActor(session),
    entityType: "client",
    entityId: clientId,
    entityLabel: before?.company || before?.name,
    summary: `Dragged to ${stage.replace("_", " ").toLowerCase()} on the pipeline board`,
    before: { status: before?.status },
    after: { status: stage },
  });
  revalidatePath("/pipeline");
  revalidatePath("/clients");
}

export async function setSubmissionStatus(submissionId: string, status: string) {
  const session = await authorize("edit", "lead");
  if (!CLIENT_STATUSES.includes(status as ClientStatus)) {
    throw new Error(`Unknown status: ${status}`);
  }
  const before = await prisma.contactSubmission.findUnique({
    where: { id: submissionId },
    select: { status: true, name: true },
  });
  await prisma.contactSubmission.update({
    where: { id: submissionId },
    data: {
      status: status as ClientStatus,
      ...(status === "CONTACTED" ? { firstContactedAt: new Date() } : {}),
    },
  });
  await recordChange({
    action: "submission.status_changed",
    actor: userActor(session),
    entityType: "submission",
    entityId: submissionId,
    entityLabel: before?.name,
    summary: `Status moved to ${status.replace("_", " ").toLowerCase()}`,
    before: { status: before?.status },
    after: { status },
  });
  revalidatePath("/submissions");
  revalidatePath(`/submissions/${submissionId}`);
}

export async function markSubmissionViewed(submissionId: string) {
  const session = await authorize("view", "lead");
  const result = await prisma.contactSubmission.updateMany({
    where: { id: submissionId, firstViewedAt: null },
    data: { firstViewedAt: new Date(), status: "VIEWED" },
  });
  if (result.count > 0) {
    await recordActivity({
      action: "submission.viewed",
      actor: userActor(session),
      entityType: "submission",
      entityId: submissionId,
      summary: "Opened for the first time",
    });
  }
  revalidatePath("/submissions");
}

const PAYMENT_STATUSES = ["PENDING", "PAID", "OVERDUE", "WAIVED"] as const;
type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

export async function setPaymentStatus(paymentId: string, status: string) {
  const session = await authorize("edit", "payment");
  if (!PAYMENT_STATUSES.includes(status as PaymentStatusValue)) {
    throw new Error(`Unknown payment status: ${status}`);
  }
  const before = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { status: true, amount: true, milestone: true },
  });
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: status as PaymentStatusValue,
      paidAt: status === "PAID" ? new Date() : null,
    },
  });
  await recordChange({
    action: "payment.status_changed",
    actor: userActor(session),
    entityType: "payment",
    entityId: paymentId,
    entityLabel: before ? `${before.milestone} · ${before.amount}` : undefined,
    summary: `Marked ${status.toLowerCase()}`,
    before: { status: before?.status },
    after: { status },
  });
  revalidatePath("/payments");
}

const MEETING_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
] as const;
type MeetingStatusValue = (typeof MEETING_STATUSES)[number];

export async function setMeetingStatus(meetingId: string, status: string) {
  const session = await authorize("approve", "meeting");
  if (!MEETING_STATUSES.includes(status as MeetingStatusValue)) {
    throw new Error(`Unknown meeting status: ${status}`);
  }
  const before = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { status: true, title: true },
  });
  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: status as MeetingStatusValue,
      ...(status === "APPROVED" ? { approvedAt: new Date() } : {}),
      ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
    },
  });
  await recordChange({
    action: "meeting.status_changed",
    actor: userActor(session),
    entityType: "meeting",
    entityId: meetingId,
    entityLabel: before?.title,
    summary: `Status moved to ${status.toLowerCase()}`,
    before: { status: before?.status },
    after: { status },
  });
  revalidatePath("/calendar");
}

const PROJECT_PHASES = [
  "DISCOVERY",
  "DESIGN",
  "DEVELOPMENT",
  "QA",
  "STAGING_REVIEW",
  "LAUNCHED",
  "POST_LAUNCH_SUPPORT",
] as const;
type ProjectPhaseValue = (typeof PROJECT_PHASES)[number];

export async function setProjectPhase(projectId: string, phase: string) {
  const session = await authorize("edit", "project");
  if (!PROJECT_PHASES.includes(phase as ProjectPhaseValue)) {
    throw new Error(`Unknown phase: ${phase}`);
  }
  const before = await prisma.project.findUnique({
    where: { id: projectId },
    select: { phase: true, name: true },
  });
  await prisma.project.update({
    where: { id: projectId },
    data: {
      phase: phase as ProjectPhaseValue,
      ...(phase === "LAUNCHED" ? { actualLaunchDate: new Date() } : {}),
    },
  });
  await recordChange({
    action: "project.phase_changed",
    actor: userActor(session),
    entityType: "project",
    entityId: projectId,
    entityLabel: before?.name,
    summary: `Moved to ${phase.replace("_", " ").toLowerCase()}`,
    before: { phase: before?.phase },
    after: { phase },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function markNotificationsRead() {
  await authorize("view", "client");
  await prisma.notification.updateMany({
    where: { read: false },
    data: { read: true, readAt: new Date() },
  });
  revalidatePath("/notifications");
}

/**
 * §16 — converting a submission into a lead NEVER destroys the submission.
 * The raw payload (UTM, referrer, user agent, the exact words they typed) stays
 * exactly as received; the Client row references it. That is the difference
 * between a CRM and a form-to-CRM importer that loses the evidence.
 */
export async function convertSubmissionToClient(submissionId: string) {
  const session = await authorize("create", "client");

  const submission = await prisma.contactSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, name: true, phone: true, client: { select: { id: true } } },
  });
  if (!submission) throw new Error("Submission not found");
  if (submission.client) return { clientId: submission.client.id, created: false };

  // A client already exists on this phone number more often than not — the same
  // person filling the form twice must not become two client records.
  const existing = await prisma.client.findFirst({
    where: { phone: submission.phone },
    select: { id: true, contactSubmissionId: true },
  });

  if (existing) {
    if (!existing.contactSubmissionId) {
      await prisma.client.update({
        where: { id: existing.id },
        data: { contactSubmissionId: submission.id },
      });
    }
    revalidatePath("/submissions");
    revalidatePath("/leads");
    return { clientId: existing.id, created: false };
  }

  const client = await prisma.client.create({
    data: {
      name: submission.name,
      phone: submission.phone,
      source: "WEBSITE_CONTACT_FORM",
      contactSubmissionId: submission.id,
      status: "NEW",
    },
    select: { id: true },
  });

  await recordActivity({
    action: "client.created",
    actor: userActor(session),
    entityType: "client",
    entityId: client.id,
    entityLabel: submission.name,
    summary: `Created from form submission`,
    after: { source: "WEBSITE_CONTACT_FORM", status: "NEW" },
    metadata: { submissionId: submission.id },
  });

  revalidatePath("/submissions");
  revalidatePath("/leads");
  revalidatePath("/clients");
  return { clientId: client.id, created: true };
}

export async function convertEstimateToClient(leadId: string) {
  const session = await authorize("create", "client");

  const lead = await prisma.transparencyLead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true, phone: true, client: { select: { id: true } } },
  });
  if (!lead) throw new Error("Estimate not found");
  if (lead.client) return { clientId: lead.client.id, created: false };

  const existing = await prisma.client.findFirst({
    where: { phone: lead.phone },
    select: { id: true, transparencyLeadId: true },
  });

  if (existing) {
    if (!existing.transparencyLeadId) {
      await prisma.client.update({
        where: { id: existing.id },
        data: { transparencyLeadId: lead.id },
      });
    }
    await prisma.transparencyLead.update({
      where: { id: lead.id },
      data: { convertedAt: new Date() },
    });
    revalidatePath("/transparency");
    return { clientId: existing.id, created: false };
  }

  const client = await prisma.client.create({
    data: {
      name: lead.name,
      phone: lead.phone,
      source: "TRANSPARENCY_ESTIMATOR",
      transparencyLeadId: lead.id,
      status: "NEW",
    },
    select: { id: true },
  });

  await prisma.transparencyLead.update({
    where: { id: lead.id },
    data: { convertedAt: new Date() },
  });

  await recordActivity({
    action: "client.created",
    actor: userActor(session),
    entityType: "client",
    entityId: client.id,
    entityLabel: lead.name,
    summary: `Created from public estimator`,
    after: { source: "TRANSPARENCY_ESTIMATOR", status: "NEW" },
    metadata: { transparencyLeadId: lead.id },
  });

  revalidatePath("/transparency");
  revalidatePath("/leads");
  revalidatePath("/clients");
  return { clientId: client.id, created: true };
}

export async function updateCompanyProfile(data: {
  phone: string;
  email: string;
  website: string;
  brandColor?: string;
  brandColorDark?: string;
}) {
  const session = await authorize("edit", "settings");
  const before = await prisma.companySettings.findUnique({ where: { id: "default" } });
  const after = await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      phone: data.phone.trim(),
      email: data.email.trim(),
      website: data.website.trim(),
      brandColor: data.brandColor?.replace(/^#/, "").trim() || "4F62D4",
      brandColorDark: data.brandColorDark?.replace(/^#/, "").trim() || "6E7CE2",
    },
    update: {
      phone: data.phone.trim(),
      email: data.email.trim(),
      website: data.website.trim(),
      brandColor: data.brandColor?.replace(/^#/, "").trim() || undefined,
      brandColorDark: data.brandColorDark?.replace(/^#/, "").trim() || undefined,
    },
  });
  await recordChange({
    action: "settings.company_profile_updated",
    actor: userActor(session),
    entityType: "settings",
    entityId: "default",
    entityLabel: "Company profile",
    summary: "Updated company profile",
    before: before ?? {},
    after,
  });
  revalidatePath("/settings");
  return { success: true };
}

export async function addSubmissionNote(submissionId: string, content: string) {
  const session = await authorize("edit", "lead");
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) throw new Error("Authenticated user not found");

  const note = await prisma.contactNote.create({
    data: {
      submissionId,
      content: content.trim(),
      createdById: user.id,
      type: "internal",
    },
    include: {
      createdBy: { select: { name: true, email: true } },
    },
  });
  await recordActivity({
    action: "submission.note_added",
    actor: userActor(session),
    entityType: "submission",
    entityId: submissionId,
    summary: "Added an internal note",
  });
  revalidatePath(`/submissions/${submissionId}`);
  return note;
}

