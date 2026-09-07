import Link from "next/link";
import { ListChecks } from "lucide-react";

import { prisma } from "@repo/database";
import { Button } from "@repo/ui";

import { EmptyState } from "@/components/os/empty-state";
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
export default async function TasksPage() {
  const [tasks, projects, users] = await Promise.all([
    prisma.projectTask.findMany({
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
    prisma.project.findMany({
      where: { status: { in: ["ACTIVE", "ON_HOLD"] } },
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        description="Work items inside a delivery project. Every task belongs to a project — a task with no project is a note, and notes belong on the client record."
      />

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

      {projects.length === 0 ? (
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
          projects={projects.map((p) => ({
            id: p.id,
            name: p.name,
            phase: p.phase,
            clientName: p.client.company || p.client.name || "Unnamed client",
          }))}
          users={users}
        />
      )}
    </div>
  );
}
