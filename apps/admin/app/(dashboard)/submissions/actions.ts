"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, type Prisma } from "@repo/database";
import { authorize } from "@/lib/authorize";
import { recordChange, userActor } from "@/lib/activity-log";

export type TriageResult = { ok: true; message: string } | { ok: false; message: string };

const SUBMISSION_STATUSES = [
  "NEW",
  "VIEWED",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "WON",
  "LOST",
  "SPAM",
] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const triageSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(SUBMISSION_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  /** null clears the assignee; undefined leaves it alone. */
  assignedToId: z.string().uuid().nullable().optional(),
});

/**
 * Triage of the raw inbound record: status, priority, who owns it.
 *
 * This is the submission's own state, not the lead's — once converted, the
 * client row carries the lead through the pipeline. The submission body
 * (message, UTM, referrer) is never touched here.
 */
export async function updateSubmissionTriage(
  input: z.input<typeof triageSchema>,
): Promise<TriageResult> {
  let session;
  try {
    session = await authorize("edit", "lead");
  } catch {
    return { ok: false, message: "You do not have permission to triage submissions." };
  }

  const parsed = triageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That change is not valid." };
  const { id, status, priority, assignedToId } = parsed.data;

  const before = await prisma.contactSubmission.findUnique({
    where: { id },
    select: {
      name: true,
      status: true,
      priority: true,
      assignedToId: true,
      assignedTo: { select: { name: true, email: true } },
      firstViewedAt: true,
      firstContactedAt: true,
    },
  });
  if (!before) return { ok: false, message: "This submission no longer exists." };

  let assignee: { id: string; name: string | null; email: string } | null = null;
  if (assignedToId) {
    // Only operators can own a submission — a USER-role account cannot sign in here.
    assignee = await prisma.user.findFirst({
      where: { id: assignedToId, role: { in: ["ADMIN", "SUPERADMIN"] } },
      select: { id: true, name: true, email: true },
    });
    if (!assignee) return { ok: false, message: "That person is not a team member." };
  }

  const now = new Date();
  const data: Prisma.ContactSubmissionUncheckedUpdateInput = {};
  if (status !== undefined) {
    data.status = status;
    // The first-touch timestamps record the first time the status said so; they
    // are never moved afterwards, so response-time stays measurable.
    if (status !== "NEW" && !before.firstViewedAt) data.firstViewedAt = now;
    if (
      !before.firstContactedAt &&
      ["CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON"].includes(status)
    ) {
      data.firstContactedAt = now;
    }
  }
  if (priority !== undefined) data.priority = priority;
  if (assignedToId !== undefined) data.assignedToId = assignedToId;
  if (Object.keys(data).length === 0) return { ok: true, message: "Nothing to change." };

  await prisma.contactSubmission.update({ where: { id }, data });

  const label = (u: { name: string | null; email: string } | null | undefined) =>
    u ? u.name || u.email : null;
  const changed = await recordChange({
    action:
      status !== undefined && status !== before.status
        ? "submission.status_changed"
        : priority !== undefined && priority !== before.priority
          ? "submission.priority_changed"
          : "submission.assigned",
    actor: userActor(session),
    entityType: "submission",
    entityId: id,
    entityLabel: before.name,
    summary: "Updated submission triage",
    before: {
      status: before.status,
      priority: before.priority,
      assignee: label(before.assignedTo),
    },
    after: {
      status: status ?? before.status,
      priority: priority ?? before.priority,
      assignee: assignedToId === undefined ? label(before.assignedTo) : label(assignee),
    },
  });

  revalidatePath("/submissions");
  revalidatePath(`/submissions/${id}`);
  return { ok: true, message: changed ? "Saved." : "Nothing changed." };
}

/**
 * Stamps the first time an operator opened the submission, and moves NEW to
 * VIEWED with it. Called once from the detail page when nothing is stamped yet.
 * A render must not write, so the page does not do this itself.
 */
export async function markSubmissionViewed(id: string): Promise<TriageResult> {
  let session;
  try {
    session = await authorize("edit", "lead");
  } catch {
    return { ok: false, message: "Not permitted." };
  }
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Invalid id." };

  const row = await prisma.contactSubmission.findUnique({
    where: { id },
    select: { name: true, status: true, firstViewedAt: true },
  });
  if (!row) return { ok: false, message: "This submission no longer exists." };
  if (row.firstViewedAt) return { ok: true, message: "Already opened." };

  const nextStatus = row.status === "NEW" ? "VIEWED" : row.status;
  // updateMany + the null guard: two tabs opening it together stamp it once.
  const { count } = await prisma.contactSubmission.updateMany({
    where: { id, firstViewedAt: null },
    data: { firstViewedAt: new Date(), status: nextStatus },
  });
  if (count === 0) return { ok: true, message: "Already opened." };

  await recordChange({
    action: "submission.viewed",
    actor: userActor(session),
    entityType: "submission",
    entityId: id,
    entityLabel: row.name,
    summary: "Opened for the first time",
    before: { status: row.status, firstViewed: null },
    after: { status: nextStatus, firstViewed: "opened" },
  });
  revalidatePath("/submissions");
  return { ok: true, message: "Marked as opened." };
}
