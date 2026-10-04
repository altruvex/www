"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@repo/database";

import { CURRENCIES } from "@repo/pricing-schema";

import { authorize } from "@/lib/authorize";
import {
  diff,
  recordActivity,
  recordChange,
  userActor,
} from "@/lib/activity-log";
import { httpUrl } from "@/lib/http-url";

export type ProjectActionResult =
  | { ok: true; changed: boolean; message: string }
  | { ok: false; message: string };

const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .pipe(httpUrl.nullable());

const editSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "A project needs a name.")
    .max(200, "Keep the name under 200 characters."),
  targetLaunchDate: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Pick a valid date.",
    )
    .transform((value) =>
      value === "" ? null : new Date(`${value}T00:00:00.000Z`),
    ),
  stagingUrl: optionalUrl,
  liveUrl: optionalUrl,
});

export async function updateProjectDetails(
  projectId: string,
  input: z.input<typeof editSchema>,
): Promise<ProjectActionResult> {
  let session;
  try {
    session = await authorize("edit", "project");
  } catch {
    return { ok: false, message: "Your role cannot edit projects." };
  }

  const parsed = editSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    const message =
      field === "stagingUrl" || field === "liveUrl"
        ? `${field === "stagingUrl" ? "Staging" : "Live"} URL must start with http:// or https://.`
        : (issue?.message ?? "Some of that input is invalid.");
    return { ok: false, message };
  }
  const data = parsed.data;

  const before = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      name: true,
      targetLaunchDate: true,
      stagingUrl: true,
      liveUrl: true,
    },
  });
  if (!before) return { ok: false, message: "That project no longer exists." };

  if (!diff(before, data))
    return { ok: true, changed: false, message: "Nothing changed." };

  try {
    await prisma.project.update({ where: { id: projectId }, data });
  } catch (error) {
    console.error("updateProjectDetails failed", error);
    return { ok: false, message: "The project could not be saved." };
  }

  await recordChange({
    action: "project.updated",
    actor: userActor(session),
    entityType: "project",
    entityId: projectId,
    entityLabel: data.name,
    summary:
      before.name !== data.name
        ? `Renamed "${before.name}" to "${data.name}"`
        : `Updated "${data.name}"`,
    before,
    after: data,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/tasks");
  return { ok: true, changed: true, message: `Saved "${data.name}".` };
}

export type RecordProjectResult =
  | { ok: true; projectId: string; message: string }
  | { ok: false; message: string };

const optionalDay = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Pick a valid date.",
  )
  .transform((value) =>
    value === "" ? null : new Date(`${value}T00:00:00.000Z`),
  )
  .refine(
    (value) => value === null || !Number.isNaN(value.getTime()),
    "Pick a valid date.",
  );

const recordSchema = z.object({
  clientId: z.string().trim().min(1, "Pick the client this was built for."),
  name: z
    .string()
    .trim()
    .min(1, "A project needs a name.")
    .max(200, "Keep the name under 200 characters."),
  currency: z.enum(CURRENCIES, {
    message: "Pick the currency the project billed in.",
  }),
  status: z.enum(["COMPLETED", "ACTIVE"], {
    message: "Pick whether the project is finished or still supported.",
  }),
  liveUrl: optionalUrl,
  stagingUrl: optionalUrl,
  actualLaunchDate: optionalDay,
  completedAt: optionalDay,
  attachProductIds: z.array(z.string().min(1)).max(100).default([]),
  attachServiceIds: z.array(z.string().min(1)).max(100).default([]),
});

export type RecordProjectInput = z.input<typeof recordSchema>;

