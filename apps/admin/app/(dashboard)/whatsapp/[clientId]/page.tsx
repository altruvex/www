import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { AlertTriangle, FileSignature, FileText } from "lucide-react";
import { PageHeader, MetaItem } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { DetailLayout, MetaList } from "@/components/os/detail-layout";
import { EmptyInline } from "@/components/os/empty-state";
import { AlertBar } from "@/components/os/error-state";
import { StatusPill } from "@/components/ui/badge";
import { Avatar } from "@repo/ui";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";
import { dateTime, money, phone as fmtPhone, when } from "@/lib/format";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

/**
 * A thread. Deliberately read-only in this pass: sending a free-form WhatsApp
 * message needs the Cloud API send path plus template selection and the 24-hour
 * session-window rule, and a compose box that silently fails outside that window
 * is worse than no compose box. The lifecycle sends (proposal, contract,
 * onboarding) already work from their own records.
 */
export default async function ThreadPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      proposals: { select: { id: true, totalPrice: true, currency: true, status: true } },
      contracts: { select: { id: true, status: true } },
    },
  });
  if (!client) notFound();

  const now = new Date();
  const name = client.company || client.name || client.phone;
  const lastInbound = [...client.messages].reverse().find((m) => m.direction === "INBOUND");
  const lastOutbound = [...client.messages].reverse().find((m) => m.direction === "OUTBOUND");
  const unanswered = Boolean(
    lastInbound && (!lastOutbound || lastOutbound.createdAt < lastInbound.createdAt),
  );
  const failed = client.messages.filter((m) => m.status === "FAILED");

  // The 24-hour session window: outside it, only approved templates can be sent.
  const hoursSinceInbound = lastInbound
    ? (now.getTime() - lastInbound.createdAt.getTime()) / 3_600_000
    : null;
  const windowOpen = hoursSinceInbound != null && hoursSinceInbound < 24;

  const relatedById = new Map<string, { kind: string; href: string; label: string }>();
  for (const proposal of client.proposals) {
    relatedById.set(proposal.id, {
      kind: "proposal",
      href: `/proposals/${proposal.id}`,
      label: `Proposal · ${money(proposal.totalPrice, proposal.currency)}`,
    });
  }
  for (const contract of client.contracts) {
    relatedById.set(contract.id, {
      kind: "contract",
      href: `/contracts/${contract.id}`,
      label: `Contract ${contract.id.slice(0, 8).toUpperCase()}`,
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[{ label: "Inbox", href: "/inbox" }, { label: name }]}
        title={
          <span className="flex items-center gap-2">
            <Avatar name={name} size="lg" />
            {name}
          </span>
        }
        status={<StatusPill registry="submissionStatus" value={client.status} />}
        meta={
          <>
            <MetaItem label="Phone">{fmtPhone(client.phone)}</MetaItem>
            <MetaItem label="Messages">{client.messages.length}</MetaItem>
            {lastInbound && <MetaItem label="Last reply">{when(lastInbound.createdAt)}</MetaItem>}
          </>
        }
        actions={
          <Button asChild variant="outline">
            <Link href={`/clients/${client.id}`}>
              Open client
            </Link>
          </Button>
        }
        alert={
          failed.length > 0 ? (
            <AlertBar tone="danger">
              {failed.length} message{failed.length === 1 ? "" : "s"} in this thread never
              reached the client. Resend from the record it belongs to, or check the
              Cloud API credentials.
            </AlertBar>
          ) : unanswered ? (
            <AlertBar tone="warning">
              The client spoke last{hoursSinceInbound != null && `, ${Math.round(hoursSinceInbound)} hours ago`}. Nobody has replied.
            </AlertBar>
          ) : null
        }
      />

      <DetailLayout
        aside={
          <>
            <Panel title="Session window" flush>
              <div className="p-3">
                <p
                  className={cn(
                    "text-base font-medium",
                    windowOpen ? "text-success" : "text-warning",
                  )}
                >
                  {windowOpen ? "Open" : "Closed"}
                </p>
                <p className="mt-1 text-meta text-muted-foreground">
                  {windowOpen
                    ? `Free-form replies are allowed for another ${Math.max(0, Math.round(24 - (hoursSinceInbound ?? 0)))} hours.`
                    : "Outside the 24-hour window WhatsApp only accepts approved templates. Lifecycle sends (proposal, contract, onboarding) use templates and always work."}
                </p>
              </div>
            </Panel>

            <Panel title="Client" flush>
              <MetaList
                items={[
                  {
                    label: "Record",
                    value: (
                      <Link href={`/clients/${client.id}`} className="hover:text-brand">
                        {name}
                      </Link>
                    ),
                  },
                  { label: "Phone", value: <span className="font-mono text-meta">{client.phone}</span> },
                  { label: "Source", value: statusOf("clientSource", client.source).label },
                  { label: "Proposals", value: client.proposals.length },
                  { label: "Contracts", value: client.contracts.length },
                ]}
              />
            </Panel>
          </>
        }
      >
        <Panel title="Conversation" flush>
          {client.messages.length === 0 ? (
            <EmptyInline>
              Nothing has been sent or received on this thread.
            </EmptyInline>
          ) : (
            <ol className="space-y-2 p-3">
              {client.messages.map((message) => {
                const inbound = message.direction === "INBOUND";
                const related =
                  (message.relatedProposalId && relatedById.get(message.relatedProposalId)) ||
                  (message.relatedContractId && relatedById.get(message.relatedContractId)) ||
                  null;
                return (
                  <li
                    key={message.id}
                    className={cn("flex", inbound ? "justify-start" : "justify-end")}
                  >
                    <div
                      className={cn(
                        "max-w-[min(560px,85%)] rounded-lg border px-2.5 py-2",
                        inbound
                          ? "border-border bg-surface"
                          : message.status === "FAILED"
                            ? "border-danger/30 bg-danger/[0.06]"
                            : "border-brand/25 bg-brand-soft",
                      )}
                    >
                      <p className="whitespace-pre-wrap text-base">{message.body}</p>
                      {related && (
                        <Link
                          href={related.href}
                          className="mt-1.5 inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-1.5 py-0.5 text-meta hover:text-brand"
                        >
                          {related.kind === "proposal" ? (
                            <FileText className="size-3" aria-hidden />
                          ) : (
                            <FileSignature className="size-3" aria-hidden />
                          )}
                          {related.label}
                        </Link>
                      )}
                      <p
                        className="mt-1 flex items-center gap-1.5 font-mono text-micro text-subtle-foreground"
                        title={dateTime(message.createdAt)}
                      >
                        {when(message.createdAt)}
                        {!inbound && (
                          <>
                            <span aria-hidden>·</span>
                            <span
                              className={message.status === "FAILED" ? "text-danger" : undefined}
                            >
                              {statusOf("whatsappStatus", message.status).label}
                            </span>
                          </>
                        )}
                        {message.status === "FAILED" && (
                          <AlertTriangle className="size-2.5 text-danger" aria-hidden />
                        )}
                        {message.templateName && (
                          <>
                            <span aria-hidden>·</span>
                            <span>{message.templateName}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <Panel title="Sending" description="Why there is no compose box here yet">
          <p className="max-w-prose text-base text-muted-foreground">
            Free-form sending is deliberately not wired into this screen. WhatsApp only
            accepts arbitrary text inside a 24-hour window after the client writes; outside
            it, an approved template is required. A compose box that silently fails half
            the time would be worse than none. The sends that matter — proposal, contract,
            onboarding — are template-based and run from their own records, where the
            system knows which template applies.
          </p>
        </Panel>
      </DetailLayout>
    </div>
  );
}
