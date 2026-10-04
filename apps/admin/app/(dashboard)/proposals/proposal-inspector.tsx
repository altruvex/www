import Link from "next/link";
import { prisma } from "@repo/database";
import { Download, ExternalLink } from "lucide-react";
import { Button } from "@repo/ui";
import { InspectSheet } from "@/components/os/inspect-sheet";
import { MetaList } from "@/components/os/detail-layout";
import { NextSteps } from "@/components/os/next-steps";
import { EntityLink } from "@/components/os/entity-link";
import { ManualStatusMenu } from "@/components/os/manual-status";
import { SendDocument } from "@/components/os/send-document";
import { StatusPill } from "@/components/ui/badge";
import { GenerateContractButton } from "@/components/proposal/generate-contract";
import { proposalSendProps } from "@/components/proposal/send-props";
import { can } from "@/lib/rbac";
import { roleCanOpen } from "@/lib/action-center";
import type { Role } from "@/lib/nav";
import { date, dateTime, daysFromNow, money } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { proposalFollowUp } from "../clients/[id]/next-steps";
import { canExtendValidity } from "./reissue";
import { ExtendValidityButton } from "@/components/proposal/extend-validity";

const OPEN = ["SENT", "DELIVERED", "READ", "VIEWED"];

export async function ProposalInspector({ id, role }: { id: string | null; role: Role | undefined }) {
  if (!id) return null;

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true, email: true } },
      contract: { select: { id: true, status: true } },
    },
  });

  if (!proposal) {
    return (
      <InspectSheet open title="Proposal not found">
        <p className="text-base text-muted-foreground">
          This proposal was deleted, or the link is wrong. Close this panel to go back to the list.
        </p>
      </InspectSheet>
    );
  }

  const clientName = proposal.client.company || proposal.client.name || "Unnamed client";
  const { pdfUrl, send } = await proposalSendProps(proposal);
  const expiresIn = daysFromNow(proposal.validUntil);
  const expired = expiresIn != null && expiresIn < 0;
  const isOpen = OPEN.includes(proposal.status);
  const split = proposal.paymentSplit as { first?: number; second?: number; final?: number };

  const canSend = can(role, "send", "proposal");
  const canEdit = can(role, "edit", "proposal");
  const canContract = can(role, "create", "contract");

  const sendable = send && canSend && (proposal.status === "DRAFT" || (proposal.status === "SENT" && !expired));
  const generate = proposal.status === "ACCEPTED" && !proposal.contract && canContract;
  const extendable =
    canEdit && canExtendValidity(proposal.status, proposal.validUntil, proposal.contract != null);
  const followUp = proposalFollowUp(proposal, proposal.clientId, role);
  const nextStep = followUp && followUp.kind !== "send" ? followUp.step : null;

  return (
    <InspectSheet
      open
      title={`${proposal.projectType} · ${clientName}`}
      subtitle={`${money(proposal.totalPrice, proposal.currency)} · ${proposal.timelineWeeks} weeks`}
      status={<StatusPill registry="proposalStatus" value={proposal.status} />}
      fullHref={`/proposals/${proposal.id}`}
      footer={
        <>
          {pdfUrl && (
            <Button asChild variant="ghost" size="sm">
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <Download className="size-3.5" aria-hidden />
                PDF
              </a>
            </Button>
          )}
          {!proposal.contract && canEdit && (
            <ManualStatusMenu entity="proposal" id={proposal.id} status={proposal.status} size="sm" />
          )}
          {extendable && (
            <ExtendValidityButton
              proposalId={proposal.id}
              validUntil={proposal.validUntil.toISOString()}
              size="sm"
            />
          )}
          {proposal.contract && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/contracts/${proposal.contract.id}`}>
                <ExternalLink className="size-3.5" aria-hidden />
                Open contract
              </Link>
            </Button>
          )}
          {generate ? (
            <GenerateContractButton proposalId={proposal.id} clientName={clientName} size="sm" />
          ) : sendable ? (
            <SendDocument
              {...send}
              label="Send proposal"
              resend={proposal.status !== "DRAFT"}
              variant={proposal.status === "DRAFT" ? "brand" : "outline"}
              size="sm"
            />
          ) : null}
        </>
      }
    >
      <div className="space-y-5">
        {proposal.status === "DRAFT" && !send && (
          <p className="rounded-sm border border-border bg-surface px-3 py-2 text-meta text-muted-foreground">
            No document was generated for this draft, so there is nothing to send. Open the full page
            and rebuild it as a new version.
          </p>
        )}
        {isOpen && expired && (
          <p className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-meta text-danger">
            Expired {Math.abs(expiresIn!)} day{Math.abs(expiresIn!) === 1 ? "" : "s"} ago — the price
            is no longer committed. Extend its validity or reissue it as a new version before the client accepts.
          </p>
        )}

        {nextStep && roleCanOpen(role, nextStep.href) && (
          <NextSteps steps={[{ ...nextStep, primary: true }]} />
        )}

        <MetaList
          className="-mx-3"
          items={[
            {
              label: "Client",
              value: (
                <EntityLink type="client" id={proposal.clientId}>
                  {clientName}
                </EntityLink>
              ),
            },
            { label: "Scope", value: `${proposal.projectType} · ${proposal.complexity}` },
            { label: "Value", value: money(proposal.totalPrice, proposal.currency) },
            { label: "Timeline", value: `${proposal.timelineWeeks} weeks` },
            {
              label: "Valid until",
              value: ["ACCEPTED", "REJECTED"].includes(proposal.status)
                ? "—"
                : date(proposal.validUntil),
            },
            {
              label: "Contract",
              value: proposal.contract ? (
                <Link href={`/contracts/${proposal.contract.id}`} className="hover:text-brand">
                  {statusOf("contractStatus", proposal.contract.status).label}
                </Link>
              ) : (
                "None yet"
              ),
            },
          ]}
        />

        <section aria-labelledby="inspect-engagement">
          <h3 id="inspect-engagement" className="telemetry mb-2 text-subtle-foreground">
            What the client did
          </h3>
          <ol className="space-y-2">
            {[
              { label: "Drafted", at: proposal.createdAt },
              { label: "Sent", at: proposal.sentAt },
              { label: "Delivered", at: proposal.deliveredAt },
              { label: "Read", at: proposal.readAt },
              {
                label: proposal.status === "REJECTED" ? "Rejected" : "Answered",
                at: proposal.respondedAt,
              },
            ].map((step) => (
              <li key={step.label} className="flex items-center gap-3 text-base">
                <span
                  aria-hidden
                  className={
                    step.at
                      ? "size-2 shrink-0 rounded-full bg-success"
                      : "size-2 shrink-0 rounded-full border border-border-mid"
                  }
                />
                <span className={step.at ? "" : "text-subtle-foreground"}>{step.label}</span>
                <span className="ms-auto font-mono text-micro tabular-nums text-subtle-foreground">
                  {step.at ? dateTime(step.at) : "not yet"}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="inspect-split">
          <h3 id="inspect-split" className="telemetry mb-2 text-subtle-foreground">
            Payment split
          </h3>
          <ul className="space-y-1.5">
            {[
              { label: "On signature", pct: split.first ?? 50 },
              { label: "At the milestone", pct: split.second ?? 30 },
              { label: "On handover", pct: split.final ?? 20 },
            ].map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3 text-base">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-mono text-meta tabular-nums">
                  {row.pct}% · {money(Math.round((proposal.totalPrice * row.pct) / 100), proposal.currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </InspectSheet>
  );
}
