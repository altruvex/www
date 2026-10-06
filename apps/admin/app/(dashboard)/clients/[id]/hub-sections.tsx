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
import { AttachPicker } from "@/components/os/attach-picker";
import { EmptyInline } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { ManualStatusMenu } from "@/components/os/manual-status";
import { Panel, PanelLink } from "@/components/os/panel";
import { PickToOpen } from "@/components/os/pick-to-open";
import { SendDocument } from "@/components/os/send-document";
import { StatTile } from "@/components/os/stat-tile";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { BILLING_INTERVAL_LABEL } from "@/lib/billing-interval";
import { paymentProgress } from "@/lib/client-payments";
import {
  contractEmailTemplate,
  proposalEmailTemplate,
} from "@/lib/document-templates";
import { roleCanOpen } from "@/lib/action-center";
import { entityHref } from "@/lib/entity-links";
import {
  date,
  dueLabel,
  money,
  moneyByCurrency,
  sumByCurrency,
  when,
} from "@/lib/format";
import { httpUrl } from "@/lib/http-url";
import type { Role } from "@/lib/nav";
import { retainerLabel } from "@/lib/payment-source";
import { projectCurrency } from "@/lib/project-currency";
import { can } from "@/lib/rbac";
import { statusOf, toneDot, type Tone } from "@/lib/status";
import { deriveStatus } from "@/lib/subscription-lifecycle";
import { cn } from "@/lib/utils";
import { LifecycleButton } from "./client-actions";
import { openChangeRequests, type ClientHub } from "./hub-data";

