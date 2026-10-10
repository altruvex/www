import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  FileSignature,
  FileText,
  Globe,
  History,
  Inbox,
  LayoutDashboard,
  Mail,
  MessageCircle,
  NotebookPen,
  Phone,
  PhoneCall,
  Rocket,
  Wallet,
} from "lucide-react";
import { Avatar, Button } from "@repo/ui";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { MetaList, QuickActions } from "@/components/os/detail-layout";
import { EventList, type EventRowData } from "@/components/os/event-row";
import { NextActionPanel, NextSteps, WhyList } from "@/components/os/next-steps";
import { WhyHint } from "@/components/os/why-hint";
import { MetaItem, PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import {
  Dossier,
  DossierSection,
  type DossierSectionDef,
} from "@/components/os/section-index";
import { ServicesList } from "@/components/os/services/services-list";
import { Timeline } from "@/components/os/timeline";
import { BeforeTheCall } from "@/components/os/before-the-call";
import { FollowUpSheet } from "@/components/os/follow-up-sheet";
import { LeadRecordEditor } from "@/components/os/lead-record-editor";
import { dayString, loadOwnerOptions, loadPreCall } from "@/lib/precall";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { buildActivity } from "@/lib/activity";
import { currentRole, getOperator } from "@/lib/authorize";
import { roleCanOpen } from "@/lib/action-center";
import { entityHref } from "@/lib/entity-links";
import { redactMoney } from "@/lib/client-services";
import { emailTransport } from "@/lib/email";
import { contactLabel, date, dateTime, money, phone as fmtPhone, when } from "@/lib/format";
import { workingDueLabel } from "@/lib/working-days";
import { httpUrl } from "@/lib/http-url";
import { followUpClosedReason, scheduleLink } from "@/lib/lead-follow-up";
import { canSeeFinance, type Role } from "@/lib/nav";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { projectCurrency } from "@/lib/project-currency";
import { whatsappConfigured } from "@/lib/sign-verification";
import { LEAD_STAGES, statusOf } from "@/lib/status";
import { loadSalesRow, meetingStart, type SalesReading } from "@/lib/sales-signals";
import { documentUrl } from "@/lib/storage";
import {
  brandLabel,
  complexityName,
  contentLabel,
  driverNames,
  nextStepLabel,
  projectTypeName,
  scopeNoteNames,
  timelineLabel,
} from "@/lib/transparency-lead-labels";
import { LifecycleButton, StatusMenu } from "./client-actions";
import { ClientNotes } from "./client-notes";
import { EditClientSheet } from "./edit-sheet";
import { HISTORY_TAKE, loadClientHub, type ClientHub } from "./hub-data";
import {
  HEALTH_DISPLAY,
  PRIORITY_DISPLAY,
  SLA_DISPLAY,
  WHY_VISIBLE,
} from "@/components/os/sales-display";
import {
  leadControl,
  planNextSteps,
  readinessHint,
  type ClientPlan,
  type LeadControl,
} from "./next-steps";
import {
  ConversationsTab,
  DealsTab,
  DeliveryTab,
  LeadNotes,
  MeetingsTab,
  MoneyTab,
  OverviewTab,
  SitesTab,
  type DealLinks,
} from "./hub-sections";

export const dynamic = "force-dynamic";

type SectionId =
  | "overview"
  | "deals"
  | "delivery"
  | "sites"
  | "money"
  | "conversations"
  | "meetings"
  | "notes"
  | "history";

const LEGACY_TABS: Record<string, SectionId> = {
  overview: "overview",
  deals: "deals",
  proposals: "deals",
  contracts: "deals",
  documents: "deals",
  delivery: "delivery",
  projects: "delivery",
  sites: "sites",
  services: "sites",
  money: "money",
  conversations: "conversations",
  communication: "conversations",
  meetings: "meetings",
  notes: "notes",
  audit: "history",
  activity: "history",
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const denied = await gateRoute("/clients/[id]", "this client");
  if (denied) return denied;

  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const role = await currentRole();
  const showMoney = canSeeFinance(role);

  if (tabParam) {
    const section = LEGACY_TABS[tabParam];
    const target = section === "money" && !showMoney ? "overview" : section;
    redirect(
      target && target !== "overview"
        ? `/clients/${id}#${target}`
        : `/clients/${id}`,
    );
  }

  const hub = await loadClientHub(id);
  if (!hub) notFound();
  const { client, stage, services } = hub;
  const name = contactLabel(client);

  const scopedHub: ClientHub = showMoney
    ? hub
    : {
        ...hub,
        attention: hub.attention.filter(
          (item) => !item.key.startsWith("payment-"),
        ),
      };

  const derived = buildActivity({
    client,
    submission: client.contactSubmission,
    transparencyLead: client.transparencyLead,
    proposals: client.proposals,
    contracts: client.contracts,
    projects: client.projects,
    payments: showMoney
      ? hub.payments.map((p) => ({
          ...p,
          status: p.overdue ? "OVERDUE" : p.status,
        }))
      : [],
    messages: client.messages,
    meetings: hub.meetings,
  });

  const now = new Date();
  const operator = await getOperator();
  const [links, sales] = await Promise.all([
    dealLinks(hub),
    loadSalesRow(client.id, operator?.session.user.id ?? null, now),
  ]);
  const reading = sales?.reading ?? null;
  const isLead =
    sales !== null &&
    (LEAD_STAGES as readonly string[]).includes(sales.signals.stage);
  // Readiness only means something before a proposal exists to be read.
  const readiness = isLead && reading ? reading.readiness : undefined;
  const plan = planNextSteps(hub, role, now, readiness);
  const channels = {
    emailConfigured: emailTransport() !== "none",
    whatsappConfigured: whatsappConfigured(),
  };

  const canEdit = can(role, "edit", "client");
  // Sales follow-ups stop once the client signs; delivery has its own channels.
  const canFollowUp =
    canEdit && can(role, "send", "message") && !followUpClosedReason(client);
  const keyMeeting = sales?.signals.meeting
    ? hub.meetings.find(
        (m) =>
          meetingStart(m).getTime() ===
          sales.signals.meeting!.scheduledAt.getTime(),
      )
    : undefined;
  const control: LeadControl = reading
    ? leadControl(plan, reading.next, {
        followUp: canFollowUp,
        record: canEdit,
        // The link opens the call to record its outcome: the operator must be able
        // to open /calendar and to record (approve) a meeting, not only view one.
        meetingHref:
          keyMeeting &&
          roleCanOpen(role, "/calendar") &&
          can(role, "view", "meeting") &&
          can(role, "approve", "meeting")
            ? `/calendar?meeting=${keyMeeting.id}`
            : null,
      })
    : null;
  // CLOSE's control is the header's status menu, rendered again beside the next action.
  const statusMenu = (
    <StatusMenu
      clientId={client.id}
      clientLabel={name}
      status={client.status}
      priority={client.priority}
      canEdit={canEdit}
    />
  );
  const followUpSheet = canFollowUp ? (
    <FollowUpSheet
      lead={{
        id: client.id,
        label: name,
        name: client.name,
        email: client.email,
        phone: client.phone,
        stage,
      }}
      emailConfigured={emailTransport() !== "none"}
      scheduleLink={scheduleLink()}
    />
  ) : null;
  const canAudit = role === "OWNER" || role === "ADMIN";
  const [preCall, owners] = await Promise.all([
    loadPreCall({ clientId: client.id }),
    canEdit ? loadOwnerOptions() : Promise.resolve([]),
  ]);

  const sections: DossierSectionDef[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard />,
      count: scopedHub.attention.length || undefined,
    },
    { id: "lead-record", label: "Before the call", icon: <PhoneCall /> },
    {
      id: "deals",
      label: "Deals",
      icon: <FileSignature />,
      count: client.proposals.length + client.contracts.length,
    },
    {
      id: "delivery",
      label: "Delivery",
      icon: <Rocket />,
      count: client.projects.length,
    },
    {
      id: "sites",
      label: "Sites",
      icon: <Globe />,
      count: client.products.length + services.length,
    },
    ...(showMoney
      ? [
          {
            id: "money",
            label: "Money",
            icon: <Wallet />,
            count: hub.payments.length,
          },
        ]
      : []),
    {
      id: "conversations",
      label: "Conversations",
      icon: <MessageCircle />,
      count: client.messages.length + client.emails.length,
    },
    {
      id: "meetings",
      label: "Meetings",
      icon: <CalendarDays />,
      count: hub.meetings.length,
    },
    {
      id: "notes",
      label: "Notes",
      icon: <NotebookPen />,
      count:
        client.notes.length + (client.contactSubmission?.notes.length ?? 0),
    },
    { id: "history", label: "History", icon: <History /> },
  ];

  const events: EventRowData[] = hub.recentEvents.map((e) => ({
    id: e.id,
    action: e.action,
    actorLabel: e.actorLabel,
    actorKind: e.actorKind,
    entityType: e.entityType,
    entityId: e.entityId,
    entityLabel: e.entityLabel,
    linkable: roleCanOpen(role, entityHref(e.entityType, e.entityId) ?? "/"),
    summary: e.summary,
    before: e.before,
    after: e.after,
    metadata: e.metadata,
    createdAt: e.createdAt,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[{ label: "Clients", href: "/clients" }, { label: name }]}
        title={
          <span className="flex min-w-0 items-center gap-2">
            <Avatar name={name} size="lg" />
            <span className="truncate">{name}</span>
          </span>
        }
        status={
          <>
            <StatusPill registry="pipelineStage" value={stage} />
            {reading && <HeaderPriority reading={reading} />}
            {reading && <HealthChips reading={reading} />}
          </>
        }
        meta={
          <>
            <MetaItem label="Source">
              {statusOf("clientSource", client.source).label}
            </MetaItem>
            <MetaItem label="Added">{date(client.createdAt)}</MetaItem>
            <MetaItem label="Last activity">
              {when(hub.lastActivityAt)}
            </MetaItem>
            {client.industry && (
              <MetaItem label="Industry">{client.industry}</MetaItem>
            )}
            {client.country && (
              <MetaItem label="Country">{client.country}</MetaItem>
            )}
          </>
        }
        actions={
          <>
            {statusMenu}
            {can(role, "view", "message") && (
              <Button asChild variant="outline">
                <Link href={`/inbox?client=${client.id}`}>
                  <MessageCircle className="size-3.5" aria-hidden />
                  Message
                </Link>
              </Button>
            )}
            {canEdit && (
              <EditClientSheet
                clientId={client.id}
                clientLabel={name}
                initial={{
                  name: client.name ?? "",
                  phone: client.phone ?? "",
                  email: client.email ?? "",
                  company: client.company ?? "",
                  industry: client.industry ?? "",
                  website: client.website ?? "",
                  country: client.country ?? "",
                  address: client.address ?? "",
                  billingEmail: client.billingEmail ?? "",
                  taxId: client.taxId ?? "",
                }}
              />
            )}
            {can(role, "delete", "client") && (
              <DeleteRecordButton
                entity="client"
                id={client.id}
                label={name}
                redirectTo="/clients"
              />
            )}
          </>
        }
      />

      {reading && (
        <NextActionBlock
          reading={reading}
          control={control}
          followUpSheet={followUpSheet}
          statusMenu={statusMenu}
          clientId={client.id}
          canPropose={can(role, "create", "proposal")}
          showReadiness={isLead}
        />
      )}

      <Dossier
        sections={sections}
        aside={<Aside hub={hub} role={role} plan={plan} control={control} />}
        label={`${name} sections`}
      >
        <DossierSection id="overview" title="Overview">
          <div className="space-y-4">
            <OverviewTab hub={scopedHub} showMoney={showMoney} role={role} />
          </div>
        </DossierSection>

        <DossierSection
          id="lead-record"
          title="Before the call"
          description="Score, answers, the booked call and who follows up"
        >
          {preCall && (
            <BeforeTheCall
              view={preCall}
              showEstimate={false}
              editor={
                canEdit ? (
                  <div className="space-y-4">
                    {/* One follow-up control per page: here unless the next action carries it. */}
                    {control?.kind !== "follow-up" && followUpSheet}
                    <LeadRecordEditor
                      // A sent follow-up moves the date on the server; remount so the form shows it.
                      key={`${client.ownerId}:${dayString(client.nextActionAt)}:${client.nextActionNote ?? ""}`}
                      clientId={client.id}
                      admins={owners}
                      initial={{
                        ownerId: client.ownerId,
                        nextActionAt: dayString(client.nextActionAt),
                        nextActionNote: client.nextActionNote ?? "",
                      }}
                    />
                  </div>
                ) : undefined
              }
            />
          )}
        </DossierSection>

        <DossierSection
          id="deals"
          title="Deals"
          description="Proposals, contracts and the documents they produced"
        >
          <div className="space-y-4">
            <DealsTab hub={hub} links={links} channels={channels} role={role} />
          </div>
        </DossierSection>

        <DossierSection id="delivery" title="Delivery">
          <DeliveryTab hub={hub} showMoney={showMoney} role={role} />
        </DossierSection>

        <DossierSection id="sites" title="Sites and services">
          <div className="space-y-4">
            <SitesTab hub={hub} role={role} />
            <ServicesList
              title="Services"
              description="Everything this client holds through Altruvex that has to be renewed"
              services={showMoney ? services : services.map(redactMoney)}
              showProject
              showMoney={showMoney}
              canManage={can(role, "edit", "project")}
              canRemind={can(role, "send", "message")}
              canDelete={can(role, "delete", "client")}
              emailConfigured={channels.emailConfigured}
              createScope={{
                clientId: client.id,
                projects: client.projects.map((p) => ({
                  id: p.id,
                  name: p.name,
                })),
                products: client.products.map((p) => ({
                  id: p.id,
                  name: p.name,
                })),
                currency: client.projects[0]
                  ? projectCurrency(client.projects[0])
                  : "EGP",
              }}
            />
            <div className="flex justify-end">
              <PanelLink href={`/services?client=${client.id}`}>
                In the services list
              </PanelLink>
            </div>
          </div>
        </DossierSection>

        {showMoney && (
          <DossierSection id="money" title="Money">
            <div className="space-y-4">
              <MoneyTab hub={hub} role={role} />
            </div>
          </DossierSection>
        )}

        <DossierSection
          id="conversations"
          title="Conversations"
          description="The latest messages both ways; the inbox holds the whole thread"
        >
          <ConversationsTab hub={hub} role={role} />
        </DossierSection>

        <DossierSection id="meetings" title="Meetings">
          <MeetingsTab hub={hub} />
        </DossierSection>

        <DossierSection id="notes" title="Notes">
          <div className="space-y-4">
            <ClientNotes
              clientId={client.id}
              clientLabel={name}
              canWrite={canEdit}
              canDelete={can(role, "delete", "note")}
              notes={client.notes.map((n) => ({
                id: n.id,
                body: n.body,
                authorLabel: n.authorLabel,
                pinned: n.pinned,
                createdAt: n.createdAt.toISOString(),
                updatedAt: n.updatedAt.toISOString(),
              }))}
            />
            <LeadNotes hub={hub} />
          </div>
        </DossierSection>

        <DossierSection
          id="history"
          title="History"
          description={
            events.length > 0
              ? `The latest ${events.length === HISTORY_TAKE ? HISTORY_TAKE : events.length} events on this client and its records, from the audit trail`
              : "Nothing in the audit trail yet"
          }
          action={
            canAudit ? (
              <PanelLink href={`/audit?entity=client&id=${client.id}`}>
                View all
              </PanelLink>
            ) : undefined
          }
        >
          <div className="space-y-4">
            {events.length > 0 ? (
              <div className="plane overflow-hidden">
                <EventList events={events} />
              </div>
            ) : (
              <p className="plane px-3 py-4 text-base text-muted-foreground">
                No one has changed this client through the admin since the audit
                trail began. What the records themselves show is below.
              </p>
            )}
            <details className="group plane overflow-hidden">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-base font-medium hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
                Record history
                <span className="text-meta font-normal text-muted-foreground">
                  Derived from the records, including before the audit trail ·{" "}
                  {derived.length}
                </span>
              </summary>
              <div className="border-t border-border-subtle p-2">
                <Timeline
                  events={derived}
                  emptyLabel="Nothing recorded for this client yet."
                />
              </div>
            </details>
          </div>
        </DossierSection>
      </Dossier>
    </div>
  );
}

/** The engine's priority (R5), the same reading the queue and pipeline show, not the stored field. */
function HeaderPriority({ reading }: { reading: SalesReading }) {
  const p = PRIORITY_DISPLAY[reading.priority.level] ?? PRIORITY_DISPLAY.LOW;
  return (
    <WhyHint title={`${p.label} priority`} why={reading.priority.why}>
      <ToneBadge tone={p.tone}>{p.label}</ToneBadge>
    </WhyHint>
  );
}

/** Health in words, its reasons behind the chip (hover, tap or keyboard); the reply promise when it asks something. */
function HealthChips({ reading }: { reading: SalesReading }) {
  const h = HEALTH_DISPLAY[reading.health.state] ?? HEALTH_DISPLAY.HEALTHY;
  const sla = SLA_DISPLAY[reading.replySla.state];
  return (
    <>
      <WhyHint title={`Health: ${h.label}`} why={reading.health.why}>
        <ToneBadge tone={h.tone}>{h.label}</ToneBadge>
      </WhyHint>
      {sla && reading.replySla.dueAt && (
        <WhyHint
          title={sla.label}
          why={[`First reply promised by ${dateTime(reading.replySla.dueAt)}`]}
        >
          <ToneBadge tone={sla.tone}>
            {sla.label} · {when(reading.replySla.dueAt)}
          </ToneBadge>
        </WhyHint>
      )}
    </>
  );
}

/**
 * The one next action, from the sales engine (lib/sales-intel.ts) through
 * loadSalesRow, so this page and /leads say the same thing. Replaces the old
 * header primary button; the aside keeps the remaining steps.
 */
function NextActionBlock({
  reading,
  control,
  followUpSheet,
  statusMenu,
  clientId,
  canPropose,
  showReadiness,
}: {
  reading: SalesReading;
  control: LeadControl;
  followUpSheet: React.ReactNode;
  statusMenu: React.ReactNode;
  clientId: string;
  canPropose: boolean;
  showReadiness: boolean;
}) {
  const p = PRIORITY_DISPLAY[reading.priority.level] ?? PRIORITY_DISPLAY.LOW;
  const next = reading.next;
  const proposalIsAction =
    control?.kind === "step" && control.step.key === "new-proposal";
  return (
    <NextActionPanel
      label={next.label}
      due={next.due && next.kind !== "NONE" ? workingDueLabel(next.due) : undefined}
      why={next.why}
      blockers={reading.blockers}
      visible={WHY_VISIBLE}
      badges={
        <WhyHint title={`${p.label} priority`} why={reading.priority.why}>
          <ToneBadge tone={p.tone}>{p.label} priority</ToneBadge>
        </WhyHint>
      }
      action={
        <>
          <ControlButton
            control={control}
            followUpSheet={followUpSheet}
            statusMenu={statusMenu}
          />
          {showReadiness && canPropose && !proposalIsAction && (
            <Button asChild variant="outline">
              <Link href={`/clients/${clientId}/new-proposal`}>
                <FileText className="size-3.5" aria-hidden />
                New proposal
              </Link>
            </Button>
          )}
        </>
      }
    >
      {showReadiness && (
        <div className="mt-3 space-y-1 border-t border-border-subtle pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="telemetry text-subtle-foreground">
              Proposal readiness
            </p>
            <ToneBadge tone={reading.readiness.ready ? "success" : "warning"}>
              {reading.readiness.ready ? "Ready" : "Not ready"}
            </ToneBadge>
          </div>
          {reading.readiness.ready ? (
            <p className="text-meta text-muted-foreground">
              {readinessHint(reading.readiness)}
            </p>
          ) : (
            <>
              <WhyList
                label="Missing before a proposal"
                why={reading.readiness.missing}
                visible={WHY_VISIBLE}
              />
              <p className="text-meta text-muted-foreground">
                You can still build a proposal; these gaps go into it as
                assumptions.
              </p>
            </>
          )}
        </div>
      )}
    </NextActionPanel>
  );
}

function ControlButton({
  control,
  followUpSheet,
  statusMenu,
}: {
  control: LeadControl;
  followUpSheet: React.ReactNode;
  statusMenu: React.ReactNode;
}) {
  if (!control) return null;
  if (control.kind === "follow-up") return <>{followUpSheet}</>;
  // Closing the lead is a status change: the same menu the header carries.
  if (control.kind === "status") return <>{statusMenu}</>;
  if (control.kind === "generate") {
    return <GenerateContract proposalId={control.proposalId} primary />;
  }
  if (control.kind === "record") {
    return (
      <Button asChild variant="brand">
        <Link href="#lead-record">
          <CalendarDays className="size-3.5" aria-hidden />
          Set the date
        </Link>
      </Button>
    );
  }
  const Icon = control.step.icon;
  return (
    <Button asChild variant="brand">
      <Link href={control.step.href}>
        <Icon className="size-3.5" aria-hidden />
        {control.step.label}
      </Link>
    </Button>
  );
}

function GenerateContract({
  proposalId,
  primary,
}: {
  proposalId: string;
  primary: boolean;
}) {
  return (
    <LifecycleButton
      label="Generate contract"
      busyLabel="Generating…"
      endpoint="/api/admin/contracts"
      body={{ proposalId }}
      variant={primary ? "brand" : "outline"}
      successMessage="Contract generated."
    />
  );
}

function Aside({
  hub,
  role,
  plan,
  control,
}: {
  hub: ClientHub;
  role: Role | undefined;
  plan: ClientPlan;
  control: LeadControl;
}) {
  const { client } = hub;
  const website =
    client.website && httpUrl.safeParse(client.website).success
      ? client.website
      : null;
  const lead = client.transparencyLead;

  return (
    <>
      {/* The next action sits above the sections; this lists everything else. */}
      <NextSteps
        title="More steps"
        steps={plan.steps
          .filter((s) => control?.kind !== "step" || s.key !== control.step.key)
          .map((s) => ({ ...s, primary: false }))}
      >
        {plan.generate && control?.kind !== "generate" && (
          <GenerateContract
            proposalId={plan.generate.proposalId}
            primary={false}
          />
        )}
      </NextSteps>

      <Panel title="Details" flush>
        <MetaList
          items={[
            {
              label: "Phone",
              value: client.phone ? (
                <a
                  href={`tel:${client.phone}`}
                  className="font-mono text-meta hover:text-brand"
                >
                  {fmtPhone(client.phone)}
                </a>
              ) : (
                "—"
              ),
            },
            {
              label: "Email",
              value: client.email ? (
                <a
                  href={`mailto:${client.email}`}
                  className="truncate hover:text-brand"
                >
                  {client.email}
                </a>
              ) : (
                "—"
              ),
            },
            { label: "Contact", value: client.name ?? "—" },
            { label: "Company", value: client.company ?? "—" },
            { label: "Industry", value: client.industry ?? "—" },
            {
              label: "Website",
              value: website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 truncate hover:text-brand"
                >
                  <span className="truncate">
                    {website.replace(/^https?:\/\//, "")}
                  </span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              ) : (
                (client.website ?? "—")
              ),
            },
            { label: "Country", value: client.country ?? "—" },
            {
              label: "Address",
              value: client.address ? (
                <span className="whitespace-pre-wrap">{client.address}</span>
              ) : (
                "—"
              ),
            },
            {
              label: "Billing email",
              value: client.billingEmail ? (
                <a
                  href={`mailto:${client.billingEmail}`}
                  className="truncate hover:text-brand"
                >
                  {client.billingEmail}
                </a>
              ) : (
                "—"
              ),
            },
            {
              label: "Tax ID",
              value: client.taxId ? (
                <span className="font-mono text-meta">{client.taxId}</span>
              ) : (
                "—"
              ),
            },
            {
              label: "Source",
              value: statusOf("clientSource", client.source).label,
            },
            { label: "Created", value: dateTime(client.createdAt) },
          ]}
        />
      </Panel>

      <Panel title="Quick actions" flush>
        <QuickActions>
          {client.phone && (
            <Button asChild variant="outline">
              <a href={`tel:${client.phone}`}>
                <Phone className="size-3.5 text-subtle-foreground" />
                Call {fmtPhone(client.phone)}
              </a>
            </Button>
          )}
          {can(role, "view", "message") && (
            <Button asChild variant="outline">
              <Link href={`/inbox?client=${client.id}`}>
                <Inbox className="size-3.5 text-subtle-foreground" />
                Open conversations
              </Link>
            </Button>
          )}
          {client.email && (
            <Button asChild variant="outline">
              <a href={`mailto:${client.email}`}>
                <Mail className="size-3.5 text-subtle-foreground" />
                Email from your mailbox
              </a>
            </Button>
          )}
          {client.contactSubmission && can(role, "view", "lead") && (
            <Button asChild variant="outline">
              <Link href={`/submissions/${client.contactSubmission.id}`}>
                <FileText className="size-3.5 text-subtle-foreground" />
                The website lead
              </Link>
            </Button>
          )}
        </QuickActions>
      </Panel>

      {lead && (
        <Panel
          title="Estimator quote"
          description="What the public site told them"
          action={
            can(role, "view", "lead") ? (
              <PanelLink href={`/transparency?inspect=${lead.id}`}>
                Open
              </PanelLink>
            ) : undefined
          }
        >
          <dl className="space-y-1.5 text-base">
            <Row label="Reference">
              <span className="font-mono text-meta">{lead.reference}</span>
            </Row>
            <Row label="Project">{projectTypeName(lead.projectType)}</Row>
            <Row label="Complexity">{complexityName(lead.complexity)}</Row>
            {timelineLabel(lead.timeline) && (
              <Row label="Pace">{timelineLabel(lead.timeline)}</Row>
            )}
            <Row label="Quoted">
              <span className="font-mono text-meta tabular-nums">
                {money(lead.priceMin)} – {money(lead.priceMax)}
              </span>
            </Row>
            <Row label="Weeks">
              <span className="font-mono text-meta tabular-nums">
                {lead.weeksMin}–{lead.weeksMax}
              </span>
            </Row>
            {brandLabel(lead.brandIdentity) && (
              <Row label="Brand">{brandLabel(lead.brandIdentity)}</Row>
            )}
            {contentLabel(lead.contentReadiness) && (
              <Row label="Content">{contentLabel(lead.contentReadiness)}</Row>
            )}
            {lead.situation && (
              <Row label="Situation">
                {statusOf("projectSituation", lead.situation).label}
              </Row>
            )}
            {lead.company && <Row label="Company">{lead.company}</Row>}
            <Row label="Locale">
              <span className="font-mono text-meta uppercase">{lead.locale}</span>
            </Row>
          </dl>
          {(lead.nextStep || lead.drivers.length > 0) && (
            <div className="mt-3 border-t border-border-subtle pt-3">
              <p className="telemetry text-subtle-foreground">
                Preliminary read · what their result showed
              </p>
              {lead.nextStep && (
                <dl className="mt-1.5 text-base">
                  <Row label="Next step">{nextStepLabel(lead.nextStep)}</Row>
                </dl>
              )}
              {lead.drivers.length > 0 && (
                <p className="mt-1.5 telemetry text-subtle-foreground">
                  What drives the range
                </p>
              )}
              {lead.drivers.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {driverNames(lead.drivers).map((driver) => (
                    <span
                      key={driver}
                      className="rounded-ctl-xs border border-border-subtle bg-surface px-1.5 py-0.5 text-meta text-muted-foreground"
                    >
                      {driver}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {lead.scopeNotes.length > 0 && (
            <div className="mt-3 border-t border-border-subtle pt-3">
              <p className="telemetry text-subtle-foreground">
                Scope notes · reviewed in scope, not priced
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {scopeNoteNames(lead.scopeNotes).map((note) => (
                  <span
                    key={note}
                    className="rounded-ctl-xs border border-border-subtle bg-surface px-1.5 py-0.5 text-meta text-muted-foreground"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>
          )}
          {lead.note && (
            <div className="mt-3 border-t border-border-subtle pt-3">
              <p className="telemetry text-subtle-foreground">Their note</p>
              <p className="mt-1.5 whitespace-pre-wrap text-base">
                {lead.note}
              </p>
            </div>
          )}
        </Panel>
      )}
    </>
  );
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
      <dt className="telemetry text-subtle-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-end">{children}</dd>
    </div>
  );
}

async function dealLinks(hub: ClientHub): Promise<DealLinks> {
  const { client, publicBase } = hub;
  const absolute = (url: string) =>
    /^https?:\/\//.test(url)
      ? url
      : `${publicBase}${url.startsWith("/") ? "" : "/"}${url}`;

  const proposals: DealLinks["proposals"] = {};
  await Promise.all(
    client.proposals.map(async (p) => {
      const open = await documentUrl(p.pdfUrl ?? p.fileUrl);
      if (open) proposals[p.id] = { open, absolute: absolute(open) };
    }),
  );

  const contracts: DealLinks["contracts"] = {};
  for (const c of client.contracts) {
    contracts[c.id] = c.signToken ? `${publicBase}/sign/${c.signToken}` : null;
  }

  const stored = [
    ...client.proposals.flatMap((p) => [
      p.fileUrl
        ? {
            kind: "Proposal deck",
            url: p.fileUrl,
            at: p.createdAt,
            type: "proposal" as const,
            id: p.id,
          }
        : null,
      p.pdfUrl
        ? {
            kind: "Proposal PDF",
            url: p.pdfUrl,
            at: p.createdAt,
            type: "proposal" as const,
            id: p.id,
          }
        : null,
    ]),
    ...client.contracts.flatMap((c) => [
      c.fileUrl
        ? {
            kind: "Contract",
            url: c.fileUrl,
            at: c.createdAt,
            type: "contract" as const,
            id: c.id,
          }
        : null,
      c.signedFileUrl
        ? {
            kind: "Signed contract",
            url: c.signedFileUrl,
            at: c.signedAt ?? c.createdAt,
            type: "contract" as const,
            id: c.id,
          }
        : null,
    ]),
  ].filter((d) => d !== null);

  const documents = await Promise.all(
    stored.map(async (doc) => ({
      ...doc,
      url: (await documentUrl(doc.url)) ?? doc.url,
    })),
  );

  return { proposals, contracts, documents };
}
