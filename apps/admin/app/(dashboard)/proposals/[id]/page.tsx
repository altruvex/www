import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import {
  CopyPlus,
  Download,
  ExternalLink,
  FileSignature,
  FileText,
  History,
  Layers,
  ListChecks,
  Receipt,
  Server,
} from "lucide-react";
import { Button } from "@repo/ui";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { PageHeader, MetaItem } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { MetaList, QuickActions } from "@/components/os/detail-layout";
import { Dossier, DossierSection } from "@/components/os/section-index";
import { Timeline } from "@/components/os/timeline";
import { EntityAudit } from "@/components/os/entity-audit";
import { EntityLink } from "@/components/os/entity-link";
import { EmptyInline } from "@/components/os/empty-state";
import { AlertBar } from "@/components/os/error-state";
import { ManualStatusMenu } from "@/components/os/manual-status";
import { SendDocument } from "@/components/os/send-document";
import { ServiceTermsPanel } from "@/components/os/services/service-terms-panel";
import { NewServiceButton } from "@/components/os/services/new-service-button";
import { StatusPill } from "@/components/ui/badge";
import { GenerateContractButton } from "@/components/proposal/generate-contract";
import { proposalSendProps } from "@/components/proposal/send-props";
import { buildActivity } from "@/lib/activity";
import { currentRole } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { roleCanOpen } from "@/lib/action-center";
import { canSeeFinance } from "@/lib/nav";
import { canExtendValidity, needsNewVersion } from "../reissue";
import { ExtendValidityButton } from "@/components/proposal/extend-validity";
import {
  discountAmount,
  investmentTotal,
  proposalContentSchema,
} from "@/lib/proposal-schema";
import { statusOf } from "@/lib/status";
import { date, dateTime, daysFromNow, money, when } from "@/lib/format";

export const dynamic = "force-dynamic";

