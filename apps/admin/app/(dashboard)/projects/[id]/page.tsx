import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import {
  Activity,
  FilePenLine,
  GitBranch,
  Globe,
  History,
  ListChecks,
  MessageCircle,
  Milestone as MilestoneIcon,
  Receipt,
  Server,
  Shuffle,
  Wallet,
} from "lucide-react";
import { PageHeader, MetaItem } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { MetaList, QuickActions } from "@/components/os/detail-layout";
import { Dossier, DossierSection } from "@/components/os/section-index";
import { EntityLink } from "@/components/os/entity-link";
import { EntityAudit } from "@/components/os/entity-audit";
import { EmptyInline } from "@/components/os/empty-state";
import { AlertBar } from "@/components/os/error-state";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { PROJECT_PHASE_ORDER, statusOf } from "@/lib/status";
import { date, dateTime, dueLabel, money, when } from "@/lib/format";
import { isPaymentOverdue } from "@/lib/payment-overdue";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { env } from "@/lib/env";
import { canSeeFinance } from "@/lib/nav";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { projectCurrency } from "@/lib/project-currency";
import { PhaseControl, ProjectMoreMenu } from "./phase-control";
import { ChangeRequestsPanel, type ChangeRequestRow } from "./change-requests";
import { EditProjectButton } from "./edit-project";
import { getProjectEngineering } from "@/lib/engineering";
import { httpUrl } from "@/lib/http-url";
import { Button } from "@repo/ui";
import { headers } from "next/headers";
import { getPricing } from "@/lib/pricing-store";
import { publicBaseUrlFromHeaders } from "@/lib/public-url";
import { emailTransport } from "@/lib/email";
import { ServicesList } from "@/components/os/services/services-list";
import { AttachPicker } from "@/components/os/attach-picker";
import { AddTaskButton } from "@/app/(dashboard)/tasks/tasks-client";
import { NewChargeButton } from "@/app/(dashboard)/payments/new-charge-dialog";
import { listServices, redactMoney } from "@/lib/client-services";
import { KIND_LABEL, needsAttention } from "@/lib/service-lifecycle";
import {
  coveredByWarranty,
  isOpen,
  rateFor,
  warrantyWindow,
} from "@/lib/change-requests";

export const dynamic = "force-dynamic";

