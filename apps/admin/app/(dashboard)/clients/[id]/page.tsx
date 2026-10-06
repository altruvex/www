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
  Rocket,
  Wallet,
} from "lucide-react";
import { Avatar, Button } from "@repo/ui";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { MetaList, QuickActions } from "@/components/os/detail-layout";
import { EventList, type EventRowData } from "@/components/os/event-row";
import { NextSteps } from "@/components/os/next-steps";
import { MetaItem, PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import {
  Dossier,
  DossierSection,
  type DossierSectionDef,
} from "@/components/os/section-index";
import { ServicesList } from "@/components/os/services/services-list";
import { Timeline } from "@/components/os/timeline";
import { StatusPill } from "@/components/ui/badge";
import { buildActivity } from "@/lib/activity";
import { currentRole } from "@/lib/authorize";
import { roleCanOpen } from "@/lib/action-center";
import { entityHref } from "@/lib/entity-links";
import { redactMoney } from "@/lib/client-services";
import { emailTransport } from "@/lib/email";
import { date, dateTime, money, phone as fmtPhone, when } from "@/lib/format";
import { httpUrl } from "@/lib/http-url";
import { canSeeFinance, type Role } from "@/lib/nav";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { projectCurrency } from "@/lib/project-currency";
import { whatsappConfigured } from "@/lib/sign-verification";
import { statusOf } from "@/lib/status";
import { documentUrl } from "@/lib/storage";
import {
  brandLabel,
  contentLabel,
  scopeNoteNames,
} from "@/lib/transparency-lead-labels";
import { LifecycleButton, StatusMenu } from "./client-actions";
import { ClientNotes } from "./client-notes";
import { EditClientSheet } from "./edit-sheet";
import { HISTORY_TAKE, loadClientHub, type ClientHub } from "./hub-data";
import { planNextSteps, type ClientPlan } from "./next-steps";
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
  const name = client.company || client.name || "Unnamed client";

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

  const links = await dealLinks(hub);
  const plan = planNextSteps(hub, role);
  const channels = {
    emailConfigured: emailTransport() !== "none",
    whatsappConfigured: whatsappConfigured(),
  };

  const canEdit = can(role, "edit", "client");
  const canAudit = role === "OWNER" || role === "ADMIN";

  const sections: DossierSectionDef[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard />,
      count: scopedHub.attention.length || undefined,
    },
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
            <StatusPill registry="priority" value={client.priority} />
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
            <StatusMenu
              clientId={client.id}
              clientLabel={name}
              status={client.status}
              priority={client.priority}
              canEdit={canEdit}
            />
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
                  phone: client.phone,
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
                label={client.company || client.name || client.phone}
                redirectTo="/clients"
              />
            )}
            <PrimaryAction plan={plan} />
          </>
        }
      />

      <Dossier
        sections={sections}
        aside={<Aside hub={hub} role={role} plan={plan} />}
        label={`${name} sections`}
      >
        <DossierSection id="overview" title="Overview">
          <div className="space-y-4">
            <OverviewTab hub={scopedHub} showMoney={showMoney} role={role} />
          </div>
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

function PrimaryAction({ plan }: { plan: ClientPlan }) {
  if (plan.generate?.primary) {
    return <GenerateContract proposalId={plan.generate.proposalId} primary />;
  }
  const step = plan.steps.find((s) => s.primary);
  if (!step) return null;
  const Icon = step.icon;
  return (
    <Button asChild variant="brand">
      <Link href={step.href}>
        <Icon className="size-3.5" aria-hidden />
        {step.label}
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
}: {
  hub: ClientHub;
  role: Role | undefined;
  plan: ClientPlan;
}) {
  const { client } = hub;
  const website =
    client.website && httpUrl.safeParse(client.website).success
      ? client.website
      : null;
  const lead = client.transparencyLead;

  return (
    <>
      <NextSteps steps={plan.steps}>
        {plan.generate && (
          <GenerateContract
            proposalId={plan.generate.proposalId}
            primary={plan.generate.primary}
          />
        )}
      </NextSteps>

      <Panel title="Details" flush>
        <MetaList
          items={[
            {
              label: "Phone",
              value: (
                <a
                  href={`tel:${client.phone}`}
                  className="font-mono text-meta hover:text-brand"
                >
                  {fmtPhone(client.phone)}
                </a>
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
          <Button asChild variant="outline">
            <a href={`tel:${client.phone}`}>
              <Phone className="size-3.5 text-subtle-foreground" />
              Call {fmtPhone(client.phone)}
            </a>
          </Button>
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
            <Row label="Project">{lead.projectType}</Row>
            <Row label="Complexity">{lead.complexity}</Row>
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
          </dl>
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
