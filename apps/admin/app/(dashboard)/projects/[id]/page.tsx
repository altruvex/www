import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { ExternalLink, GitBranch, Globe, Wallet } from "lucide-react";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { PageHeader, MetaItem } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { TabNav } from "@/components/os/tab-nav";
import { DetailLayout, MetaList, QuickActions } from "@/components/os/detail-layout";
import { EntityLink } from "@/components/os/entity-link";
import { EntityAudit } from "@/components/os/entity-audit";
import { EmptyInline } from "@/components/os/empty-state";
import { AlertBar } from "@/components/os/error-state";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { PROJECT_PHASE_ORDER, statusOf } from "@/lib/status";
import { date, dateTime, dueLabel, money, when } from "@/lib/format";
import { isPaymentOverdue } from "@/lib/payment-overdue";
import { PhaseControl, ProjectStatusControl } from "./phase-control";
import { ChangeRequestsPanel, type ChangeRequestRow } from "./change-requests";
import { CloseProjectButton } from "./close-project";
import { EditProjectButton } from "./edit-project";
import { getProjectEngineering } from "@/lib/engineering";
import { httpUrl } from "@/lib/http-url";
import { Button } from "@repo/ui";
import { headers } from "next/headers";
import { getPricing } from "@/lib/pricing-store";
import { publicBaseUrlFromHeaders } from "@/lib/public-url";
import { emailTransport } from "@/lib/email";
import { ServicesList } from "@/components/os/services/services-list";
import { listServices } from "@/lib/client-services";
import { needsAttention } from "@/lib/service-lifecycle";
import { coveredByWarranty, isOpen, rateFor, warrantyWindow } from "@/lib/change-requests";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "milestones", label: "Milestones" },
  { id: "changes", label: "Change requests" },
  { id: "services", label: "Services" },
  { id: "financials", label: "Financials" },
  { id: "communication", label: "Communication" },
  { id: "activity", label: "Audit trail" },
];

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam! : "overview";

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: {
        select: { id: true, name: true, company: true, phone: true, email: true },
      },
      contract: { include: { proposal: true } },
      payments: { orderBy: { dueDate: "asc" } },
      changeRequests: {
        orderBy: { requestedAt: "desc" },
        include: { payment: { select: { status: true } } },
      },
    },
  });
  if (!project) notFound();

  const { terms } = await getPricing();

  const messages = await prisma.whatsAppMessage.findMany({
    where: { clientId: project.clientId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Domains, hosting and mail sold with this engagement. Loaded on every tab:
  // the tab count and the header alert both read them.
  const [services, clientProjects, clientProducts] = await Promise.all([
    listServices({ projectId: project.id }),
    prisma.project.findMany({
      where: { clientId: project.clientId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { clientId: project.clientId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const servicesDue = services.filter((s) => needsAttention(s.state));

  const clientName = project.client.company || project.client.name || "Unnamed client";
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

  const elapsedWeeks = Math.round(
    (now.getTime() - project.createdAt.getTime()) / 604_800_000,
  );

  const phaseIndex = PROJECT_PHASE_ORDER.indexOf(
    project.phase as (typeof PROJECT_PHASE_ORDER)[number],
  );
  const progress = Math.round(((phaseIndex + 1) / PROJECT_PHASE_ORDER.length) * 100);

  const currency = project.contract.proposal.currency;
  const warranty = warrantyWindow(project.actualLaunchDate, terms.postLaunchWarrantyDays, now);
  const openRequests = project.changeRequests.filter((c) => isOpen(c.status));
  const changeBilled = project.changeRequests.reduce((s, c) => s + (c.billedAmount ?? 0), 0);
  const changeRows: ChangeRequestRow[] = project.changeRequests.map((c) => ({
    id: c.id,
    title: c.title,
    detail: c.detail,
    status: c.status,
    pricing: c.pricing,
    estimatedMinutes: c.estimatedMinutes,
    actualMinutes: c.actualMinutes,
    hourlyRate: c.hourlyRate,
    quotedAmount: c.quotedAmount,
    billedAmount: c.billedAmount,
    requestedAt: c.requestedAt.toISOString(),
    deliveredAt: c.deliveredAt?.toISOString() ?? null,
    warrantyEligible: coveredByWarranty(c.requestedAt, project.actualLaunchDate, terms.postLaunchWarrantyDays),
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
    // BETTER_AUTH_URL unset in production: the send dialog says so instead of the page failing.
  }
  const tabs = TABS.map((t) =>
    t.id === "changes"
      ? { ...t, count: openRequests.length }
      : t.id === "services"
        ? { ...t, count: servicesDue.length }
        : t,
  );
  const closed = project.status === "COMPLETED";
  const warrantyLabel =
    warranty.state === "active"
      ? `until ${date(warranty.endsAt)} · ${warranty.daysLeft}d left`
      : warranty.state === "ended"
        ? `ended ${date(warranty.endsAt)}`
        : "starts at launch";

  // URLs here are typed by an operator today, but older rows predate the
  // httpUrl check — a stored value is rendered as a link only if it passes.
  const stagingHref = safeHref(project.stagingUrl);
  const liveHref = safeHref(project.liveUrl);

  const engineering = tab === "overview" ? await getProjectEngineering(project.id) : null;
  const milestones = tab === "milestones" ? buildMilestones(project, terms.postLaunchWarrantyDays, now) : [];

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
            <MetaItem label="Started">{date(project.createdAt)}</MetaItem>
            <MetaItem label="Target">
              {project.targetLaunchDate ? date(project.targetLaunchDate) : "not set"}
            </MetaItem>
            {closed ? (
              <MetaItem label="Closed">
                {project.completedAt ? date(project.completedAt) : "date not recorded"}
              </MetaItem>
            ) : (
              <MetaItem label="Progress">{progress}%</MetaItem>
            )}
          </>
        }
        actions={
          <>
            <EditProjectButton
              project={{
                id: project.id,
                name: project.name,
                targetLaunchDate: project.targetLaunchDate?.toISOString() ?? null,
                stagingUrl: project.stagingUrl,
                liveUrl: project.liveUrl,
              }}
            />
            <PhaseControl projectId={project.id} phase={project.phase} />
            <ProjectStatusControl projectId={project.id} status={project.status} />
            {(project.status === "ACTIVE" || project.status === "ON_HOLD") && (
              <CloseProjectButton projectId={project.id} projectName={project.name} />
            )}
            <Button asChild variant="outline">
              <Link href={`/portal/${project.portalToken}`} target="_blank">
                <ExternalLink className="size-3.5" />
                Client portal
              </Link>
            </Button>
            <DeleteRecordButton
              entity="project"
              id={project.id}
              label={project.name}
              redirectTo="/projects"
            />
          </>
        }
        alert={
          // First, because a lapsed domain takes the live site down with it —
          // nothing else on this page is that immediate.
          servicesDue.some((s) => s.state === "expired" || s.state === "urgent") ? (
            <AlertBar
              tone="danger"
              href={`/projects/${project.id}?tab=services`}
              cta="Open services"
            >
              {(() => {
                const hot = servicesDue.filter((s) => s.state === "expired" || s.state === "urgent");
                const lapsed = hot.filter((s) => s.state === "expired").length;
                const names = hot.slice(0, 2).map((s) => s.name).join(", ");
                return lapsed > 0
                  ? `${names}${hot.length > 2 ? ` and ${hot.length - 2} more` : ""} — ${lapsed} already expired. Renew at the provider before the client notices.`
                  : `${names}${hot.length > 2 ? ` and ${hot.length - 2} more` : ""} expire${hot.length === 1 ? "s" : ""} within 7 days. Renew and invoice the next term.`;
              })()}
            </AlertBar>
          ) : late ? (
            <AlertBar
              tone="danger"
              href={`/whatsapp/${project.clientId}`}
              cta="Message the client"
            >
              Target launch was {dueLabel(project.targetLaunchDate)} and there is{" "}
              {project.stagingUrl ? "a staging build" : "no staging build"}. Either move
              the date with the client or say why it slipped.
            </AlertBar>
          ) : overdue.length > 0 ? (
            <AlertBar
              tone="warning"
              href={`/projects/${project.id}?tab=financials`}
              cta="Open the payment schedule"
            >
              {overdue.length} payment{overdue.length === 1 ? " is" : "s are"} past due on
              this project — {money(overdue.reduce((s, p) => s + p.amount, 0), currency)}{" "}
              outstanding.
            </AlertBar>
          ) : openRequests.some((c) => c.status === "REQUESTED") ? (
            <AlertBar
              tone="warning"
              href={`/projects/${project.id}?tab=changes`}
              cta="Quote them"
            >
              {(() => {
                const n = openRequests.filter((c) => c.status === "REQUESTED").length;
                return `${n} change request${n === 1 ? " is" : "s are"} waiting for a quote. Nothing moves until the client has a number.`;
              })()}
            </AlertBar>
          ) : null
        }
        tabs={<TabNav tabs={tabs} active={tab} basePath={`/projects/${project.id}`} />}
      />

      <DetailLayout
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
                  {
                    label: "Contract",
                    value: (
                      <EntityLink type="contract" id={project.contractId}>
                        {money(project.contract.proposal.totalPrice, project.contract.proposal.currency)}
                      </EntityLink>
                    ),
                  },
                  { label: "Phase", value: statusOf("projectPhase", project.phase).label },
                  { label: "Status", value: statusOf("projectStatus", project.status).label },
                  { label: "Started", value: dateTime(project.createdAt) },
                  {
                    label: "Target",
                    value: project.targetLaunchDate ? date(project.targetLaunchDate) : "—",
                  },
                  {
                    label: "Launched",
                    value: project.actualLaunchDate ? date(project.actualLaunchDate) : "—",
                  },
                  { label: "Warranty", value: warrantyLabel },
                  ...(closed
                    ? [
                        {
                          label: "Closed",
                          value: project.completedAt ? date(project.completedAt) : "not recorded",
                        },
                      ]
                    : []),
                ]}
              />
            </Panel>

            <Panel title="Environments" flush>
              <QuickActions>
                {stagingHref ? (
                  <Button asChild variant="outline">
                    <a href={stagingHref} target="_blank" rel="noopener noreferrer">
                      <Globe className="size-3.5 text-subtle-foreground" />
                      Staging
                    </a>
                  </Button>
                ) : (
                  <p className="text-meta text-subtle-foreground">
                    {project.stagingUrl
                      ? "The stored staging URL is not an http(s) address. Correct it with Edit."
                      : "No staging URL recorded. Add it with Edit."}
                  </p>
                )}
                {liveHref && (
                  <Button asChild variant="outline">
                    <a href={liveHref} target="_blank" rel="noopener noreferrer">
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
        {tab === "overview" && (
          <>
            <Panel title="Phase progress" description={`${phaseIndex + 1} of ${PROJECT_PHASE_ORDER.length}`}>
              <ol className="space-y-1.5">
                {PROJECT_PHASE_ORDER.map((phase, i) => {
                  const done = i < phaseIndex;
                  const current = i === phaseIndex;
                  return (
                    <li key={phase} className="flex items-center gap-3">
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
                      {current && (
                        <span className="telemetry ms-auto text-progress">current</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Panel>

            <div className="grid gap-4 sm:grid-cols-2">
              <Panel title="Money">
                <dl className="space-y-2">
                  <Row label="Contract value">
                    {money(project.contract.proposal.totalPrice, project.contract.proposal.currency)}
                  </Row>
                  {changeBilled > 0 && (
                    <Row label="Change requests">{money(changeBilled, currency)}</Row>
                  )}
                  <Row label="Billed">{money(billed, currency)}</Row>
                  <Row label="Collected">
                    <span className="text-success">{money(collected, currency)}</span>
                  </Row>
                  <Row label="Outstanding">
                    <span className={billed - collected > 0 ? "text-warning" : ""}>
                      {money(billed - collected, currency)}
                    </span>
                  </Row>
                </dl>
              </Panel>
              <Panel title="Schedule">
                <dl className="space-y-2">
                  <Row label="Started">{date(project.createdAt)}</Row>
                  <Row label="Target launch">
                    {project.targetLaunchDate ? date(project.targetLaunchDate) : "not set"}
                  </Row>
                  <Row label="Actual launch">
                    {project.actualLaunchDate ? date(project.actualLaunchDate) : "—"}
                  </Row>
                  <Row label="Elapsed">{elapsedWeeks} weeks</Row>
                  <Row label="Warranty">{warrantyLabel}</Row>
                  {closed && (
                    <Row label="Closed">
                      {project.completedAt ? date(project.completedAt) : "not recorded"}
                    </Row>
                  )}
                </dl>
              </Panel>
            </div>

            {engineering && (
              <>
                <Panel
                  title="Products"
                  description="What this project shipped, and the latest deployment CI reported for each"
                  flush
                >
                  {engineering.products.length === 0 ? (
                    <EmptyInline
                      action={
                        <Button asChild variant="outline" size="sm">
                          <Link href="/products">Open products</Link>
                        </Button>
                      }
                    >
                      No product is attached to this project. Attach the site or app it builds to
                      a product and its deployments and incidents appear here.
                    </EmptyInline>
                  ) : (
                    <ul className="rows">
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
                                    {statusOf("deployEnvironment", deploy.environment).label}
                                    {deploy.version ? ` · ${deploy.version}` : ""} ·{" "}
                                    {when(deploy.finishedAt ?? deploy.createdAt)}
                                  </EntityLink>
                                ) : (
                                  "No deployment reported yet"
                                )}
                              </p>
                            </div>
                            {deploy && (
                              <StatusPill registry="deploymentStatus" value={deploy.status} variant="dot" />
                            )}
                            <StatusPill registry="productStatus" value={product.status} />
                            {repo && (
                              <a
                                href={repo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-meta text-muted-foreground hover:text-foreground"
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
                  )}
                </Panel>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Panel
                    title="Open incidents"
                    description={
                      engineering.products.length === 0
                        ? "Incidents are raised against a product"
                        : `${engineering.openIncidents.length} not resolved`
                    }
                    flush
                  >
                    {engineering.openIncidents.length === 0 ? (
                      <EmptyInline>
                        {engineering.products.length === 0
                          ? "No product, so nothing to raise an incident against."
                          : "Nothing open on this project’s products."}
                      </EmptyInline>
                    ) : (
                      <ul className="rows">
                        {engineering.openIncidents.map((incident) => (
                          <li key={incident.id} className="flex items-center gap-3 px-3 py-2.5">
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
                            <StatusPill registry="incidentSeverity" value={incident.severity} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>

                  <Panel
                    title="Tasks"
                    action={
                      <Link
                        href={`/tasks?project=${project.id}`}
                        className="text-meta text-muted-foreground hover:text-foreground"
                      >
                        Open board →
                      </Link>
                    }
                  >
                    {engineering.tasks.total === 0 ? (
                      <p className="text-meta text-subtle-foreground">
                        No task recorded for this project.{" "}
                        <Link href={`/tasks?project=${project.id}`} className="underline underline-offset-2 hover:text-foreground">
                          Add one on the board
                        </Link>
                        .
                      </p>
                    ) : (
                      <dl className="space-y-2">
                        <Row label="Open">{engineering.tasks.open}</Row>
                        <Row label="Done">{engineering.tasks.done}</Row>
                        <Row label="Total">{engineering.tasks.total}</Row>
                      </dl>
                    )}
                  </Panel>
                </div>
              </>
            )}
          </>
        )}

        {tab === "milestones" && (
          <Panel
            title="Milestones"
            description="The contract’s payment milestones and the delivery dates on record, in order. Nothing here is planned that was not agreed."
            flush
          >
            <ul className="rows">
              {milestones.map((m) => (
                <li key={m.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
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
                    <span className="font-mono text-meta tabular-nums">{money(m.amount, currency)}</span>
                  )}
                  <ToneBadge tone={MILESTONE_TONE[m.state]}>{MILESTONE_LABEL[m.state]}</ToneBadge>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {tab === "changes" && (
          <ChangeRequestsPanel
            projectId={project.id}
            currency={currency}
            rate={rateFor(currency, terms)}
            warrantyDays={terms.postLaunchWarrantyDays}
            closed={closed}
            rows={changeRows}
            sending={{
              baseUrl: quoteBaseUrl,
              validityDays: terms.proposalValidityDays,
              clientName: project.client.name || project.client.company,
              clientEmail: project.client.email,
              clientPhone: project.client.phone,
              emailConfigured: emailTransport() !== "none",
              whatsappConfigured: Boolean(
                process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
              ),
            }}
          />
        )}

        {tab === "services" && (
          <ServicesList
            title="Services"
            description="Domain, hosting and anything else this project runs on that has to be renewed"
            services={services}
            emailConfigured={emailTransport() !== "none"}
            createScope={{
              clientId: project.clientId,
              projectId: project.id,
              projects: clientProjects,
              products: clientProducts,
              currency,
            }}
            emptyText="Nothing recorded for this project. Add its domain and hosting — each one counts down to its expiry and alerts you 30, 14, 7 and 1 days before. Services listed in the signed proposal would have appeared here automatically."
          />
        )}

        {tab === "financials" && (
          <Panel title="Payment schedule" flush>
            {project.payments.length === 0 ? (
              <EmptyInline>
                No payment schedule was created for this project. The contract’s
                50/30/20 split is the intended default — until rows exist here, nothing
                is being chased automatically.
              </EmptyInline>
            ) : (
              <ul className="rows">
                {project.payments.map((payment) => (
                  <li key={payment.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                    <Wallet className="size-3.5 shrink-0 text-subtle-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium">
                        {statusOf("paymentMilestone", payment.milestone).label}
                      </p>
                      <p className="text-meta text-muted-foreground">
                        {payment.dueDate ? dueLabel(payment.dueDate) : "No due date"}
                        {payment.paidAt && ` · paid ${date(payment.paidAt)}`}
                        {payment.reference && ` · ref ${payment.reference}`}
                      </p>
                    </div>
                    <span className="font-mono text-md tabular-nums">
                      {money(payment.amount, currency)}
                    </span>
                    <StatusPill registry="paymentStatus" value={payment.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "communication" && (
          <Panel
            title="Conversation"
            description="Messages with this client, newest first"
            action={
              <Link href={`/whatsapp/${project.clientId}`} className="text-meta text-muted-foreground hover:text-foreground">
                Open thread →
              </Link>
            }
            flush
          >
            {messages.length === 0 ? (
              <EmptyInline>
                Nothing sent or received on this client’s thread yet.
              </EmptyInline>
            ) : (
              <ul className="rows">
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
                      <p className="whitespace-pre-wrap text-base">{message.body}</p>
                      <p className="mt-0.5 font-mono text-micro text-subtle-foreground">
                        {message.direction === "INBOUND" ? "FROM CLIENT" : "SENT"} · {when(message.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "activity" && <EntityAudit type="project" id={project.id} />}
      </DetailLayout>
    </div>
  );
}

function safeHref(value: string | null | undefined): string | null {
  return value && httpUrl.safeParse(value).success ? value : null;
}

type MilestoneState = "done" | "current" | "upcoming" | "late" | "waived";

const MILESTONE_TONE: Record<MilestoneState, "success" | "progress" | "neutral" | "danger"> = {
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
  /** Sort key; null sinks to the end in its group. */
  at: Date | null;
  amount?: number;
  paymentId?: string;
}

/** The milestones the contract bills against. Change requests, service terms
 *  and retainer periods are billed work too, but not delivery milestones —
 *  they stay on the Financials tab. */
const CONTRACT_MILESTONES = new Set(["DEPOSIT_50", "MILESTONE_30", "FINAL_20", "OTHER"]);

/**
 * A milestone view built only from what is recorded: the contract's payment
 * schedule, the phase the project is in, and the launch / warranty / closure
 * dates. There is no Milestone model, so nothing here can be scheduled that
 * was not already agreed in the contract or set on the project.
 */
function buildMilestones(
  project: {
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
      label: "Contract signed, project opened",
      detail: date(project.createdAt),
      state: "done",
      at: project.createdAt,
    },
  ];

  for (const p of project.payments) {
    if (!CONTRACT_MILESTONES.has(p.milestone)) continue;
    const label = `${statusOf("paymentMilestone", p.milestone).label} payment`;
    if (p.status === "PAID") {
      out.push({ key: p.id, label, detail: p.paidAt ? `Paid ${date(p.paidAt)}` : "Paid, date not recorded", state: "done", at: p.paidAt ?? p.dueDate, amount: p.amount, paymentId: p.id });
    } else if (p.status === "WAIVED") {
      out.push({ key: p.id, label, detail: "Waived", state: "waived", at: p.dueDate, amount: p.amount, paymentId: p.id });
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

  const phaseIndex = PROJECT_PHASE_ORDER.indexOf(project.phase as (typeof PROJECT_PHASE_ORDER)[number]);
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
      project.targetLaunchDate && project.actualLaunchDate > project.targetLaunchDate
        ? ` · target was ${date(project.targetLaunchDate)}`
        : "";
    out.push({ key: "launch", label: "Launched", detail: `${date(project.actualLaunchDate)}${missed}`, state: "done", at: project.actualLaunchDate });
    const warranty = warrantyWindow(project.actualLaunchDate, warrantyDays, now);
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
      detail: project.targetLaunchDate ? dueLabel(project.targetLaunchDate) : "No date agreed — set one with Edit",
      state: project.targetLaunchDate && project.targetLaunchDate < now ? "late" : "upcoming",
      at: project.targetLaunchDate,
    });
  }

  if (project.completedAt) {
    out.push({ key: "closed", label: "Project closed", detail: date(project.completedAt), state: "done", at: project.completedAt });
  }

  // Dated rows in date order; undated ones (a payment with no due date, a
  // launch never agreed) last, in the order they were added.
  return out
    .map((m, i) => ({ m, i }))
    .sort((a, b) => {
      if (a.m.at && b.m.at) return a.m.at.getTime() - b.m.at.getTime() || a.i - b.i;
      if (a.m.at) return -1;
      if (b.m.at) return 1;
      return a.i - b.i;
    })
    .map(({ m }) => m);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-base text-muted-foreground">{label}</dt>
      <dd className="shrink-0 font-mono text-meta tabular-nums">{children}</dd>
    </div>
  );
}
