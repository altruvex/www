import Link from "next/link";
import { redirect } from "next/navigation";
import { ListChecks } from "lucide-react";

import { prisma } from "@repo/database";
import { Button } from "@repo/ui";

import { EmptyState } from "@/components/os/empty-state";
import { EntityAudit } from "@/components/os/entity-audit";
import { AlertBar } from "@/components/os/error-state";
import { ActiveFilters, FilterBar, FilterChip } from "@/components/os/filter-bar";
import { INSPECT_PARAM, inspectHref } from "@/components/os/inspect-sheet";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { getOperator } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { TasksClient, type TaskItem } from "./tasks-client";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

type Params = {
  project?: string;
  task?: string;
  inspect?: string;
  status?: string;
  assignee?: string;
  due?: string;
  q?: string;
  view?: string;
  new?: string;
};

const STATUS_VALUES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];

export default async function TasksPage({ searchParams }: { searchParams: Promise<Params> }) {
  const denied = await gateRoute("/tasks", "tasks");
  if (denied) return denied;

  const params = await searchParams;
  if (params.task && !params[INSPECT_PARAM]) {
    const { task, ...rest } = params;
    redirect(inspectHref("/tasks", rest, task));
  }

  const operator = await getOperator();
  const role = operator?.role;
  const me = operator?.session.user.id ?? null;
  const canEdit = can(role, "edit", "project");
  const canCreate = can(role, "create", "project");
  const canDelete = can(role, "delete", "project");

  const projectId = params.project?.trim() || null;
  const taskId = params[INSPECT_PARAM]?.trim() || null;
  const status = STATUS_VALUES.includes(params.status ?? "") ? params.status! : null;
  const assignee = params.assignee?.trim() || null;
  const due = params.due === "overdue" || params.due === "week" ? params.due : null;
  const q = params.q?.trim().toLowerCase() || null;
  const view = params.view === "list" ? "list" : "board";

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

  const isOpen = (t: TaskItem) => t.status !== "DONE" && t.status !== "CANCELLED";
  const isOverdue = (t: TaskItem) => isOpen(t) && t.dueDate != null && new Date(t.dueDate) < now;
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  const openTasks = items.filter(isOpen);
  const overdue = openTasks.filter(isOverdue);
  const blocked = openTasks.filter((t) => t.status === "BLOCKED");
  const unassigned = openTasks.filter((t) => !t.assigneeId);
  const done = items.filter((t) => t.status === "DONE").length;
  const mine = me ? openTasks.filter((t) => t.assigneeId === me).length : 0;
  const missingTask = taskId != null && !items.some((t) => t.id === taskId);

  const shown = items.filter((t) => {
    if (status ? t.status !== status : t.status === "CANCELLED") return false;
    if (assignee === "none" ? t.assigneeId != null : assignee === "me" ? t.assigneeId !== me : assignee ? t.assigneeId !== assignee : false) {
      return false;
    }
    if (due === "overdue" && !isOverdue(t)) return false;
    if (due === "week" && !(isOpen(t) && t.dueDate && new Date(t.dueDate) <= weekAhead)) return false;
    if (q && !`${t.title} ${t.detail ?? ""} ${t.projectName} ${t.clientName} ${t.assigneeName ?? ""}`.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
  const filtered = Boolean(status || assignee || due || q);

  const tileHref = (key: "status" | "assignee" | "due" | null, value: string | null) => {
    const next = new URLSearchParams();
    if (projectId) next.set("project", projectId);
    if (view === "list") next.set("view", "list");
    if (key && value) next.set(key, value);
    const query = next.toString();
    return query ? `/tasks?${query}` : "/tasks";
  };

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

      {missingTask && (
        <AlertBar tone="warning" href={`/audit?entity=task&id=${taskId}`} cta="Open the audit log">
          That task no longer exists. If it was deleted, the audit log has what it contained.
        </AlertBar>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="Open"
          value={openTasks.length}
          sub={`${done} done${scopeProject ? ` on ${scopeProject.name}` : ""}`}
          tone={openTasks.length > 0 ? "progress" : "neutral"}
          href={tileHref(null, null)}
        />
        <StatTile
          label="Overdue"
          value={overdue.length}
          sub="Open, past their due date"
          tone={overdue.length > 0 ? "danger" : "success"}
          href={tileHref("due", due === "overdue" ? null : "overdue")}
        />
        <StatTile
          label="Blocked"
          value={blocked.length}
          sub="Waiting on someone else"
          tone={blocked.length > 0 ? "warning" : "neutral"}
          href={tileHref("status", status === "BLOCKED" ? null : "BLOCKED")}
        />
        <StatTile
          label="Unassigned"
          value={unassigned.length}
          sub="Open with no owner"
          tone={unassigned.length > 0 ? "warning" : "neutral"}
          href={tileHref("assignee", assignee === "none" ? null : "none")}
        />
      </div>

      {projectOptions.length > 0 && (
        <div className="space-y-2">
          <FilterBar
            search={{ placeholder: "Search tasks, projects, people…" }}
            trailing={
              <div className="flex items-center gap-1" aria-label="Layout">
                <FilterChip param="view" label="Board" />
                <FilterChip param="view" value="list" label="List" />
              </div>
            }
          >
            <div className="flex max-w-full items-center gap-1 overflow-x-auto" aria-label="Status">
              <FilterChip param="status" label="Not cancelled" />
              {STATUS_VALUES.map((value) => (
                <FilterChip
                  key={value}
                  param="status"
                  value={value}
                  label={STATUS_LABEL[value]}
                  count={items.filter((t) => t.status === value).length}
                />
              ))}
            </div>
            <div className="flex items-center gap-1" aria-label="Owner and due date">
              {me && <FilterChip param="assignee" value="me" label="Mine" count={mine} />}
              <FilterChip param="due" value="week" label="Next 7 days + overdue" />
            </div>
          </FilterBar>
          <ActiveFilters
            labels={{ project: "Project", assignee: "Owner", due: "Due", status: "Status" }}
            valueLabels={{
              project: projectId && scopeProject ? { [projectId]: scopeProject.name } : {},
              assignee: {
                me: "Mine",
                none: "Unassigned",
                ...Object.fromEntries(users.map((u) => [u.id, u.name || u.email])),
              },
              due: { overdue: "Overdue", week: "Next 7 days + overdue" },
              status: STATUS_LABEL,
            }}
          />
        </div>
      )}

      {projectOptions.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No project to put work against"
          body="A task belongs to a delivery project. A project opens when a contract is signed, or you can record work that was built before this system."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {canCreate && (
                <Button asChild variant="outline">
                  <Link href="/projects?new=recorded">Record a project</Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/contracts">Open contracts</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <TasksClient
          items={shown}
          totalInScope={items.length}
          filtered={filtered}
          statusFilter={status}
          view={view}
          projects={projectOptions}
          users={users}
          scopeProjectId={scopeProject ? projectId : null}
          inspectId={missingTask ? null : taskId}
          inspected={missingTask ? null : (items.find((t) => t.id === taskId) ?? null)}
          inspectHistory={
            taskId && !missingTask ? <EntityAudit type="task" id={taskId} /> : null
          }
          canEdit={canEdit}
          canCreate={canCreate}
          canDelete={canDelete}
          openCreate={canCreate && params.new === "task"}
        />
      )}
    </div>
  );
}
