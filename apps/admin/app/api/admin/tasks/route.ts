import { z } from "zod";

import { prisma } from "@repo/database";

import { recordActivity, recordChange } from "@/lib/activity-log";
import { notFound, ok, readJson, withAdmin } from "@/lib/with-admin";

export const dynamic = "force-dynamic";

const STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const PHASES = [
  "DISCOVERY",
  "DESIGN",
  "DEVELOPMENT",
  "QA",
  "STAGING_REVIEW",
  "LAUNCHED",
  "POST_LAUNCH_SUPPORT",
] as const;

const POSITION_STEP = 1000;

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(300),
  detail: z.string().max(5000).nullable().optional(),
  status: z.enum(STATUSES).default("TODO"),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  assigneeId: z.string().min(1).nullable().optional(),
  phase: z.enum(PHASES).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1).optional(),
  title: z.string().min(1).max(300).optional(),
  detail: z.string().max(5000).nullable().optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  phase: z.enum(PHASES).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const GET = withAdmin(async (request) => {
  const projectId = request.nextUrl.searchParams.get("projectId");
  const tasks = await prisma.projectTask.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: {
        select: {
          id: true,
          name: true,
          client: { select: { id: true, name: true, company: true } },
        },
      },
    },
  });
  return ok({ tasks });
}, { can: ["view", "project"] });

export const POST = withAdmin(async (request, { actor, session }) => {
  const body = await readJson(request, createSchema);

  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    select: { id: true, name: true },
  });
  if (!project) throw notFound("That project no longer exists.");

  const last = await prisma.projectTask.findFirst({
    where: { projectId: body.projectId, status: body.status },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const task = await prisma.projectTask.create({
    data: {
      projectId: body.projectId,
      title: body.title,
      detail: body.detail ?? null,
      status: body.status,
      priority: body.priority,
      assigneeId: body.assigneeId ?? null,
      phase: body.phase ?? null,
      dueDate: body.dueDate ?? null,
      position: (last?.position ?? 0) + POSITION_STEP,
      completedAt: body.status === "DONE" ? new Date() : null,
      createdBy: session.user.email ?? session.user.id ?? null,
    },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  });

  await recordActivity({
    action: "task.created",
    actor,
    entityType: "task",
    entityId: task.id,
    entityLabel: task.title,
    summary: `Added "${task.title}" to ${project.name}`,
    after: { status: task.status, priority: task.priority },
    metadata: { projectId: project.id },
  });

  return ok({ task });
}, { can: ["create", "project"] });

export const PATCH = withAdmin(async (request, { actor }) => {
  const { id, ...patch } = await readJson(request, patchSchema);

  const existing = await prisma.projectTask.findUnique({
    where: { id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!existing) throw notFound("That task no longer exists.");

  const target =
    patch.projectId && patch.projectId !== existing.projectId
      ? await prisma.project.findUnique({
          where: { id: patch.projectId },
          select: { id: true, name: true },
        })
      : null;
  if (patch.projectId && patch.projectId !== existing.projectId && !target) {
    throw notFound("That project no longer exists.");
  }

  const task = await prisma.projectTask.update({
    where: { id },
    data: {
      ...patch,
      ...(patch.status
        ? {
            completedAt:
              patch.status === "DONE" ? (existing.completedAt ?? new Date()) : null,
          }
        : {}),
    },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  });

  await recordChange({
    action: "task.updated",
    actor,
    entityType: "task",
    entityId: id,
    entityLabel: task.title,
    summary: target
      ? `Moved "${task.title}" from ${existing.project.name} to ${target.name}`
      : patch.status && patch.status !== existing.status
        ? `Moved "${task.title}" to ${patch.status.replace("_", " ").toLowerCase()}`
        : `Updated "${task.title}"`,
    before: Object.fromEntries(
      Object.keys(patch).map((k) => [k, existing[k as keyof typeof existing]]),
    ),
    after: patch as Record<string, unknown>,
    metadata: { projectId: target?.id ?? existing.project.id },
  });

  return ok({ task });
}, { can: ["edit", "project"] });
