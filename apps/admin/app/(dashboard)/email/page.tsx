import Link from "next/link";
import { Mail } from "lucide-react";

import { prisma } from "@repo/database";
import { Button } from "@repo/ui";

import { EmptyState } from "@/components/os/empty-state";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { MetaList } from "@/components/os/detail-layout";
import { AlertBar } from "@/components/os/error-state";
import { FilterChip } from "@/components/os/data-table";
import { EntityLink } from "@/components/os/entity-link";
import { ToneBadge } from "@/components/ui/badge";
import { dateTime } from "@/lib/format";
import { emailTransport } from "@/lib/email";
import { ChannelTabs } from "../inbox/channel-tabs";
import { EmailReplyNote } from "../inbox/email-reply-note";

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  QUEUED: "neutral",
  SENT: "info",
  DELIVERED: "success",
  FAILED: "danger",
  BOUNCED: "danger",
  COMPLAINED: "warning",
} as const;

type EmailStatus = keyof typeof STATUS_TONE;

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; status?: string }>;
}) {
  const params = await searchParams;
  const transport = emailTransport();
  // `?status=` is matched against the enum, never passed through as typed.
  const status = (Object.keys(STATUS_TONE) as EmailStatus[]).find(
    (key) => key.toLowerCase() === params.status?.toLowerCase(),
  );
  const scopedClient = params.client
    ? await prisma.client.findUnique({
        where: { id: params.client },
        select: { id: true, name: true, company: true, phone: true },
      })
    : null;
  const scoped = Boolean(scopedClient || status);
  const where = {
    ...(scopedClient ? { clientId: scopedClient.id } : {}),
    ...(status ? { status } : {}),
  };
  const [messages, matching, total, failed] = await Promise.all([
    prisma.emailMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { client: { select: { id: true, name: true, company: true } } },
    }),
    prisma.emailMessage.count({ where }),
    prisma.emailMessage.count(),
    prisma.emailMessage.count({ where: { status: "FAILED" } }),
  ]);
  const scopedName = scopedClient
    ? scopedClient.company || scopedClient.name || scopedClient.phone
    : null;
  // Removing one chip keeps the other.
  const without = (drop: "client" | "status") => {
    const next = new URLSearchParams();
    if (drop !== "client" && scopedClient) next.set("client", scopedClient.id);
    if (drop !== "status" && status) next.set("status", status.toLowerCase());
    const query = next.toString();
    return query ? `/email?${query}` : "/email";
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Email"
        crumbs={[{ label: "Inbox", href: "/inbox" }, { label: "Email" }]}
        tabs={<ChannelTabs active="email" clientId={scopedClient?.id} />}
        description="Every proposal and contract sent by mail, with what the transport answered. Written only when something is actually sent — this screen cannot compose."
        alert={
          transport === "none" ? (
            <AlertBar tone="warning" href="/integrations" cta="Integrations">
              No mail transport is configured, so nothing can be sent. Set RESEND_API_KEY, or
              SMTP_HOST, SMTP_USER and SMTP_PASSWORD.
            </AlertBar>
          ) : failed > 0 && status !== "FAILED" ? (
            <AlertBar tone="danger" href="/email?status=failed" cta="See them">
              {failed} message{failed === 1 ? "" : "s"} were refused by the transport.
            </AlertBar>
          ) : null
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/integrations">Transport settings</Link>
          </Button>
        }
      />

      <Panel
        title="Transport"
        description={
          transport === "none"
            ? "Nothing configured"
            : transport === "resend"
              ? "Resend — sends from your own domain"
              : "SMTP — sends from the mailbox the credentials belong to"
        }
        action={
          <ToneBadge tone={transport === "none" ? "neutral" : "success"}>
            {transport === "none" ? "Not configured" : transport}
          </ToneBadge>
        }
        flush
      >
        <MetaList
          items={[
            { label: "Transport", value: transport === "none" ? "—" : transport },
            { label: "From", value: process.env.EMAIL_FROM || process.env.SMTP_USER || "—" },
            { label: "Recorded", value: String(total) },
            { label: "Refused", value: String(failed) },
          ]}
        />
        <p className="border-t border-border px-3 py-2 text-meta text-subtle-foreground">
          Delivery, bounce and complaint states exist in the schema and nothing here can set
          them — they need a provider webhook, which is not wired up. A message shown as{" "}
          <span className="font-mono">sent</span> means the transport accepted it, not that it
          arrived.
        </p>
        <div className="border-t border-border px-3 py-2">
          <EmailReplyNote />
        </div>
      </Panel>

      {scoped && (
        <div className="flex flex-wrap items-center gap-2">
          {scopedClient && (
            <FilterChip label="Client" value={scopedName} clearHref={without("client")} />
          )}
          {status && (
            <FilterChip
              label="Status"
              value={status.charAt(0) + status.slice(1).toLowerCase()}
              clearHref={without("status")}
            />
          )}
          {scopedClient && (
            <Link
              href={`/inbox?client=${scopedClient.id}`}
              className="text-meta text-brand hover:underline"
            >
              Whole conversation, both channels
            </Link>
          )}
        </div>
      )}

      <Panel
        title={status === "FAILED" ? "Refused mail" : "Sent mail"}
        description={
          matching > messages.length
            ? `Newest first — showing ${messages.length} of ${matching}`
            : "Newest first"
        }
        flush
      >
        {messages.length === 0 ? (
          <EmptyState
            icon={Mail}
            title={scoped ? "No mail matches" : "Nothing has been sent"}
            body={
              scoped
                ? "No recorded email fits this filter. Remove it to see the whole log."
                : transport === "none"
                  ? "No transport is configured yet. Once one is, proposals and contracts can be sent by mail from their own pages."
                  : "Send a proposal or a contract by email from its page and it will be recorded here."
            }
            action={
              scoped ? (
                <Button asChild variant="outline">
                  <Link href="/email">Show all mail</Link>
                </Button>
              ) : transport === "none" ? (
                <Button asChild variant="outline">
                  <Link href="/integrations">Set up a transport</Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/proposals">Open a proposal</Link>
                </Button>
              )
            }
          />
        ) : (
          <ul className="rows">
            {messages.map((message) => (
              <li key={message.id} className="flex flex-wrap items-start gap-3 px-3 py-2.5">
                <ToneBadge tone={STATUS_TONE[message.status]}>
                  {message.status.toLowerCase()}
                </ToneBadge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{message.subject}</p>
                  <p className="truncate text-meta text-muted-foreground">
                    <EntityLink type="client" id={message.client.id}>
                      {message.client.company || message.client.name || "Unnamed client"}
                    </EntityLink>
                    {" · "}
                    <span className="font-mono">{message.toAddress}</span>
                  </p>
                  {message.failureReason && (
                    <p className="mt-0.5 text-meta text-danger">{message.failureReason}</p>
                  )}
                </div>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="font-mono text-micro text-subtle-foreground">
                    {dateTime(message.createdAt)}
                  </span>
                  <Link
                    href={`/inbox?client=${message.client.id}`}
                    className="text-micro text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Conversation
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
