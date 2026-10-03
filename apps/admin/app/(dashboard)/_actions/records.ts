"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/database";
import { PALETTE } from "@repo/ui/palette";
import { authorize } from "@/lib/authorize";
import { recordActivity, recordChange, userActor } from "@/lib/activity-log";

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

// OVERDUE is not settable: it is derived from the due date (lib/payment-overdue.ts).
// A hand-set OVERDUE would stay overdue after the date moved, and a hand-cleared
// one would hide a payment that is genuinely late.
const PAYMENT_STATUSES = ["PENDING", "PAID", "WAIVED"] as const;
type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

export async function setPaymentStatus(paymentId: string, status: string) {
  const session = await authorize("edit", "payment");
  if (!PAYMENT_STATUSES.includes(status as PaymentStatusValue)) {
    throw new Error(`Payment status cannot be set to ${status}`);
  }
  const before = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { status: true, amount: true, milestone: true, paidAt: true },
  });
  if (!before) throw new Error("Payment not found");
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: status as PaymentStatusValue,
      // Re-marking a paid row keeps the date it was actually paid.
      paidAt: status === "PAID" ? (before.status === "PAID" ? before.paidAt : new Date()) : null,
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
    select: { phase: true, name: true, actualLaunchDate: true },
  });
  await prisma.project.update({
    where: { id: projectId },
    data: {
      phase: phase as ProjectPhaseValue,
      // The launch happened once. Re-picking LAUNCHED (after stepping back to QA
      // for a fix, say) must not move the recorded launch date.
      ...(phase === "LAUNCHED" && !before?.actualLaunchDate ? { actualLaunchDate: new Date() } : {}),
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

const PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
type ProjectStatusValue = (typeof PROJECT_STATUSES)[number];

export async function setProjectStatus(projectId: string, status: string) {
  const session = await authorize("edit", "project");
  if (!PROJECT_STATUSES.includes(status as ProjectStatusValue)) {
    throw new Error(`Unknown project status: ${status}`);
  }
  // Completion goes through `closeProject` (_actions/change-requests.ts): it
  // checks unpaid payments and open change requests and stamps completedAt.
  // Setting COMPLETED here would skip both.
  if (status === "COMPLETED") {
    throw new Error("Use Close project — it checks payments and open change requests first.");
  }
  const before = await prisma.project.findUnique({
    where: { id: projectId },
    select: { status: true, name: true },
  });
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: status as ProjectStatusValue,
      // Reopening a closed project un-closes it; a stale completedAt would
      // keep reading "closed on" a date that is no longer true.
      ...(before?.status === "COMPLETED" ? { completedAt: null } : {}),
    },
  });
  await recordChange({
    action: "project.status_changed",
    actor: userActor(session),
    entityType: "project",
    entityId: projectId,
    entityLabel: before?.name,
    summary: `Status set to ${status.replace("_", " ").toLowerCase()}`,
    before: { status: before?.status },
    after: { status },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

/**
 * Notifications are per person: writers fan out one row per admin, so marking
 * read is scoped to the signed-in user — one operator clearing their inbox must
 * not clear everybody else's.
 */
export async function markNotificationsRead() {
  const session = await authorize("view", "notification");
  const { count } = await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true, readAt: new Date() },
  });
  if (count > 0) {
    await recordActivity({
      action: "notification.read_all",
      actor: userActor(session),
      entityType: "user",
      entityId: session.user.id,
      entityLabel: session.user.name ?? session.user.email,
      summary: `Marked ${count} notification${count === 1 ? "" : "s"} read`,
      metadata: { count },
    });
  }
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markNotificationRead(notificationId: string) {
  const session = await authorize("view", "notification");
  // Scoped to the signed-in person's own row: the id alone is not enough,
  // because the same fact fans out as one row per admin.
  const row = await prisma.notification.findFirst({
    where: { id: notificationId, userId: session.user.id, read: false },
    select: { id: true, title: true },
  });
  if (!row) return;
  await prisma.notification.update({
    where: { id: row.id },
    data: { read: true, readAt: new Date() },
  });
  await recordActivity({
    action: "notification.read",
    actor: userActor(session),
    entityType: "notification",
    entityId: row.id,
    entityLabel: row.title,
    summary: "Marked read",
    before: { read: false },
    after: { read: true },
  });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
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
      await recordActivity({
        action: "client.submission_linked",
        actor: userActor(session),
        entityType: "client",
        entityId: existing.id,
        entityLabel: submission.name,
        summary: "Linked a form submission to this existing client (same phone)",
        before: { contactSubmissionId: null },
        after: { contactSubmissionId: submission.id },
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
      await recordActivity({
        action: "client.estimate_linked",
        actor: userActor(session),
        entityType: "client",
        entityId: existing.id,
        entityLabel: lead.name,
        summary: "Linked an estimator lead to this existing client (same phone)",
        before: { transparencyLeadId: null },
        after: { transparencyLeadId: lead.id },
      });
    }
    await prisma.transparencyLead.update({
      where: { id: lead.id },
      data: { convertedAt: new Date() },
    });
    revalidatePath("/transparency");
    revalidatePath("/leads");
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
      brandColor: data.brandColor?.replace(/^#/, "").trim() || PALETTE.light["brand-text"],
      brandColorDark: data.brandColorDark?.replace(/^#/, "").trim() || PALETTE.dark["brand-text"],
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
    // Only the profile fields: the whole row would also diff updatedAt and
    // the invoice counter, neither of which this edit changed.
    before: before
      ? { phone: before.phone, email: before.email, website: before.website, brandColor: before.brandColor, brandColorDark: before.brandColorDark }
      : {},
    after: { phone: after.phone, email: after.email, website: after.website, brandColor: after.brandColor, brandColorDark: after.brandColorDark },
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

