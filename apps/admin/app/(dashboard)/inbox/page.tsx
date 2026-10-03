import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, FileSignature, FileText, Inbox, Mail, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState, EmptyInline } from "@/components/os/empty-state";
import { ThreadList } from "@/components/os/thread-list";
import { FilterChip } from "@/components/os/data-table";
import { EntityLink } from "@/components/os/entity-link";
import { entityHref } from "@/lib/entity-links";
import { StatusPill } from "@/components/ui/badge";
import { statusOf } from "@/lib/status";
import { getConversationThreads, getClientConversation, type ConversationItem } from "@/lib/threads";
import { dateTime, when } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@repo/ui";
import { ChannelTabs } from "./channel-tabs";
import { EmailReplyNote } from "./email-reply-note";

export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Every conversation across WhatsApp and email, one row per client, waiting-on-you first. Replying never means leaving the system to find who they are.";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client: clientId } = await searchParams;
  if (clientId) return <ClientConversation clientId={clientId} />;

  const threads = await getConversationThreads();
  const unanswered = threads.filter((t) => t.unanswered);
  const failed = threads.filter((t) => t.failed > 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Inbox" description={DESCRIPTION} tabs={<ChannelTabs active="all" />} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Needs a reply"
          value={unanswered.length}
          sub={unanswered.length ? "Client spoke last on WhatsApp" : "Everyone has been answered"}
          tone={unanswered.length ? "danger" : "success"}
        />
        <StatTile label="Active threads" value={threads.length} sub="Clients with any message" />
        <StatTile
          label="Delivery failures"
          value={failed.length}
          sub={failed.length ? "Clients with a message that never arrived" : "All delivered"}
          tone={failed.length ? "danger" : "success"}
        />
      </div>

      {threads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No conversations yet"
          body="Threads appear as soon as a proposal or contract is sent by WhatsApp or email, or a client writes in on WhatsApp. Each one stays attached to the client it belongs to."
          action={
            <>
              <Button asChild variant="outline">
                <Link href="/integrations">Check the connections</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/clients">Open a client</Link>
              </Button>
            </>
          }
        />
      ) : (
        <>
          {unanswered.length > 0 && (
            <Panel
              title="Waiting on you"
              description="The client spoke last on WhatsApp — longest wait first"
              flush
            >
              <ThreadList threads={unanswered} />
            </Panel>
          )}
          <Panel title="All conversations" description="Waiting first, then latest activity" flush>
            <ThreadList threads={threads} />
          </Panel>
          <p className="text-meta text-subtle-foreground">
            Email is outbound only here — a client cannot be &quot;waiting&quot; on an email thread because
            replies never arrive in this app.
          </p>
        </>
      )}
    </div>
  );
}

async function ClientConversation({ clientId }: { clientId: string }) {
  const conversation = await getClientConversation(clientId);
  if (!conversation) notFound();
  const { client, items, whatsappCount, emailCount } = conversation;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbox"
        description={DESCRIPTION}
        actions={
          <Button asChild variant="outline">
            <Link href={`/clients/${client.id}`}>Open client</Link>
          </Button>
        }
        tabs={<ChannelTabs active="all" clientId={client.id} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip label="Client" value={client.name} clearHref="/inbox" />
        <StatusPill registry="submissionStatus" value={client.status} variant="dot" />
        <span className="font-mono text-micro text-subtle-foreground">
          {whatsappCount} WhatsApp · {emailCount} email
        </span>
      </div>

      <Panel
        title="Conversation"
        description="Oldest first, both channels"
        action={
          <span className="flex items-center gap-3 text-meta">
            {whatsappCount > 0 && (
              <Link href={`/whatsapp/${client.id}`} className="text-brand hover:underline">
                WhatsApp thread
              </Link>
            )}
            {emailCount > 0 && (
              <Link href={`/email?client=${client.id}`} className="text-brand hover:underline">
                Email log
              </Link>
            )}
          </span>
        }
        flush
      >
        {items.length === 0 ? (
          <EmptyInline
            action={
              <Button asChild variant="outline" size="sm">
                <Link href={`/clients/${client.id}`}>Send a proposal from the client</Link>
              </Button>
            }
          >
            Nothing has been sent or received with{" "}
            <EntityLink type="client" id={client.id}>
              {client.name}
            </EntityLink>{" "}
            on WhatsApp or email.
          </EmptyInline>
        ) : (
          <ol className="space-y-2 p-3">
            {items.map((item) => (
              <Message key={`${item.channel}-${item.id}`} item={item} />
            ))}
          </ol>
        )}
      </Panel>

      <Panel title="Replying" description="Where an answer goes from here">
        <div className="space-y-3">
          <p className="max-w-prose text-base text-muted-foreground">
            <span className="font-medium text-foreground">WhatsApp.</span> Reply from the WhatsApp
            thread — it shows whether the 24-hour session window is open.
          </p>
          <EmailReplyNote />
        </div>
      </Panel>
    </div>
  );
}

