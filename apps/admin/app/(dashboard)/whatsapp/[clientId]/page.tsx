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
import { gateRoute } from "@/lib/page-gate";
import { currentRole } from "@/lib/authorize";
import { roleCanOpen } from "@/lib/action-center";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";
import { dateTime, money, phone as fmtPhone, when } from "@/lib/format";
import { Button } from "@repo/ui";
import { EntityLink } from "@/components/os/entity-link";
import { ChannelTabs } from "../../inbox/channel-tabs";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const denied = await gateRoute("/whatsapp/[clientId]", "this thread");
  if (denied) return denied;

  const { clientId } = await params;
  const role = await currentRole();

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
  // Failed sends are resent from the record they belong to; when they all belong to one, go there.
  const failedHomes = new Set(
    failed.map((m) =>
      m.relatedProposalId && roleCanOpen(role, "/proposals")
        ? `/proposals/${m.relatedProposalId}`
        : m.relatedContractId && roleCanOpen(role, "/contracts")
          ? `/contracts/${m.relatedContractId}`
          : `/clients/${client.id}#conversations`,
    ),
  );
  const resendHref =
    failedHomes.size === 1 ? [...failedHomes][0]! : `/clients/${client.id}#conversations`;

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
        crumbs={[
          { label: "Inbox", href: "/inbox" },
          { label: "WhatsApp", href: "/whatsapp" },
          { label: name, href: `/clients/${client.id}` },
        ]}
        tabs={<ChannelTabs active="whatsapp" clientId={client.id} />}
        title={
          <span className="flex items-center gap-2">
            <Avatar name={name} size="lg" />
            <EntityLink type="client" id={client.id} className="min-w-0 truncate">
              {name}
            </EntityLink>
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
          <>
            <Button asChild variant="outline">
              <Link href={`/inbox?client=${client.id}`}>All channels</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/clients/${client.id}#conversations`}>Open client</Link>
            </Button>
          </>
        }
        alert={
          failed.length > 0 ? (
            <AlertBar
              tone="danger"
              href={resendHref}
              cta={
                resendHref.startsWith("/proposals/")
                  ? "Open the proposal"
                  : resendHref.startsWith("/contracts/")
                    ? "Open the contract"
                    : "Open the client record"
              }
            >
              {failed.length} message{failed.length === 1 ? "" : "s"} in this thread never
              reached the client. Resend from the record it belongs to, or check the
              Cloud API credentials.
            </AlertBar>
          ) : unanswered ? (
            <AlertBar
              tone="warning"
              href={`https://wa.me/${client.phone.replace(/\D/g, "")}`}
              cta="Reply on WhatsApp"
            >
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
                      <EntityLink type="client" id={client.id}>
                        {name}
                      </EntityLink>
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
                        "max-w-[min(560px,85%)] rounded-panel-sm border px-2.5 py-2",
                        inbound
                          ? "border-border-subtle bg-surface"
                          : message.status === "FAILED"
                            ? "border-danger/30 bg-danger/[0.06]"
                            : "border-brand/25 bg-brand-soft",
                      )}
                    >
                      <p className="whitespace-pre-wrap text-base">{message.body}</p>
                      {related && (
                        <Link
                          href={related.href}
                          className="mt-1.5 inline-flex items-center gap-1.5 rounded-ctl-xs border border-border-subtle bg-card px-1.5 py-0.5 text-meta hover:text-brand"
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

        <Panel title="Sending" description="No free-form compose here — by design, not an omission">
          <p className="max-w-prose text-base text-muted-foreground">
            This screen reads the thread; it does not compose. WhatsApp accepts arbitrary text
            only inside the 24-hour window after the client writes, and outside it only an
            approved template. A compose box that silently fails half the time would be worse
            than none. The sends that matter — proposal, contract, onboarding — are
            template-based and run from their own records, where the system knows which
            template applies. To reply with free text while the window is open, use the
            business phone.
          </p>
        </Panel>
      </DetailLayout>
    </div>
  );
}
