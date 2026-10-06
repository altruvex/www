import Link from "next/link";
import { prisma } from "@repo/database";
import { Download, ExternalLink } from "lucide-react";
import { Button } from "@repo/ui";
import { InspectSheet } from "@/components/os/inspect-sheet";
import { MetaList } from "@/components/os/detail-layout";
import { EntityLink } from "@/components/os/entity-link";
import { NextSteps } from "@/components/os/next-steps";
import { ManualOnboardingButton, ManualStatusMenu } from "@/components/os/manual-status";
import { SendDocument } from "@/components/os/send-document";
import { StatusPill } from "@/components/ui/badge";
import { CopyLinkButton } from "@/components/proposal/copy-link";
import { contractSendProps } from "@/components/proposal/send-props";
import { can } from "@/lib/rbac";
import type { Role } from "@/lib/nav";
import { date, dateTime, money } from "@/lib/format";
import { documentUrl } from "@/lib/storage";
import { effectiveSigner } from "@/lib/sign-verification";
import { contractStepPermissions } from "./contract-permissions";
import { contractNextSteps } from "./contract-steps";

export async function ContractInspector({ id, role }: { id: string | null; role: Role | undefined }) {
  if (!id) return null;

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true, email: true, phone: true } },
      proposal: {
        select: {
          id: true,
          projectType: true,
          totalPrice: true,
          currency: true,
          timelineWeeks: true,
          paymentSplit: true,
        },
      },
      project: { select: { id: true, name: true, status: true } },
    },
  });

  if (!contract) {
    return (
      <InspectSheet open title="Contract not found">
        <p className="text-base text-muted-foreground">
          This contract was deleted, or the link is wrong. Close this panel to go back to the list.
        </p>
      </InspectSheet>
    );
  }

  const clientName = contract.client.company || contract.client.name || "Unnamed client";
  const reference = contract.id.slice(0, 8).toUpperCase();
  const { signUrl, send } = await contractSendProps(contract);
  const fileUrl = await documentUrl(contract.signedFileUrl ?? contract.fileUrl);
  const signer = effectiveSigner(contract, contract.client);
  const split = contract.proposal.paymentSplit as { first?: number; second?: number; final?: number };
  const value = contract.proposal.totalPrice;
  const currency = contract.proposal.currency;

  const canSend = can(role, "send", "contract");
  const canEdit = can(role, "edit", "contract");
  const signable = contract.status === "DRAFT" || contract.status === "SENT";
  const sendable = send && canSend && signable;
  const steps = contractNextSteps(contract, contractStepPermissions(role)).filter(
    (step) => step.key !== "project",
  );

  return (
    <InspectSheet
      open
      title={`${contract.proposal.projectType} · ${clientName}`}
      subtitle={`Contract ${reference} · ${money(value, currency)}`}
      status={<StatusPill registry="contractStatus" value={contract.status} />}
      fullHref={`/contracts/${contract.id}`}
      footer={
        <>
          {fileUrl && (
            <Button asChild variant="ghost" size="sm">
              <a href={fileUrl} target="_blank" rel="noreferrer">
                <Download className="size-3.5" aria-hidden />
                {contract.signedFileUrl ? "Signed copy" : "Document"}
              </a>
            </Button>
          )}
          {signable && signUrl && <CopyLinkButton url={signUrl} label="Copy signing link" size="sm" />}
          {contract.status !== "SIGNED" && canEdit && (
            <ManualStatusMenu entity="contract" id={contract.id} status={contract.status} size="sm" />
          )}
          {contract.status === "SIGNED" && !contract.onboardingMessageSentAt && canEdit && (
            <ManualOnboardingButton contractId={contract.id} size="sm" />
          )}
          {contract.project && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${contract.project.id}`}>
                <ExternalLink className="size-3.5" aria-hidden />
                Open project
              </Link>
            </Button>
          )}
          {sendable && (
            <SendDocument
              {...send}
              label="Send for signature"
              resend={contract.status === "SENT"}
              variant={contract.status === "DRAFT" ? "brand" : "outline"}
              size="sm"
            />
          )}
        </>
      }
    >
      <div className="space-y-5">
        {signable && !send && (
          <p className="rounded-panel-sm border border-border-subtle bg-surface px-3 py-2 text-meta text-muted-foreground">
            {contract.signToken
              ? "This contract has no generated document, so it cannot be sent for signature. Open the full page for details."
              : "This contract has no signing link, so it cannot be sent from here. Record it by hand if it was signed another way."}
          </p>
        )}
        {contract.status === "SIGNED" && !contract.project && (
          <p className="rounded-panel-sm border border-danger/30 bg-danger/5 px-3 py-2 text-meta text-danger">
            Signed, but no project exists — delivery has not formally started and no payment
            schedule is being tracked.
          </p>
        )}

        <NextSteps steps={steps} />

        <MetaList
          className="-mx-3"
          items={[
            {
              label: "Client",
              value: (
                <EntityLink type="client" id={contract.clientId}>
                  {clientName}
                </EntityLink>
              ),
            },
            {
              label: "Proposal",
              value: (
                <EntityLink type="proposal" id={contract.proposalId}>
                  {contract.proposal.projectType}
                </EntityLink>
              ),
            },
            { label: "Value", value: money(value, currency) },
            { label: "Timeline", value: `${contract.proposal.timelineWeeks} weeks` },
            { label: "Created", value: date(contract.createdAt) },
            { label: "Signer", value: signer.name ?? "Not set" },
            {
              label: "Signed",
              value: contract.signedAt
                ? `${dateTime(contract.signedAt)}${contract.signedByName ? ` · ${contract.signedByName}` : ""}`
                : "Not yet",
            },
            {
              label: "Delivery",
              value: contract.project ? (
                <EntityLink type="project" id={contract.project.id}>
                  {contract.project.name}
                </EntityLink>
              ) : (
                "No project"
              ),
            },
            ...(contract.status === "SIGNED"
              ? [
                  {
                    label: "Onboarding",
                    value: contract.onboardingMessageSentAt
                      ? date(contract.onboardingMessageSentAt)
                      : "Not recorded",
                  },
                ]
              : []),
          ]}
        />

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
                  {row.pct}% · {money(Math.round((value * row.pct) / 100), currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </InspectSheet>
  );
}