const TASKS_SHOWN = 5;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const denied = await gateRoute("/projects/[id]", "this project");
  if (denied) return denied;

  const { id } = await params;
  const role = await currentRole();
  const finance = canSeeFinance(role);
  const canEdit = can(role, "edit", "project");
  const canMessage = can(role, "view", "message");
  const canPrice = canEdit && can(role, "create", "payment");

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          company: true,
          phone: true,
          email: true,
        },
      },
      contract: { include: { proposal: true } },
      payments: { orderBy: { dueDate: "asc" } },
      changeRequests: {
        orderBy: { requestedAt: "desc" },
        include: { payment: { select: { id: true, status: true } } },
      },
    },
  });
  if (!project) notFound();

  const [
    { terms },
    messages,
    services,
    clientProjects,
    clientProducts,
    engineering,
    openTasks,
    team,
    looseServices,
  ] = await Promise.all([
    getPricing(),
    canMessage
      ? prisma.whatsAppMessage.findMany({
          where: { clientId: project.clientId },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    listServices({ projectId: project.id }),
    prisma.project.findMany({
      where: { clientId: project.clientId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { clientId: project.clientId },
      select: { id: true, name: true, projectId: true },
      orderBy: { createdAt: "desc" },
    }),
    getProjectEngineering(project.id),
    prisma.projectTask.findMany({
      where: {
        projectId: project.id,
        status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
      },
      orderBy: [
        { dueDate: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      take: TASKS_SHOWN,
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        assignee: { select: { name: true, email: true } },
      },
    }),
    canEdit || can(role, "create", "project")
      ? prisma.user.findMany({
          where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    canEdit
      ? prisma.clientService.findMany({
          where: {
            clientId: project.clientId,
            projectId: null,
            status: { not: "CANCELLED" },
          },
          select: { id: true, name: true, kind: true, currency: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const looseProducts = canEdit
    ? clientProducts.filter((p) => p.projectId === null)
    : [];
  const taskProject = {
    id: project.id,
    name: project.name,
    phase: project.phase,
    clientName: project.client.company || project.client.name || "Unnamed client",
  };
  const servicesDue = services.filter((s) => needsAttention(s.state));

  const clientName =
    project.client.company || project.client.name || "Unnamed client";
  const now = new Date();
  const late =
    project.status === "ACTIVE" &&
    project.targetLaunchDate != null &&
    project.targetLaunchDate < now &&
    !project.actualLaunchDate;

  const billed = project.payments.reduce((s, p) => s + p.amount, 0);
  const collected = project.payments
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.amount, 0);
  const overdue = project.payments.filter((p) => isPaymentOverdue(p, now));

  const recorded = project.origin === "RECORDED";
  const elapsedWeeks = Math.round(
    (now.getTime() - project.createdAt.getTime()) / 604_800_000,
  );

  const phaseIndex = PROJECT_PHASE_ORDER.indexOf(
    project.phase as (typeof PROJECT_PHASE_ORDER)[number],
  );
  const progress = Math.round(
    ((phaseIndex + 1) / PROJECT_PHASE_ORDER.length) * 100,
  );

  const currency = projectCurrency(project);
  const warranty = warrantyWindow(
    project.actualLaunchDate,
    terms.postLaunchWarrantyDays,
    now,
  );
  const openRequests = project.changeRequests.filter((c) => isOpen(c.status));
  const changeBilled = project.changeRequests.reduce(
    (s, c) => s + (c.billedAmount ?? 0),
    0,
  );
  const changeRows: ChangeRequestRow[] = project.changeRequests.map((c) => ({
    id: c.id,
    title: c.title,
    detail: c.detail,
    status: c.status,
    pricing: c.pricing,
    estimatedMinutes: c.estimatedMinutes,
    actualMinutes: c.actualMinutes,
    hourlyRate: finance ? c.hourlyRate : null,
    quotedAmount: finance ? c.quotedAmount : null,
    billedAmount: finance ? c.billedAmount : null,
    requestedAt: c.requestedAt.toISOString(),
    deliveredAt: c.deliveredAt?.toISOString() ?? null,
    warrantyEligible: coveredByWarranty(
      c.requestedAt,
      project.actualLaunchDate,
      terms.postLaunchWarrantyDays,
    ),
    payment: c.payment,
    quoteToken: c.quoteToken,
    quoteSentAt: c.quoteSentAt?.toISOString() ?? null,
    quoteSentVia: c.quoteSentVia,
    quoteViewedAt: c.quoteViewedAt?.toISOString() ?? null,
    quoteExpiresAt: c.quoteExpiresAt?.toISOString() ?? null,
    respondedByName: c.respondedByName,
    clientResponseNote: c.clientResponseNote,
  }));
  let quoteBaseUrl: string | null = null;
  try {
    quoteBaseUrl = publicBaseUrlFromHeaders(await headers());
  } catch {
  }
  const closed = project.status === "COMPLETED";
  const warrantyLabel =
    warranty.state === "active"
      ? `until ${date(warranty.endsAt)} · ${warranty.daysLeft}d left`
      : warranty.state === "ended"
        ? `ended ${date(warranty.endsAt)}`
        : "starts at launch";

  const stagingHref = safeHref(project.stagingUrl);
  const liveHref = safeHref(project.liveUrl);

  const milestones = buildMilestones(
    project,
    terms.postLaunchWarrantyDays,
    now,
  ).filter((m) => finance || !m.paymentId);
  const tasksHref = `/tasks?project=${project.id}`;
  const running = project.status === "ACTIVE" || project.status === "ON_HOLD";
  const canAddTask = running && can(role, "create", "project");
  const canCharge =
    running &&
    finance &&
    can(role, "create", "payment") &&
    roleCanOpen(role, "/payments");

  const sections = [
    { id: "phases", label: "Phases and dates", icon: <MilestoneIcon /> },
    {
      id: "tasks",
      label: "Tasks",
      icon: <ListChecks />,
      count: engineering.tasks.open,
    },
    {
      id: "engineering",
      label: "Engineering",
      icon: <Activity />,
      count: engineering.openIncidents.length,
    },
    {
      id: "changes",
      label: "Change requests",
      icon: <Shuffle />,
      count: openRequests.length,
    },
    {
      id: "services",
      label: "Services",
      icon: <Server />,
      count: servicesDue.length,
    },
    ...(finance
      ? [
          {
            id: "money",
            label: "Money",
            icon: <Wallet />,
            count: overdue.length,
          },
        ]
      : []),
    ...(canMessage
      ? [{ id: "conversation", label: "Conversation", icon: <MessageCircle /> }]
      : []),
    { id: "history", label: "History", icon: <History /> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[
          { label: "Projects", href: "/projects" },
          { label: clientName, href: `/clients/${project.clientId}` },
          { label: project.name },
        ]}
        title={project.name}
        status={
          <>
            <StatusPill registry="projectStatus" value={project.status} />
            {late && <ToneBadge tone="warning">At risk</ToneBadge>}
          </>
        }
        meta={
          <>
            <MetaItem label="Client">
              <EntityLink type="client" id={project.clientId}>
                {clientName}
              </EntityLink>
            </MetaItem>
            {project.origin === "RECORDED" && (
              <MetaItem label="Origin">
                <StatusPill registry="projectOrigin" value={project.origin} />
              </MetaItem>
            )}
            <MetaItem label={recorded ? "Recorded" : "Started"}>
              {date(project.createdAt)}
            </MetaItem>
            <MetaItem label="Target">
              {project.targetLaunchDate
                ? date(project.targetLaunchDate)
                : "not set"}
            </MetaItem>
            {closed ? (
              <MetaItem label="Closed">
                {project.completedAt
                  ? date(project.completedAt)
                  : "date not recorded"}
              </MetaItem>
            ) : (
              <MetaItem label="Progress">{progress}%</MetaItem>
            )}
          </>
        }
        actions={
          <>
            {canAddTask && (
              <AddTaskButton
                project={taskProject}
                users={team}
                variant="brand"
                size="default"
              />
            )}
            {canEdit && project.status === "ACTIVE" && (
              <Button asChild variant="outline">
                <Link href="#changes">
                  <FilePenLine className="size-3.5" aria-hidden />
                  Request a change
                </Link>
              </Button>
            )}
            {canCharge && (
              <Button asChild variant="outline">
                <Link
                  href={`/payments?new=charge&client=${project.clientId}&project=${project.id}`}
                >
                  <Receipt className="size-3.5" aria-hidden />
                  New charge
                </Link>
              </Button>
            )}
            {canEdit && (
              <EditProjectButton
                project={{
                  id: project.id,
                  name: project.name,
                  targetLaunchDate:
                    project.targetLaunchDate?.toISOString() ?? null,
                  stagingUrl: project.stagingUrl,
                  liveUrl: project.liveUrl,
                }}
              />
            )}
            {canEdit && (
              <PhaseControl
                projectId={project.id}
                phase={project.phase}
                hasLaunchDate={project.actualLaunchDate != null}
              />
            )}
            <ProjectMoreMenu
              projectId={project.id}
              projectName={project.name}
              status={project.status}
              portalHref={`/portal/${project.portalToken}`}
              canEdit={canEdit}
              canDelete={can(role, "delete", "project")}
            />
          </>
        }
        alert={
          servicesDue.some(
            (s) => s.state === "expired" || s.state === "urgent",
          ) ? (
            <AlertBar tone="danger" href="#services" cta="Open services">
              {(() => {
                const hot = servicesDue.filter(
                  (s) => s.state === "expired" || s.state === "urgent",
                );
                const lapsed = hot.filter((s) => s.state === "expired").length;
                const names = hot
                  .slice(0, 2)
                  .map((s) => s.name)
                  .join(", ");
                return lapsed > 0
                  ? `${names}${hot.length > 2 ? ` and ${hot.length - 2} more` : ""} — ${lapsed} already expired. Renew at the provider before the client notices.`
                  : `${names}${hot.length > 2 ? ` and ${hot.length - 2} more` : ""} expire${hot.length === 1 ? "s" : ""} within 7 days. Renew and invoice the next term.`;
              })()}
            </AlertBar>
          ) : late ? (
            <AlertBar
              tone="danger"
              href={canMessage ? `/whatsapp/${project.clientId}` : "#phases"}
              cta={canMessage ? "Message the client" : "Open the dates"}
            >
              Target launch was {dueLabel(project.targetLaunchDate)} and there
              is {project.stagingUrl ? "a staging build" : "no staging build"}.
              Either move the date with the client or say why it slipped.
            </AlertBar>
          ) : finance && overdue.length > 0 ? (
            <AlertBar
              tone="warning"
              action={
                <span className="ms-auto inline-flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <AlertLink
                    href={
                      overdue.length === 1
                        ? `/payments?inspect=${overdue[0]!.id}`
                        : `/payments?project=${project.id}&status=overdue`
                    }
                  >
                    {overdue.length === 1
                      ? "Open the payment"
                      : "Open the late payments"}
                  </AlertLink>
                  {canMessage && (
                    <AlertLink href={`/whatsapp/${project.clientId}`}>
                      {clientName} on WhatsApp
                    </AlertLink>
                  )}
                </span>
              }
            >
              {overdue.length} payment{overdue.length === 1 ? " is" : "s are"}{" "}
              past due on this project —{" "}
              {money(
                overdue.reduce((s, p) => s + p.amount, 0),
                currency,
              )}{" "}
              outstanding.
            </AlertBar>
          ) : openRequests.some((c) => c.status === "REQUESTED") ? (
            <AlertBar tone="warning" href="#changes" cta="Quote them">
              {(() => {
                const n = openRequests.filter(
                  (c) => c.status === "REQUESTED",
                ).length;
                return `${n} change request${n === 1 ? " is" : "s are"} waiting for a quote. Nothing moves until the client has a number.`;
              })()}
            </AlertBar>
          ) : null
        }
      />

      <Dossier
        label="Project sections"
        sections={sections}
        aside={
          <>
            <Panel title="Project" flush>
              <MetaList
                items={[
                  {
                    label: "Client",
                    value: (
                      <EntityLink type="client" id={project.clientId}>
                        {clientName}
                      </EntityLink>
                    ),
                  },
                  project.contract && project.contractId
                    ? {
                        label: "Contract",
                        value: (
                          <EntityLink type="contract" id={project.contractId}>
                            {finance
                              ? money(
                                  project.contract.proposal.totalPrice,
                                  currency,
                                )
                              : "Open contract"}
                          </EntityLink>
                        ),
                      }
                    : {
                        label: "Contract",
                        value: (
                          <span className="text-muted-foreground">
                            Recorded — no contract
                          </span>
                        ),
                        hint: "Entered by hand; no proposal or contract was signed through this system.",
                      },
                  {
                    label: "Phase",
                    value: statusOf("projectPhase", project.phase).label,
                  },
                  {
                    label: "Status",
                    value: statusOf("projectStatus", project.status).label,
                  },
                  {
                    label: recorded ? "Recorded" : "Started",
                    value: dateTime(project.createdAt),
                  },
                  ...(recorded
                    ? []
                    : [{ label: "Elapsed", value: `${elapsedWeeks} weeks` }]),
                  {
                    label: "Target",
                    value: project.targetLaunchDate
                      ? date(project.targetLaunchDate)
                      : "—",
                  },
                  {
                    label: "Launched",
                    value: project.actualLaunchDate
                      ? date(project.actualLaunchDate)
                      : "—",
                  },
                  { label: "Warranty", value: warrantyLabel },
                  ...(closed
                    ? [
                        {
                          label: "Closed",
                          value: project.completedAt
                            ? date(project.completedAt)
                            : "not recorded",
                        },
                      ]
                    : []),
                ]}
              />
            </Panel>

            <Panel title="Environments" flush>
              <QuickActions>
                {stagingHref ? (
                  <Button
                    asChild
                    variant="outline"
                    className="pointer-coarse:h-11"
                  >
                    <a
                      href={stagingHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="size-3.5 text-subtle-foreground" />
                      Staging
                    </a>
                  </Button>
                ) : (
                  <p className="text-meta text-subtle-foreground">
                    {project.stagingUrl
                      ? "The stored staging URL is not an http(s) address. Correct it with Edit."
                      : canEdit
                        ? "No staging URL recorded. Add it with Edit."
                        : "No staging URL recorded."}
                  </p>
                )}
                {liveHref && (
                  <Button
                    asChild
                    variant="outline"
                    className="pointer-coarse:h-11"
                  >
                    <a
                      href={liveHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="size-3.5 text-success" />
                      Live site
                    </a>
                  </Button>
                )}
              </QuickActions>
            </Panel>
          </>
        }
      >
        <DossierSection
          id="phases"
          title="Phases and key dates"
          description="There is no milestone model: this is the delivery phase the project is in, plus the dates on record and the contract’s payment schedule. Nothing here is planned that was not agreed."
        >
          <ol
            className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5"
            aria-label="Delivery phases"
          >
            {PROJECT_PHASE_ORDER.map((phase, i) => {
              const done = i < phaseIndex;
              const current = i === phaseIndex;
              return (
                <li
                  key={phase}
                  className="flex items-center gap-2"
                  aria-current={current ? "step" : undefined}
                >
                  <span
                    className={
                      done
                        ? "size-2 shrink-0 rounded-full bg-success"
                        : current
                          ? "size-2 shrink-0 rounded-full bg-progress ring-2 ring-progress/25"
                          : "size-2 shrink-0 rounded-full border border-border-mid"
                    }
                    aria-hidden
                  />
                  <span
                    className={
                      current
                        ? "text-base font-medium"
                        : done
                          ? "text-base"
                          : "text-base text-subtle-foreground"
                    }
                  >
                    {statusOf("projectPhase", phase).label}
                  </span>
                </li>
              );
            })}
          </ol>
          <ul className="plane rows overflow-hidden">
            {milestones.map((m) => (
              <li
                key={m.key}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5"
              >
                <span
                  className={
                    m.state === "done"
                      ? "size-2 shrink-0 rounded-full bg-success"
                      : m.state === "late"
                        ? "size-2 shrink-0 rounded-full bg-danger"
                        : m.state === "current"
                          ? "size-2 shrink-0 rounded-full bg-progress ring-2 ring-progress/25"
                          : "size-2 shrink-0 rounded-full border border-border-mid"
                  }
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-base">
                    {m.paymentId ? (
                      <EntityLink type="payment" id={m.paymentId}>
                        {m.label}
                      </EntityLink>
                    ) : (
                      m.label
                    )}
                  </p>
                  <p className="text-meta text-muted-foreground">{m.detail}</p>
                </div>
                {m.amount != null && (
                  <span className="font-mono text-meta tabular-nums">
                    {money(m.amount, currency)}
                  </span>
                )}
                <ToneBadge tone={MILESTONE_TONE[m.state]}>
                  {MILESTONE_LABEL[m.state]}
                </ToneBadge>
              </li>
            ))}
          </ul>
        </DossierSection>

        <DossierSection
          id="tasks"
          title="Tasks"
          description={
            engineering.tasks.total === 0
              ? undefined
              : `${engineering.tasks.open} open · ${engineering.tasks.done} done · ${engineering.tasks.total} in all`
          }
          action={
            <Button
              asChild
              variant="outline"
              size="sm"
              className="pointer-coarse:h-11"
            >
              <Link href={tasksHref}>View all</Link>
            </Button>
          }
        >
          {openTasks.length === 0 ? (
            <EmptyInline
              action={
                canAddTask ? (
                  <AddTaskButton project={taskProject} users={team} />
                ) : undefined
              }
            >
              {engineering.tasks.total === 0
                ? "No task recorded for this project."
                : "Nothing open — every task on this project is done or cancelled."}
            </EmptyInline>
          ) : (
            <ul className="plane rows overflow-hidden">
              {openTasks.map((task) => {
                const taskLate = task.dueDate != null && task.dueDate < now;
                return (
                  <li
                    key={task.id}
                    className="relative flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 hover:bg-surface/70"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`${tasksHref}&inspect=${task.id}`}
                        className="block truncate text-base after:absolute after:inset-0"
                      >
                        {task.title}
                      </Link>
                      <p className="truncate text-meta text-muted-foreground">
                        {task.assignee
                          ? task.assignee.name || task.assignee.email
                          : "Unassigned"}
                        {task.dueDate && (
                          <span
                            className={taskLate ? "text-danger" : undefined}
                          >
                            {" "}
                            · {dueLabel(task.dueDate)}
                          </span>
                        )}
                      </p>
                    </div>
                    {!task.assignee && canEdit && team.length > 0 && (
                      <span className="relative z-10">
                        <AttachPicker
                          label="Assign"
                          options={team.map((u) => ({
                            value: u.id,
                            label: u.name || u.email,
                            hint: u.name ? u.email : undefined,
                          }))}
                          request={{
                            url: "/api/admin/tasks",
                            method: "PATCH",
                            body: { id: task.id },
                            field: "assigneeId",
                          }}
                          successMessage={`Assigned “${task.title}”.`}
                          searchPlaceholder="Search the team"
                          variant="ghost"
                        />
                      </span>
                    )}
                    <StatusPill registry="taskStatus" value={task.status} />
                  </li>
                );
              })}
            </ul>
          )}
          {engineering.tasks.open > openTasks.length && (
            <p className="mt-2 text-meta text-subtle-foreground">
              Showing the {openTasks.length} due soonest of{" "}
              {engineering.tasks.open} open.{" "}
              <Link
                href={tasksHref}
                className="underline underline-offset-2 hover:text-foreground"
              >
                View all
              </Link>
            </p>
          )}
        </DossierSection>

        <DossierSection
          id="engineering"
          title="Engineering"
          description="Products this project shipped, the latest deployment CI reported for each, and open incidents. Written by CI, read-only here."
          action={
            looseProducts.length > 0 && engineering.products.length > 0 ? (
              <AttachPicker
                  label="Attach an existing product"
                  options={looseProducts.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  request={{
                    url: "/api/admin/products",
                    method: "PATCH",
                    body: { action: "update", patch: { projectId: project.id } },
                    field: "id",
                  }}
                  successMessage={`Attached to ${project.name}.`}
                  searchPlaceholder="Search this client’s products"
                />
            ) : undefined
          }
        >
          {engineering.products.length === 0 ? (
            <EmptyInline
              action={
                <span className="inline-flex flex-wrap items-center gap-2">
                  {looseProducts.length > 0 && (
                    <AttachPicker
                  label="Attach an existing product"
                  options={looseProducts.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  request={{
                    url: "/api/admin/products",
                    method: "PATCH",
                    body: { action: "update", patch: { projectId: project.id } },
                    field: "id",
                  }}
                  successMessage={`Attached to ${project.name}.`}
                  searchPlaceholder="Search this client’s products"
                />
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/products?new=product&project=${project.id}&client=${project.clientId}`}
                    >
                      Add a product
                    </Link>
                  </Button>
                </span>
              }
            >
              {looseProducts.length > 0
                ? `No product is attached to this project. ${clientName} has ${looseProducts.length} product${looseProducts.length === 1 ? "" : "s"} on no project — attach the one this project builds, or add a new one. Its deployments and incidents then appear here.`
                : "No product is attached to this project. Add the site or app it builds as a product and its deployments and incidents appear here."}
            </EmptyInline>
          ) : (
            <div className="space-y-3">
              <ul className="plane rows overflow-hidden">
                {engineering.products.map((product) => {
                  const repo = safeHref(product.repositoryUrl);
                  const deploy = product.latestDeployment;
                  return (
                    <li
                      key={product.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium">
                          <EntityLink type="product" id={product.id}>
                            {product.name}
                          </EntityLink>
                        </p>
                        <p className="truncate text-meta text-muted-foreground">
                          {deploy ? (
                            <EntityLink type="deployment" id={deploy.id} muted>
                              Deploy #{deploy.number} ·{" "}
                              {
                                statusOf(
                                  "deployEnvironment",
                                  deploy.environment,
                                ).label
                              }
                              {deploy.version ? ` · ${deploy.version}` : ""} ·{" "}
                              {when(deploy.finishedAt ?? deploy.createdAt)}
                            </EntityLink>
                          ) : (
                            "No deployment reported yet"
                          )}
                        </p>
                      </div>
                      {deploy && (
                        <StatusPill
                          registry="deploymentStatus"
                          value={deploy.status}
                          variant="dot"
                        />
                      )}
                      <StatusPill
                        registry="productStatus"
                        value={product.status}
                      />
                      {repo && (
                        <a
                          href={repo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-1 text-meta text-muted-foreground hover:text-foreground sm:min-h-0"
                          aria-label={`Repository for ${product.name}`}
                        >
                          <GitBranch className="size-3.5" />
                          Repo
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>

              <h3 className="telemetry text-subtle-foreground">
                Open incidents · {engineering.openIncidents.length}
              </h3>
              {engineering.openIncidents.length === 0 ? (
                <p className="text-meta text-subtle-foreground">
                  Nothing open on this project’s products.
                </p>
              ) : (
                <ul className="plane rows overflow-hidden">
                  {engineering.openIncidents.map((incident) => (
                    <li
                      key={incident.id}
                      className="flex items-center gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base">
                          <EntityLink type="incident" id={incident.id}>
                            #{incident.number} {incident.title}
                          </EntityLink>
                        </p>
                        <p className="truncate text-meta text-muted-foreground">
                          {incident.product.name} · {when(incident.detectedAt)}
                        </p>
                      </div>
                      <StatusPill
                        registry="incidentSeverity"
                        value={incident.severity}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </DossierSection>

        <DossierSection id="changes" title="Change requests">
          <ChangeRequestsPanel
            projectId={project.id}
            currency={currency}
            rate={finance ? rateFor(currency, terms) : null}
            warrantyDays={terms.postLaunchWarrantyDays}
            closed={closed}
            rows={changeRows}
            finance={finance}
            canEdit={canEdit}
            canPrice={canPrice}
            sending={{
              baseUrl: quoteBaseUrl,
              validityDays: terms.proposalValidityDays,
              clientName: project.client.name || project.client.company,
              clientEmail: project.client.email,
              clientPhone: project.client.phone,
              emailConfigured: emailTransport() !== "none",
              whatsappConfigured: Boolean(
                env?.WHATSAPP_ACCESS_TOKEN && env?.WHATSAPP_PHONE_NUMBER_ID,
              ),
            }}
          />
        </DossierSection>

        <DossierSection
          id="services"
          title="Services"
          action={
            looseServices.some((s) => s.currency === currency) ? (
              <AttachPicker
                label="Attach an existing service"
                options={looseServices
                  .filter((s) => s.currency === currency)
                  .map((s) => ({
                  value: s.id,
                  label: s.name,
                  hint: KIND_LABEL[s.kind],
                }))}
                request={{
                  url: "/api/admin/services",
                  method: "PATCH",
                  body: { action: "update", fields: { projectId: project.id } },
                  field: "id",
                }}
                successMessage={`Attached to ${project.name}.`}
                searchPlaceholder="Search this client’s services"
              />
            ) : undefined
          }
        >
          <ServicesList
            title="Domains, hosting and renewals"
            description="Everything this project runs on that has to be renewed"
            services={finance ? services : services.map(redactMoney)}
            showMoney={finance}
            canManage={can(role, "edit", "project")}
            canRemind={can(role, "send", "message")}
            canDelete={can(role, "delete", "client")}
            embedded
            emailConfigured={emailTransport() !== "none"}
            createScope={{
              clientId: project.clientId,
              projectId: project.id,
              projects: clientProjects,
              products: clientProducts,
              currency,
            }}
            emptyText={`Nothing recorded for this project. Add its domain and hosting — each one counts down to its expiry and alerts you 30, 14, 7 and 1 days before.${recorded ? "" : " Services listed in the signed proposal would have appeared here automatically."}`}
          />
        </DossierSection>

        {finance && (
          <DossierSection
            id="money"
            title="Money"
            action={
              <Button
                asChild
                variant="outline"
                size="sm"
                className="pointer-coarse:h-11"
              >
                <Link href={`/payments?project=${project.id}`}>View all</Link>
              </Button>
            }
          >
            <dl className="plane mb-3 grid gap-2 p-3 sm:grid-cols-2">
              {project.contract && (
                <Row label="Contract value">
                  {money(project.contract.proposal.totalPrice, currency)}
                </Row>
              )}
              {changeBilled > 0 && (
                <Row label="Change requests">
                  {money(changeBilled, currency)}
                </Row>
              )}
              <Row label="Billed">{money(billed, currency)}</Row>
              <Row label="Collected">
                <span className="text-success">
                  {money(collected, currency)}
                </span>
              </Row>
              <Row label="Outstanding">
                <span className={billed - collected > 0 ? "text-warning" : ""}>
                  {money(billed - collected, currency)}
                </span>
              </Row>
            </dl>
            {project.payments.length === 0 ? (
              <EmptyInline
                action={
                  canCharge ? (
                    <NewChargeButton
                      targets={[
                        {
                          value: `project:${project.id}`,
                          label: `${project.name} · ${clientName}`,
                          currency,
                          clientId: project.clientId,
                        },
                      ]}
                      scope={{
                        clientId: project.clientId,
                        projectId: project.id,
                      }}
                    />
                  ) : undefined
                }
              >
                {recorded
                  ? "No payments are recorded for this project. Payments made before it was recorded were not carried over."
                  : "No payment schedule was created for this project. The contract’s 50/30/20 split is the intended default — until rows exist here, nothing is being chased automatically."}
              </EmptyInline>
            ) : (
              <ul className="plane rows overflow-hidden">
                {project.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                  >
                    <Wallet
                      className="size-3.5 shrink-0 text-subtle-foreground"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium">
                        <EntityLink type="payment" id={payment.id}>
                          {
                            statusOf("paymentMilestone", payment.milestone)
                              .label
                          }
                        </EntityLink>
                      </p>
                      <p className="text-meta text-muted-foreground">
                        {payment.dueDate
                          ? dueLabel(payment.dueDate)
                          : "No due date"}
                        {payment.paidAt && ` · paid ${date(payment.paidAt)}`}
                        {payment.reference && ` · ref ${payment.reference}`}
                      </p>
                    </div>
                    <span className="font-mono text-md tabular-nums">
                      {money(payment.amount, currency)}
                    </span>
                    <StatusPill
                      registry="paymentStatus"
                      value={payment.status}
                    />
                  </li>
                ))}
              </ul>
            )}
          </DossierSection>
        )}

        {canMessage && (
          <DossierSection
            id="conversation"
            title="Conversation"
            description="The latest messages with this client, newest first"
            action={
              <Button
                asChild
                variant="outline"
                size="sm"
                className="pointer-coarse:h-11"
              >
                <Link href={`/whatsapp/${project.clientId}`}>Open thread</Link>
              </Button>
            }
          >
            {messages.length === 0 ? (
              <EmptyInline>
                Nothing sent or received on this client’s thread yet.
              </EmptyInline>
            ) : (
              <ul className="plane rows overflow-hidden">
                {messages.map((message) => (
                  <li key={message.id} className="flex gap-3 px-3 py-2.5">
                    <span
                      className={
                        message.direction === "INBOUND"
                          ? "mt-1 size-1.5 shrink-0 rounded-full bg-progress"
                          : "mt-1 size-1.5 shrink-0 rounded-full bg-neutral"
                      }
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-3 whitespace-pre-wrap text-base">
                        {message.body}
                      </p>
                      <p className="mt-0.5 font-mono text-micro text-subtle-foreground">
                        {message.direction === "INBOUND"
                          ? "FROM CLIENT"
                          : "SENT"}{" "}
                        · {when(message.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DossierSection>
        )}

        <DossierSection
          id="history"
          title="History"
          description="Every recorded change to this project"
        >
          <EntityAudit type="project" id={project.id} />
        </DossierSection>
      </Dossier>
    </div>
  );
}

function safeHref(value: string | null | undefined): string | null {
  return value && httpUrl.safeParse(value).success ? value : null;
}

type MilestoneState = "done" | "current" | "upcoming" | "late" | "waived";

const MILESTONE_TONE: Record<
  MilestoneState,
  "success" | "progress" | "neutral" | "danger"
> = {
  done: "success",
  current: "progress",
  upcoming: "neutral",
  late: "danger",
  waived: "neutral",
};
const MILESTONE_LABEL: Record<MilestoneState, string> = {
  done: "Done",
  current: "In progress",
  upcoming: "Upcoming",
  late: "Late",
  waived: "Waived",
};

interface Milestone {
  key: string;
  label: string;
  detail: string;
  state: MilestoneState;
  at: Date | null;
  amount?: number;
  paymentId?: string;
}

const CONTRACT_MILESTONES = new Set([
  "DEPOSIT_50",
  "MILESTONE_30",
  "FINAL_20",
  "OTHER",
]);

function buildMilestones(
  project: {
    origin: string;
    createdAt: Date;
    phase: string;
    targetLaunchDate: Date | null;
    actualLaunchDate: Date | null;
    completedAt: Date | null;
    status: string;
    payments: {
      id: string;
      milestone: string;
      amount: number;
      status: string;
      dueDate: Date | null;
      paidAt: Date | null;
    }[];
  },
  warrantyDays: number,
  now: Date,
): Milestone[] {
  const out: Milestone[] = [
    {
      key: "opened",
      label:
        project.origin === "RECORDED"
          ? "Recorded in this system"
          : "Contract signed, project opened",
      detail: date(project.createdAt),
      state: "done",
      at: project.createdAt,
    },
  ];

  for (const p of project.payments) {
    if (!CONTRACT_MILESTONES.has(p.milestone)) continue;
    const label = `${statusOf("paymentMilestone", p.milestone).label} payment`;
    if (p.status === "PAID") {
      out.push({
        key: p.id,
        label,
        detail: p.paidAt ? `Paid ${date(p.paidAt)}` : "Paid, date not recorded",
        state: "done",
        at: p.paidAt ?? p.dueDate,
        amount: p.amount,
        paymentId: p.id,
      });
    } else if (p.status === "WAIVED") {
      out.push({
        key: p.id,
        label,
        detail: "Waived",
        state: "waived",
        at: p.dueDate,
        amount: p.amount,
        paymentId: p.id,
      });
    } else {
      out.push({
        key: p.id,
        label,
        detail: p.dueDate ? `Due ${dueLabel(p.dueDate)}` : "No due date set",
        state: isPaymentOverdue(p, now) ? "late" : "upcoming",
        at: p.dueDate,
        amount: p.amount,
        paymentId: p.id,
      });
    }
  }

  const phaseIndex = PROJECT_PHASE_ORDER.indexOf(
    project.phase as (typeof PROJECT_PHASE_ORDER)[number],
  );
  if (!project.actualLaunchDate) {
    out.push({
      key: "phase",
      label: `${statusOf("projectPhase", project.phase).label} phase`,
      detail: `Phase ${phaseIndex + 1} of ${PROJECT_PHASE_ORDER.length}`,
      state: project.status === "COMPLETED" ? "done" : "current",
      at: now,
    });
  }

  if (project.actualLaunchDate) {
    const missed =
      project.targetLaunchDate &&
      project.actualLaunchDate > project.targetLaunchDate
        ? ` · target was ${date(project.targetLaunchDate)}`
        : "";
    out.push({
      key: "launch",
      label: "Launched",
      detail: `${date(project.actualLaunchDate)}${missed}`,
      state: "done",
      at: project.actualLaunchDate,
    });
    const warranty = warrantyWindow(
      project.actualLaunchDate,
      warrantyDays,
      now,
    );
    if (warranty.endsAt) {
      out.push({
        key: "warranty",
        label: "Warranty ends",
        detail: `${date(warranty.endsAt)} · ${warrantyDays} days after launch`,
        state: warranty.state === "ended" ? "done" : "upcoming",
        at: warranty.endsAt,
      });
    }
  } else {
    out.push({
      key: "launch",
      label: "Target launch",
      detail: project.targetLaunchDate
        ? dueLabel(project.targetLaunchDate)
        : "No date agreed — set one with Edit",
      state:
        project.targetLaunchDate && project.targetLaunchDate < now
          ? "late"
          : "upcoming",
      at: project.targetLaunchDate,
    });
  }

  if (project.completedAt) {
    out.push({
      key: "closed",
      label: "Project closed",
      detail: date(project.completedAt),
      state: "done",
      at: project.completedAt,
    });
  }

  return out
    .map((m, i) => ({ m, i }))
    .sort((a, b) => {
      if (a.m.at && b.m.at)
        return a.m.at.getTime() - b.m.at.getTime() || a.i - b.i;
      if (a.m.at) return -1;
      if (b.m.at) return 1;
      return a.i - b.i;
    })
    .map(({ m }) => m);
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-base text-muted-foreground">{label}</dt>
      <dd className="shrink-0 font-mono text-meta tabular-nums">{children}</dd>
    </div>
  );
}

function AlertLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-xs text-meta font-medium text-foreground transition-colors duration-[var(--dur-state)] hover:text-brand hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {children}
      <span aria-hidden>&rarr;</span>
    </Link>
  );
}
