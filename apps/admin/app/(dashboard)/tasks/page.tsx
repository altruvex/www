import Link from "next/link";
import { ListChecks } from "lucide-react";

import { prisma } from "@repo/database";
import { Button } from "@repo/ui";

import { EmptyState } from "@/components/os/empty-state";
import { FilterChip } from "@/components/os/data-table";
import { AlertBar } from "@/components/os/error-state";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { TasksClient, type TaskItem } from "./tasks-client";

export const dynamic = "force-dynamic";

/**
 * Delivery tasks (§5).
 *
 * These rows are real. The previous version of this screen derived three tasks
 * per project from its phase, gave them ids like `task-<projectId>-1`, and
 * answered "create" with a toast that wrote nothing — so an operator who
 * assigned work here lost it on refresh. Everything below is `ProjectTask`.
 */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; task?: string }>;
}) {
  const { project: projectParam, task: taskParam } = await searchParams;
  const projectId = projectParam?.trim() || null;
  const taskId = taskParam?.trim() || null;

  // `?project=` scopes the board and its counts to one project (the project
  // page links here); `?task=` opens one task's sheet (entityHref for a task).
  const [tasks, projects, users, scopeProject] = await Promise.all([
    prisma.projectTask.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: {
          select: {
            id: true,
            name: true,
            phase: true,
            client: { select: { id: true, name: true, company: true } },
          },
        },
      },
    }),
    // Work is put against live projects. A closed project named in the scope
    // is still offered, so its own tasks can be edited and re-homed.
    prisma.project.findMany({
      where: {
        OR: [{ status: { in: ["ACTIVE", "ON_HOLD"] } }, ...(projectId ? [{ id: projectId }] : [])],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        phase: true,
        client: { select: { name: true, company: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    projectId
      ? prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
      : null,
  ]);

  const now = new Date();

  const items: TaskItem[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    detail: task.detail,
    status: task.status,
    priority: task.priority,
    phase: task.phase,
    projectId: task.project.id,
    projectName: task.project.name,
    clientId: task.project.client.id,
    clientName: task.project.client.company || task.project.client.name || "Unnamed client",
    assigneeId: task.assignee?.id ?? null,
    assigneeName: task.assignee?.name || task.assignee?.email || null,
    dueDate: task.dueDate?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
  }));

  const openTasks = items.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");
  const overdue = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);
  const blocked = openTasks.filter((t) => t.status === "BLOCKED");
  const unassigned = openTasks.filter((t) => !t.assigneeId);
  const missingTask = taskId != null && !items.some((t) => t.id === taskId);

  // Projects the edit sheet may need that the live list leaves out: a task on
  // a completed project still has to show its own project in the picker.
  const projectOptions = projects.map((p) => ({
    id: p.id,
    name: p.name,
    phase: p.phase,
    clientName: p.client.company || p.client.name || "Unnamed client",
  }));
  for (const task of tasks) {
    if (!projectOptions.some((p) => p.id === task.project.id)) {
      projectOptions.push({
        id: task.project.id,
        name: task.project.name,
        phase: task.project.phase,
        clientName: task.project.client.company || task.project.client.name || "Unnamed client",
      });
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        description="Work items inside a delivery project. Every task belongs to a project — a task with no project is a note, and notes belong on the client record."
      />

      {projectId && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            label="Project"
            value={scopeProject?.name ?? "Unknown project"}
            clearHref="/tasks"
          />
        </div>
      )}

      {missingTask && (
        <AlertBar tone="warning" href={`/audit?entity=task&id=${taskId}`} cta="Open the audit log">
          That task no longer exists. If it was deleted, the audit log has what it contained.
        </AlertBar>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Open"
          value={openTasks.length}
          sub={`of ${items.length} total`}
          tone={openTasks.length > 0 ? "progress" : "neutral"}
        />
        <StatTile
          label="Overdue"
          value={overdue.length}
          sub="Past their due date"
          tone={overdue.length > 0 ? "danger" : "success"}
        />
        <StatTile
          label="Blocked"
          value={blocked.length}
          sub="Waiting on someone else"
          tone={blocked.length > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Unassigned"
          value={unassigned.length}
          sub="Open with no owner"
          tone={unassigned.length > 0 ? "warning" : "neutral"}
        />
      </div>

      {projectOptions.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No project to put work against"
          body="A task belongs to a delivery project, and a project is created from a signed contract. Sign a contract and the project — and somewhere to track its work — appears."
          action={
            <Button asChild variant="outline">
              <Link href="/contracts">Open contracts</Link>
            </Button>
          }
        />
      ) : (
        <TasksClient
          items={items}
          projects={projectOptions}
          users={users}
          scopeProjectId={scopeProject ? projectId : null}
          openTaskId={missingTask ? null : taskId}
        />
      )}
    </div>
  );
}
