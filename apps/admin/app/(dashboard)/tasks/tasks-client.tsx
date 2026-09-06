"use client";

import * as React from "react";
import {
  List,
  LayoutGrid,
  Plus,
  Search,
  ArrowRight,
} from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { segmentClass } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar } from "@/components/ui/avatar";
import { ToneBadge } from "@/components/ui/badge";
import { dueLabel, initials } from "@/lib/format";
import { toast } from "sonner";

export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  projectName: string;
  clientName: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeName: string | null;
  dueDate: string | null;
  createdAt: string;
}

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "BACKLOG", label: "Backlog" },
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "REVIEW", label: "In Review" },
  { id: "DONE", label: "Completed" },
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; tone: "neutral" | "info" | "warning" | "danger" }> = {
  LOW: { label: "Low", tone: "neutral" },
  MEDIUM: { label: "Medium", tone: "info" },
  HIGH: { label: "High", tone: "warning" },
  URGENT: { label: "Urgent", tone: "danger" },
};

/** Radix Select has no empty value, so "nobody" needs a token of its own. */
const UNASSIGNED = "__unassigned__";

export function TasksClient({
  initialTasks,
  projects,
  teamUsers,
}: {
  initialTasks: TaskItem[];
  projects: { id: string; name: string; clientName: string }[];
  teamUsers: { id: string; name: string | null; email: string }[];
}) {
  const [tasks, setTasks] = React.useState<TaskItem[]>(initialTasks);
  const [viewMode, setViewMode] = React.useState<"board" | "list">("board");
  const [selectedProject, setSelectedProject] = React.useState<string>("all");
  const [selectedPriority, setSelectedPriority] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskDesc, setNewTaskDesc] = React.useState("");
  const [newTaskProject, setNewTaskProject] = React.useState(projects[0]?.id ?? "");
  const [newTaskPriority, setNewTaskPriority] = React.useState<TaskPriority>("MEDIUM");
  const [newTaskAssignee, setNewTaskAssignee] = React.useState(teamUsers[0]?.name ?? "");
  const [newTaskDueDate, setNewTaskDueDate] = React.useState("");

  const handleMoveStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    const colName = COLUMNS.find((c) => c.id === newStatus)?.label;
    toast.success(`Task moved to ${colName}`);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const proj = projects.find((p) => p.id === newTaskProject);
    const created: TaskItem = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      projectId: newTaskProject,
      projectName: proj?.name ?? "Internal",
      clientName: proj?.clientName ?? "Altruvex",
      status: "TODO",
      priority: newTaskPriority,
      assigneeName: newTaskAssignee || null,
      dueDate: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [created, ...prev]);
    setIsCreateOpen(false);
    setNewTaskTitle("");
    setNewTaskDesc("");
    toast.success("Task created successfully");
  };

  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (selectedProject !== "all" && t.projectId !== selectedProject) return false;
      if (selectedPriority !== "all" && t.priority !== selectedPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesProject = t.projectName.toLowerCase().includes(q);
        const matchesAssignee = t.assigneeName?.toLowerCase().includes(q) ?? false;
        return matchesTitle || matchesProject || matchesAssignee;
      }
      return true;
    });
  }, [tasks, selectedProject, selectedPriority, searchQuery]);

  const listColumns: Column<TaskItem>[] = [
    {
      id: "title",
      header: "Task",
      hideable: false,
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{row.title}</span>
          <span className="block truncate text-meta text-muted-foreground">
            {row.projectName} · {row.clientName}
          </span>
        </span>
      ),
      sortValue: (row) => row.title.toLowerCase(),
      searchValue: (row) => `${row.title} ${row.projectName} ${row.clientName}`,
    },
    {
      id: "status",
      header: "Status",
      width: "140px",
      cell: (row) => (
        <Select
          value={row.status}
          onValueChange={(value) => handleMoveStatus(row.id, value as TaskStatus)}
        >
          <SelectTrigger size="sm" aria-label={`Status of ${row.title}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLUMNS.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      sortValue: (row) => row.status,
    },
    {
      id: "priority",
      header: "Priority",
      width: "110px",
      cell: (row) => (
        <ToneBadge tone={PRIORITY_CONFIG[row.priority].tone}>
          {PRIORITY_CONFIG[row.priority].label}
        </ToneBadge>
      ),
      sortValue: (row) => ["URGENT", "HIGH", "MEDIUM", "LOW"].indexOf(row.priority),
    },
    {
      id: "assignee",
      header: "Assignee",
      width: "140px",
      cell: (row) => (
        <span className="flex items-center gap-1.5 text-meta text-muted-foreground">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-micro font-semibold text-foreground">
            {initials(row.assigneeName)}
          </span>
          <span className="truncate">{row.assigneeName ?? "Unassigned"}</span>
        </span>
      ),
      sortValue: (row) => row.assigneeName ?? "",
    },
    {
      id: "dueDate",
      header: "Due",
      width: "130px",
      cell: (row) =>
        row.dueDate ? (
          <span className="font-mono text-meta text-muted-foreground">{dueLabel(row.dueDate)}</span>
        ) : (
          <span className="font-mono text-meta text-subtle-foreground">—</span>
        ),
      sortValue: (row) => (row.dueDate ? new Date(row.dueDate).getTime() : 0),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger aria-label="Filter by project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects ({tasks.length})</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger aria-label="Filter by priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative min-w-0 sm:w-56">
            <Search className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks…"
              aria-label="Filter tasks"
              className="ps-7"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Two views of one list: a segmented control, the same one the
              proposal builder uses — not two buttons that happen to look joined. */}
          <div role="radiogroup" aria-label="View" className="flex items-center gap-1.5">
            {([
              { id: "board", label: "Board", icon: LayoutGrid },
              { id: "list", label: "List", icon: List },
            ] as const).map((view) => (
              <button
                key={view.id}
                type="button"
                role="radio"
                aria-checked={viewMode === view.id}
                onClick={() => setViewMode(view.id)}
                className={segmentClass({ selected: viewMode === view.id })}
              >
                <view.icon />
                {view.label}
              </button>
            ))}
          </div>

          <Button variant="brand" onClick={() => setIsCreateOpen(true)}>
            <Plus />
            New task
          </Button>
        </div>
      </div>

      {/* Main View */}
      {viewMode === "board" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5 items-start">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-lg border border-border bg-surface/50 p-2.5 space-y-2.5 min-h-[350px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <span className="font-mono text-micro uppercase font-semibold text-foreground/80">
                    {col.label}
                  </span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-micro tabular-nums text-muted-foreground">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Task Cards */}
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group space-y-2 rounded-md border border-border bg-card p-3 transition-colors duration-[var(--dur-state)] hover:border-border-mid"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-base font-medium leading-snug text-foreground line-clamp-2">
                          {task.title}
                        </span>
                        <ToneBadge tone={PRIORITY_CONFIG[task.priority].tone}>
                          {PRIORITY_CONFIG[task.priority].label}
                        </ToneBadge>
                      </div>

                      {task.description && (
                        <p className="text-meta text-muted-foreground line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="border-t border-border/50 pt-2 flex items-center justify-between text-meta text-muted-foreground">
                        <span className="max-w-[110px] truncate font-mono text-micro">
                          {task.projectName}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {task.assigneeName && (
                            <Avatar name={task.assigneeName} size="sm" />
                          )}
                        </div>
                      </div>

                      {/* Quick Move Next Stage */}
                      <div className="flex items-center justify-between pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {col.id !== "DONE" ? (
                          <button
                            onClick={() => {
                              const nextIdx = COLUMNS.findIndex((c) => c.id === col.id) + 1;
                              if (nextIdx < COLUMNS.length) handleMoveStatus(task.id, COLUMNS[nextIdx].id);
                            }}
                            className="inline-flex cursor-pointer items-center gap-1 font-mono text-micro text-brand hover:underline"
                          >
                            <span>Advance</span>
                            <ArrowRight className="size-2.5" />
                          </button>
                        ) : (
                          <span className="text-micro text-success font-mono">Done ✓</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="rounded-md border border-dashed border-border/70 p-4 text-center text-meta text-subtle-foreground">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <DataTable
          tableId="tasks-list"
          rows={filteredTasks}
          columns={listColumns}
          rowKey={(r) => r.id}
          searchPlaceholder="Search tasks…"
          empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No tasks found.</div>}
        />
      )}

      {/* Creating a task is contextual work, so it happens in a Sheet: the board
          stays visible behind it. */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>New task</SheetTitle>
            <SheetDescription>Tracked against a project, owned by one person.</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleCreateTask} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="space-y-4">
              <Field label="Task title">
                <Input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Finalize payment gateway integration"
                />
              </Field>

              <Field label="Project">
                <Select value={newTaskProject} onValueChange={setNewTaskProject}>
                  <SelectTrigger className="w-full" aria-label="Project">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.clientName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Priority">
                  <Select
                    value={newTaskPriority}
                    onValueChange={(value) => setNewTaskPriority(value as TaskPriority)}
                  >
                    <SelectTrigger className="w-full" aria-label="Priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Assignee">
                  <Select
                    value={newTaskAssignee || UNASSIGNED}
                    onValueChange={(value) => setNewTaskAssignee(value === UNASSIGNED ? "" : value)}
                  >
                    <SelectTrigger className="w-full" aria-label="Assignee">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {teamUsers.map((u) => (
                        <SelectItem key={u.id} value={u.name ?? u.email}>
                          {u.name ?? u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Due date">
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                />
              </Field>

              <Field label="Description / notes">
                <Textarea
                  rows={3}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Optional context or acceptance criteria…"
                />
              </Field>
            </SheetBody>

            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="brand">
                Create task
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
