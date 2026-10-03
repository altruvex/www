import Link from "next/link";
import {
  AlertTriangle,
  CalendarPlus,
  Download,
  ExternalLink,
  FileSignature,
  FileText,
  Mail,
  MessageCircle,
} from "lucide-react";
import { Button } from "@repo/ui";
import { EmptyInline } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { ManualStatusMenu } from "@/components/os/manual-status";
import { Panel, PanelLink } from "@/components/os/panel";
import { SendDocument } from "@/components/os/send-document";
import { StatTile } from "@/components/os/stat-tile";
import { Timeline, type TimelineEvent } from "@/components/os/timeline";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { BILLING_INTERVAL_LABEL } from "@/lib/billing-interval";
import { paymentProgress } from "@/lib/client-payments";
import { contractDraft, proposalDraft } from "@/lib/email-templates";
import { entityHref } from "@/lib/entity-links";
import { date, dueLabel, money, moneyByCurrency, sumByCurrency, when } from "@/lib/format";
import { httpUrl } from "@/lib/http-url";
import { retainerLabel } from "@/lib/payment-source";
import { statusOf, toneDot, type Tone } from "@/lib/status";
import { deriveStatus } from "@/lib/subscription-lifecycle";
import { cn } from "@/lib/utils";
import { LifecycleButton } from "./client-actions";
import { openChangeRequests, type ClientHub, type HubEvent } from "./hub-data";

/**
 * The tab bodies of the client hub. Server components only: each receives the
 * finished hub data from `hub-data.ts` and renders it, and the only client
 * code is the existing islands (SendDocument, ManualStatusMenu, LifecycleButton).
 */

export interface DealLinks {
  /** Proposal id → the document to open (signed-on-read) and its absolute form for a send. */
  proposals: Record<string, { open: string | null; absolute: string }>;
  /** Contract id → the absolute signing link, when the contract has a token. */
  contracts: Record<string, string | null>;
  documents: { kind: string; url: string; at: Date; type: "proposal" | "contract"; id: string }[];
}

export interface Channels {
  emailConfigured: boolean;
  whatsappConfigured: boolean;
}

function displayName(client: ClientHub["client"]) {
  return client.company || client.name || "Unnamed client";
}

function ScopeLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {links.map((link) => (
        <PanelLink key={link.href} href={link.href}>
          {link.label}
        </PanelLink>
      ))}
    </div>
  );
}

/* ── Overview ─────────────────────────────────────────────────────────── */

function eventToTimeline(event: HubEvent): TimelineEvent {
  return {
    id: event.id,
    at: event.createdAt,
    tone: event.action.endsWith(".deleted") ? "danger" : "neutral",
    title: event.summary,
    detail: event.actorLabel,
    href: entityHref(event.entityType, event.entityId) ?? undefined,
  };
}

