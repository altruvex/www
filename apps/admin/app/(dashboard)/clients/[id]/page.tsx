import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import {
  Download,
  ExternalLink,
  FileSignature,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Plus,
} from "lucide-react";
import { PageHeader, MetaItem } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { TabNav } from "@/components/os/tab-nav";
import { DetailLayout, MetaList, QuickActions } from "@/components/os/detail-layout";
import { Timeline } from "@/components/os/timeline";
import { EmptyInline } from "@/components/os/empty-state";
import { StatusPill } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { deriveClientStage } from "@/lib/dashboard-data";
import { buildActivity } from "@/lib/activity";
import { statusOf } from "@/lib/status";
import { date, dateTime, money, phone as fmtPhone, when } from "@/lib/format";
import { StatusMenu, LifecycleButton, MarkSignedButton } from "./client-actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "proposals", label: "Proposals" },
  { id: "contracts", label: "Contracts" },
  { id: "projects", label: "Projects" },
  { id: "communication", label: "Communication" },
  { id: "documents", label: "Documents" },
  { id: "activity", label: "Activity" },
];

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam! : "overview";

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contactSubmission: {
        include: {
          notes: { include: { createdBy: { select: { name: true, email: true } } } },
          tags: true,
          meetings: true,
        },
      },
      transparencyLead: true,
      proposals: { orderBy: { createdAt: "desc" } },
      contracts: { orderBy: { createdAt: "desc" } },
      projects: {
        include: {
          payments: true,
          contract: { select: { proposal: { select: { currency: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
      messages: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) notFound();

  const stage = deriveClientStage(client);
  const displayName = client.company || client.name || "Unnamed client";
  const activity = buildActivity({
    client,
    submission: client.contactSubmission,
    transparencyLead: client.transparencyLead,
    proposals: client.proposals,
    contracts: client.contracts,
    projects: client.projects,
    payments: client.projects.flatMap((p) =>
      p.payments.map((pay) => ({
        ...pay,
        projectId: p.id,
        currency: p.contract.proposal.currency,
      })),
    ),
    messages: client.messages,
    meetings: client.contactSubmission?.meetings ?? [],
  });

  const documents = [
    ...client.proposals.flatMap((p) =>
      [
        p.fileUrl && { kind: "Proposal deck", url: p.fileUrl, at: p.createdAt, ref: `/proposals/${p.id}` },
        p.pdfUrl && { kind: "Proposal PDF", url: p.pdfUrl, at: p.createdAt, ref: `/proposals/${p.id}` },
      ].filter(Boolean),
    ),
    ...client.contracts.flatMap((c) =>
      [
        c.fileUrl && { kind: "Contract", url: c.fileUrl, at: c.createdAt, ref: `/contracts/${c.id}` },
        c.signedFileUrl && {
          kind: "Signed contract",
          url: c.signedFileUrl,
          at: c.signedAt ?? c.createdAt,
          ref: `/contracts/${c.id}`,
        },
      ].filter(Boolean),
    ),
  ] as { kind: string; url: string; at: Date; ref: string }[];

  const tabs = TABS.map((t) => ({
    ...t,
    count:
      t.id === "proposals"
        ? client.proposals.length
        : t.id === "contracts"
          ? client.contracts.length
          : t.id === "projects"
            ? client.projects.length
            : t.id === "communication"
              ? client.messages.length
              : t.id === "documents"
                ? documents.length
                : undefined,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[{ label: "Clients", href: "/clients" }, { label: displayName }]}
        title={
          <span className="flex items-center gap-2">
            <Avatar name={displayName} size="lg" />
            {displayName}
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
            <MetaItem label="Source">{statusOf("clientSource", client.source).label}</MetaItem>
            <MetaItem label="Added">{date(client.createdAt)}</MetaItem>
            <MetaItem label="Last activity">{when(client.updatedAt)}</MetaItem>
            {client.industry && <MetaItem label="Industry">{client.industry}</MetaItem>}
          </>
        }
        actions={
          <>
            <StatusMenu clientId={client.id} status={client.status} priority={client.priority} />
            <Button asChild variant="outline">
              <Link href={`/whatsapp/${client.id}`}>
                <MessageCircle className="size-3.5" />
                Message
              </Link>
            </Button>
            <Button asChild variant="brand">
              <Link href={`/clients/${client.id}/new-proposal`}>
                <Plus className="size-3.5" />
                New proposal
              </Link>
            </Button>
          </>
        }
        tabs={<TabNav tabs={tabs} active={tab} basePath={`/clients/${client.id}`} />}
      />

      <DetailLayout
        aside={
          <>
            <Panel title="Details" flush>
              <MetaList
                items={[
                  {
                    label: "Phone",
                    value: (
                      <a href={`tel:${client.phone}`} className="font-mono text-meta hover:text-brand">
                        {fmtPhone(client.phone)}
                      </a>
                    ),
                  },
                  {
                    label: "Email",
                    value: client.email ? (
                      <a href={`mailto:${client.email}`} className="truncate hover:text-brand">
                        {client.email}
                      </a>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Company", value: client.company ?? "—" },
                  { label: "Contact", value: client.name ?? "—" },
                  { label: "Industry", value: client.industry ?? "—" },
                  { label: "Source", value: statusOf("clientSource", client.source).label },
                  { label: "Created", value: dateTime(client.createdAt) },
                  { label: "Updated", value: dateTime(client.updatedAt) },
                  {
                    label: "Record",
                    value: <span className="font-mono text-micro">{client.id.slice(0, 8)}</span>,
                    hint: "Internal record id",
                  },
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
                  <Link href={`/whatsapp/${client.id}`}>
                    <MessageCircle className="size-3.5 text-messaging-whatsapp" />
                    Open conversation
                  </Link>
                </Button>
                {client.email && (
                  <Button asChild variant="outline">
                    <a href={`mailto:${client.email}`}>
                      <Mail className="size-3.5 text-subtle-foreground" />
                      Send email
                    </a>
                  </Button>
                )}
              </QuickActions>
            </Panel>

            {client.transparencyLead && (
              <Panel title="Estimator quote" description="What the public site told them">
                <dl className="space-y-1.5 text-base">
                  <Row label="Project">{client.transparencyLead.projectType}</Row>
                  <Row label="Complexity">{client.transparencyLead.complexity}</Row>
                  <Row label="Quoted">
                    <span className="font-mono text-meta tabular-nums">
                      {money(client.transparencyLead.priceMin)} – {money(client.transparencyLead.priceMax)}
                    </span>
                  </Row>
                  <Row label="Weeks">
                    <span className="font-mono text-meta tabular-nums">
                      {client.transparencyLead.weeksMin}–{client.transparencyLead.weeksMax}
                    </span>
                  </Row>
                </dl>
              </Panel>
            )}
          </>
        }
      >
        {tab === "overview" && (
          <>
            {client.contactSubmission?.message && (
              <Panel title="What they asked for" description="Verbatim from the website form">
                <p className="max-w-prose whitespace-pre-wrap text-base">
                  {client.contactSubmission.message}
                </p>
                {client.contactSubmission.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                    {client.contactSubmission.tags.map((t) => (
                      <span
                        key={t.id}
                        className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-meta text-muted-foreground"
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </Panel>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <Panel title="Proposals">
                <p className="font-sans text-lg font-medium tabular-nums">{client.proposals.length}</p>
                <p className="text-meta text-muted-foreground">
                  {client.proposals.filter((p) => p.status === "ACCEPTED").length} accepted
                </p>
              </Panel>
              <Panel title="Contracts">
                <p className="font-sans text-lg font-medium tabular-nums">{client.contracts.length}</p>
                <p className="text-meta text-muted-foreground">
                  {client.contracts.filter((c) => c.status === "SIGNED").length} signed
                </p>
              </Panel>
              <Panel title="Projects">
                <p className="font-sans text-lg font-medium tabular-nums">{client.projects.length}</p>
                <p className="text-meta text-muted-foreground">
                  {client.projects.filter((p) => p.status === "ACTIVE").length} active
                </p>
              </Panel>
            </div>

            <Panel title="Recent activity" flush bodyClassName="p-2">
              <Timeline
                events={activity.slice(0, 8)}
                dense
                emptyLabel="Nothing recorded for this client yet."
              />
            </Panel>
          </>
        )}

        {tab === "proposals" && (
          <Panel title="Proposals" flush>
            {client.proposals.length === 0 ? (
              <EmptyInline
                action={
                  <Button asChild variant="brand">
                    <Link href={`/clients/${client.id}/new-proposal`}>
                      <Plus className="size-3.5" />
                      Build a proposal
                    </Link>
                  </Button>
                }
              >
                No proposal has been issued to this client. Building one prices the work
                from the same table the public estimator uses, so the number they were
                quoted and the number you send cannot disagree.
              </EmptyInline>
            ) : (
              <ul className="rows">
                {client.proposals.map((proposal) => (
                  <li key={proposal.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                    <FileText className="size-3.5 shrink-0 text-subtle-foreground" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/proposals/${proposal.id}`} className="text-base font-medium hover:text-brand">
                        {proposal.projectType}
                      </Link>
                      <p className="text-meta text-muted-foreground">
                        {money(proposal.totalPrice, proposal.currency)} · {proposal.timelineWeeks} weeks ·
                        valid until {date(proposal.validUntil)}
                      </p>
                    </div>
                    <StatusPill registry="proposalStatus" value={proposal.status} />
                    <div className="flex items-center gap-1.5">
                      {proposal.status === "DRAFT" && (
                        <LifecycleButton
                          label="Send via WhatsApp"
                          busyLabel="Sending…"
                          endpoint={`/api/admin/proposals/${proposal.id}/send`}
                          variant="brand"
                        />
                      )}
                      {proposal.status === "ACCEPTED" && (
                        <LifecycleButton
                          label="Generate contract"
                          busyLabel="Generating…"
                          endpoint="/api/admin/contracts"
                          body={{ proposalId: proposal.id }}
                        />
                      )}
                      {proposal.pdfUrl && (
                        <Button asChild variant="outline">
                          <a href={proposal.pdfUrl} target="_blank" rel="noreferrer">
                            <Download className="size-3.5" />
                            PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "contracts" && (
          <Panel title="Contracts" flush>
            {client.contracts.length === 0 ? (
              <EmptyInline>
                No contract yet. A contract is generated from an accepted proposal, so
                the commitment always references an offer the client actually saw.
              </EmptyInline>
            ) : (
              <ul className="rows">
                {client.contracts.map((contract) => (
                  <li key={contract.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                    <FileSignature className="size-3.5 shrink-0 text-subtle-foreground" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/contracts/${contract.id}`} className="text-base font-medium hover:text-brand">
                        Contract {contract.id.slice(0, 8).toUpperCase()}
                      </Link>
                      <p className="text-meta text-muted-foreground">
                        Created {date(contract.createdAt)}
                        {contract.signedAt && ` · signed ${date(contract.signedAt)} by ${contract.signedByName}`}
                      </p>
                    </div>
                    <StatusPill registry="contractStatus" value={contract.status} />
                    <div className="flex items-center gap-1.5">
                      {contract.status === "DRAFT" && (
                        <LifecycleButton
                          label="Send for signature"
                          busyLabel="Sending…"
                          endpoint={`/api/admin/contracts/${contract.id}/send`}
                          variant="brand"
                        />
                      )}
                      {contract.status === "SENT" && <MarkSignedButton contractId={contract.id} />}
                      {contract.signToken && (
                        <Button asChild variant="outline">
                          <a href={`/sign/${contract.signToken}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-3.5" />
                            Signing page
                          </a>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "projects" && (
          <Panel title="Projects" flush>
            {client.projects.length === 0 ? (
              <EmptyInline>
                Delivery has not started. A project is created from a signed contract —
                that is the only route in, so a project always has a commitment behind it.
              </EmptyInline>
            ) : (
              <ul className="rows">
                {client.projects.map((project) => {
                  const paid = project.payments.filter((p) => p.status === "PAID");
                  const total = project.payments.reduce((s, p) => s + p.amount, 0);
                  const collected = paid.reduce((s, p) => s + p.amount, 0);
                  return (
                    <li key={project.id} className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <Link href={`/projects/${project.id}`} className="text-base font-medium hover:text-brand">
                            {project.name}
                          </Link>
                          <p className="text-meta text-muted-foreground">
                            {project.targetLaunchDate ? `Target ${date(project.targetLaunchDate)}` : "No target date"}
                          </p>
                        </div>
                        <StatusPill registry="projectPhase" value={project.phase} variant="dot" />
                        <StatusPill registry="projectStatus" value={project.status} />
                      </div>
                      {total > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                            <span
                              className="block h-full rounded-full bg-success"
                              style={{ width: `${Math.round((collected / total) * 100)}%` }}
                            />
                          </span>
                          <span className="font-mono text-micro tabular-nums text-muted-foreground">
                            {money(collected, project.contract.proposal.currency)} /{" "}
                            {money(total, project.contract.proposal.currency)}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        )}

        {tab === "communication" && (
          <Panel
            title="Conversation"
            description="Every WhatsApp message bound to this client"
            action={
              <Link href={`/whatsapp/${client.id}`} className="text-meta text-muted-foreground hover:text-foreground">
                Open thread →
              </Link>
            }
            flush
          >
            {client.messages.length === 0 ? (
              <EmptyInline>
                Nothing has been sent or received. Messages sent from a proposal or a
                contract land here automatically and stay attached to those records.
              </EmptyInline>
            ) : (
              <ul className="rows">
                {client.messages.slice(0, 30).map((message) => (
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
                        {message.direction === "INBOUND" ? "FROM CLIENT" : "SENT"} ·{" "}
                        {statusOf("whatsappStatus", message.status).label} · {when(message.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "documents" && (
          <Panel title="Documents" description="Every file this client's records produced" flush>
            {documents.length === 0 ? (
              <EmptyInline>
                No files yet. Documents are generated by the proposal and contract
                builders — they are never uploaded loose, so every file here belongs to
                a record you can open.
              </EmptyInline>
            ) : (
              <ul className="rows">
                {documents.map((doc) => (
                  <li key={doc.url} className="flex items-center gap-3 px-3 py-2.5">
                    <FileText className="size-3.5 shrink-0 text-subtle-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium">{doc.kind}</p>
                      <Link href={doc.ref} className="text-meta text-muted-foreground hover:text-brand">
                        Belongs to {doc.ref.split("/")[1].replace(/s$/, "")} {doc.ref.split("/")[2].slice(0, 8)}
                      </Link>
                    </div>
                    <span className="shrink-0 font-mono text-micro text-subtle-foreground">
                      {date(doc.at)}
                    </span>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border px-2 text-meta hover:bg-surface"
                    >
                      <Download className="size-3" />
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "activity" && (
          <Panel
            title="Everything that happened"
            description="Derived from the records themselves — this cannot drift from the data"
            flush
            bodyClassName="p-2"
          >
            <Timeline events={activity} emptyLabel="Nothing recorded for this client yet." />
          </Panel>
        )}
      </DetailLayout>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="telemetry text-subtle-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-end">{children}</dd>
    </div>
  );
}
