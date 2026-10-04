import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import {
  CopyPlus,
  Download,
  ExternalLink,
  FolderKanban,
  History,
  PenLine,
  Receipt,
  Route,
  Server,
  ShieldCheck,
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
import { NextSteps } from "@/components/os/next-steps";
import { AlertBar } from "@/components/os/error-state";
import { ManualOnboardingButton, ManualStatusMenu } from "@/components/os/manual-status";
import { SendDocument } from "@/components/os/send-document";
import { ContractSignerForm } from "@/components/os/contract-signer";
import { ServiceTermsPanel } from "@/components/os/services/service-terms-panel";
import { StatusPill } from "@/components/ui/badge";
import { CopyValueButton } from "@/components/os/copy-button";
import { CopyLinkButton } from "@/components/proposal/copy-link";
import { contractSendProps } from "@/components/proposal/send-props";
import { buildActivity } from "@/lib/activity";
import { currentRole } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { documentUrl } from "@/lib/storage";
import { statusOf } from "@/lib/status";
import { discountAmount, investmentTotal, proposalContentSchema } from "@/lib/proposal-schema";
import { date, dateTime, money } from "@/lib/format";
import { effectiveSigner, maskEmail, maskPhone } from "@/lib/sign-verification";
import { entityHref } from "@/lib/entity-links";
import { isPaymentOverdue } from "@/lib/payment-overdue";
import { findDeletedContractProject } from "@/lib/contract-signing";
import { contractStepPermissions } from "../contract-permissions";
import { contractNextSteps } from "../contract-steps";
import { CreateProjectButton } from "./create-project";

export const dynamic = "force-dynamic";

const LIFECYCLE = [
  { id: "DRAFT", label: "Drafted" },
  { id: "SENT", label: "Sent for signature" },
  { id: "SIGNED", label: "Signed" },
  { id: "PROJECT", label: "Project created" },
];

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const denied = await gateRoute("/contracts/[id]");
  if (denied) return denied;

  const { id } = await params;
  const role = await currentRole();

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true, phone: true, email: true } },
      proposal: true,
      project: { include: { payments: true } },
    },
  });
  if (!contract) notFound();

  const { signUrl, send } = await contractSendProps(contract);

  const contractFileUrl = await documentUrl(contract.fileUrl);
  const signedFileUrl = await documentUrl(contract.signedFileUrl);

  const clientName = contract.client.company || contract.client.name || "Unnamed client";
  const signer = effectiveSigner(contract, contract.client);
  const verifiedHint =
    contract.signerVerifiedVia && contract.signerVerifiedTo
      ? `${contract.signerVerifiedVia === "WHATSAPP" ? "WhatsApp" : "Email"} code to ${
          contract.signerVerifiedVia === "WHATSAPP"
            ? maskPhone(contract.signerVerifiedTo)
            : maskEmail(contract.signerVerifiedTo)
        }`
      : null;
  const nameDiffers =
    Boolean(contract.signedByName && signer.name) &&
    contract.signedByName!.trim().toLowerCase() !== signer.name!.trim().toLowerCase();

  const proposalContent = proposalContentSchema.safeParse(contract.proposal.content);
  const discount = proposalContent.success ? proposalContent.data.discount : null;
  const reduction = proposalContent.success
    ? discountAmount(proposalContent.data.investmentItems, discount)
    : 0;
  const subtotal = proposalContent.success
    ? investmentTotal(proposalContent.data.investmentItems)
    : contract.proposal.totalPrice;
  const discountLabel = discount?.label.trim() || "Discount";
  const split = contract.proposal.paymentSplit as {
    first?: number;
    second?: number;
    final?: number;
  };
  const activity = buildActivity({
    contracts: [contract],
    proposals: [contract.proposal],
    projects: contract.project ? [contract.project] : [],
    payments: contract.project
      ? contract.project.payments.map((p) => ({
          ...p,
          projectId: contract.project!.id,
          currency: contract.proposal.currency,
        }))
      : [],
  });

  const dead = contract.status === "DECLINED" || contract.status === "EXPIRED";
  const reachedIndex = dead
    ? 1
    : contract.project != null
      ? 3
      : contract.status === "SIGNED"
        ? 2
        : contract.status === "DRAFT"
          ? 0
          : 1;

  const canSend = can(role, "send", "contract");
  const canEdit = can(role, "edit", "contract");
  const canDelete = can(role, "delete", "contract");
  const canSeePayments = can(role, "view", "payment");
  const canCreateProject = can(role, "create", "project");
  const priorProject =
    canCreateProject && contract.status === "SIGNED" && !contract.project
      ? await findDeletedContractProject(contract.id)
      : null;
  const signable = contract.status === "DRAFT" || contract.status === "SENT";
  const sendable = send && canSend && signable;
  const services = proposalContent.success ? proposalContent.data.services : [];
  const payments = contract.project?.payments ?? [];
  const reference = contract.id.slice(0, 8).toUpperCase();
  const steps = contractNextSteps(contract, contractStepPermissions(role));
  const projectStep = steps.find((step) => step.key === "project");
  const quoteStep = steps.find((step) => step.key === "quote");
  const deliverySteps = steps.filter((step) => step.key === "task" || step.key === "charge");
  const onboardingInHeader =
    contract.status === "SIGNED" && !contract.onboardingMessageSentAt && !contract.project && canEdit;

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[
          { label: "Contracts", href: "/contracts" },
          { label: clientName, href: `/clients/${contract.clientId}` },
          { label: reference },
        ]}
        title={`Contract ${reference}`}
        status={<StatusPill registry="contractStatus" value={contract.status} />}
        meta={
          <>
            <MetaItem label="Reference">
              <span className="inline-flex items-center gap-1">
                <span className="font-mono">{reference}</span>
                <CopyValueButton value={reference} label="Contract number" />
              </span>
            </MetaItem>
            <MetaItem label="Scope">{contract.proposal.projectType}</MetaItem>
            <MetaItem label="Value">
              {money(contract.proposal.totalPrice, contract.proposal.currency)}
            </MetaItem>
            {reduction > 0 && (
              <MetaItem label={discountLabel}>
                <span className="text-danger">−{money(reduction, contract.proposal.currency)}</span>
              </MetaItem>
            )}
            <MetaItem label="Created">{date(contract.createdAt)}</MetaItem>
            {contract.signedAt && <MetaItem label="Signed">{date(contract.signedAt)}</MetaItem>}
          </>
        }
        actions={
          <>
            {contractFileUrl && (
              <Button asChild variant="ghost">
                <a href={contractFileUrl} target="_blank" rel="noreferrer">
                  <Download className="size-3.5" aria-hidden />
                  Document
                </a>
              </Button>
            )}
            {contract.status !== "SIGNED" && canEdit && (
              <ManualStatusMenu entity="contract" id={contract.id} status={contract.status} />
            )}
            {canDelete && (
              <DeleteRecordButton
                entity="contract"
                id={contract.id}
                label={`${contract.proposal.projectType} · ${clientName}`}
                redirectTo="/contracts"
              />
            )}
            {onboardingInHeader && <ManualOnboardingButton contractId={contract.id} />}
            {projectStep && (
              <Button asChild variant="outline">
                <Link href={projectStep.href}>
                  <FolderKanban className="size-3.5" aria-hidden />
                  {projectStep.label}
                </Link>
              </Button>
            )}
            {quoteStep && (
              <Button asChild variant="brand">
                <Link href={quoteStep.href}>
                  <CopyPlus className="size-3.5" aria-hidden />
                  {quoteStep.label}
                </Link>
              </Button>
            )}
            {sendable && (
              <SendDocument
                {...send}
                label="Send for signature"
                resend={contract.status === "SENT"}
                variant={contract.status === "DRAFT" ? "brand" : "outline"}
              />
            )}
          </>
        }
        alert={
          signable && !send ? (
            <AlertBar tone="warning">
              {contract.signToken
                ? "This contract has no generated document, so it cannot be sent for signature. Delete it and generate it again from the accepted proposal, or record a signature by hand if it was signed another way."
                : "This contract has no signing link, so it cannot be sent from here. Record it by hand if it was signed another way."}
            </AlertBar>
          ) : contract.status === "SIGNED" && !contract.project ? (
            <AlertBar
              tone="danger"
              action={
                canCreateProject ? (
                  <CreateProjectButton
                    contractId={contract.id}
                    total={money(contract.proposal.totalPrice, contract.proposal.currency)}
                    split={`${split.first ?? 50}/${split.second ?? 30}/${split.final ?? 20}`}
                    priorProject={
                      priorProject
                        ? {
                            label: priorProject.label,
                            deletedAt: priorProject.deletedAt ? date(priorProject.deletedAt) : null,
                          }
                        : null
                    }
                  />
                ) : null
              }
            >
              This contract is signed but no project exists. Delivery has not formally started and
              no payment schedule is being tracked.
            </AlertBar>
          ) : contract.status === "SIGNED" && !contract.onboardingMessageSentAt ? (
            <AlertBar
              tone="warning"
              action={canEdit ? <ManualOnboardingButton contractId={contract.id} /> : null}
            >
              Onboarding is not recorded. Once you have told the client what happens next, record it
              here so the first week does not go quiet unnoticed.
            </AlertBar>
          ) : null
        }
      />

      <Dossier
        label="Contract sections"
        sections={[
          { id: "status", label: "Status", icon: <Route /> },
          { id: "delivery", label: "Delivery", icon: <FolderKanban /> },
          { id: "terms", label: "Terms & split", icon: <Receipt /> },
          { id: "services", label: "Services", icon: <Server />, count: services.length },
          { id: "signature", label: "Signature", icon: <PenLine /> },
          { id: "history", label: "History", icon: <History /> },
        ]}
        aside={
          <>
            <NextSteps steps={deliverySteps} />
            <Panel title="Parties" flush>
              <MetaList
                items={[
                  { label: "Provider", value: "Altruvex" },
                  {
                    label: "Client",
                    value: (
                      <EntityLink type="client" id={contract.clientId}>
                        {clientName}
                      </EntityLink>
                    ),
                  },
                  {
                    label: "Phone",
                    value: contract.client.phone ? (
                      <span className="font-mono text-meta">{contract.client.phone}</span>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Email", value: contract.client.email ?? "—" },
                  {
                    label: "Proposal",
                    value: (
                      <EntityLink type="proposal" id={contract.proposalId}>
                        {money(contract.proposal.totalPrice, contract.proposal.currency)}
                      </EntityLink>
                    ),
                  },
                ]}
              />
            </Panel>

            <Panel
              title="Authorised signer"
              description={
                contract.status === "SIGNED"
                  ? "Who the link was restricted to"
                  : "Only this person receives the code the link needs"
              }
            >
              {contract.status === "SIGNED" || !canEdit ? (
                <MetaList
                  className="-mx-3"
                  items={[
                    { label: "Name", value: signer.name ?? "—" },
                    { label: "WhatsApp", value: signer.phone ?? "—" },
                    { label: "Email", value: signer.email ?? "—" },
                  ]}
                />
              ) : (
                <ContractSignerForm
                  contractId={contract.id}
                  initial={{
                    signerName: contract.signerName ?? "",
                    signerPhone: contract.signerPhone ?? "",
                    signerEmail: contract.signerEmail ?? "",
                  }}
                  fallback={{
                    name: contract.client.name,
                    phone: contract.client.phone,
                    email: contract.client.email,
                  }}
                />
              )}
            </Panel>

            {signUrl && signable && (
              <Panel title="Client link">
                <QuickActions>
                  <CopyLinkButton url={signUrl} label="Copy signing link" />
                  <Button asChild variant="ghost">
                    <a href={signUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5 text-subtle-foreground" aria-hidden />
                      Open the signing page
                    </a>
                  </Button>
                  <p className="text-meta text-subtle-foreground">
                    The link alone cannot sign: it asks for a one-time code sent to the authorised
                    signer&apos;s WhatsApp or email. It is tied to this contract only.
                  </p>
                </QuickActions>
              </Panel>
            )}
          </>
        }
      >
        <DossierSection
          id="status"
          title="Where this contract stands"
          description={
            dead
              ? `This contract is ${statusOf("contractStatus", contract.status).label.toLowerCase()} — it will not move further.`
              : undefined
          }
        >
          <ol className="grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-2">
            {LIFECYCLE.map((step, i) => {
              const done = i <= reachedIndex;
              return (
                <li
                  key={step.id}
                  className="flex items-center gap-2"
                  aria-current={i === reachedIndex ? "step" : undefined}
                >
                  <span
                    className={
                      done
                        ? "flex size-5 items-center justify-center rounded-full bg-success/15 font-mono text-micro text-success"
                        : "flex size-5 items-center justify-center rounded-full border border-border font-mono text-micro text-subtle-foreground"
                    }
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className={done ? "text-base" : "text-base text-subtle-foreground"}>
                    {step.label}
                    <span className="sr-only">{done ? " (done)" : " (not yet)"}</span>
                  </span>
                  {i < LIFECYCLE.length - 1 && (
                    <span className="mx-1 hidden h-px w-6 bg-border sm:block" aria-hidden />
                  )}
                </li>
              );
            })}
          </ol>
        </DossierSection>

        <DossierSection id="delivery" title="Delivery">
          {contract.project ? (
            <Panel flush>
              <div className="px-3 py-3">
                <EntityLink type="project" id={contract.project.id} className="text-base font-medium">
                  {contract.project.name}
                </EntityLink>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <StatusPill registry="projectPhase" value={contract.project.phase} variant="dot" />
                  <StatusPill registry="projectStatus" value={contract.project.status} />
                </div>
                {canSeePayments ? (
                  payments.length > 0 ? (
                    <ul className="rows mt-3 border-t border-border">
                      {payments.map((payment) => (
                        <li key={payment.id}>
                          <Link
                            href={entityHref("payment", payment.id) ?? "/payments"}
                            className="-mx-1 flex min-h-11 items-center gap-3 rounded-xs px-1 py-2 transition-colors duration-[var(--dur-state)] hover:bg-surface-2 sm:min-h-0"
                          >
                            <span className="min-w-0 flex-1 truncate text-base">
                              {statusOf("paymentMilestone", payment.milestone).label}
                            </span>
                            <span className="font-mono text-meta tabular-nums">
                              {money(payment.amount, contract.proposal.currency)}
                            </span>
                            <StatusPill
                              registry="paymentStatus"
                              value={derivedPaymentStatus(payment)}
                              variant="dot"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 border-t border-border pt-3 text-meta text-muted-foreground">
                      No payment rows on this project.
                    </p>
                  )
                ) : (
                  <p className="mt-3 border-t border-border pt-3 text-meta text-muted-foreground">
                    Payment records are visible to finance roles only.
                  </p>
                )}
              </div>
            </Panel>
          ) : (
            <EmptyInline>
              {contract.status === "SIGNED"
                ? "No project was opened from this contract. A project is how the commitment becomes tracked delivery — phases, launch date and the payment schedule all live on it."
                : "A project and its payment schedule open automatically when this contract is signed."}
            </EmptyInline>
          )}
        </DossierSection>

        <DossierSection
          id="terms"
          title="Terms and payment split"
          description="Taken from the proposal, not re-entered"
        >
          <div className="space-y-4">
            <Panel flush>
              <MetaList
                items={[
                  { label: "Scope", value: contract.proposal.projectType },
                  { label: "Complexity", value: contract.proposal.complexity },
                  ...(reduction > 0
                    ? [
                        { label: "List price", value: money(subtotal, contract.proposal.currency) },
                        {
                          label: discountLabel,
                          value: (
                            <span className="text-danger">
                              −{money(reduction, contract.proposal.currency)}
                            </span>
                          ),
                        },
                      ]
                    : []),
                  {
                    label: reduction > 0 ? "Total after discount" : "Total",
                    value: money(contract.proposal.totalPrice, contract.proposal.currency),
                  },
                  { label: "Timeline", value: `${contract.proposal.timelineWeeks} weeks` },
                  { label: "Currency", value: contract.proposal.currency },
                ]}
              />
            </Panel>
            <Panel title="Payment terms">
              <div className="space-y-3">
                {[
                  { label: "On signature", pct: split.first ?? 50 },
                  { label: "At milestone", pct: split.second ?? 30 },
                  { label: "On handover", pct: split.final ?? 20 },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:flex"
                  >
                    <span className="text-base text-muted-foreground sm:w-36 sm:shrink-0">
                      {row.label}
                    </span>
                    <span className="text-end font-mono text-meta tabular-nums sm:order-last sm:w-32 sm:shrink-0">
                      {row.pct}% ·{" "}
                      {money(
                        Math.round((contract.proposal.totalPrice * row.pct) / 100),
                        contract.proposal.currency,
                      )}
                    </span>
                    <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-2 sm:flex-1">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${row.pct}%` }} />
                    </span>
                  </div>
                ))}
              </div>
              {reduction > 0 && (
                <p className="mt-3 border-t border-border pt-3 text-meta text-subtle-foreground">
                  Percentages are of the discounted total, not of the{" "}
                  {money(subtotal, contract.proposal.currency)} list price.
                </p>
              )}
            </Panel>
          </div>
        </DossierSection>

        <DossierSection
          id="services"
          title="Services outside the fee"
          description="Opened as tracked services when the contract is signed"
        >
          {services.length === 0 ? (
            <EmptyInline>
              {proposalContent.success
                ? "The proposal behind this contract carries no services."
                : "The proposal behind this contract predates the services list, so it carries none."}
            </EmptyInline>
          ) : (
            <ServiceTermsPanel
              services={services}
              currency={contract.proposal.currency}
              liveHref={`/clients/${contract.clientId}?tab=services`}
            />
          )}
        </DossierSection>

        <DossierSection
          id="signature"
          title="Signature and onboarding"
          description="What was captured, and what it proves"
        >
          <div className="space-y-4">
            {contract.signedAt ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-md border border-success/30 bg-success/[0.06] p-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-base font-medium">
                      Signed by {contract.signedByName ?? "an unnamed party"}
                    </p>
                    <p className="mt-0.5 text-meta text-muted-foreground">
                      {dateTime(contract.signedAt)}
                      {contract.signedIp && ` from ${contract.signedIp}`}
                    </p>
                    {verifiedHint && (
                      <p className="mt-0.5 text-meta text-muted-foreground">
                        Verified by a {verifiedHint}
                      </p>
                    )}
                    {nameDiffers && (
                      <p className="mt-1 text-meta text-warning">
                        The typed name differs from the authorised signer ({signer.name}). The code
                        still went only to that person&apos;s contact.
                      </p>
                    )}
                  </div>
                </div>
                <p className="max-w-prose text-base text-muted-foreground">
                  This is a click-to-sign record: the name, timestamp and originating IP captured at
                  the moment the client confirmed. A link signature also required a one-time code,
                  which proves control of the authorised signer&apos;s WhatsApp or mailbox — not
                  their legal identity. It is evidence of assent, not a cryptographic signature.
                </p>
                {signedFileUrl && (
                  <Button asChild variant="outline">
                    <a href={signedFileUrl} target="_blank" rel="noreferrer">
                      <Download className="size-3.5" aria-hidden />
                      Signed copy
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <EmptyInline>
                Not signed. Once the client signs — or you record a signature by hand — the name,
                time and IP are captured here permanently.
              </EmptyInline>
            )}

            <Panel flush>
              <MetaList
                items={[
                  {
                    label: "Method",
                    value: contract.signatureMethod
                      ? contract.signatureMethod.replace(/_/g, " ").toLowerCase()
                      : "—",
                  },
                  {
                    label: "Verified",
                    value: verifiedHint ?? "—",
                    hint: "Where the one-time code that authorised the signature was sent",
                  },
                  {
                    label: "Onboarding",
                    value: contract.onboardingMessageSentAt
                      ? dateTime(contract.onboardingMessageSentAt)
                      : contract.status === "SIGNED"
                        ? "Not recorded"
                        : "After signature",
                  },
                ]}
              />
            </Panel>
          </div>
        </DossierSection>

        <DossierSection id="history" title="History">
          <div className="space-y-4">
            <Panel title="Activity" flush bodyClassName="p-2">
              <Timeline events={activity} emptyLabel="Nothing recorded for this contract." />
            </Panel>
            <EntityAudit type="contract" id={contract.id} />
          </div>
        </DossierSection>
      </Dossier>
    </div>
  );
}

function derivedPaymentStatus(payment: { status: string; dueDate: Date | null }): string {
  if (isPaymentOverdue(payment)) return "OVERDUE";
  return payment.status === "OVERDUE" ? "PENDING" : payment.status;
}
