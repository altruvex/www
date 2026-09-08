"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@repo/ui";

import { EmptyInline } from "@/components/os/empty-state";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { dueLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface TaskItem {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  priority: string;
  phase: string | null;
  projectId: string;
  projectName: string;
  clientName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

/**
 * Columns mirror the `TaskStatus` enum exactly.
 *
 * The board this replaced had five columns (BACKLOG, TODO, IN_PROGRESS, REVIEW,
 * DONE) that existed in no schema anywhere, so a card could sit in a column the
 * database had no way to store.
 */
const COLUMNS = [
  { id: "TODO", label: "To do" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "BLOCKED", label: "Blocked" },
  { id: "DONE", label: "Done" },
] as const;

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const UNASSIGNED = "__unassigned__";

export function TasksClient({
  items,
  projects,
  users,
}: {
  items: TaskItem[];
  projects: { id: string; name: string; phase: string; clientName: string }[];
  users: { id: string; name: string | null; email: string }[];
}) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const [projectFilter, setProjectFilter] = React.useState<string>(UNASSIGNED);

  const visible =
    projectFilter === UNASSIGNED
      ? items
      : items.filter((task) => task.projectId === projectFilter);

  async function call(
    method: "POST" | "PATCH" | "DELETE",
    body: unknown,
    okMessage: string,
  ): Promise<boolean> {
    const res = await fetch("/api/admin/tasks", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      toast.error("Your session expired. Sign in again.");
      router.push("/login");
      return false;
    }
    const data = (await res.json()) as { success: boolean; message?: string };
    if (!data.success) {
      toast.error(data.message ?? "That change could not be saved.");
      return false;
    }
    toast.success(okMessage);
    router.refresh();
    return true;
  }

  async function move(task: TaskItem, status: string) {
    if (status === task.status) return;
    setPending(task.id);
    await call("PATCH", { id: task.id, status }, `Moved to ${status.replace("_", " ").toLowerCase()}.`);
    setPending(null);
  }

  return (
    <>
      <Panel
        title="Board"
        description={`${visible.length} task${visible.length === 1 ? "" : "s"}`}
        action={
          <div className="flex items-center gap-1.5">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-48" aria-label="Filter by project">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>All projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="brand" size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-3.5" />
              New task
            </Button>
          </div>
        }
        flush
      >
        {visible.length === 0 ? (
          <EmptyInline
            action={
              <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
                Add the first task
              </Button>
            }
          >
            {items.length === 0
              ? "No task has been created yet. A task is a unit of delivery work with an owner and a due date — add one and it appears on this board and on its project."
              : "No task on that project."}
          </EmptyInline>
        ) : (
          <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((column) => {
              const columnTasks = visible.filter((task) => task.status === column.id);
              return (
                <section key={column.id} className="min-w-0 space-y-2">
                  <header className="flex items-center justify-between gap-2">
                    <h3 className="telemetry text-subtle-foreground">{column.label}</h3>
                    <span className="text-meta tabular-nums text-subtle-foreground">
                      {columnTasks.length}
                    </span>
                  </header>

                  <ul className="space-y-1.5">
                    {columnTasks.length === 0 && (
                      <li className="rounded-sm border border-dashed border-border px-2 py-4 text-center text-meta text-subtle-foreground">
                        Empty
                      </li>
                    )}
                    {columnTasks.map((task) => (
                      <li
                        key={task.id}
                        className={cn(
                          "plane space-y-1.5 p-2",
                          pending === task.id && "opacity-60",
                        )}
                      >
                        <p className="text-base leading-snug">{task.title}</p>
                        <p className="truncate text-meta text-subtle-foreground">
                          <Link
                            href={`/projects/${task.projectId}`}
                            className="hover:text-foreground hover:underline"
                          >
                            {task.projectName}
                          </Link>
                          {" · "}
                          {task.assigneeName ?? "Unassigned"}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusPill registry="priority" value={task.priority} variant="dot" />
                          {task.dueDate && task.status !== "DONE" && (
                            <span
                              className={cn(
                                "text-meta",
                                new Date(task.dueDate) < new Date()
                                  ? "text-danger"
                                  : "text-subtle-foreground",
                              )}
                            >
                              {dueLabel(task.dueDate)}
                            </span>
                          )}
                        </div>
                        <Select
                          value={task.status}
                          onValueChange={(value) => move(task, value)}
                          disabled={pending === task.id}
                        >
                          <SelectTrigger
                            className="h-7 w-full"
                            aria-label={`Status for ${task.title}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLUMNS.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </Panel>

      <CreateTaskSheet
        // Remount per opening so the form starts clean without an effect.
        key={creating ? `open-${projectFilter}` : "closed"}
        open={creating}
        onOpenChange={setCreating}
        projects={projects}
        users={users}
        defaultProjectId={projectFilter === UNASSIGNED ? (projects[0]?.id ?? "") : projectFilter}
        onSubmit={async (body) => {
          const done = await call("POST", body, "Task created.");
          if (done) setCreating(false);
        }}
      />
    </>
  );
}

function CreateTaskSheet({
  open,
  onOpenChange,
  projects,
  users,
  defaultProjectId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string; clientName: string }[];
  users: { id: string; name: string | null; email: string }[];
  defaultProjectId: string;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  // Seeded once per open; the caller remounts on `open` via `key`, so the
  // operator's choice is never overwritten while the sheet is on screen.
  const [projectId, setProjectId] = React.useState(defaultProjectId);
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [priority, setPriority] = React.useState<string>("MEDIUM");
  const [assigneeId, setAssigneeId] = React.useState<string>(UNASSIGNED);
  const [dueDate, setDueDate] = React.useState("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New task</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-3 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!title.trim() || !projectId) return;
            setBusy(true);
            await onSubmit({
              projectId,
              title: title.trim(),
              detail: detail.trim() || null,
              priority,
              assigneeId: assigneeId === UNASSIGNED ? null : assigneeId,
              dueDate: dueDate || null,
            });
            setBusy(false);
            setTitle("");
            setDetail("");
            setDueDate("");
          }}
        >
          <label className="block space-y-1">
            <span className="telemetry block text-subtle-foreground">Project</span>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full" aria-label="Project">
                <SelectValue placeholder="Pick a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} · {project.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="block space-y-1">
            <span className="telemetry block text-subtle-foreground">Task</span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Wire the contact form to the CRM"
              required
              maxLength={300}
            />
          </label>

          <label className="block space-y-1">
            <span className="telemetry block text-subtle-foreground">Detail</span>
            <textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              rows={3}
              maxLength={5000}
              className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-base outline-none focus-visible:border-brand"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="telemetry block text-subtle-foreground">Priority</span>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full" aria-label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.charAt(0) + value.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="block space-y-1">
              <span className="telemetry block text-subtle-foreground">Due</span>
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="telemetry block text-subtle-foreground">Assignee</span>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="w-full" aria-label="Assignee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={busy || !title.trim() || !projectId}>
              {busy ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
