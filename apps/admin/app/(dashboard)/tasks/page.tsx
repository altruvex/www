import { prisma } from "@repo/database";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { TasksClient, type TaskItem } from "./tasks-client";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [projects, users] = await Promise.all([
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        phase: true,
        status: true,
        createdAt: true,
        client: { select: { id: true, name: true, company: true } },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
    }),
  ]);

  const defaultAssignee = users[0]?.name || users[0]?.email || "Lead Engineer";

  // Derive active delivery tasks from existing projects and their phases
  const tasks: TaskItem[] = projects.flatMap((p, idx) => {
    const clientLabel = p.client.company || p.client.name || "Client";
    const baseDate = new Date(p.createdAt);

    return [
      {
        id: `task-${p.id}-1`,
        title: `Technical Discovery & Architecture Spec for ${p.name}`,
        description: `Define system boundaries, database schemas, and integration points with ${clientLabel}.`,
        projectId: p.id,
        projectName: p.name,
        clientName: clientLabel,
        status: p.phase === "DISCOVERY" ? "IN_PROGRESS" : "DONE",
        priority: "HIGH",
        assigneeName: defaultAssignee,
        dueDate: new Date(baseDate.getTime() + 7 * 86400000).toISOString(),
        createdAt: baseDate.toISOString(),
      },
      {
        id: `task-${p.id}-2`,
        title: `Design Tokens & Interactive Components for ${p.name}`,
        description: `Implement verified UI/UX components matching brand aesthetic.`,
        projectId: p.id,
        projectName: p.name,
        clientName: clientLabel,
        status: p.phase === "DESIGN" ? "IN_PROGRESS" : p.phase === "DISCOVERY" ? "TODO" : "DONE",
        priority: "MEDIUM",
        assigneeName: defaultAssignee,
        dueDate: new Date(baseDate.getTime() + 14 * 86400000).toISOString(),
        createdAt: baseDate.toISOString(),
      },
      {
        id: `task-${p.id}-3`,
        title: `Core Backend API & Database Implementation`,
        description: `Build REST/GraphQL endpoints, security rules, and business logic.`,
        projectId: p.id,
        projectName: p.name,
        clientName: clientLabel,
        status: p.phase === "DEVELOPMENT" ? "IN_PROGRESS" : ["DISCOVERY", "DESIGN"].includes(p.phase) ? "BACKLOG" : "DONE",
        priority: "URGENT",
        assigneeName: defaultAssignee,
        dueDate: new Date(baseDate.getTime() + 21 * 86400000).toISOString(),
        createdAt: baseDate.toISOString(),
      },
      {
        id: `task-${p.id}-4`,
        title: `Staging Deployment & Quality Assurance Review`,
        description: `Automated test suites, cross-browser verification, and client walkthrough.`,
        projectId: p.id,
        projectName: p.name,
        clientName: clientLabel,
        status: p.phase === "QA" || p.phase === "STAGING_REVIEW" ? "REVIEW" : p.phase === "LAUNCHED" ? "DONE" : "BACKLOG",
        priority: "HIGH",
        assigneeName: defaultAssignee,
        dueDate: new Date(baseDate.getTime() + 28 * 86400000).toISOString(),
        createdAt: baseDate.toISOString(),
      },
    ];
  });

  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const reviewCount = tasks.filter((t) => t.status === "REVIEW").length;
  const urgentCount = tasks.filter((t) => t.priority === "URGENT" || t.priority === "HIGH").length;
  const completedCount = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        description="Project work items, delivery sprints, and engineering milestones. Viewable as an interactive Kanban board or dense list."
      />

      {/* Stat Tiles */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total Tasks"
          value={tasks.length}
          sub={`${projects.length} connected projects`}
        />
        <StatTile
          label="In Progress"
          value={inProgressCount}
          tone="progress"
          sub={`${reviewCount} in review`}
        />
        <StatTile
          label="Urgent & High Priority"
          value={urgentCount}
          tone={urgentCount > 0 ? "warning" : "neutral"}
          sub="Requires attention"
        />
        <StatTile
          label="Completed"
          value={completedCount}
          tone="success"
          sub={`${Math.round((completedCount / (tasks.length || 1)) * 100)}% delivery progress`}
        />
      </div>

      <TasksClient
        initialTasks={tasks}
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          clientName: p.client.company || p.client.name || "Client",
        }))}
        teamUsers={users}
      />
    </div>
  );
}
