import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { Download, ExternalLink, ShieldCheck } from "lucide-react";
import { PageHeader, MetaItem } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { TabNav } from "@/components/os/tab-nav";
import { DetailLayout, MetaList, QuickActions } from "@/components/os/detail-layout";
import { Timeline } from "@/components/os/timeline";
import { EmptyInline } from "@/components/os/empty-state";
import { AlertBar } from "@/components/os/error-state";
import { StatusPill } from "@/components/ui/badge";
import { buildActivity } from "@/lib/activity";
import { statusOf } from "@/lib/status";
import { discountAmount, investmentTotal, proposalContentSchema } from "@/lib/proposal-schema";
import { date, dateTime, money } from "@/lib/format";
import { LifecycleButton, MarkSignedButton } from "@/app/(dashboard)/clients/[id]/client-actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "terms", label: "Terms" },
  { id: "signature", label: "Signature" },
  { id: "activity", label: "Activity" },
];

/**
 * The contract lifecycle, stated on the page so an operator never has to
 * remember it: Draft → Sent → Signed → Active (project) → Completed.
 */
const LIFECYCLE = [
  { id: "DRAFT", label: "Drafted" },
  { id: "SENT", label: "Sent for signature" },
  { id: "SIGNED", label: "Signed" },
  { id: "PROJECT", label: "Project created" },
];

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam! : "overview";

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true, phone: true, email: true } },
      proposal: true,
      project: { include: { payments: true } },
    },
  });
  if (!contract) notFound();

  const clientName = contract.client.company || contract.client.name || "Unnamed client";

  // The contract's value is the proposal's NET total. The list price and the
  // discount that got the client here are read back off the proposal content,
  // because "what did we actually give away" is a question this page gets
  // asked more often than any other.
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

  // DECLINED / EXPIRED are dead ends, not points on this line — a declined
  // contract sitting on "Sent for signature" reads as still in flight.
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

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[
          { label: "Contracts", href: "/contracts" },
          { label: clientName, href: `/clients/${contract.clientId}` },
          { label: contract.id.slice(0, 8).toUpperCase() },
        ]}
        title={`Contract ${contract.id.slice(0, 8).toUpperCase()}`}
        status={<StatusPill registry="contractStatus" value={contract.status} />}
        meta={
          <>
            <MetaItem label="Client">{clientName}</MetaItem>
            <MetaItem label="Value">
              {money(contract.proposal.totalPrice, contract.proposal.currency)}
            </MetaItem>
            {reduction > 0 && (
              <MetaItem label={discountLabel}>
                <span className="text-danger">
                  −{money(reduction, contract.proposal.currency)}
                </span>
              </MetaItem>
            )}
            <MetaItem label="Created">{date(contract.createdAt)}</MetaItem>
            {contract.signedAt && <MetaItem label="Signed">{date(contract.signedAt)}</MetaItem>}
          </>
        }
        actions={
          <>
            {contract.fileUrl && (
              <Button asChild variant="outline">
                <a href={contract.fileUrl} target="_blank" rel="noreferrer">
                  <Download className="size-3.5" />
                  Document
                </a>
              </Button>
            )}
            {contract.status === "DRAFT" && (
              <LifecycleButton
                label="Send for signature"
                busyLabel="Sending…"
                endpoint={`/api/admin/contracts/${contract.id}/send`}
                variant="brand"
              />
            )}
            {contract.status === "SENT" && <MarkSignedButton contractId={contract.id} />}
          </>
        }
        alert={
          contract.status === "SIGNED" && !contract.project ? (
            <AlertBar tone="danger">
              This contract is signed but no project exists. Delivery has not formally
              started and no payment schedule is being tracked.
            </AlertBar>
          ) : contract.status === "SIGNED" && !contract.onboardingMessageSentAt ? (
            <AlertBar tone="warning">
              The client has not been told what happens next. Send the onboarding
              message so the first week does not go quiet.
            </AlertBar>
          ) : null
        }
        tabs={<TabNav tabs={TABS} active={tab} basePath={`/contracts/${contract.id}`} />}
      />

      <DetailLayout
        aside={
          <>
            <Panel title="Parties" flush>
              <MetaList
                items={[
                  { label: "Provider", value: "Altruvex" },
                  {
                    label: "Client",
                    value: (
                      <Link href={`/clients/${contract.clientId}`} className="hover:text-brand">
                        {clientName}
                      </Link>
                    ),
                  },
                  { label: "Phone", value: <span className="font-mono text-meta">{contract.client.phone}</span> },
                  { label: "Email", value: contract.client.email ?? "—" },
                  {
                    label: "Proposal",
                    value: (
                      <Link href={`/proposals/${contract.proposalId}`} className="hover:text-brand">
                        {money(contract.proposal.totalPrice, contract.proposal.currency)}
                      </Link>
                    ),
                  },
                ]}
              />
            </Panel>

            <Panel title="Signature" flush>
              <MetaList
                items={[
                  {
                    label: "Method",
                    value: contract.signatureMethod
                      ? contract.signatureMethod.replace(/_/g, " ").toLowerCase()
                      : "—",
                  },
                  { label: "Signed by", value: contract.signedByName ?? "—" },
                  { label: "Signed at", value: contract.signedAt ? dateTime(contract.signedAt) : "—" },
                  {
                    label: "From IP",
                    value: contract.signedIp ? (
                      <span className="font-mono text-micro">{contract.signedIp}</span>
                    ) : (
                      "—"
                    ),
                    hint: "Recorded at signature for evidentiary value",
                  },
                ]}
              />
            </Panel>

            {contract.signToken && (
              <Panel title="Client link" flush>
                <QuickActions>
                  <Button asChild variant="outline">
                    <a href={`/sign/${contract.signToken}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5 text-subtle-foreground" />
                      Open the signing page
                    </a>
                  </Button>
                  <p className="text-meta text-subtle-foreground">
                    Anyone with this link can sign. It is single-purpose and tied to this
                    contract only.
                  </p>
                </QuickActions>
              </Panel>
            )}
          </>
        }
      >
        {tab === "overview" && (
          <>
            <Panel
              title="Where this contract stands"
              description={
                dead
                  ? `This contract is ${statusOf("contractStatus", contract.status).label.toLowerCase()} — it will not move further.`
                  : undefined
              }
            >
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
                {LIFECYCLE.map((step, i) => {
                  const done = i <= reachedIndex;
                  return (
                    <li key={step.id} className="flex items-center gap-2">
                      <span
                        className={
                          done
                            ? "flex size-5 items-center justify-center rounded-full bg-success/15 font-mono text-micro text-success"
                            : "flex size-5 items-center justify-center rounded-full border border-border font-mono text-micro text-subtle-foreground"
                        }
                      >
                        {i + 1}
                      </span>
                      <span className={done ? "text-base" : "text-base text-subtle-foreground"}>
                        {step.label}
                      </span>
                      {i < LIFECYCLE.length - 1 && (
                        <span className="mx-1 h-px w-6 bg-border" aria-hidden />
                      )}
                    </li>
                  );
                })}
              </ol>
            </Panel>

            <Panel title="Delivery" flush>
              {contract.project ? (
                <div className="px-3 py-3">
                  <Link
                    href={`/projects/${contract.project.id}`}
                    className="text-base font-medium hover:text-brand"
                  >
                    {contract.project.name}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <StatusPill registry="projectPhase" value={contract.project.phase} variant="dot" />
                    <StatusPill registry="projectStatus" value={contract.project.status} />
                  </div>
                  {contract.project.payments.length > 0 && (
                    <ul className="rows mt-3 border-t border-border">
                      {contract.project.payments.map((payment) => (
                        <li key={payment.id} className="flex items-center gap-3 py-2">
                          <span className="min-w-0 flex-1 truncate text-base">
                            {statusOf("paymentMilestone", payment.milestone).label}
                          </span>
                          <span className="font-mono text-meta tabular-nums">
                            {money(payment.amount, contract.proposal.currency)}
                          </span>
                          <StatusPill registry="paymentStatus" value={payment.status} variant="dot" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <EmptyInline>
                  No project has been created from this contract. A project is how the
                  commitment becomes tracked delivery — phases, launch date and the
                  payment schedule all live on it.
                </EmptyInline>
              )}
            </Panel>
          </>
        )}

        {tab === "terms" && (
          <>
            <Panel title="Commercial terms" description="Taken from the proposal, not re-entered">
              <MetaList
                className="-mx-3"
                items={[
                  { label: "Scope", value: contract.proposal.projectType },
                  { label: "Complexity", value: contract.proposal.complexity },
                  ...(reduction > 0
                    ? [
                        {
                          label: "List price",
                          value: money(subtotal, contract.proposal.currency),
                        },
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
              <div className="space-y-2">
                {[
                  { label: "On signature", pct: split.first ?? 50 },
                  { label: "At milestone", pct: split.second ?? 30 },
                  { label: "On handover", pct: split.final ?? 20 },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-base text-muted-foreground">{row.label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${row.pct}%` }} />
                    </span>
                    <span className="w-28 shrink-0 text-end font-mono text-meta tabular-nums">
                      {row.pct}% ·{" "}
                      {money(
                        Math.round((contract.proposal.totalPrice * row.pct) / 100),
                        contract.proposal.currency,
                      )}
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
          </>
        )}

        {tab === "signature" && (
          <Panel title="Signature evidence" description="What was captured, and what it proves">
            {contract.signedAt ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-md border border-success/30 bg-success/[0.06] p-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                  <div>
                    <p className="text-base font-medium">
                      Signed by {contract.signedByName ?? "an unnamed party"}
                    </p>
                    <p className="mt-0.5 text-meta text-muted-foreground">
                      {dateTime(contract.signedAt)}
                      {contract.signedIp && ` from ${contract.signedIp}`}
                    </p>
                  </div>
                </div>
                <p className="max-w-prose text-base text-muted-foreground">
                  This is a click-to-sign record: the name, timestamp and originating IP
                  captured at the moment the client confirmed. It is evidence of assent,
                  not a cryptographic signature. A qualified e-signature provider can be
                  wired in behind the same status field without changing this screen —
                  see Integrations.
                </p>
                {contract.signedFileUrl && (
                  <Button asChild variant="outline">
                    <a href={contract.signedFileUrl} target="_blank" rel="noreferrer">
                      <Download className="size-3.5" />
                      Signed copy
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <EmptyInline>
                Not signed. Once the client signs — or you record a signature by hand —
                the name, time and IP are captured here permanently.
              </EmptyInline>
            )}
          </Panel>
        )}

        {tab === "activity" && (
          <Panel title="Activity" flush bodyClassName="p-2">
            <Timeline events={activity} emptyLabel="Nothing recorded for this contract." />
          </Panel>
        )}
      </DetailLayout>
    </div>
  );
}
