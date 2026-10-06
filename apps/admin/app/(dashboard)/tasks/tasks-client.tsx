"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, FolderKanban, ListChecks, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Button,
  DropdownMenuItem,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Textarea,
} from "@repo/ui";

import { SearchSelect } from "@/components/os/combobox-select";
import { DateField } from "@/components/os/date-field";
import { EmptyInline } from "@/components/os/empty-state";
import { InlineSelect } from "@/components/os/inline-select";
import { EntityLink } from "@/components/os/entity-link";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { InspectSheet, inspectHref } from "@/components/os/inspect-sheet";
import { useRowOpen } from "@/components/os/row-open";
import { List, ListRow } from "@/components/os/list-row";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { dueLabel } from "@/lib/format";
import { optionsOf } from "@/lib/status";
import { cn } from "@/lib/utils";
import { setTaskAssignee, setTaskDue, setTaskStatus, type TaskActionResult } from "@/app/(dashboard)/_actions/projects";
import { useSheetSide } from "@/app/(dashboard)/calendar/sheet-shell";

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

const COLUMNS = [
  { id: "TODO", label: "To do" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "BLOCKED", label: "Blocked" },
  { id: "DONE", label: "Done" },
] as const;
const CANCELLED_COLUMN = { id: "CANCELLED", label: "Cancelled" } as const;
const ALL_COLUMNS = [...COLUMNS, CANCELLED_COLUMN];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const NONE = "__none__";
const ALL_PROJECTS = "__all__";

const isOpenStatus = (status: string) => status !== "DONE" && status !== "CANCELLED";
const isLate = (task: TaskItem) =>
  isOpenStatus(task.status) && task.dueDate != null && new Date(task.dueDate) < new Date();

function report(result: TaskActionResult, router: ReturnType<typeof useRouter>) {
  if (!result.ok) {
    toast.error(result.message);
    return false;
  }
  if (result.message === "Nothing changed.") {
    toast(result.message);
    return false;
  }
  toast.success(result.message);
  router.refresh();
  return true;
}