export interface DealLinks {
  proposals: Record<string, { open: string | null; absolute: string }>;
  contracts: Record<string, string | null>;
  documents: {
    kind: string;
    url: string;
    at: Date;
    type: "proposal" | "contract";
    id: string;
  }[];
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

export function OverviewTab({
  hub,
  showMoney,
  role,
}: {
  hub: ClientHub;
  showMoney: boolean;
  role: Role | undefined;
}) {
  const { client, attention, payments } = hub;
  const outstanding = sumByCurrency(
    payments.filter((p) => p.status === "PENDING" || p.status === "OVERDUE"),
  );
  const openDeals =
    client.proposals.filter(
      (p) => !["ACCEPTED", "REJECTED", "EXPIRED"].includes(p.status),
    ).length +
    client.contracts.filter((c) => c.status === "DRAFT" || c.status === "SENT")
      .length;
  const activeProjects = client.projects.filter(
    (p) => p.status === "ACTIVE",
  ).length;
  const openIncidents = client.products.reduce(
    (n, p) => n + p.incidents.length,
    0,
  );
  const anchor = (id: string) => `#${id}`;

  return (
    <>
      <Panel
        title="Needs attention"
        description="Derived from the records now; nothing here has to be cleared by hand"
        flush
      >
        {attention.length === 0 ? (
          <EmptyInline>
            Nothing is waiting on you for {displayName(client)}.
          </EmptyInline>
        ) : (
          <ul className="rows">
            {attention.map((item) => (
              <li key={item.key} className="flex items-start gap-3 px-3 py-2.5">
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    toneDot[item.tone],
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="text-base font-medium hover:text-brand"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <p className="text-base font-medium">{item.title}</p>
                  )}
                  <p className="text-meta text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open deals" value={openDeals} href={anchor("deals")} />
        <StatTile
          label="Active projects"
          value={activeProjects}
          href={anchor("delivery")}
        />
        {showMoney ? (
          <StatTile
            label="Outstanding"
            value={
              <span className="text-lg">
                {moneyByCurrency(outstanding, true)}
              </span>
            }
            sub={`${payments.filter((p) => p.overdue).length} overdue`}
            tone={payments.some((p) => p.overdue) ? "danger" : undefined}
            href={anchor("money")}
          />
        ) : (
          <StatTile
            label="Meetings"
            value={hub.meetings.length}
            href={anchor("meetings")}
          />
        )}
        <StatTile
          label="Open incidents"
          value={openIncidents}
          tone={openIncidents > 0 ? "warning" : undefined}
          href={anchor("sites")}
        />
      </div>

      {client.contactSubmission?.message && (
        <Panel
          title="What they asked for"
          description="Verbatim from the website form"
          action={
            can(role, "view", "lead") ? (
              <PanelLink href={`/submissions/${client.contactSubmission.id}`}>
                Website lead
              </PanelLink>
            ) : undefined
          }
        >
          <p className="max-w-prose whitespace-pre-wrap text-base">
            {client.contactSubmission.message}
          </p>
          {client.contactSubmission.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border-subtle pt-3">
              {client.contactSubmission.tags.map((t) => (
                <span
                  key={t.id}
                  className="rounded-ctl-xs border border-border-subtle bg-surface px-1.5 py-0.5 text-meta text-muted-foreground"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </Panel>
      )}
    </>
  );
}

export function DealsTab({
  hub,
  links,
  channels,
  role,
}: {
  hub: ClientHub;
  links: DealLinks;
  channels: Channels;
  role: Role | undefined;
}) {
  const { client } = hub;
  const canViewProposal = can(role, "view", "proposal");
  const canSendProposal = can(role, "send", "proposal");
  const canEditProposal = can(role, "edit", "proposal");
  const canCreateProposal = can(role, "create", "proposal");
  const canContract = can(role, "create", "contract");
  const canSendContract = can(role, "send", "contract");
  const canEditContract = can(role, "edit", "contract");
  const acceptedWithoutContract = client.proposals.find(
    (p) => p.status === "ACCEPTED" && !p.contract,
  );
  return (
    <>
      <Panel
        title="Proposals"
        action={
          canViewProposal ? (
            <PanelLink href={`/proposals?client=${client.id}`}>
              In the proposals list
            </PanelLink>
          ) : undefined
        }
        flush
      >
        {client.proposals.length === 0 ? (
          <EmptyInline
            action={
              canCreateProposal ? (
                <Button asChild variant="outline">
                  <Link href={`/clients/${client.id}/new-proposal`}>
                    Build a proposal
                  </Link>
                </Button>
              ) : undefined
            }
          >
            No proposal has been issued. Building one prices the work from the
            same table the public estimator uses, so the quoted and the sent
            number cannot disagree.
          </EmptyInline>
        ) : (
          <ul className="rows">
            {client.proposals.map((proposal) => {
              const doc = links.proposals[proposal.id];
              const draft = doc
                ? proposalEmailTemplate({
                    clientName: client.name,
                    projectType: proposal.projectType,
                    totalPrice: proposal.totalPrice,
                    currency: proposal.currency,
                    link: doc.absolute,
                  })
                : null;
              return (
                <li
                  key={proposal.id}
                  className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                >
                  <FileText className="size-3.5 shrink-0 text-subtle-foreground" />
                  <div className="min-w-0 flex-1">
                    {canViewProposal ? (
                      <Link
                        href={`/proposals/${proposal.id}`}
                        className="text-base font-medium hover:text-brand"
                      >
                        {proposal.projectType}
                      </Link>
                    ) : (
                      <p className="text-base font-medium">
                        {proposal.projectType}
                      </p>
                    )}
                    <p className="text-meta text-muted-foreground">
                      {canViewProposal &&
                        `${money(proposal.totalPrice, proposal.currency)} · `}
                      {proposal.timelineWeeks} weeks · valid until{" "}
                      {date(proposal.validUntil)}
                    </p>
                  </div>
                  <StatusPill
                    registry="proposalStatus"
                    value={proposal.status}
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {proposal.status === "DRAFT" &&
                      draft &&
                      canSendProposal && (
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
                    {!proposal.contract && canEditProposal && (
                      <ManualStatusMenu
                        entity="proposal"
                        id={proposal.id}
                        status={proposal.status}
                      />
                    )}
                    {proposal.status === "ACCEPTED" &&
                      !proposal.contract &&
                      canContract && (
                        <LifecycleButton
                          label="Generate contract"
                          busyLabel="Generating…"
                          endpoint="/api/admin/contracts"
                          body={{ proposalId: proposal.id }}
                        />
                      )}
                    {proposal.contract && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/contracts/${proposal.contract.id}`}>
                          Its contract
                        </Link>
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
        action={
          <PanelLink href={`/contracts?client=${client.id}`}>
            In the contracts list
          </PanelLink>
        }
        flush
      >
        {client.contracts.length === 0 ? (
          <EmptyInline
            action={
              acceptedWithoutContract && canContract ? (
                <LifecycleButton
                  label="Generate contract"
                  busyLabel="Generating…"
                  endpoint="/api/admin/contracts"
                  body={{ proposalId: acceptedWithoutContract.id }}
                  successMessage="Contract generated."
                />
              ) : undefined
            }
          >
            No contract yet. A contract is generated from an accepted proposal,
            so the commitment always references an offer the client actually
            saw.
          </EmptyInline>
        ) : (
          <ul className="rows">
            {client.contracts.map((contract) => {
              const signUrl = links.contracts[contract.id];
              const draft =
                signUrl && contract.fileUrl
                  ? contractEmailTemplate({
                      clientName: client.name,
                      projectType: contract.proposal.projectType,
                      link: signUrl,
                    })
                : null;
              return (
                <li
                  key={contract.id}
                  className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                >
                  <FileSignature className="size-3.5 shrink-0 text-subtle-foreground" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="text-base font-medium hover:text-brand"
                    >
                      {contract.proposal.projectType} contract
                    </Link>
                    <p className="text-meta text-muted-foreground">
                      Created {date(contract.createdAt)}
                      {contract.signedAt &&
                        ` · signed ${date(contract.signedAt)} by ${contract.signedByName}`}
                    </p>
                  </div>
                  <StatusPill
                    registry="contractStatus"
                    value={contract.status}
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {contract.status === "DRAFT" &&
                      draft &&
                      canSendContract && (
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
                    {contract.status !== "SIGNED" && canEditContract && (
                      <ManualStatusMenu
                        entity="contract"
                        id={contract.id}
                        status={contract.status}
                      />
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
        action={
          <PanelLink href={`/documents?client=${client.id}`}>
            In the documents list
          </PanelLink>
        }
        flush
      >
        {links.documents.length === 0 ? (
          <EmptyInline>
            No files yet. Documents are generated by the proposal and contract
            builders, so every file here belongs to a record you can open.
          </EmptyInline>
        ) : (
          <ul className="rows">
            {links.documents.map((doc) => (
              <li
                key={doc.url}
                className="flex flex-wrap items-center gap-3 px-3 py-2.5"
              >
                <FileText className="size-3.5 shrink-0 text-subtle-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{doc.kind}</p>
                  {doc.type === "contract" || canViewProposal ? (
                    <EntityLink
                      type={doc.type}
                      id={doc.id}
                      muted
                      className="text-meta"
                    >
                      Open the {doc.type}
                    </EntityLink>
                  ) : (
                    <p className="text-meta text-muted-foreground">
                      From a proposal
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-micro text-subtle-foreground">
                  {date(doc.at)}
                </span>
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

export function DeliveryTab({
  hub,
  showMoney,
  role,
}: {
  hub: ClientHub;
  showMoney: boolean;
  role: Role | undefined;
}) {
  const { client, publicBase } = hub;
  const canRecord =
    can(role, "create", "project") && roleCanOpen(role, "/projects");
  const unopened = client.contracts.find(
    (c) => c.status === "SIGNED" && !c.project,
  );
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
        <EmptyInline
          action={
            canRecord || (unopened && can(role, "create", "project")) ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {unopened && can(role, "create", "project") && (
                  <Button asChild variant="outline">
                    <Link href={`/contracts/${unopened.id}#delivery`}>
                      Open the project from its contract
                    </Link>
                  </Button>
                )}
                {canRecord && (
                  <Button asChild variant="outline">
                    <Link href={`/projects?new=recorded&client=${client.id}`}>
                      Record a past project
                    </Link>
                  </Button>
                )}
              </div>
            ) : undefined
          }
        >
          {unopened
            ? "A contract is signed but no project was opened from it. "
            : ""}
          Delivery has not started. A project opens when a contract is signed,
          so it always has a commitment behind it — or record a past project
          that was built before this system existed.
        </EmptyInline>
      ) : (
        <ul className="rows">
          {client.projects.map((project) => {
            const currency = projectCurrency(project);
            const { total, collected } = paymentProgress(project.payments);
            const changes = openChangeRequests(project);
            return (
              <li key={project.id} className="space-y-2 px-3 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-base font-medium hover:text-brand"
                    >
                      {project.name}
                    </Link>
                    <p className="text-meta text-muted-foreground">
                      {project.targetLaunchDate
                        ? `Target ${date(project.targetLaunchDate)}`
                        : "No target date"}
                    </p>
                  </div>
                  <StatusPill
                    registry="projectPhase"
                    value={project.phase}
                    variant="dot"
                  />
                  <StatusPill registry="projectStatus" value={project.status} />
                  {project.origin === "RECORDED" && (
                    <StatusPill registry="projectOrigin" value={project.origin} />
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-meta">
                  <Link
                    href={`/tasks?project=${project.id}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {project._count.tasks} open{" "}
                    {project._count.tasks === 1 ? "task" : "tasks"}
                  </Link>
                  <Link
                    href={`/projects/${project.id}#changes`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {changes.length} open change{" "}
                    {changes.length === 1 ? "request" : "requests"}
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
                  <ul className="space-y-1 border-s border-border-subtle ps-3">
                    {changes.map((cr) => (
                      <li
                        key={cr.id}
                        className="flex flex-wrap items-center gap-2 text-meta"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {cr.title}
                        </span>
                        <StatusPill
                          registry="changeRequestStatus"
                          value={cr.status}
                          variant="dot"
                        />
                        <span className="font-mono text-micro text-subtle-foreground">
                          {when(cr.requestedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {showMoney && total > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="block h-full rounded-full bg-success"
                        style={{
                          width: `${Math.round((collected / total) * 100)}%`,
                        }}
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

export function SitesTab({
  hub,
  role,
}: {
  hub: ClientHub;
  role: Role | undefined;
}) {
  const { client } = hub;
  const canRegister =
    can(role, "create", "project") && roleCanOpen(role, "/products");
  const canLink = can(role, "edit", "project");
  const projectOptions = client.projects.map((p) => ({
    value: p.id,
    label: p.name,
    hint: statusOf("projectStatus", p.status).label,
  }));
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
        <EmptyInline
          action={
            canRegister ? (
              <Button asChild variant="outline">
                <Link href={`/products?new=product&client=${client.id}`}>
                  Register a product
                </Link>
              </Button>
            ) : undefined
          }
        >
          No product is registered. A product is what CI reports builds and
          deployments against, so register one when the first site goes to
          staging.
        </EmptyInline>
      ) : (
        <ul className="rows">
          {client.products.map((product) => {
            const url =
              product.productionUrl &&
              httpUrl.safeParse(product.productionUrl).success
                ? product.productionUrl
                : null;
            const lastDeploy = product.deployments[0];
            return (
              <li key={product.id} className="space-y-1.5 px-3 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${product.id}`}
                      className="text-base font-medium hover:text-brand"
                    >
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
                      <p className="text-meta text-muted-foreground">
                        {product.productionUrl ?? "No production URL"}
                      </p>
                    )}
                  </div>
                  <StatusPill registry="productStatus" value={product.status} />
                </div>
                {!product.projectId && (
                  <div className="flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
                    <span>Not on a project.</span>
                    {canLink && projectOptions.length > 0 && (
                      <AttachPicker
                        label="Link to a project"
                        options={projectOptions}
                        request={{
                          url: "/api/admin/products",
                          method: "PATCH",
                          body: { action: "update", id: product.id, patch: {} },
                          field: "patch.projectId",
                        }}
                        successMessage={`${product.name} linked to the project.`}
                      />
                    )}
                  </div>
                )}
                <p className="text-meta text-muted-foreground">
                  {lastDeploy ? (
                    <>
                      Last production deploy{" "}
                      <Link
                        href={entityHref("deployment", lastDeploy.id) ?? "#"}
                        className="hover:text-foreground"
                      >
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
                  <ul className="space-y-1 border-s border-border-subtle ps-3">
                    {product.incidents.map((incident) => (
                      <li
                        key={incident.id}
                        className="flex flex-wrap items-center gap-2 text-meta"
                      >
                        <AlertTriangle
                          className="size-3 shrink-0 text-warning"
                          aria-hidden
                        />
                        <Link
                          href={entityHref("incident", incident.id) ?? "#"}
                          className="min-w-0 flex-1 truncate hover:text-brand"
                        >
                          #{incident.number} {incident.title}
                        </Link>
                        <StatusPill
                          registry="incidentSeverity"
                          value={incident.severity}
                          variant="dot"
                        />
                        <StatusPill
                          registry="incidentStatus"
                          value={incident.status}
                        />
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

export function MoneyTab({
  hub,
  role,
}: {
  hub: ClientHub;
  role: Role | undefined;
}) {
  const { client, payments, publicBase } = hub;
  const canCharge =
    can(role, "create", "payment") && roleCanOpen(role, "/payments");
  const canRetain =
    can(role, "create", "payment") && roleCanOpen(role, "/maintenance");
  // A charge bills a running project only (loadChargeTargets: ACTIVE / ON_HOLD).
  const chargeable = client.projects.filter(
    (p) => p.status === "ACTIVE" || p.status === "ON_HOLD",
  );
  const outstanding = sumByCurrency(
    payments.filter((p) => p.status === "PENDING" || p.status === "OVERDUE"),
  );
  const overdue = sumByCurrency(payments.filter((p) => p.overdue));
  const collected = sumByCurrency(payments.filter((p) => p.status === "PAID"));
  const projectName = new Map(client.projects.map((p) => [p.id, p.name]));
  const sorted = [...payments].sort(
    (a, b) =>
      (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity),
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Outstanding"
          value={
            <span className="text-lg">{moneyByCurrency(outstanding)}</span>
          }
        />
        <StatTile
          label="Overdue"
          value={<span className="text-lg">{moneyByCurrency(overdue)}</span>}
          tone={payments.some((p) => p.overdue) ? "danger" : undefined}
        />
        <StatTile
          label="Collected"
          value={<span className="text-lg">{moneyByCurrency(collected)}</span>}
        />
      </div>

      <Panel
        title="Payments"
        description="Overdue is read from the due date, never set by hand"
        action={
          <PanelLink href={`/payments?client=${client.id}`}>
            In billing
          </PanelLink>
        }
        flush
      >
        {sorted.length === 0 ? (
          <EmptyInline
            action={
              canCharge && chargeable.length > 0 ? (
                <PickToOpen
                  label="New charge"
                  options={chargeable.map((p) => ({
                    label: p.name,
                    href: `/payments?new=charge&client=${client.id}&project=${p.id}`,
                    hint: statusOf("projectStatus", p.status).label,
                  }))}
                />
              ) : undefined
            }
          >
            No payments yet. The schedule opens with the project when a contract
            is signed, and each retainer period adds its own.
          </EmptyInline>
        ) : (
          <ul className="rows">
            {sorted.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center gap-3 px-3 py-2.5"
              >
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
                    {payment.paidAt
                      ? `Paid ${date(payment.paidAt)}`
                      : `Due ${dueLabel(payment.dueDate)}`}
                  </p>
                </div>
                <span className="font-mono text-meta tabular-nums">
                  {money(payment.amount, payment.currency)}
                </span>
                <StatusPill
                  registry="paymentStatus"
                  value={payment.overdue ? "OVERDUE" : payment.status}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Retainers"
        action={
          <PanelLink href={`/maintenance?client=${client.id}`}>
            In retainers
          </PanelLink>
        }
        flush
      >
        {client.subscriptions.length === 0 ? (
          <EmptyInline
            action={
              canRetain ? (
                <Button asChild variant="outline">
                  <Link href={`/maintenance?new=retainer&client=${client.id}`}>
                    Start a retainer
                  </Link>
                </Button>
              ) : undefined
            }
          >
            No retainer. Start one once the site has launched.
          </EmptyInline>
        ) : (
          <ul className="rows">
            {client.subscriptions.map((sub) => (
              <li
                key={sub.id}
                className="flex flex-wrap items-center gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/maintenance/${sub.id}`}
                    className="text-base font-medium hover:text-brand"
                  >
                    {retainerLabel(sub)}
                  </Link>
                  <p className="text-meta text-muted-foreground">
                    {BILLING_INTERVAL_LABEL[sub.billingInterval]} · current
                    period to {date(sub.currentPeriodEnd)}
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
                <StatusPill
                  registry="subscriptionStatus"
                  value={deriveStatus(sub)}
                  variant="dot"
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

const EMAIL_TONE: Record<string, Tone> = {
  QUEUED: "neutral",
  SENT: "info",
  FAILED: "danger",
  DELIVERED: "success",
  BOUNCED: "danger",
  COMPLAINED: "danger",
};

const CONVERSATIONS_SHOWN = 10;

export function ConversationsTab({
  hub,
  role,
}: {
  hub: ClientHub;
  role: Role | undefined;
}) {
  const { client } = hub;
  const entries = [
    ...client.messages.map((m) => ({
      kind: "whatsapp" as const,
      at: m.createdAt,
      m,
    })),
    ...client.emails.map((e) => ({
      kind: "email" as const,
      at: e.createdAt,
      e,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const shown = entries.slice(0, CONVERSATIONS_SHOWN);

  return (
    <Panel
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
            can(role, "send", "message") ? (
              <Button asChild variant="outline">
                <Link href={`/whatsapp/${client.id}`}>Start a conversation</Link>
              </Button>
            ) : undefined
          }
        >
          Nothing has been sent or received. Proposals and contracts sent from
          here land in this list and stay attached to those records.
        </EmptyInline>
      ) : (
        <ul className="rows">
          {shown.map((entry) =>
            entry.kind === "whatsapp" ? (
              <li key={`wa-${entry.m.id}`} className="flex gap-3 px-3 py-2.5">
                <MessageCircle
                  className={cn(
                    "mt-0.5 size-3.5 shrink-0",
                    entry.m.direction === "INBOUND"
                      ? "text-progress"
                      : "text-subtle-foreground",
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-3 whitespace-pre-wrap text-base">
                    {entry.m.body}
                  </p>
                  <p className="mt-0.5 font-mono text-micro text-subtle-foreground">
                    WHATSAPP ·{" "}
                    {entry.m.direction === "INBOUND" ? "FROM CLIENT" : "SENT"} ·{" "}
                    {statusOf("whatsappStatus", entry.m.status).label} ·{" "}
                    {when(entry.m.createdAt)}
                  </p>
                </div>
              </li>
            ) : (
              <li key={`em-${entry.e.id}`} className="flex gap-3 px-3 py-2.5">
                <Mail
                  className="mt-0.5 size-3.5 shrink-0 text-subtle-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">
                    {entry.e.subject}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-micro text-subtle-foreground">
                    EMAIL · TO {entry.e.toAddress} · {when(entry.e.createdAt)}
                    <ToneBadge tone={EMAIL_TONE[entry.e.status] ?? "neutral"}>
                      {entry.e.status.charAt(0) +
                        entry.e.status.slice(1).toLowerCase()}
                    </ToneBadge>
                  </p>
                  {entry.e.failureReason && (
                    <p className="mt-0.5 text-meta text-danger">
                      {entry.e.failureReason}
                    </p>
                  )}
                </div>
              </li>
            ),
          )}
        </ul>
      )}
      {entries.length > shown.length && (
        <p className="border-t border-border-subtle px-3 py-2 text-meta text-muted-foreground">
          Showing the latest {shown.length}.{" "}
          <Link
            href={`/inbox?client=${client.id}`}
            className="text-foreground underline-offset-2 hover:underline"
          >
            All WhatsApp
          </Link>
          {" · "}
          <Link
            href={`/email?client=${client.id}`}
            className="text-foreground underline-offset-2 hover:underline"
          >
            All sent mail
          </Link>
        </p>
      )}
    </Panel>
  );
}

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
      description="Booked with this client, including the ones booked from the website before they became a client"
      action={schedule}
      flush
    >
      {meetings.length === 0 ? (
        <EmptyInline>
          No meeting has been booked with {displayName(client)}.
        </EmptyInline>
      ) : (
        <ul className="rows">
          {meetings.map((meeting) => (
            <li
              key={meeting.id}
              className="flex flex-wrap items-center gap-3 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/calendar?meeting=${meeting.id}`}
                  className="text-base font-medium hover:text-brand"
                >
                  {meeting.title}
                </Link>
                <p className="text-meta text-muted-foreground">
                  {date(meeting.scheduledDate)} at {meeting.scheduledTime} ·{" "}
                  {meeting.durationMinutes} min
                </p>
              </div>
              <StatusPill
                registry="meetingType"
                value={meeting.type}
                variant="dot"
              />
              <StatusPill registry="meetingStatus" value={meeting.status} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function LeadNotes({ hub }: { hub: ClientHub }) {
  const submission = hub.client.contactSubmission;
  if (!submission || submission.notes.length === 0) return null;
  return (
    <Panel
      title="From the website lead"
      description="Notes written while this was still a lead. Read-only here; they stay on the submission."
      action={
        <PanelLink href={`/submissions/${submission.id}`}>
          Open the lead
        </PanelLink>
      }
      flush
    >
      <ul className="rows">
        {submission.notes.map((note) => (
          <li key={note.id} className="px-3 py-2.5">
            <p className="text-meta text-muted-foreground">
              {note.createdBy.name || note.createdBy.email} ·{" "}
              {when(note.createdAt)}
            </p>
            <p className="mt-1 max-w-prose whitespace-pre-wrap text-base">
              {note.content}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