export function OverviewTab({ hub, derived }: { hub: ClientHub; derived: TimelineEvent[] }) {
  const { client, attention, payments } = hub;
  const outstanding = sumByCurrency(payments.filter((p) => p.status === "PENDING" || p.status === "OVERDUE"));
  const openDeals =
    client.proposals.filter((p) => !["ACCEPTED", "REJECTED", "EXPIRED"].includes(p.status)).length +
    client.contracts.filter((c) => c.status === "DRAFT" || c.status === "SENT").length;
  const activeProjects = client.projects.filter((p) => p.status === "ACTIVE").length;
  const openIncidents = client.products.reduce((n, p) => n + p.incidents.length, 0);
  const tab = (id: string) => `/clients/${client.id}?tab=${id}`;

  // Persisted events say who did what; until the client has any, the history
  // derived from the records themselves is the honest fallback.
  const persisted = hub.recentEvents.map(eventToTimeline);
  const recent = persisted.length > 0 ? persisted : derived.slice(0, 8);

  return (
    <>
      <Panel
        title="Needs attention"
        description="Derived from the records now; nothing here has to be cleared by hand"
        flush
      >
        {attention.length === 0 ? (
          <EmptyInline>Nothing is waiting on you for {displayName(client)}.</EmptyInline>
        ) : (
          <ul className="rows">
            {attention.map((item) => (
              <li key={item.key} className="flex items-start gap-3 px-3 py-2.5">
                <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", toneDot[item.tone])} aria-hidden />
                <div className="min-w-0 flex-1">
                  {item.href ? (
                    <Link href={item.href} className="text-base font-medium hover:text-brand">
                      {item.title}
                    </Link>
                  ) : (
                    <p className="text-base font-medium">{item.title}</p>
                  )}
                  <p className="text-meta text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open deals" value={openDeals} href={tab("deals")} />
        <StatTile label="Active projects" value={activeProjects} href={tab("delivery")} />
        <StatTile
          label="Outstanding"
          value={<span className="text-lg">{moneyByCurrency(outstanding, true)}</span>}
          sub={`${payments.filter((p) => p.overdue).length} overdue`}
          tone={payments.some((p) => p.overdue) ? "danger" : undefined}
          href={tab("money")}
        />
        <StatTile
          label="Open incidents"
          value={openIncidents}
          tone={openIncidents > 0 ? "warning" : undefined}
          href={tab("sites")}
        />
      </div>

      {client.contactSubmission?.message && (
        <Panel
          title="What they asked for"
          description="Verbatim from the website form"
          action={<PanelLink href={`/submissions/${client.contactSubmission.id}`}>Website lead</PanelLink>}
        >
          <p className="max-w-prose whitespace-pre-wrap text-base">{client.contactSubmission.message}</p>
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

      <Panel
        title="Recent activity"
        description={persisted.length > 0 ? "From the audit trail" : "Derived from the records"}
        action={<PanelLink href={tab("audit")}>Full history</PanelLink>}
        flush
        bodyClassName="p-2"
      >
        <Timeline events={recent} dense emptyLabel="Nothing recorded for this client yet." />
      </Panel>
    </>
  );
}

/* ── Deals ────────────────────────────────────────────────────────────── */

export function DealsTab({
  hub,
  links,
  channels,
}: {
  hub: ClientHub;
  links: DealLinks;
  channels: Channels;
}) {
  const { client } = hub;
  return (
    <>
      <Panel
        title="Proposals"
        action={<PanelLink href={`/proposals?client=${client.id}`}>In the proposals list</PanelLink>}
        flush
      >
        {client.proposals.length === 0 ? (
          <EmptyInline
            action={
              <Button asChild variant="outline">
                <Link href={`/clients/${client.id}/new-proposal`}>Build a proposal</Link>
              </Button>
            }
          >
            No proposal has been issued. Building one prices the work from the same table
            the public estimator uses, so the quoted and the sent number cannot disagree.
          </EmptyInline>
        ) : (
          <ul className="rows">
            {client.proposals.map((proposal) => {
              const doc = links.proposals[proposal.id];
              const draft = doc ? proposalDraft(client.name, doc.absolute) : null;
              return (
                <li key={proposal.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <FileText className="size-3.5 shrink-0 text-subtle-foreground" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/proposals/${proposal.id}`} className="text-base font-medium hover:text-brand">
                      {proposal.projectType}
                    </Link>
                    <p className="text-meta text-muted-foreground">
                      {money(proposal.totalPrice, proposal.currency)} · {proposal.timelineWeeks} weeks · valid
                      until {date(proposal.validUntil)}
                    </p>
                  </div>
                  <StatusPill registry="proposalStatus" value={proposal.status} />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {proposal.status === "DRAFT" && draft && (
                      <SendDocument
                        label="Send proposal"
                        endpoint={`/api/admin/proposals/${proposal.id}/send`}
                        defaultSubject={draft.subject}
                        defaultBody={draft.body}
                        clientEmail={client.email}
                        emailConfigured={channels.emailConfigured}
                        whatsappConfigured={channels.whatsappConfigured}
                      />
                    )}
                    {!proposal.contract && (
                      <ManualStatusMenu entity="proposal" id={proposal.id} status={proposal.status} />
                    )}
                    {proposal.status === "ACCEPTED" && !proposal.contract && (
                      <LifecycleButton
                        label="Generate contract"
                        busyLabel="Generating…"
                        endpoint="/api/admin/contracts"
                        body={{ proposalId: proposal.id }}
                      />
                    )}
                    {proposal.contract && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/contracts/${proposal.contract.id}`}>Its contract</Link>
                      </Button>
                    )}
                    {doc?.open && (
                      <Button asChild variant="outline" size="sm">
                        <a href={doc.open} target="_blank" rel="noreferrer">
                          <Download className="size-3.5" />
                          Document
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Contracts"
        action={<PanelLink href={`/contracts?client=${client.id}`}>In the contracts list</PanelLink>}
        flush
      >
        {client.contracts.length === 0 ? (
          <EmptyInline>
            No contract yet. A contract is generated from an accepted proposal, so the
            commitment always references an offer the client actually saw.
          </EmptyInline>
        ) : (
          <ul className="rows">
            {client.contracts.map((contract) => {
              const signUrl = links.contracts[contract.id];
              const draft = signUrl ? contractDraft(client.name, signUrl) : null;
              return (
                <li key={contract.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <FileSignature className="size-3.5 shrink-0 text-subtle-foreground" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/contracts/${contract.id}`} className="text-base font-medium hover:text-brand">
                      {contract.proposal.projectType} contract
                    </Link>
                    <p className="text-meta text-muted-foreground">
                      Created {date(contract.createdAt)}
                      {contract.signedAt && ` · signed ${date(contract.signedAt)} by ${contract.signedByName}`}
                    </p>
                  </div>
                  <StatusPill registry="contractStatus" value={contract.status} />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {contract.status === "DRAFT" && draft && (
                      <SendDocument
                        label="Send for signature"
                        endpoint={`/api/admin/contracts/${contract.id}/send`}
                        defaultSubject={draft.subject}
                        defaultBody={draft.body}
                        clientEmail={client.email}
                        emailConfigured={channels.emailConfigured}
                        whatsappConfigured={channels.whatsappConfigured}
                      />
                    )}
                    {contract.status !== "SIGNED" && (
                      <ManualStatusMenu entity="contract" id={contract.id} status={contract.status} />
                    )}
                    {signUrl && contract.status === "SENT" && (
                      <Button asChild variant="outline" size="sm">
                        <a href={signUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="size-3.5" />
                          Signing page
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Documents"
        description="Every file this client's proposals and contracts produced"
        action={<PanelLink href={`/documents?client=${client.id}`}>In the documents list</PanelLink>}
        flush
      >
        {links.documents.length === 0 ? (
          <EmptyInline>
            No files yet. Documents are generated by the proposal and contract builders, so
            every file here belongs to a record you can open.
          </EmptyInline>
        ) : (
          <ul className="rows">
            {links.documents.map((doc) => (
              <li key={doc.url} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <FileText className="size-3.5 shrink-0 text-subtle-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{doc.kind}</p>
                  <EntityLink type={doc.type} id={doc.id} muted className="text-meta">
                    Open the {doc.type}
                  </EntityLink>
                </div>
                <span className="shrink-0 font-mono text-micro text-subtle-foreground">{date(doc.at)}</span>
                <Button asChild variant="outline" size="sm">
                  <a href={doc.url} target="_blank" rel="noreferrer">
                    <Download className="size-3.5" />
                    Open
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

/* ── Delivery ─────────────────────────────────────────────────────────── */

export function DeliveryTab({ hub }: { hub: ClientHub }) {
  const { client, publicBase } = hub;
  return (
    <Panel
      title="Projects"
      action={
        <ScopeLinks
          links={[
            { href: `/projects?client=${client.id}`, label: "Projects" },
            { href: `/tasks?client=${client.id}`, label: "Tasks" },
          ]}
        />
      }
      flush
    >
      {client.projects.length === 0 ? (
        <EmptyInline>
          Delivery has not started. A project opens when a contract is signed — that is the
          only route in, so a project always has a commitment behind it.
        </EmptyInline>
      ) : (
        <ul className="rows">
          {client.projects.map((project) => {
            const currency = project.contract.proposal.currency;
            const { total, collected } = paymentProgress(project.payments);
            const changes = openChangeRequests(project);
            return (
              <li key={project.id} className="space-y-2 px-3 py-3">
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

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-meta">
                  <Link href={`/tasks?project=${project.id}`} className="text-muted-foreground hover:text-foreground">
                    {project._count.tasks} open {project._count.tasks === 1 ? "task" : "tasks"}
                  </Link>
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {changes.length} open change {changes.length === 1 ? "request" : "requests"}
                  </Link>
                  <a
                    href={`${publicBase}/portal/${project.portalToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    Client portal
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                {changes.length > 0 && (
                  <ul className="space-y-1 border-s border-border ps-3">
                    {changes.map((cr) => (
                      <li key={cr.id} className="flex flex-wrap items-center gap-2 text-meta">
                        <span className="min-w-0 flex-1 truncate">{cr.title}</span>
                        <StatusPill registry="changeRequestStatus" value={cr.status} variant="dot" />
                        <span className="font-mono text-micro text-subtle-foreground">{when(cr.requestedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {total > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="block h-full rounded-full bg-success"
                        style={{ width: `${Math.round((collected / total) * 100)}%` }}
                      />
                    </span>
                    <span className="font-mono text-micro tabular-nums text-muted-foreground">
                      {money(collected, currency)} / {money(total, currency)}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ── Sites ────────────────────────────────────────────────────────────── */

export function SitesTab({ hub }: { hub: ClientHub }) {
  const { client } = hub;
  return (
    <Panel
      title="Products"
      description="The sites and apps running for this client"
      action={
        <ScopeLinks
          links={[
            { href: `/products?client=${client.id}`, label: "Products" },
            { href: `/incidents?client=${client.id}`, label: "Incidents" },
          ]}
        />
      }
      flush
    >
      {client.products.length === 0 ? (
        <EmptyInline>
          No product is registered. A product is what CI reports builds and deployments
          against, so register one when the first site goes to staging.
        </EmptyInline>
      ) : (
        <ul className="rows">
          {client.products.map((product) => {
            // The URL is rendered as a link, so it passes the same scheme check
            // as any other followed URL; an unsafe value is shown as text.
            const url = product.productionUrl && httpUrl.safeParse(product.productionUrl).success
              ? product.productionUrl
              : null;
            const lastDeploy = product.deployments[0];
            return (
              <li key={product.id} className="space-y-1.5 px-3 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${product.id}`} className="text-base font-medium hover:text-brand">
                      {product.name}
                    </Link>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 truncate text-meta text-muted-foreground hover:text-foreground"
                      >
                        {url.replace(/^https?:\/\//, "")}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ) : (
                      <p className="text-meta text-muted-foreground">{product.productionUrl ?? "No production URL"}</p>
                    )}
                  </div>
                  <StatusPill registry="productStatus" value={product.status} />
                </div>
                <p className="text-meta text-muted-foreground">
                  {lastDeploy ? (
                    <>
                      Last production deploy{" "}
                      <Link href={entityHref("deployment", lastDeploy.id) ?? "#"} className="hover:text-foreground">
                        #{lastDeploy.number}
                        {lastDeploy.version ? ` · ${lastDeploy.version}` : ""}
                      </Link>{" "}
                      {when(lastDeploy.finishedAt ?? lastDeploy.createdAt)}
                    </>
                  ) : (
                    "No successful production deploy reported"
                  )}
                </p>
                {product.incidents.length > 0 && (
                  <ul className="space-y-1 border-s border-border ps-3">
                    {product.incidents.map((incident) => (
                      <li key={incident.id} className="flex flex-wrap items-center gap-2 text-meta">
                        <AlertTriangle className="size-3 shrink-0 text-warning" aria-hidden />
                        <Link
                          href={entityHref("incident", incident.id) ?? "#"}
                          className="min-w-0 flex-1 truncate hover:text-brand"
                        >
                          #{incident.number} {incident.title}
                        </Link>
                        <StatusPill registry="incidentSeverity" value={incident.severity} variant="dot" />
                        <StatusPill registry="incidentStatus" value={incident.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ── Money ────────────────────────────────────────────────────────────── */

export function MoneyTab({ hub }: { hub: ClientHub }) {
  const { client, payments, publicBase } = hub;
  const outstanding = sumByCurrency(payments.filter((p) => p.status === "PENDING" || p.status === "OVERDUE"));
  const overdue = sumByCurrency(payments.filter((p) => p.overdue));
  const collected = sumByCurrency(payments.filter((p) => p.status === "PAID"));
  const projectName = new Map(client.projects.map((p) => [p.id, p.name]));
  const sorted = [...payments].sort(
    (a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity),
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Outstanding" value={<span className="text-lg">{moneyByCurrency(outstanding)}</span>} />
        <StatTile
          label="Overdue"
          value={<span className="text-lg">{moneyByCurrency(overdue)}</span>}
          tone={payments.some((p) => p.overdue) ? "danger" : undefined}
        />
        <StatTile label="Collected" value={<span className="text-lg">{moneyByCurrency(collected)}</span>} />
      </div>

      <Panel
        title="Payments"
        description="Overdue is read from the due date, never set by hand"
        action={<PanelLink href={`/payments?client=${client.id}`}>In billing</PanelLink>}
        flush
      >
        {sorted.length === 0 ? (
          <EmptyInline>
            No payments yet. The schedule opens with the project when a contract is signed,
            and each retainer period adds its own.
          </EmptyInline>
        ) : (
          <ul className="rows">
            {sorted.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <Link
                    href={entityHref("payment", payment.id) ?? "/payments"}
                    className="text-base font-medium hover:text-brand"
                  >
                    {statusOf("paymentMilestone", payment.milestone).label}
                  </Link>
                  <p className="text-meta text-muted-foreground">
                    {payment.projectId ? (
                      <EntityLink type="project" id={payment.projectId} muted>
                        {projectName.get(payment.projectId) ?? "Project"}
                      </EntityLink>
                    ) : payment.subscription ? (
                      retainerLabel(payment.subscription)
                    ) : null}
                    {" · "}
                    {payment.paidAt ? `Paid ${date(payment.paidAt)}` : `Due ${dueLabel(payment.dueDate)}`}
                  </p>
                </div>
                <span className="font-mono text-meta tabular-nums">{money(payment.amount, payment.currency)}</span>
                <StatusPill registry="paymentStatus" value={payment.overdue ? "OVERDUE" : payment.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Retainers"
        action={<PanelLink href={`/maintenance?client=${client.id}`}>In retainers</PanelLink>}
        flush
      >
        {client.subscriptions.length === 0 ? (
          <EmptyInline>No retainer. A retainer is set up from Retainers once the site has launched.</EmptyInline>
        ) : (
          <ul className="rows">
            {client.subscriptions.map((sub) => (
              <li key={sub.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <Link href={`/maintenance/${sub.id}`} className="text-base font-medium hover:text-brand">
                    {retainerLabel(sub)}
                  </Link>
                  <p className="text-meta text-muted-foreground">
                    {BILLING_INTERVAL_LABEL[sub.billingInterval]} · current period to {date(sub.currentPeriodEnd)}
                    {" · "}
                    <a
                      href={`${publicBase}/client-portal/${sub.portalToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-foreground"
                    >
                      Client portal
                    </a>
                  </p>
                </div>
                <StatusPill registry="subscriptionStatus" value={deriveStatus(sub)} variant="dot" />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

/* ── Conversations ────────────────────────────────────────────────────── */

const EMAIL_TONE: Record<string, Tone> = {
  QUEUED: "neutral",
  SENT: "info",
  FAILED: "danger",
  DELIVERED: "success",
  BOUNCED: "danger",
  COMPLAINED: "danger",
};

export function ConversationsTab({ hub }: { hub: ClientHub }) {
  const { client } = hub;
  const entries = [
    ...client.messages.map((m) => ({ kind: "whatsapp" as const, at: m.createdAt, m })),
    ...client.emails.map((e) => ({ kind: "email" as const, at: e.createdAt, e })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 30);

  return (
    <Panel
      title="Conversations"
      description="WhatsApp both ways; email is outbound only, so replies arrive in the reply-to mailbox, not here"
      action={
        <ScopeLinks
          links={[
            { href: `/inbox?client=${client.id}`, label: "Inbox" },
            { href: `/email?client=${client.id}`, label: "Sent mail" },
          ]}
        />
      }
      flush
    >
      {entries.length === 0 ? (
        <EmptyInline
          action={
            <Button asChild variant="outline">
              <Link href={`/whatsapp/${client.id}`}>Start a conversation</Link>
            </Button>
          }
        >
          Nothing has been sent or received. Proposals and contracts sent from here land in
          this list and stay attached to those records.
        </EmptyInline>
      ) : (
        <ul className="rows">
          {entries.map((entry) =>
            entry.kind === "whatsapp" ? (
              <li key={`wa-${entry.m.id}`} className="flex gap-3 px-3 py-2.5">
                <MessageCircle
                  className={cn(
                    "mt-0.5 size-3.5 shrink-0",
                    entry.m.direction === "INBOUND" ? "text-progress" : "text-subtle-foreground",
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-3 whitespace-pre-wrap text-base">{entry.m.body}</p>
                  <p className="mt-0.5 font-mono text-micro text-subtle-foreground">
                    WHATSAPP · {entry.m.direction === "INBOUND" ? "FROM CLIENT" : "SENT"} ·{" "}
                    {statusOf("whatsappStatus", entry.m.status).label} · {when(entry.m.createdAt)}
                  </p>
                </div>
              </li>
            ) : (
              <li key={`em-${entry.e.id}`} className="flex gap-3 px-3 py-2.5">
                <Mail className="mt-0.5 size-3.5 shrink-0 text-subtle-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{entry.e.subject}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-micro text-subtle-foreground">
                    EMAIL · TO {entry.e.toAddress} · {when(entry.e.createdAt)}
                    <ToneBadge tone={EMAIL_TONE[entry.e.status] ?? "neutral"}>
                      {entry.e.status.charAt(0) + entry.e.status.slice(1).toLowerCase()}
                    </ToneBadge>
                  </p>
                  {entry.e.failureReason && (
                    <p className="mt-0.5 text-meta text-danger">{entry.e.failureReason}</p>
                  )}
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </Panel>
  );
}

/* ── Meetings ─────────────────────────────────────────────────────────── */

export function MeetingsTab({ hub }: { hub: ClientHub }) {
  const { client, meetings } = hub;
  const schedule = (
    <Button asChild variant="outline" size="sm">
      <Link href={`/calendar?new=meeting&client=${client.id}`}>
        <CalendarPlus className="size-3.5" />
        Schedule a meeting
      </Link>
    </Button>
  );
  return (
    <Panel
      title="Meetings"
      description="Booked with this client, including the ones booked from the website before they became a client"
      action={schedule}
      flush
    >
      {meetings.length === 0 ? (
        <EmptyInline>No meeting has been booked with {displayName(client)}.</EmptyInline>
      ) : (
        <ul className="rows">
          {meetings.map((meeting) => (
            <li key={meeting.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <Link href={`/calendar?meeting=${meeting.id}`} className="text-base font-medium hover:text-brand">
                  {meeting.title}
                </Link>
                <p className="text-meta text-muted-foreground">
                  {date(meeting.scheduledDate)} at {meeting.scheduledTime} · {meeting.durationMinutes} min
                </p>
              </div>
              <StatusPill registry="meetingType" value={meeting.type} variant="dot" />
              <StatusPill registry="meetingStatus" value={meeting.status} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ── Notes from the website lead ──────────────────────────────────────── */

export function LeadNotes({ hub }: { hub: ClientHub }) {
  const submission = hub.client.contactSubmission;
  if (!submission || submission.notes.length === 0) return null;
  return (
    <Panel
      title="From the website lead"
      description="Notes written while this was still a lead. Read-only here; they stay on the submission."
      action={<PanelLink href={`/submissions/${submission.id}`}>Open the lead</PanelLink>}
      flush
    >
      <ul className="rows">
        {submission.notes.map((note) => (
          <li key={note.id} className="px-3 py-2.5">
            <p className="text-meta text-muted-foreground">
              {note.createdBy.name || note.createdBy.email} · {when(note.createdAt)}
            </p>
            <p className="mt-1 max-w-prose whitespace-pre-wrap text-base">{note.content}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
