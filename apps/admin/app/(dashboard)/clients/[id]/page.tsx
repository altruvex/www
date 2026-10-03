import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarPlus,
  ExternalLink,
  FileText,
  Inbox,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
} from "lucide-react";
import { Avatar, Button } from "@repo/ui";
import { DeleteRecordButton } from "@/components/os/delete-record";
import {
  DetailLayout,
  MetaList,
  QuickActions,
} from "@/components/os/detail-layout";
import { EntityAudit } from "@/components/os/entity-audit";
import { MetaItem, PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import { ServicesList } from "@/components/os/services/services-list";
import { TabNav } from "@/components/os/tab-nav";
import { Timeline } from "@/components/os/timeline";
import { StatusPill } from "@/components/ui/badge";
import { buildActivity } from "@/lib/activity";
import { emailTransport } from "@/lib/email";
import { date, dateTime, money, phone as fmtPhone, when } from "@/lib/format";
import { httpUrl } from "@/lib/http-url";
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
import { loadClientHub, type ClientHub } from "./hub-data";
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

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "deals", label: "Deals" },
  { id: "delivery", label: "Delivery" },
  { id: "sites", label: "Sites" },
  { id: "money", label: "Money" },
  { id: "conversations", label: "Conversations" },
  { id: "meetings", label: "Meetings" },
  { id: "notes", label: "Notes" },
  { id: "audit", label: "Audit" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Links written before the hub was regrouped keep landing on the right tab.
const LEGACY_TABS: Record<string, TabId> = {
  proposals: "deals",
  contracts: "deals",
  documents: "deals",
  projects: "delivery",
  services: "sites",
  communication: "conversations",
  activity: "audit",
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: TabId =
    TABS.find((t) => t.id === tabParam)?.id ??
    (tabParam ? LEGACY_TABS[tabParam] : undefined) ??
    "overview";

  const hub = await loadClientHub(id);
  if (!hub) notFound();
  const { client, stage, services } = hub;
  const name = client.company || client.name || "Unnamed client";

  const derived = buildActivity({
    client,
    submission: client.contactSubmission,
    transparencyLead: client.transparencyLead,
    proposals: client.proposals,
    contracts: client.contracts,
    projects: client.projects,
    // The derived history shows a late payment as overdue, the same rule the
    // rest of the hub reads, rather than whatever status was last stored.
    payments: hub.payments.map((p) => ({
      ...p,
      status: p.overdue ? "OVERDUE" : p.status,
    })),
    messages: client.messages,
    meetings: hub.meetings,
  });

  const links = await dealLinks(hub);
  const channels = {
    emailConfigured: emailTransport() !== "none",
    whatsappConfigured: whatsappConfigured(),
  };

  const counts: Partial<Record<TabId, number>> = {
    deals: client.proposals.length + client.contracts.length,
    delivery: client.projects.length,
    sites: client.products.length + services.length,
    money: hub.payments.length,
    conversations: client.messages.length + client.emails.length,
    meetings: hub.meetings.length,
    notes: client.notes.length + (client.contactSubmission?.notes.length ?? 0),
  };
  const tabs = TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: counts[t.id],
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
              status={client.status}
              priority={client.priority}
            />
            <Button asChild variant="outline">
              <Link href={`/inbox?client=${client.id}`}>
                <MessageCircle className="size-3.5" />
                Message
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/clients/${client.id}/edit`}>
                <Pencil className="size-3.5" />
                Edit
              </Link>
            </Button>
            <DeleteRecordButton
              entity="client"
              id={client.id}
              label={client.company || client.name || client.phone}
              redirectTo="/clients"
            />
            <PrimaryAction hub={hub} />
          </>
        }
        tabs={
          <TabNav tabs={tabs} active={tab} basePath={`/clients/${client.id}`} />
        }
      />

      <DetailLayout aside={<Aside hub={hub} />}>
        {tab === "overview" && <OverviewTab hub={hub} derived={derived} />}
        {tab === "deals" && (
          <DealsTab hub={hub} links={links} channels={channels} />
        )}
        {tab === "delivery" && <DeliveryTab hub={hub} />}
        {tab === "sites" && (
          <>
            <SitesTab hub={hub} />
            <ServicesList
              title="Services"
              description="Everything this client holds through Altruvex that has to be renewed"
              services={services}
              showProject
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
                currency:
                  client.projects[0]?.contract.proposal.currency ?? "EGP",
              }}
            />
            <div className="flex justify-end">
              <PanelLink href={`/services?client=${client.id}`}>
                In the services list
              </PanelLink>
            </div>
          </>
        )}
        {tab === "money" && <MoneyTab hub={hub} />}
        {tab === "conversations" && <ConversationsTab hub={hub} />}
        {tab === "meetings" && <MeetingsTab hub={hub} />}
        {tab === "notes" && (
          <>
            <ClientNotes
              clientId={client.id}
              clientLabel={name}
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
          </>
        )}
        {tab === "audit" && (
          <>
            <EntityAudit type="client" id={client.id} title="Audit trail" />
            <Panel
              title="Record history"
              description="Derived from the records themselves, including what happened before the audit trail existed"
              flush
              bodyClassName="p-2"
            >
              <Timeline
                events={derived}
                emptyLabel="Nothing recorded for this client yet."
              />
            </Panel>
          </>
        )}
      </DetailLayout>
    </div>
  );
}

/**
 * The one brand action in the header: the next commercial step for where this
 * client stands. It follows the derived stage, so it moves on by itself as the
 * proposal is read, the contract is sent and the contract is signed.
 */
function PrimaryAction({ hub }: { hub: ClientHub }) {
  const { client, stage } = hub;
  const latestContract = client.contracts[0];
  const latestProposal = client.proposals[0];
  const acceptedWithoutContract = client.proposals.find(
    (p) => p.status === "ACCEPTED" && !p.contract,
  );
  const activeProject = client.projects.find((p) => p.status === "ACTIVE");

  const open = (href: string, label: string) => (
    <Button asChild variant="brand">
      <Link href={href}>{label}</Link>
    </Button>
  );

  if (
    latestContract &&
    (latestContract.status === "DRAFT" || stage === "CONTRACT_SENT")
  ) {
    return open(
      `/contracts/${latestContract.id}`,
      latestContract.status === "DRAFT"
        ? "Send the contract"
        : "Open the contract",
    );
  }
  if (acceptedWithoutContract) {
    return (
      <LifecycleButton
        label="Generate contract"
        busyLabel="Generating…"
        endpoint="/api/admin/contracts"
        body={{ proposalId: acceptedWithoutContract.id }}
        variant="brand"
      />
    );
  }
  if (
    latestProposal &&
    (stage === "PROPOSAL_SENT" || stage === "PROPOSAL_READ")
  ) {
    return open(`/proposals/${latestProposal.id}`, "Open the proposal");
  }
  if (latestProposal?.status === "DRAFT") {
    return open(`/proposals/${latestProposal.id}`, "Send the proposal");
  }
  if (stage === "SIGNED" && activeProject) {
    return open(`/projects/${activeProject.id}`, "Open the project");
  }
  return (
    <Button asChild variant="brand">
      <Link href={`/clients/${client.id}/new-proposal`}>
        <Plus className="size-3.5" />
        New proposal
      </Link>
    </Button>
  );
}

function Aside({ hub }: { hub: ClientHub }) {
  const { client } = hub;
  const website =
    client.website && httpUrl.safeParse(client.website).success
      ? client.website
      : null;
  const lead = client.transparencyLead;

  return (
    <>
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
          <Button asChild variant="outline">
            <Link href={`/inbox?client=${client.id}`}>
              <Inbox className="size-3.5 text-subtle-foreground" />
              Open conversations
            </Link>
          </Button>
          {client.email && (
            <Button asChild variant="outline">
              <a href={`mailto:${client.email}`}>
                <Mail className="size-3.5 text-subtle-foreground" />
                Email from your mailbox
              </a>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/calendar?new=meeting&client=${client.id}`}>
              <CalendarPlus className="size-3.5 text-subtle-foreground" />
              Schedule a meeting
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/clients/${client.id}/new-proposal`}>
              <Plus className="size-3.5 text-subtle-foreground" />
              New proposal
            </Link>
          </Button>
          {client.contactSubmission && (
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
            <PanelLink href={`/transparency?lead=${lead.id}`}>Open</PanelLink>
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
            {/* Older leads predate these answers; a missing one is simply not a row. */}
            {brandLabel(lead.brandIdentity) && (
              <Row label="Brand">{brandLabel(lead.brandIdentity)}</Row>
            )}
            {contentLabel(lead.contentReadiness) && (
              <Row label="Content">{contentLabel(lead.contentReadiness)}</Row>
            )}
          </dl>
          {lead.scopeNotes.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="telemetry text-subtle-foreground">
                Scope notes · reviewed in scope, not priced
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {scopeNoteNames(lead.scopeNotes).map((note) => (
                  <span
                    key={note}
                    className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-meta text-muted-foreground"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>
          )}
          {lead.note && (
            <div className="mt-3 border-t border-border pt-3">
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

/**
 * Document and signing links for the Deals tab. Documents are signed on read
 * when the bucket is private, and anything that goes into a client's message is
 * made absolute from the public base URL, never from the request host.
 */
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
