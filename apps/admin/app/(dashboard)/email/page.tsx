import Link from "next/link";
import { Mail } from "lucide-react";

import { prisma } from "@repo/database";
import { Button } from "@repo/ui";

import { EmptyState } from "@/components/os/empty-state";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { MetaList } from "@/components/os/detail-layout";
import { AlertBar } from "@/components/os/error-state";
import { ToneBadge } from "@/components/ui/badge";
import { dateTime } from "@/lib/format";
import { emailTransport } from "@/lib/email";

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  QUEUED: "neutral",
  SENT: "info",
  DELIVERED: "success",
  FAILED: "danger",
  BOUNCED: "danger",
  COMPLAINED: "warning",
} as const;

export default async function EmailPage() {
  const transport = emailTransport();
  const [messages, failed] = await Promise.all([
    prisma.emailMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { client: { select: { id: true, name: true, company: true } } },
    }),
    prisma.emailMessage.count({ where: { status: "FAILED" } }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Email"
        crumbs={[{ label: "Communication" }, { label: "Email" }]}
        description="Every proposal and contract sent by mail, with what the transport answered. Written only when something is actually sent — this screen cannot compose."
        alert={
          transport === "none" ? (
            <AlertBar tone="warning" href="/integrations" cta="Integrations">
              No mail transport is configured, so nothing can be sent. Set RESEND_API_KEY, or
              SMTP_HOST, SMTP_USER and SMTP_PASSWORD.
            </AlertBar>
          ) : failed > 0 ? (
            <AlertBar tone="danger" href="#failed" cta="See them">
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
            { label: "Sent", value: String(messages.length) },
            { label: "Refused", value: String(failed) },
          ]}
        />
        <p className="border-t border-border px-3 py-2 text-meta text-subtle-foreground">
          Delivery, bounce and complaint states exist in the schema and nothing here can set
          them — they need a provider webhook, which is not wired up. A message shown as{" "}
          <span className="font-mono">sent</span> means the transport accepted it, not that it
          arrived.
        </p>
      </Panel>

      <Panel
        title="Sent mail"
        description="Newest first, the last 100"
        flush
      >
        {messages.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="Nothing has been sent"
            body={
              transport === "none"
                ? "No transport is configured yet. Once one is, proposals and contracts can be sent by mail from their own pages."
                : "Send a proposal or a contract by email from its page and it will be recorded here."
            }
          />
        ) : (
          <ul className="rows" id="failed">
            {messages.map((message) => (
              <li key={message.id} className="flex flex-wrap items-start gap-3 px-3 py-2.5">
                <ToneBadge tone={STATUS_TONE[message.status]}>
                  {message.status.toLowerCase()}
                </ToneBadge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{message.subject}</p>
                  <p className="truncate text-meta text-muted-foreground">
                    <Link href={`/clients/${message.client.id}`} className="text-brand hover:underline">
                      {message.client.company || message.client.name || "Unnamed client"}
                    </Link>
                    {" · "}
                    <span className="font-mono">{message.toAddress}</span>
                  </p>
                  {message.failureReason && (
                    <p className="mt-0.5 text-meta text-danger">{message.failureReason}</p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-micro text-subtle-foreground">
                  {dateTime(message.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