function Message({ item }: { item: ConversationItem }) {
  const inbound = item.direction === "INBOUND";
  const Icon = item.channel === "whatsapp" ? MessageCircle : Mail;
  const proposalHref = item.relatedProposalId ? entityHref("proposal", item.relatedProposalId) : null;
  const contractHref = item.relatedContractId ? entityHref("contract", item.relatedContractId) : null;
  const statusLabel =
    item.channel === "whatsapp"
      ? statusOf("whatsappStatus", item.status).label
      : item.status.toLowerCase();

  return (
    <li className={cn("flex", inbound ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[min(560px,92%)] rounded-lg border px-2.5 py-2",
          inbound
            ? "border-border bg-surface"
            : item.failed
              ? "border-danger/30 bg-danger/[0.06]"
              : "border-brand/25 bg-brand-soft",
        )}
      >
        <p className="mb-1 flex items-center gap-1.5 font-mono text-micro text-subtle-foreground">
          <Icon className="size-2.5" aria-hidden />
          {item.channel === "whatsapp" ? "WhatsApp" : "Email"}
          <span aria-hidden>·</span>
          {inbound ? "Client" : "You"}
        </p>
        {item.channel === "email" ? (
          <details>
            <summary className="cursor-pointer text-base font-medium">{item.subject}</summary>
            <p className="mt-1.5 whitespace-pre-wrap text-base">{item.body}</p>
          </details>
        ) : (
          <p className="whitespace-pre-wrap text-base">{item.body}</p>
        )}
        {(proposalHref || contractHref) && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {proposalHref && (
              <Link
                href={proposalHref}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-1.5 py-0.5 text-meta hover:text-brand"
              >
                <FileText className="size-3" aria-hidden />
                Proposal
              </Link>
            )}
            {contractHref && (
              <Link
                href={contractHref}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-1.5 py-0.5 text-meta hover:text-brand"
              >
                <FileSignature className="size-3" aria-hidden />
                Contract
              </Link>
            )}
          </div>
        )}
        {item.failureReason && <p className="mt-1 text-meta text-danger">{item.failureReason}</p>}
        <p
          className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-micro text-subtle-foreground"
          title={dateTime(item.at)}
        >
          {when(item.at)}
          {!inbound && (
            <>
              <span aria-hidden>·</span>
              <span className={item.failed ? "text-danger" : undefined}>{statusLabel}</span>
            </>
          )}
          {item.toAddress && (
            <>
              <span aria-hidden>·</span>
              <span className="min-w-0 truncate">{item.toAddress}</span>
            </>
          )}
          {item.failed && <AlertTriangle className="size-2.5 text-danger" aria-hidden />}
          {item.templateName && (
            <>
              <span aria-hidden>·</span>
              <span>{item.templateName}</span>
            </>
          )}
        </p>
      </div>
    </li>
  );
}
