"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@repo/database";
import { auth } from "@/lib/auth";
import { toProductRole, can, type Subject, type Action } from "@/lib/rbac";

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
  await authorize("edit", "client");
  if (!CLIENT_STATUSES.includes(status as ClientStatus)) {
    throw new Error(`Unknown status: ${status}`);
  }
  await prisma.client.update({
    where: { id: clientId },
    data: { status: status as ClientStatus },
  });
  revalidatePath("/clients");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath(`/clients/${clientId}`);
}

export async function setClientPriority(clientId: string, priority: string) {
  await authorize("edit", "client");
  if (!PRIORITIES.includes(priority as PriorityValue)) {
    throw new Error(`Unknown priority: ${priority}`);
  }
  await prisma.client.update({
    where: { id: clientId },
    data: { priority: priority as PriorityValue },
  });
  revalidatePath("/leads");
  revalidatePath(`/clients/${clientId}`);
}

export async function bulkSetClientStatus(clientIds: string[], status: string) {
  await authorize("edit", "client");
  if (!CLIENT_STATUSES.includes(status as ClientStatus)) {
    throw new Error(`Unknown status: ${status}`);
  }
  await prisma.client.updateMany({
    where: { id: { in: clientIds } },
    data: { status: status as ClientStatus },
  });
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
  await authorize("edit", "client");
  if (!WRITABLE_STAGES.has(stage)) {
    throw new Error(
      `“${stage}” is derived from proposals and contracts and cannot be set directly. ` +
      `Send a proposal or generate a contract instead.`,
    );
  }
  await prisma.client.update({
    where: { id: clientId },
    data: { status: stage as ClientStatus },
  });
  revalidatePath("/pipeline");
  revalidatePath("/clients");
}

export async function setSubmissionStatus(submissionId: string, status: string) {
  await authorize("edit", "lead");
  if (!CLIENT_STATUSES.includes(status as ClientStatus)) {
    throw new Error(`Unknown status: ${status}`);
  }
  await prisma.contactSubmission.update({
    where: { id: submissionId },
    data: {
      status: status as ClientStatus,
      ...(status === "CONTACTED" ? { firstContactedAt: new Date() } : {}),
    },
  });
  revalidatePath("/submissions");
  revalidatePath(`/submissions/${submissionId}`);
}

export async function markSubmissionViewed(submissionId: string) {
  await authorize("view", "lead");
  await prisma.contactSubmission.updateMany({
    where: { id: submissionId, firstViewedAt: null },
    data: { firstViewedAt: new Date(), status: "VIEWED" },
  });
  revalidatePath("/submissions");
}

const PAYMENT_STATUSES = ["PENDING", "PAID", "OVERDUE", "WAIVED"] as const;
type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

export async function setPaymentStatus(paymentId: string, status: string) {
  await authorize("edit", "payment");
  if (!PAYMENT_STATUSES.includes(status as PaymentStatusValue)) {
    throw new Error(`Unknown payment status: ${status}`);
  }
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: status as PaymentStatusValue,
      paidAt: status === "PAID" ? new Date() : null,
    },
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
  await authorize("approve", "meeting");
  if (!MEETING_STATUSES.includes(status as MeetingStatusValue)) {
    throw new Error(`Unknown meeting status: ${status}`);
  }
  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: status as MeetingStatusValue,
      ...(status === "APPROVED" ? { approvedAt: new Date() } : {}),
      ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
    },
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
  await authorize("edit", "project");
  if (!PROJECT_PHASES.includes(phase as ProjectPhaseValue)) {
    throw new Error(`Unknown phase: ${phase}`);
  }
  await prisma.project.update({
    where: { id: projectId },
    data: {
      phase: phase as ProjectPhaseValue,
      ...(phase === "LAUNCHED" ? { actualLaunchDate: new Date() } : {}),
    },
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
  await authorize("create", "client");

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

  revalidatePath("/submissions");
  revalidatePath("/leads");
  revalidatePath("/clients");
  return { clientId: client.id, created: true };
}

export async function convertEstimateToClient(leadId: string) {
  await authorize("create", "client");

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
  await authorize("edit", "settings");
  await prisma.companySettings.upsert({
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
  revalidatePath(`/submissions/${submissionId}`);
  return note;
}