export function TasksClient({
  items,
  totalInScope,
  filtered,
  statusFilter,
  view,
  projects,
  users,
  scopeProjectId,
  inspectId,
  inspected,
  inspectHistory,
  canEdit,
  canCreate,
  canDelete,
  openCreate = false,
}: {
  items: TaskItem[];
  totalInScope: number;
  filtered: boolean;
  statusFilter: string | null;
  view: "board" | "list";
  projects: ProjectOption[];
  users: UserOption[];
  scopeProjectId: string | null;
  inspectId: string | null;
  inspected: TaskItem | null;
  inspectHistory: React.ReactNode;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  openCreate?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [creating, setCreating] = React.useState(openCreate);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const del = useRecordDelete({
    entity: "task",
    onDeleted: () => {
      if (inspectId) router.replace(inspectHref(pathname, searchParams, null), { scroll: false });
    },
  });

  const columns =
    statusFilter == null ? COLUMNS : ALL_COLUMNS.filter((c) => c.id === statusFilter);
  const editing = editingId
    ? (items.find((t) => t.id === editingId) ?? (inspected?.id === editingId ? inspected : null))
    : null;
  const hrefFor = (id: string) => inspectHref(pathname, searchParams, id);
  const rowOpen = useRowOpen();

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
    toast.success(data.message ?? okMessage);
    router.refresh();
    return true;
  }

  function setCreatingOpen(open: boolean) {
    setCreating(open);
    if (!open && searchParams.has("new")) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("new");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }

  async function moveTo(task: TaskItem, status: string) {
    report(await setTaskStatus(task.id, status), router);
  }

  function rowMenu(task: TaskItem) {
    return (
      <RowActions
        onDelete={canDelete ? () => del.request({ id: task.id, label: task.title }) : undefined}
      >
        <DropdownMenuItem asChild>
          <Link href={`/projects/${task.projectId}#tasks`}>
            <FolderKanban className="size-3.5" />
            Open the project
          </Link>
        </DropdownMenuItem>
        {canEdit && task.status === "BLOCKED" && (
          <DropdownMenuItem onSelect={() => void moveTo(task, "IN_PROGRESS")}>
            <Play className="size-3.5" />
            Unblock (In progress)
          </DropdownMenuItem>
        )}
        {canEdit && isOpenStatus(task.status) && (
          <DropdownMenuItem onSelect={() => void moveTo(task, "DONE")}>
            <CircleCheck className="size-3.5" />
            Mark done
          </DropdownMenuItem>
        )}
      </RowActions>
    );
  }

  function openEditor(id: string) {
    if (inspectId) router.replace(inspectHref(pathname, searchParams, null), { scroll: false });
    setEditingId(id);
  }

  const projectPicker = (
    <SearchSelect
      ariaLabel="Filter by project"
      className="w-40 pointer-coarse:h-11 sm:w-48"
      value={scopeProjectId ?? ALL_PROJECTS}
      onChange={(value) => {
        const next = new URLSearchParams(searchParams.toString());
        next.delete("inspect");
        if (value === ALL_PROJECTS) next.delete("project");
        else next.set("project", value);
        const query = next.toString();
        router.push(query ? `/tasks?${query}` : "/tasks");
      }}
      options={[
        { value: ALL_PROJECTS, label: "All projects" },
        ...projects.map((project) => ({ value: project.id, label: project.name })),
      ]}
      placeholder="All projects"
      searchPlaceholder="Search projects"
    />
  );

  return (
    <>
      <Panel
        title={view === "list" ? "List" : "Board"}
        description={`${items.length} task${items.length === 1 ? "" : "s"}`}
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            {projectPicker}
            {canCreate && (
              <Button variant="brand" size="sm" className="pointer-coarse:h-11" onClick={() => setCreatingOpen(true)}>
                <Plus className="size-3.5" />
                New task
              </Button>
            )}
          </div>
        }
        flush
      >
        {items.length === 0 ? (
          <EmptyInline
            action={
              totalInScope === 0 && canCreate ? (
                <Button variant="outline" size="sm" onClick={() => setCreatingOpen(true)}>
                  Add the first task
                </Button>
              ) : filtered ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={scopeProjectId ? `/tasks?project=${scopeProjectId}` : "/tasks"}>
                    Clear the filters
                  </Link>
                </Button>
              ) : undefined
            }
          >
            {totalInScope === 0
              ? scopeProjectId
                ? "No task on this project yet. A task is a unit of delivery work with an owner and a due date — add one and it appears here and on the project."
                : "No task has been created yet. A task is a unit of delivery work with an owner and a due date — add one and it appears on this board and on its project."
              : filtered
                ? "No task matches these filters."
                : "Every task in scope is cancelled. The Cancelled chip shows them."}
          </EmptyInline>
        ) : view === "list" ? (
          <List label="Tasks">
            {items.map((task) => (
              <ListRow
                key={task.id}
                icon={<ListChecks />}
                tone={task.status === "BLOCKED" || isLate(task) ? "danger" : task.status === "DONE" ? "success" : "neutral"}
                title={task.title}
                inspect={hrefFor(task.id)}
                selected={task.id === inspectId}
                meta={
                  <>
                    <span className="truncate">{task.projectName}</span>
                    <span className={canEdit ? "sm:hidden" : undefined}>{task.assigneeName ?? "Unassigned"}</span>
                    {task.dueDate && isOpenStatus(task.status) && (
                      <span className={isLate(task) ? "text-danger" : undefined}>{dueLabel(task.dueDate)}</span>
                    )}
                  </>
                }
                trailing={<StatusPill registry="priority" value={task.priority} variant="dot" />}
                actions={
                  <>
                    {canEdit ? (
                      <>
                        <AssigneeInline task={task} users={users} className="hidden w-32 sm:inline-flex" />
                        <StatusInline task={task} />
                      </>
                    ) : (
                      <StatusPill registry="taskStatus" value={task.status} />
                    )}
                    {rowMenu(task)}
                  </>
                }
              />
            ))}
          </List>
        ) : (
          <div
            className={cn(
              "grid gap-3 p-3",
              columns.length === 1 ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-4",
            )}
          >
            {columns.map((column) => {
              const columnTasks = items.filter((task) => task.status === column.id);
              return (
                <section key={column.id} className="min-w-0 space-y-2" aria-label={column.label}>
                  <header className="flex items-center justify-between gap-2">
                    <h3 className="telemetry text-subtle-foreground">{column.label}</h3>
                    <span className="text-meta tabular-nums text-subtle-foreground">
                      {columnTasks.length}
                    </span>
                  </header>

                  <ul className="space-y-1.5">
                    {columnTasks.length === 0 && (
                      <li className="rounded-panel-sm border border-dashed border-border-subtle px-2 py-4 text-center text-meta text-subtle-foreground">
                        Empty
                      </li>
                    )}
                    {columnTasks.map((task) => (
                      <li
                        key={task.id}
                        onClick={rowOpen(hrefFor(task.id))}
                        className={cn(
                          "plane cursor-pointer space-y-1.5 p-2",
                          inspectId === task.id && "border-brand",
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <Link
                            href={hrefFor(task.id)}
                            scroll={false}
                            aria-haspopup="dialog"
                            className="min-w-0 py-0.5 text-start text-base leading-snug hover:underline pointer-coarse:py-2"
                          >
                            {task.title}
                          </Link>
                          {rowMenu(task)}
                        </div>
                        <p className="truncate text-meta text-subtle-foreground">
                          <EntityLink type="project" id={task.projectId} muted>
                            {task.projectName}
                          </EntityLink>
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusPill registry="priority" value={task.priority} variant="dot" />
                          {task.phase && (
                            <StatusPill registry="projectPhase" value={task.phase} variant="dot" />
                          )}
                          {task.dueDate && isOpenStatus(task.status) && (
                            <span className={cn("text-meta", isLate(task) ? "text-danger" : "text-subtle-foreground")}>
                              {dueLabel(task.dueDate)}
                            </span>
                          )}
                        </div>
                        {canEdit ? (
                          <div className="flex min-w-0 items-center justify-between gap-2 text-meta">
                            <StatusInline task={task} />
                            <AssigneeInline task={task} users={users} className="justify-end text-muted-foreground" />
                          </div>
                        ) : (
                          <p className="text-meta text-subtle-foreground">{task.assigneeName ?? "Unassigned"}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </Panel>

      <InspectSheet
        open={inspected != null}
        title={inspected?.title ?? "Task"}
        status={inspected ? <StatusPill registry="taskStatus" value={inspected.status} /> : undefined}
        subtitle={
          inspected ? (
            <>
              <EntityLink type="project" id={inspected.projectId}>
                {inspected.projectName}
              </EntityLink>
              {" · "}
              <EntityLink type="client" id={inspected.clientId} muted>
                {inspected.clientName}
              </EntityLink>
            </>
          ) : undefined
        }
        footer={
          inspected ? (
            <>
              {canEdit && canDelete && (
                <Button
                  variant="destructive-ghost"
                  onClick={() => del.request({ id: inspected.id, label: inspected.title })}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              )}
              <Button asChild variant="outline" className="ms-auto">
                <Link href={`/projects/${inspected.projectId}#tasks`}>
                  <FolderKanban className="size-3.5" aria-hidden />
                  Open the project
                </Link>
              </Button>
              {canEdit && (
                <Button variant="outline" onClick={() => openEditor(inspected.id)}>
                  <Pencil className="size-3.5" />
                  Edit all fields
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {inspected && (
          <div className="space-y-4">
            {canEdit ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Status">
                  <StatusSelect task={inspected} />
                </Field>
                <Field label="Assignee">
                  <AssigneeQuick task={inspected} users={users} />
                </Field>
                <Field label="Due">
                  <DueQuick key={inspected.dueDate ?? "none"} task={inspected} />
                </Field>
              </div>
            ) : (
              <dl className="grid grid-cols-3 gap-3 text-base">
                <div>
                  <dt className="telemetry text-subtle-foreground">Status</dt>
                  <dd><StatusPill registry="taskStatus" value={inspected.status} /></dd>
                </div>
                <div>
                  <dt className="telemetry text-subtle-foreground">Assignee</dt>
                  <dd>{inspected.assigneeName ?? "Unassigned"}</dd>
                </div>
                <div>
                  <dt className="telemetry text-subtle-foreground">Due</dt>
                  <dd>{inspected.dueDate ? inspected.dueDate.slice(0, 10) : "No date"}</dd>
                </div>
              </dl>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill registry="priority" value={inspected.priority} variant="dot" />
              {inspected.phase && <StatusPill registry="projectPhase" value={inspected.phase} variant="dot" />}
              {inspected.dueDate && isOpenStatus(inspected.status) && (
                <span className={cn("text-meta", isLate(inspected) ? "text-danger" : "text-subtle-foreground")}>
                  {dueLabel(inspected.dueDate)}
                </span>
              )}
              {inspected.completedAt && (
                <span className="text-meta text-subtle-foreground">
                  Completed {inspected.completedAt.slice(0, 10)}
                </span>
              )}
            </div>

            <section className="space-y-1">
              <h3 className="telemetry text-subtle-foreground">Detail</h3>
              <p className="whitespace-pre-wrap text-base text-muted-foreground">
                {inspected.detail || "No detail written. Edit all fields to add one."}
              </p>
            </section>

            {inspectHistory}
          </div>
        )}
      </InspectSheet>

      <CreateTaskSheet
        key={creating ? `open-${scopeProjectId ?? ""}` : "closed"}
        open={creating}
        onOpenChange={setCreatingOpen}
        projects={projects}
        users={users}
        defaultProjectId={scopeProjectId ?? projects[0]?.id ?? ""}
        onSubmit={async (body) => {
          const done = await call("POST", body, "Task created.");
          if (done) setCreatingOpen(false);
        }}
      />

      <EditTaskSheet
        key={editing?.id ?? "none"}
        task={editing}
        onClose={() => setEditingId(null)}
        projects={projects}
        users={users}
        onSubmit={async (patch) => {
          if (!editing) return;
          if (Object.keys(patch).length === 0) {
            toast("Nothing changed.");
            setEditingId(null);
            return;
          }
          const done = await call("PATCH", { id: editing.id, ...patch }, "Task saved.");
          if (done) setEditingId(null);
        }}
      />

      {del.dialog}
    </>
  );
}

function StatusSelect({ task }: { task: TaskItem }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <Select
      value={task.status}
      disabled={pending}
      onValueChange={(value) =>
        value !== task.status &&
        startTransition(async () => {
          report(await setTaskStatus(task.id, value), router);
        })
      }
    >
      <SelectTrigger
        className={cn("w-full pointer-coarse:h-11", pending && "opacity-60")}
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
  );
}

function AssigneeQuick({ task, users }: { task: TaskItem; users: UserOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const options = withFormerAssignee(task, users);
  return (
    <Select
      value={task.assigneeId ?? NONE}
      disabled={pending}
      onValueChange={(value) => {
        const next = value === NONE ? null : value;
        if (next === task.assigneeId) return;
        startTransition(async () => {
          report(await setTaskAssignee(task.id, next), router);
        });
      }}
    >
      <SelectTrigger
        className={cn("w-full pointer-coarse:h-11", pending && "opacity-60")}
        aria-label={`Assignee for ${task.title}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Unassigned</SelectItem>
        {options.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name || user.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StatusInline({ task }: { task: TaskItem }) {
  return (
    <InlineSelect
      ariaLabel={`Status for ${task.title}`}
      value={task.status}
      options={ALL_COLUMNS.map((option) => ({ value: option.id, label: option.label }))}
      display={(value) => <StatusPill registry="taskStatus" value={value} variant="dot" />}
      onCommit={(next) => setTaskStatus(task.id, next)}
    />
  );
}

function AssigneeInline({
  task,
  users,
  className,
}: {
  task: TaskItem;
  users: UserOption[];
  className?: string;
}) {
  return (
    <InlineSelect
      ariaLabel={`Assignee for ${task.title}`}
      className={className}
      value={task.assigneeId ?? NONE}
      options={[
        { value: NONE, label: "Unassigned" },
        ...withFormerAssignee(task, users).map((user) => ({ value: user.id, label: user.name || user.email })),
      ]}
      searchPlaceholder="Search the team"
      onCommit={(next) => setTaskAssignee(task.id, next === NONE ? null : next)}
    />
  );
}

function DueQuick({ task }: { task: TaskItem }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const saved = task.dueDate?.slice(0, 10) ?? "";
  const [value, setValue] = React.useState(saved);
  return (
    <DateField
      value={value}
      disabled={pending}
      ariaLabel={`Due date for ${task.title}`}
      className="pointer-coarse:h-11"
      onChange={(next) => {
        setValue(next);
        if (next === saved) return;
        startTransition(async () => {
          if (!report(await setTaskDue(task.id, next || null), router)) setValue(saved);
        });
      }}
    />
  );
}

function withFormerAssignee(task: TaskItem | null, users: UserOption[]): UserOption[] {
  return task?.assigneeId && !users.some((u) => u.id === task.assigneeId)
    ? [...users, { id: task.assigneeId, name: task.assigneeName, email: task.assigneeName ?? "Former member" }]
    : users;
}

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
    <SearchSelect
      ariaLabel="Project"
      value={value}
      onChange={onChange}
      options={projects.map((project) => ({
        value: project.id,
        label: `${project.name} · ${project.clientName}`,
      }))}
      placeholder="Pick a project"
      searchPlaceholder="Search projects or clients"
    />
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

function FormActions({
  onCancel,
  busy,
  disabled,
  label,
  busyLabel,
}: {
  onCancel: () => void;
  busy: boolean;
  disabled: boolean;
  label: string;
  busyLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <Button type="button" variant="ghost" className="pointer-coarse:h-11" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" variant="brand" className="pointer-coarse:h-11" disabled={busy || disabled}>
        {busy ? busyLabel : label}
      </Button>
    </div>
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
  const sheet = useSheetSide();
  const [busy, setBusy] = React.useState(false);
  const [projectId, setProjectId] = React.useState(defaultProjectId);
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [priority, setPriority] = React.useState<string>("MEDIUM");
  const [assigneeId, setAssigneeId] = React.useState<string>(NONE);
  const [dueDate, setDueDate] = React.useState("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={sheet.side} width="md" className={sheet.className}>
        <SheetHeader>
          <SheetTitle>New task</SheetTitle>
        </SheetHeader>
        <SheetBody className="overflow-y-auto">
          <form
            className="space-y-3"
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
              <Textarea
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                rows={3}
                maxLength={5000}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                <PrioritySelect value={priority} onChange={setPriority} />
              </Field>
              <Field label="Due">
                <DateField value={dueDate} onChange={setDueDate} />
              </Field>
            </div>

            <Field label="Assignee">
              <AssigneeSelect value={assigneeId} onChange={setAssigneeId} users={users} />
            </Field>

            <FormActions
              onCancel={() => onOpenChange(false)}
              busy={busy}
              disabled={!title.trim() || !projectId}
              label="Create task"
              busyLabel="Creating…"
            />
          </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

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
  const sheet = useSheetSide();
  const [busy, setBusy] = React.useState(false);
  const [title, setTitle] = React.useState(task?.title ?? "");
  const [detail, setDetail] = React.useState(task?.detail ?? "");
  const [status, setStatus] = React.useState(task?.status ?? "TODO");
  const [priority, setPriority] = React.useState(task?.priority ?? "MEDIUM");
  const [projectId, setProjectId] = React.useState(task?.projectId ?? "");
  const [phase, setPhase] = React.useState(task?.phase ?? NONE);
  const [assigneeId, setAssigneeId] = React.useState(task?.assigneeId ?? NONE);
  const [dueDate, setDueDate] = React.useState(task?.dueDate?.slice(0, 10) ?? "");

  const userOptions = withFormerAssignee(task, users);

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
      <SheetContent side={sheet.side} width="md" className={sheet.className}>
        <SheetHeader>
          <SheetTitle>Edit task</SheetTitle>
        </SheetHeader>
        {task && (
          <SheetBody className="overflow-y-auto">
            <form
              className="space-y-3"
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
                <Input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={300} />
              </Field>

              <Field label="Detail">
                <Textarea
                  value={detail}
                  onChange={(event) => setDetail(event.target.value)}
                  rows={4}
                  maxLength={5000}
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
                  <DateField value={dueDate} onChange={setDueDate} />
                </Field>
              </div>

              <Field label="Assignee">
                <AssigneeSelect value={assigneeId} onChange={setAssigneeId} users={userOptions} />
              </Field>

              <FormActions
                onCancel={onClose}
                busy={busy}
                disabled={!title.trim()}
                label="Save"
                busyLabel="Saving…"
              />
            </form>
          </SheetBody>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * "Add a task" where the project is shown: opens the same create sheet as the
 * board, pre-set to this project, and posts to the same endpoint.
 */
export function AddTaskButton({
  project,
  users,
  label = "Add a task",
  variant = "outline",
  size = "sm",
}: {
  project: ProjectOption;
  users: UserOption[];
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  async function create(body: Record<string, unknown>) {
    let data: { success?: boolean; message?: string } = {};
    let status = 0;
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      status = res.status;
      data = (await res.json().catch(() => ({}))) as typeof data;
    } catch {
      toast.error("The server could not be reached. Nothing was saved.");
      return;
    }
    if (status === 401) {
      toast.error("Your session expired. Sign in again.");
      router.push("/login");
      return;
    }
    if (!data.success) {
      toast.error(data.message ?? "That task could not be created.");
      return;
    }
    toast.success(data.message ?? "Task created.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant={variant} size={size} className="pointer-coarse:h-11" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        {label}
      </Button>
      <CreateTaskSheet
        key={open ? "open" : "closed"}
        open={open}
        onOpenChange={setOpen}
        projects={[project]}
        users={users}
        defaultProjectId={project.id}
        onSubmit={create}
      />
    </>
  );
}