export async function recordPastProject(
  input: RecordProjectInput,
): Promise<RecordProjectResult> {
  let session;
  try {
    session = await authorize("create", "project");
  } catch {
    return { ok: false, message: "Your role cannot record projects." };
  }

  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    const message =
      field === "stagingUrl" || field === "liveUrl"
        ? `${field === "stagingUrl" ? "Staging" : "Live"} URL must start with http:// or https://.`
        : (issue?.message ?? "Some of that input is invalid.");
    return { ok: false, message };
  }
  const data = parsed.data;

  const now = new Date();
  if (data.completedAt && data.status !== "COMPLETED") {
    return {
      ok: false,
      message: "A project that is still supported has no completion date yet.",
    };
  }
  if (data.actualLaunchDate && data.actualLaunchDate > now) {
    return {
      ok: false,
      message:
        "The launch date is in the future — this records work already done.",
    };
  }
  if (data.completedAt && data.completedAt > now) {
    return {
      ok: false,
      message:
        "The completion date is in the future — this records work already done.",
    };
  }
  if (
    data.completedAt &&
    data.actualLaunchDate &&
    data.completedAt < data.actualLaunchDate
  ) {
    return {
      ok: false,
      message: "The project cannot have been completed before it launched.",
    };
  }

  const client = await prisma.client.findUnique({
    where: { id: data.clientId },
    select: { id: true, name: true, company: true },
  });
  if (!client) return { ok: false, message: "That client no longer exists." };

  const phase =
    data.status === "COMPLETED" ? "LAUNCHED" : "POST_LAUNCH_SUPPORT";

  const attaching =
    data.attachProductIds.length + data.attachServiceIds.length > 0;
  if (attaching) {
    try {
      await authorize("edit", "client");
    } catch {
      return {
        ok: false,
        message:
          "Your role cannot attach products or services — untick them to record the project alone.",
      };
    }
  }

  let project: { id: string };
  let attached: { products: string[]; services: string[] } = {
    products: [],
    services: [],
  };
  try {
    [project, attached] = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          origin: "RECORDED",
          clientId: client.id,
          name: data.name,
          currency: data.currency,
          status: data.status,
          phase,
          liveUrl: data.liveUrl,
          stagingUrl: data.stagingUrl,
          actualLaunchDate: data.actualLaunchDate,
          completedAt: data.status === "COMPLETED" ? data.completedAt : null,
        },
        select: { id: true },
      });
      const looseProducts = await tx.product.findMany({
        where: {
          id: { in: data.attachProductIds },
          clientId: client.id,
          projectId: null,
        },
        select: { id: true, name: true },
      });
      const looseServices = await tx.clientService.findMany({
        where: {
          id: { in: data.attachServiceIds },
          clientId: client.id,
          projectId: null,
        },
        select: { id: true, name: true },
      });
      if (looseProducts.length > 0) {
        await tx.product.updateMany({
          where: {
            id: { in: looseProducts.map((x) => x.id) },
            projectId: null,
          },
          data: { projectId: created.id },
        });
      }
      if (looseServices.length > 0) {
        await tx.clientService.updateMany({
          where: {
            id: { in: looseServices.map((x) => x.id) },
            projectId: null,
          },
          data: { projectId: created.id },
        });
      }
      return [
        created,
        {
          products: looseProducts.map((x) => x.name),
          services: looseServices.map((x) => x.name),
        },
      ] as const;
    });
  } catch (error) {
    console.error("recordPastProject failed", error);
    return { ok: false, message: "The project could not be recorded." };
  }

  const clientLabel = client.company || client.name || "Unnamed client";
  await recordActivity({
    action: "project.recorded",
    actor: userActor(session),
    entityType: "project",
    entityId: project.id,
    entityLabel: data.name,
    summary: `Recorded past project "${data.name}" for ${clientLabel} — no contract`,
    after: {
      name: data.name,
      currency: data.currency,
      status: data.status,
      phase,
      liveUrl: data.liveUrl,
      stagingUrl: data.stagingUrl,
      actualLaunchDate: data.actualLaunchDate,
      completedAt: data.status === "COMPLETED" ? data.completedAt : null,
      attachedProducts: attached.products,
      attachedServices: attached.services,
    },
    metadata: { manual: true, origin: "RECORDED", clientId: client.id },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${project.id}`);
  revalidatePath(`/clients/${client.id}`);
  revalidatePath("/tasks");
  if (attaching) {
    revalidatePath("/products");
    revalidatePath("/services");
  }
  const attachedCount = attached.products.length + attached.services.length;
  return {
    ok: true,
    projectId: project.id,
    message:
      attachedCount > 0
        ? `Recorded "${data.name}" and attached ${attachedCount} ${attachedCount === 1 ? "item" : "items"} to it.`
        : `Recorded "${data.name}".`,
  };
}

export type TaskActionResult = { ok: boolean; message: string };

const TASK_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELLED",
] as const;
type TaskStatusValue = (typeof TASK_STATUSES)[number];
const TASK_STATUS_LABEL: Record<TaskStatusValue, string> = {
  TODO: "to do",
  IN_PROGRESS: "in progress",
  BLOCKED: "blocked",
  DONE: "done",
  CANCELLED: "cancelled",
};

type TaskPatch = {
  status?: TaskStatusValue;
  assigneeId?: string | null;
  dueDate?: Date | null;
};

async function patchTask(
  taskId: string,
  patch: TaskPatch,
  describe: (title: string) => string,
): Promise<TaskActionResult> {
  let session;
  try {
    session = await authorize("edit", "project");
  } catch {
    return { ok: false, message: "Your role cannot edit tasks." };
  }

  const existing = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      status: true,
      assigneeId: true,
      dueDate: true,
      completedAt: true,
      projectId: true,
    },
  });
  if (!existing) return { ok: false, message: "That task no longer exists." };

  const before = Object.fromEntries(
    Object.keys(patch).map((key) => [key, existing[key as keyof TaskPatch]]),
  );
  if (!diff(before, patch)) return { ok: true, message: "Nothing changed." };

  try {
    await prisma.projectTask.update({
      where: { id: taskId },
      data: {
        ...patch,
        ...(patch.status
          ? {
              completedAt:
                patch.status === "DONE"
                  ? (existing.completedAt ?? new Date())
                  : null,
            }
          : {}),
      },
    });
  } catch (error) {
    console.error("patchTask failed", error);
    return { ok: false, message: "The task could not be saved." };
  }

  const summary = describe(existing.title);
  await recordChange({
    action: "task.updated",
    actor: userActor(session),
    entityType: "task",
    entityId: taskId,
    entityLabel: existing.title,
    summary,
    before,
    after: patch,
    metadata: { projectId: existing.projectId },
  });

  revalidatePath("/tasks");
  revalidatePath(`/projects/${existing.projectId}`);
  return { ok: true, message: summary };
}

export async function setTaskStatus(
  taskId: string,
  status: string,
): Promise<TaskActionResult> {
  const parsed = z.enum(TASK_STATUSES).safeParse(status);
  if (!parsed.success)
    return { ok: false, message: "That is not a task status." };
  return patchTask(
    taskId,
    { status: parsed.data },
    (title) => `Moved "${title}" to ${TASK_STATUS_LABEL[parsed.data]}`,
  );
}

export async function setTaskAssignee(
  taskId: string,
  assigneeId: string | null,
): Promise<TaskActionResult> {
  let name: string | null = null;
  if (assigneeId) {
    const user = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { name: true, email: true },
    });
    if (!user)
      return { ok: false, message: "That team member no longer exists." };
    name = user.name || user.email;
  }
  return patchTask(taskId, { assigneeId }, (title) =>
    name ? `Assigned "${title}" to ${name}` : `Unassigned "${title}"`,
  );
}

export async function setTaskDue(
  taskId: string,
  ymd: string | null,
): Promise<TaskActionResult> {
  const value = ymd?.trim() || null;
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { ok: false, message: "Pick a valid date." };
  }
  const dueDate = value ? new Date(`${value}T00:00:00.000Z`) : null;
  if (dueDate && Number.isNaN(dueDate.getTime()))
    return { ok: false, message: "Pick a valid date." };
  return patchTask(taskId, { dueDate }, (title) =>
    value ? `"${title}" is due ${value}` : `Cleared the due date on "${title}"`,
  );
}
