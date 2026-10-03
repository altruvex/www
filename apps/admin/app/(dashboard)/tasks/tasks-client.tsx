"use client";

import * as React from "react";
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
import { EntityLink } from "@/components/os/entity-link";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { dueLabel } from "@/lib/format";
import { optionsOf } from "@/lib/status";
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
  clientId: string;
  clientName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

type ProjectOption = { id: string; name: string; phase: string; clientName: string };
type UserOption = { id: string; name: string | null; email: string };

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
const CANCELLED_COLUMN = { id: "CANCELLED", label: "Cancelled" } as const;
const ALL_COLUMNS = [...COLUMNS, CANCELLED_COLUMN];

/**
 * What the board shows. Cancelled work is off the default board (it is not
 * work anyone will do) but never unreachable: "All" and "Cancelled" bring it
 * back, so a task cancelled by mistake can be found and reopened.
 */
const VIEWS = [
  { id: "board", label: "Board" },
  { id: "all", label: "All, incl. cancelled" },
  ...ALL_COLUMNS.map((c) => ({ id: c.id as string, label: c.label as string })),
];

const GRID: Record<number, string> = {
  1: "grid-cols-1",
  4: "md:grid-cols-2 xl:grid-cols-4",
  5: "md:grid-cols-2 xl:grid-cols-5",
};

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const NONE = "__none__";
const ALL_PROJECTS = "__all__";