interface LineItem {
  item?: string;
  label?: string;
  amount?: number;
}

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const denied = await gateRoute("/proposals/[id]");
  if (denied) return denied;

  const { id } = await params;
  const role = await currentRole();

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true, phone: true, email: true } },
      contract: {
        select: {
          id: true,
          status: true,
          signedAt: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!proposal) notFound();

  const { pdfUrl, send } = await proposalSendProps(proposal);

  const author = await prisma.user.findUnique({
    where: { id: proposal.createdBy },
    select: { name: true, email: true },
  });

  const siblings = await prisma.proposal.findMany({
    where: { clientId: proposal.clientId },
    select: {
      id: true,
      totalPrice: true,
      currency: true,
      status: true,
      createdAt: true,
      timelineWeeks: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const clientName = proposal.client.company || proposal.client.name || "Unnamed client";
  const parsed = proposalContentSchema.safeParse(proposal.content);
  const content = parsed.success ? parsed.data : null;

  const storedItems = Array.isArray(proposal.lineItems)
    ? (proposal.lineItems as LineItem[])
    : [];
  const lineItems = storedItems.filter((item) => (item.amount ?? 0) >= 0);
  const reduction = content
    ? discountAmount(content.investmentItems, content.discount)
    : storedItems.reduce(
        (sum, item) => sum + ((item.amount ?? 0) < 0 ? -(item.amount ?? 0) : 0),
        0,
      );
  const subtotal = content
    ? investmentTotal(content.investmentItems)
    : proposal.totalPrice + reduction;
  const discountLabel =
    content && content.discount.mode !== "none"
      ? content.discount.label.trim() || "Discount"
      : (storedItems.find((item) => (item.amount ?? 0) < 0)?.item ??
        storedItems.find((item) => (item.amount ?? 0) < 0)?.label ??
        "Discount");
  const split = proposal.paymentSplit as { first?: number; second?: number; final?: number };

  const expiresIn = daysFromNow(proposal.validUntil);
  const isOpen = ["SENT", "DELIVERED", "READ", "VIEWED"].includes(proposal.status);

  const expired = expiresIn != null && expiresIn < 0;
  const activity = buildActivity({ proposals: [proposal] });
  const services = content?.services ?? [];

  const canSend = can(role, "send", "proposal");
  const canEdit = can(role, "edit", "proposal");
  const canCreate = can(role, "create", "proposal");
  const canDelete = can(role, "delete", "proposal");
  const canContract = can(role, "create", "contract");

  const sendable =
    send && canSend && (proposal.status === "DRAFT" || (proposal.status === "SENT" && !expired));
  const generate = proposal.status === "ACCEPTED" && !proposal.contract && canContract;
  const reissueHref = `/clients/${proposal.clientId}/new-proposal?from=${proposal.id}`;
  const reissue =
    canCreate && roleCanOpen(role, "/clients") && needsNewVersion(proposal.status, proposal.validUntil);
  const liveProject = proposal.contract?.project ?? null;
  const canAddService = can(role, "create", "project") && roleCanOpen(role, "/services");
  const extendable =
    canEdit && canExtendValidity(proposal.status, proposal.validUntil, proposal.contract != null);

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[
          { label: "Proposals", href: "/proposals" },
          { label: clientName, href: `/clients/${proposal.clientId}` },
          { label: proposal.projectType },
        ]}
        title={`${proposal.projectType} · ${clientName}`}
        status={<StatusPill registry="proposalStatus" value={proposal.status} />}
        meta={
          <>
            <MetaItem label="Value">{money(proposal.totalPrice, proposal.currency)}</MetaItem>
            {reduction > 0 && (
              <MetaItem label={discountLabel}>
                <span className="text-danger">−{money(reduction, proposal.currency)}</span>
              </MetaItem>
            )}
            <MetaItem label="Timeline">{proposal.timelineWeeks} weeks</MetaItem>
            <MetaItem label="Valid until">{date(proposal.validUntil)}</MetaItem>
            {proposal.sentAt && <MetaItem label="Sent">{when(proposal.sentAt)}</MetaItem>}
          </>
        }
        actions={
          <>
            {pdfUrl && (
              <Button asChild variant="ghost">
                <a href={pdfUrl} target="_blank" rel="noreferrer">
                  <Download className="size-3.5" aria-hidden />
                  PDF
                </a>
              </Button>
            )}
            {!proposal.contract && canEdit && (
              <ManualStatusMenu entity="proposal" id={proposal.id} status={proposal.status} />
            )}
            {canDelete && (
              <DeleteRecordButton
                entity="proposal"
                id={proposal.id}
                label={`${proposal.projectType} · ${clientName}`}
                redirectTo="/proposals"
              />
            )}
            {proposal.contract && roleCanOpen(role, "/contracts") && (
              <Button asChild variant="outline">
                <Link href={`/contracts/${proposal.contract.id}`}>
                  <FileSignature className="size-3.5" aria-hidden />
                  Open the contract
                </Link>
              </Button>
            )}
            {!reissue && canCreate && roleCanOpen(role, "/clients") && (
              <Button asChild variant="ghost">
                <Link href={reissueHref}>
                  <CopyPlus className="size-3.5" aria-hidden />
                  Duplicate
                </Link>
              </Button>
            )}
            {reissue && (
              <Button asChild variant={sendable && proposal.status === "DRAFT" ? "outline" : "brand"}>
                <Link href={reissueHref}>
                  <CopyPlus className="size-3.5" aria-hidden />
                  New version
                </Link>
              </Button>
            )}
            {generate ? (
              <GenerateContractButton proposalId={proposal.id} clientName={clientName} />
            ) : sendable ? (
              <SendDocument
                {...send}
                label="Send proposal"
                resend={proposal.status !== "DRAFT"}
                variant={proposal.status === "DRAFT" ? "brand" : "outline"}
              />
            ) : null}
          </>
        }
        alert={
          proposal.status === "DRAFT" && !send ? (
            <AlertBar
              tone="warning"
              {...(canCreate
                ? { href: reissueHref, cta: "Rebuild as a new version" }
                : { action: null })}
            >
              No document was generated for this draft, so there is nothing to send yet.
            </AlertBar>
          ) : isOpen && expiresIn != null && expiresIn <= 7 ? (
            <AlertBar
              tone={expired ? "danger" : "warning"}
              {...(canCreate
                ? { href: reissueHref, cta: "Reissue as a new version" }
                : { action: null })}
            >
              {expired
                ? `This proposal expired ${Math.abs(expiresIn)} day${Math.abs(expiresIn) === 1 ? "" : "s"} ago. The price is no longer committed — extend its validity or reissue it before the client accepts.`
                : `Expires in ${expiresIn} day${expiresIn === 1 ? "" : "s"}. To give the client longer, extend its validity or reissue it as a new version.`}
            </AlertBar>
          ) : null
        }
      />

      <Dossier
        label="Proposal sections"
        sections={[
          { id: "engagement", label: "Engagement", icon: <ListChecks /> },
          { id: "content", label: "Content", icon: <FileText /> },
          { id: "pricing", label: "Pricing & split", icon: <Receipt /> },
          { id: "services", label: "Services", icon: <Server />, count: services.length },
          { id: "versions", label: "Versions", icon: <Layers />, count: siblings.length },
          { id: "history", label: "History", icon: <History /> },
        ]}
        aside={
          <>
            <Panel title="Record" flush>
              <MetaList
                items={[
                  {
                    label: "Client",
                    value: (
                      <EntityLink type="client" id={proposal.clientId}>
                        {clientName}
                      </EntityLink>
                    ),
                  },
                  { label: "Scope", value: proposal.projectType },
                  { label: "Complexity", value: proposal.complexity },
                  { label: "Accent", value: `${proposal.accentName} (${proposal.colorWorld})` },
                  { label: "Created", value: dateTime(proposal.createdAt) },
                  {
                    label: "Author",
                    value:
                      author?.name ??
                      author?.email ?? (
                        <span className="text-subtle-foreground">Account removed</span>
                      ),
                  },
                ]}
              />
            </Panel>

            <Panel title="Next step">
              <QuickActions>
                {proposal.contract ? (
                  <Button asChild variant="outline">
                    <Link href={`/contracts/${proposal.contract.id}`}>
                      <ExternalLink className="size-3.5 text-subtle-foreground" aria-hidden />
                      Open contract ({statusOf("contractStatus", proposal.contract.status).label})
                    </Link>
                  </Button>
                ) : (
                  <p className="text-base text-muted-foreground">
                    {proposal.status === "ACCEPTED"
                      ? canContract
                        ? "Accepted. Generate the contract to turn this offer into a commitment."
                        : "Accepted. Someone who may create contracts generates it next."
                      : proposal.status === "REJECTED" || proposal.status === "EXPIRED"
                        ? "This offer is closed. To quote the client again, issue a new version — the builder starts from this one."
                        : proposal.status === "DRAFT"
                        ? "Send it to the client, or record it as sent if it went out another way."
                        : "A contract can be generated once the client accepts. If they agreed outside the system, use Record manually → Accepted."}
                  </p>
                )}
                {extendable && (
                  <ExtendValidityButton
                    proposalId={proposal.id}
                    validUntil={proposal.validUntil.toISOString()}
                  />
                )}
              </QuickActions>
            </Panel>
          </>
        }
      >
        <DossierSection
          id="engagement"
          title="Delivery and engagement"
          description="What happened after it was sent"
        >
          <ol className="space-y-2.5">
            <Stage label="Drafted" at={proposal.createdAt} done />
            <Stage label="Sent" at={proposal.sentAt} done={Boolean(proposal.sentAt)} />
            <Stage label="Delivered" at={proposal.deliveredAt} done={Boolean(proposal.deliveredAt)} />
            <Stage label="Read by client" at={proposal.readAt} done={Boolean(proposal.readAt)} />
            <Stage
              label={proposal.status === "REJECTED" ? "Rejected" : "Accepted"}
              at={proposal.respondedAt}
              done={Boolean(proposal.respondedAt)}
              tone={proposal.status === "REJECTED" ? "danger" : "success"}
            />
          </ol>
        </DossierSection>

        <DossierSection
          id="content"
          title="Deck content"
          description="Every string the generated document renders"
          action={
            canCreate ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={reissueHref}>Edit as a new version</Link>
              </Button>
            ) : undefined
          }
        >
          {!content ? (
            <EmptyInline>
              This proposal predates the structured content editor, or its stored content does not
              match the current schema. The generated PDF is still the record of what the client
              received.
            </EmptyInline>
          ) : (
            <div className="space-y-5">
              <Block title="Problems named">
                <ul className="space-y-1">
                  {content.problems.map((problem) => (
                    <li key={problem.title} className="text-base">
                      <span className="font-medium">{problem.title}</span>
                      <span className="text-muted-foreground"> — {problem.description}</span>
                    </li>
                  ))}
                </ul>
              </Block>
              <Block title="Modules proposed">
                <ul className="space-y-1">
                  {content.solutionModules.map((module) => (
                    <li key={module.title} className="text-base">
                      <span className="font-medium">{module.title}</span>
                      <span className="text-muted-foreground"> — {module.description}</span>
                    </li>
                  ))}
                </ul>
              </Block>
              <Block title="Timeline">
                <ul className="rows -mx-3">
                  {content.timelinePhases.map((phase) => (
                    <li
                      key={phase.name}
                      className="grid grid-cols-[1fr_auto] gap-x-3 px-3 py-1.5 sm:flex sm:items-center"
                    >
                      <span className="truncate text-base font-medium sm:w-32 sm:shrink-0">
                        {phase.name}
                      </span>
                      <span className="col-span-2 row-start-2 min-w-0 text-meta text-muted-foreground sm:flex-1 sm:truncate">
                        {phase.deliverable}
                      </span>
                      <span className="shrink-0 font-mono text-micro text-subtle-foreground">
                        {phase.durationLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              </Block>
              <Block title="In scope">
                <ul className="grid gap-1 sm:grid-cols-2">
                  {content.scopeIncluded.map((entry) => (
                    <li key={entry} className="flex gap-1.5 text-base">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-success" aria-hidden />
                      {entry}
                    </li>
                  ))}
                </ul>
              </Block>
              <Block title="Explicitly not in scope">
                <ul className="grid gap-1 sm:grid-cols-2">
                  {content.scopeNotIncluded.map((entry) => (
                    <li key={entry} className="flex gap-1.5 text-base text-muted-foreground">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-danger" aria-hidden />
                      {entry}
                    </li>
                  ))}
                </ul>
              </Block>
            </div>
          )}
        </DossierSection>

        <DossierSection id="pricing" title="Pricing and payment split">
          <div className="space-y-4">
            <Panel title="Line items" flush>
              {lineItems.length === 0 ? (
                <EmptyInline>This proposal stores a total but no itemised breakdown.</EmptyInline>
              ) : (
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-border-subtle bg-surface">
                      <th className="telemetry h-8 px-3 text-start font-normal text-subtle-foreground">
                        Item
                      </th>
                      <th className="telemetry h-8 px-3 text-end font-normal text-subtle-foreground">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={`${item.item ?? item.label ?? i}`} className="border-b border-border-subtle">
                        <td className="px-3 py-2">{item.item ?? item.label ?? "—"}</td>
                        <td className="px-3 py-2 text-end font-mono text-meta tabular-nums whitespace-nowrap">
                          {money(item.amount ?? 0, proposal.currency)}
                        </td>
                      </tr>
                    ))}
                    {reduction > 0 && (
                      <>
                        <tr className="border-b border-border-subtle">
                          <td className="px-3 py-2 text-muted-foreground">Subtotal</td>
                          <td className="px-3 py-2 text-end font-mono text-meta tabular-nums whitespace-nowrap text-muted-foreground">
                            {money(subtotal, proposal.currency)}
                          </td>
                        </tr>
                        <tr className="border-b border-border-subtle">
                          <td className="px-3 py-2 text-danger">
                            {discountLabel}
                            <span className="ms-2 font-mono text-micro tabular-nums text-subtle-foreground">
                              {subtotal > 0
                                ? `${((reduction / subtotal) * 100).toFixed(
                                    ((reduction / subtotal) * 100) % 1 === 0 ? 0 : 1,
                                  )}%`
                                : ""}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-end font-mono text-meta tabular-nums whitespace-nowrap text-danger">
                            −{money(reduction, proposal.currency)}
                          </td>
                        </tr>
                      </>
                    )}
                    <tr className="bg-surface">
                      <td className="px-3 py-2 font-medium">
                        {reduction > 0 ? "Total after discount" : "Total"}
                      </td>
                      <td className="px-3 py-2 text-end font-mono text-md font-medium tabular-nums whitespace-nowrap">
                        {money(proposal.totalPrice, proposal.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title="Payment schedule" description="What triggers each instalment">
              <div className="space-y-3">
                {[
                  { label: "On signature", pct: split.first ?? 50 },
                  { label: "At the agreed milestone", pct: split.second ?? 30 },
                  { label: "On handover", pct: split.final ?? 20 },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:flex"
                  >
                    <span className="text-base text-muted-foreground sm:w-44 sm:shrink-0">
                      {row.label}
                    </span>
                    <span className="text-end font-mono text-meta tabular-nums sm:order-last sm:w-32 sm:shrink-0">
                      {row.pct}% · {money(Math.round((proposal.totalPrice * row.pct) / 100), proposal.currency)}
                    </span>
                    <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-2 sm:flex-1">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${row.pct}%` }} />
                    </span>
                  </div>
                ))}
              </div>
              {reduction > 0 && (
                <p className="mt-3 border-t border-border-subtle pt-3 text-meta text-subtle-foreground">
                  Percentages are of the discounted total, not of the{" "}
                  {money(subtotal, proposal.currency)} subtotal.
                </p>
              )}
            </Panel>
          </div>
        </DossierSection>

        <DossierSection
          id="services"
          title="Services outside the fee"
          description="Domains, hosting and the like — billed per term, never part of the total"
        >
          {services.length === 0 ? (
            <EmptyInline
              action={
                liveProject && canAddService ? (
                  <NewServiceButton
                    scope={{
                      clientId: proposal.clientId,
                      projectId: liveProject.id,
                      projects: [liveProject],
                      products: [],
                      currency: proposal.currency,
                    }}
                    showMoney={canSeeFinance(role)}
                    canCreate
                  />
                ) : !proposal.contract && canCreate && roleCanOpen(role, "/clients") ? (
                  <Button asChild variant="outline">
                    <Link href={reissueHref}>Add services in a new version</Link>
                  </Button>
                ) : undefined
              }
            >
              {liveProject
                ? "This proposal carried no services. Add what the client holds through you to its project here."
                : content
                ? "This proposal carries no services. Anything a client holds through you can still be added on their record after signing."
                : "This proposal predates the services list, so it carries none."}
            </EmptyInline>
          ) : (
            <ServiceTermsPanel
              services={services}
              currency={proposal.currency}
              liveHref={`/clients/${proposal.clientId}#sites`}
            />
          )}
        </DossierSection>

        <DossierSection
          id="versions"
          title="Every proposal issued to this client"
          description="Nothing is overwritten — a new price is a new record"
        >
          <Panel flush>
            <ul className="rows">
              {siblings.map((sibling) => (
                <li
                  key={sibling.id}
                  className={
                    sibling.id === proposal.id
                      ? "flex items-center gap-3 bg-brand-soft px-3 py-2.5"
                      : "flex items-center gap-3 px-3 py-2.5"
                  }
                >
                  <FileText className="size-3.5 shrink-0 text-subtle-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/proposals/${sibling.id}`}
                      aria-current={sibling.id === proposal.id ? "page" : undefined}
                      className="text-base font-medium hover:text-brand"
                    >
                      {money(sibling.totalPrice, sibling.currency)} · {sibling.timelineWeeks} weeks
                      {sibling.id === proposal.id && (
                        <span className="ms-2 text-meta font-normal text-muted-foreground">this one</span>
                      )}
                    </Link>
                    <p className="text-meta text-muted-foreground">{dateTime(sibling.createdAt)}</p>
                  </div>
                  <StatusPill registry="proposalStatus" value={sibling.status} variant="dot" />
                </li>
              ))}
            </ul>
          </Panel>
        </DossierSection>

        <DossierSection id="history" title="History">
          <div className="space-y-4">
            <Panel title="Activity" flush bodyClassName="p-2">
              <Timeline events={activity} emptyLabel="Nothing recorded for this proposal." />
            </Panel>
            <EntityAudit type="proposal" id={proposal.id} />
          </div>
        </DossierSection>
      </Dossier>
    </div>
  );
}

function Stage({
  label,
  at,
  done,
  tone = "success",
}: {
  label: string;
  at: Date | null;
  done: boolean;
  tone?: "success" | "danger";
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={
          done
            ? tone === "danger"
              ? "size-2 shrink-0 rounded-full bg-danger"
              : "size-2 shrink-0 rounded-full bg-success"
            : "size-2 shrink-0 rounded-full border border-border-mid"
        }
        aria-hidden
      />
      <span className={done ? "text-base" : "text-base text-subtle-foreground"}>{label}</span>
      <span className="ms-auto font-mono text-micro tabular-nums text-subtle-foreground">
        {at ? dateTime(at) : "—"}
      </span>
    </li>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="telemetry mb-1.5 text-subtle-foreground">{title}</p>
      {children}
    </div>
  );
}