export function TasksClient({
  items,
  projects,
  users,
  scopeProjectId,
  openTaskId,
}: {
  items: TaskItem[];
  projects: ProjectOption[];
  users: UserOption[];
  /** `?project=` — the board is already scoped server-side. */
  scopeProjectId: string | null;
  /** `?task=` — open this task's sheet on arrival. */
  openTaskId: string | null;
}) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(openTaskId);
  const [pending, setPending] = React.useState<string | null>(null);
  const [view, setView] = React.useState<string>(() => {
    // Arriving on a cancelled task's link should show the card it opened.
    const opened = items.find((t) => t.id === openTaskId);
    return opened?.status === "CANCELLED" ? "all" : "board";
  });
  const del = useRecordDelete({ entity: "task" });

  const scopeHref = scopeProjectId ? `/tasks?project=${scopeProjectId}` : "/tasks";
  const columns =
    view === "board" ? COLUMNS : view === "all" ? ALL_COLUMNS : ALL_COLUMNS.filter((c) => c.id === view);
  const shown = new Set<string>(columns.map((c) => c.id));
  const visible = items.filter((task) => shown.has(task.status));
  const editing = editingId ? (items.find((t) => t.id === editingId) ?? null) : null;

  async function call(method: "POST" | "PATCH", body: unknown, okMessage: string): Promise<boolean> {
    let data: { success?: boolean; message?: string } = {};
    let status = 0;
    try {
      const res = await fetch("/api/admin/tasks", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      status = res.status;
      data = (await res.json().catch(() => ({}))) as typeof data;
    } catch {
      toast.error("The server could not be reached. Nothing was saved.");
      return false;
    }
    if (status === 401) {
      toast.error("Your session expired. Sign in again.");
      router.push("/login");
      return false;
    }
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

  function closeEditor() {
    setEditingId(null);
    // Drop `?task=` so a refresh does not reopen the sheet just closed.
    if (openTaskId) router.replace(scopeHref, { scroll: false });
  }

  return (
    <>
      <Panel
        title="Board"
        description={`${visible.length} task${visible.length === 1 ? "" : "s"}`}
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <Select
              value={scopeProjectId ?? ALL_PROJECTS}
              onValueChange={(value) =>
                router.push(value === ALL_PROJECTS ? "/tasks" : `/tasks?project=${value}`)
              }
            >
              <SelectTrigger className="w-40 sm:w-48" aria-label="Filter by project">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={view} onValueChange={setView}>
              <SelectTrigger className="w-36 sm:w-44" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEWS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
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
              items.length === 0 ? (
                <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
                  Add the first task
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setView("all")}>
                  Show every status
                </Button>
              )
            }
          >
            {items.length === 0
              ? scopeProjectId
                ? "No task on this project yet. A task is a unit of delivery work with an owner and a due date — add one and it appears here and on the project."
                : "No task has been created yet. A task is a unit of delivery work with an owner and a due date — add one and it appears on this board and on its project."
              : "No task matches this status filter."}
          </EmptyInline>
        ) : (
          <div className={cn("grid gap-3 p-3", GRID[columns.length])}>
            {columns.map((column) => {
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
                          editingId === task.id && "border-brand",
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(task.id)}
                            className="min-w-0 text-start text-base leading-snug hover:underline"
                          >
                            {task.title}
                          </button>
                          <RowActions
                            onDelete={() => del.request({ id: task.id, label: task.title })}
                          />
                        </div>
                        <p className="truncate text-meta text-subtle-foreground">
                          <EntityLink type="project" id={task.projectId} muted>
                            {task.projectName}
                          </EntityLink>
                          {" · "}
                          {task.assigneeName ?? "Unassigned"}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusPill registry="priority" value={task.priority} variant="dot" />
                          {task.phase && (
                            <StatusPill registry="projectPhase" value={task.phase} variant="dot" />
                          )}
                          {task.dueDate && task.status !== "DONE" && task.status !== "CANCELLED" && (
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
                            {ALL_COLUMNS.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
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
        key={creating ? `open-${scopeProjectId ?? ""}` : "closed"}
        open={creating}
        onOpenChange={setCreating}
        projects={projects}
        users={users}
        defaultProjectId={scopeProjectId ?? projects[0]?.id ?? ""}
        onSubmit={async (body) => {
          const done = await call("POST", body, "Task created.");
          if (done) setCreating(false);
        }}
      />

      <EditTaskSheet
        // Remount per task so the form always starts from the saved row.
        key={editing?.id ?? "none"}
        task={editing}
        onClose={closeEditor}
        projects={projects}
        users={users}
        onSubmit={async (patch) => {
          if (!editing) return;
          if (Object.keys(patch).length === 0) {
            toast("Nothing changed.");
            closeEditor();
            return;
          }
          const done = await call("PATCH", { id: editing.id, ...patch }, "Task saved.");
          if (done) closeEditor();
        }}
      />

      {del.dialog}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="telemetry block text-subtle-foreground">{label}</span>
      {children}
    </label>
  );
}

const textareaClass =
  "w-full rounded-sm border border-border bg-background px-2 py-1.5 text-base outline-none focus-visible:border-brand";

function PrioritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full" aria-label="Priority">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRIORITIES.map((p) => (
          <SelectItem key={p} value={p}>
            {p.charAt(0) + p.slice(1).toLowerCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ProjectSelect({
  value,
  onChange,
  projects,
}: {
  value: string;
  onChange: (v: string) => void;
  projects: ProjectOption[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
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
  );
}

function AssigneeSelect({
  value,
  onChange,
  users,
}: {
  value: string;
  onChange: (v: string) => void;
  users: UserOption[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full" aria-label="Assignee">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Unassigned</SelectItem>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name || user.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  projects: ProjectOption[];
  users: UserOption[];
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
  const [assigneeId, setAssigneeId] = React.useState<string>(NONE);
  const [dueDate, setDueDate] = React.useState("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New task</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-3 overflow-y-auto p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!title.trim() || !projectId) return;
            setBusy(true);
            await onSubmit({
              projectId,
              title: title.trim(),
              detail: detail.trim() || null,
              priority,
              assigneeId: assigneeId === NONE ? null : assigneeId,
              dueDate: dueDate || null,
            });
            setBusy(false);
          }}
        >
          <Field label="Project">
            <ProjectSelect value={projectId} onChange={setProjectId} projects={projects} />
          </Field>

          <Field label="Task">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Wire the contact form to the CRM"
              required
              maxLength={300}
            />
          </Field>

          <Field label="Detail">
            <textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              rows={3}
              maxLength={5000}
              className={textareaClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <PrioritySelect value={priority} onChange={setPriority} />
            </Field>
            <Field label="Due">
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </Field>
          </div>

          <Field label="Assignee">
            <AssigneeSelect value={assigneeId} onChange={setAssigneeId} users={users} />
          </Field>

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

/**
 * Every field the tasks API accepts, in one place. Only the fields that moved
 * are sent, so the audit event names exactly what the operator changed.
 */
function EditTaskSheet({
  task,
  onClose,
  projects,
  users,
  onSubmit,
}: {
  task: TaskItem | null;
  onClose: () => void;
  projects: ProjectOption[];
  users: UserOption[];
  onSubmit: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [title, setTitle] = React.useState(task?.title ?? "");
  const [detail, setDetail] = React.useState(task?.detail ?? "");
  const [status, setStatus] = React.useState(task?.status ?? "TODO");
  const [priority, setPriority] = React.useState(task?.priority ?? "MEDIUM");
  const [projectId, setProjectId] = React.useState(task?.projectId ?? "");
  const [phase, setPhase] = React.useState(task?.phase ?? NONE);
  const [assigneeId, setAssigneeId] = React.useState(task?.assigneeId ?? NONE);
  const [dueDate, setDueDate] = React.useState(task?.dueDate?.slice(0, 10) ?? "");

  // An assignee who has since lost admin access is still who the task names;
  // keep them selectable rather than silently showing a blank picker.
  const userOptions =
    task?.assigneeId && !users.some((u) => u.id === task.assigneeId)
      ? [...users, { id: task.assigneeId, name: task.assigneeName, email: task.assigneeName ?? "Former member" }]
      : users;

  function changes(): Record<string, unknown> {
    if (!task) return {};
    const patch: Record<string, unknown> = {};
    const nextTitle = title.trim();
    const nextDetail = detail.trim() || null;
    const nextPhase = phase === NONE ? null : phase;
    const nextAssignee = assigneeId === NONE ? null : assigneeId;
    const nextDue = dueDate || null;
    if (nextTitle !== task.title) patch.title = nextTitle;
    if (nextDetail !== (task.detail ?? null)) patch.detail = nextDetail;
    if (status !== task.status) patch.status = status;
    if (priority !== task.priority) patch.priority = priority;
    if (projectId !== task.projectId) patch.projectId = projectId;
    if (nextPhase !== task.phase) patch.phase = nextPhase;
    if (nextAssignee !== task.assigneeId) patch.assigneeId = nextAssignee;
    if (nextDue !== (task.dueDate?.slice(0, 10) ?? null)) patch.dueDate = nextDue;
    return patch;
  }

  return (
    <Sheet open={task != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="end" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit task</SheetTitle>
        </SheetHeader>
        {task && (
          <form
            className="space-y-3 overflow-y-auto p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!title.trim()) return;
              setBusy(true);
              await onSubmit(changes());
              setBusy(false);
            }}
          >
            <p className="text-meta text-subtle-foreground">
              On{" "}
              <EntityLink type="project" id={task.projectId}>
                {task.projectName}
              </EntityLink>{" "}
              for{" "}
              <EntityLink type="client" id={task.clientId}>
                {task.clientName}
              </EntityLink>
            </p>

            <Field label="Task">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={300}
              />
            </Field>

            <Field label="Detail">
              <textarea
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                rows={4}
                maxLength={5000}
                className={textareaClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {optionsOf("taskStatus").map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Priority">
                <PrioritySelect value={priority} onChange={setPriority} />
              </Field>
            </div>

            <Field label="Project">
              <ProjectSelect value={projectId} onChange={setProjectId} projects={projects} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Phase">
                <Select value={phase} onValueChange={setPhase}>
                  <SelectTrigger className="w-full" aria-label="Phase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No phase</SelectItem>
                    {optionsOf("projectPhase").map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Due">
                <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </Field>
            </div>

            <Field label="Assignee">
              <AssigneeSelect value={assigneeId} onChange={setAssigneeId} users={userOptions} />
            </Field>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={busy || !title.trim()}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
