import { MetaList } from "@/components/os/detail-layout";
import { EmptyState } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { AlertBar } from "@/components/os/error-state";
import { ActiveFilters, FilterBar, FilterChip } from "@/components/os/filter-bar";
import { List, ListRow } from "@/components/os/list-row";
import { NewProposalButton } from "@/components/os/new-proposal-button";
import { PageHeader } from "@/components/os/page-header";
import { Pager } from "@/components/os/pager";
import { Panel } from "@/components/os/panel";
import { PickToOpen, type PickOption } from "@/components/os/pick-to-open";
import { ToneBadge } from "@/components/ui/badge";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { emailTransport, fromAddress } from "@/lib/email";
import { contactLabel, dateTime } from "@/lib/format";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { prisma } from "@repo/database";
import { Button } from "@repo/ui";
import { Mail } from "lucide-react";
import Link from "next/link";
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

const PAGE_SIZE = 50;

function titleCase(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function senderOrReason(): string {
  try {
    return fromAddress();
  } catch {
    return "Not set — EMAIL_FROM is required with Resend";
  }
}

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; status?: string; q?: string; page?: string }>;
}) {
  const denied = await gateRoute("/email", "the email log");
  if (denied) return denied;

  const params = await searchParams;
  const role = await currentRole();
  const canViewProposals = roleCanOpen(role, "/proposals");
  const canPropose = can(role, "create", "proposal");
  const transport = emailTransport();
  const status = (Object.keys(STATUS_TONE) as EmailStatus[]).find(
    (key) => key.toLowerCase() === params.status?.toLowerCase(),
  );
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const scopedClient = params.client
    ? await prisma.client.findUnique({
        where: { id: params.client },
        select: { id: true, name: true, company: true, email: true, phone: true },
      })
    : null;
  const scoped = Boolean(scopedClient || status || q);
  const where = {
    ...(scopedClient ? { clientId: scopedClient.id } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { subject: { contains: q, mode: "insensitive" as const } },
            { toAddress: { contains: q, mode: "insensitive" as const } },
            { client: { is: { name: { contains: q, mode: "insensitive" as const } } } },
            { client: { is: { company: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };
  const [messages, matching, total, byStatus] = await Promise.all([
    prisma.emailMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { client: { select: { id: true, name: true, company: true } } },
    }),
    prisma.emailMessage.count({ where }),
    prisma.emailMessage.count(),
    prisma.emailMessage.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const proposalPicks: PickOption[] =
    messages.length === 0 && !scoped && transport !== "none" && canViewProposals
      ? (
          await prisma.proposal.findMany({
            orderBy: { updatedAt: "desc" },
            take: 30,
            select: {
              id: true,
              projectType: true,
              status: true,
              client: { select: { name: true, company: true } },
            },
          })
        ).map((p) => ({
          href: `/proposals/${p.id}`,
          label: p.client.company || p.client.name || "Unnamed client",
          hint: `${p.projectType} · ${p.status.toLowerCase()}`,
        }))
      : [];
  const countOf = new Map(byStatus.map((row) => [row.status, row._count._all]));
  const failed = countOf.get("FAILED") ?? 0;
  const scopedName = scopedClient
    ? contactLabel(scopedClient)
    : null;
  const from = transport === "none" ? "—" : senderOrReason();

  const hrefFor = (nextPage: number) => {
    const next = new URLSearchParams();
    if (scopedClient) next.set("client", scopedClient.id);
    if (status) next.set("status", status.toLowerCase());
    if (q) next.set("q", q);
    if (nextPage > 1) next.set("page", String(nextPage));
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
            <AlertBar tone="warning" href="/integrations#email" cta="Integrations">
              No mail transport is configured, so nothing is sent — a Send action on a proposal or
              contract records nothing and says so. Set RESEND_API_KEY, or SMTP_HOST, SMTP_USER and
              SMTP_PASSWORD, then redeploy.
            </AlertBar>
          ) : failed > 0 && status !== "FAILED" ? (
            <AlertBar tone="danger" href="/email?status=failed" cta="See them">
              {failed} message{failed === 1 ? "" : "s"} were refused by the transport.
            </AlertBar>
          ) : null
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/integrations#email">Transport settings</Link>
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
            { label: "From", value: <span className="font-mono text-meta">{from}</span> },
            { label: "Recorded", value: String(total) },
            { label: "Refused", value: String(failed) },
          ]}
        />
        <p className="border-t border-border-subtle px-3 py-2 text-meta text-subtle-foreground">
          Delivery, bounce and complaint states exist in the schema and nothing here can set
          them — they need a provider webhook, which is not wired up. A message shown as{" "}
          <span className="font-mono">sent</span> means the transport accepted it, not that it
          arrived.
        </p>
        <div className="border-t border-border-subtle px-3 py-2">
          <EmailReplyNote />
        </div>
      </Panel>

      <div className="space-y-2">
        <FilterBar
          search={{ placeholder: "Search subject, address or client…" }}
          label="Email filters"
          trailing={
            scopedClient ? (
              <Link
                href={`/inbox?client=${scopedClient.id}`}
                className="text-meta text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Whole conversation, both channels
              </Link>
            ) : undefined
          }
        >
          <FilterChip param="status" label="All" count={total} />
          {(Object.keys(STATUS_TONE) as EmailStatus[])
            .filter((key) => key === "SENT" || key === "FAILED" || (countOf.get(key) ?? 0) > 0)
            .map((key) => (
              <FilterChip
                key={key}
                param="status"
                value={key.toLowerCase()}
                label={titleCase(key)}
                count={countOf.get(key) ?? 0}
              />
            ))}
        </FilterBar>
        <ActiveFilters
          labels={{ client: "Client", status: "Status", q: "Search" }}
          valueLabels={{
            ...(scopedClient && scopedName ? { client: { [scopedClient.id]: scopedName } } : {}),
            status: Object.fromEntries(
              (Object.keys(STATUS_TONE) as EmailStatus[]).map((key) => [key.toLowerCase(), titleCase(key)]),
            ),
          }}
        />
      </div>

      <Panel
        title={status === "FAILED" ? "Refused mail" : "Sent mail"}
        description="Newest first. Open a row for the body as it went out."
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
                  <Link href="/integrations#email">Set up a transport</Link>
                </Button>
              ) : (
                proposalPicks.length > 0 ? (
                  <PickToOpen
                    label="Open a proposal"
                    options={proposalPicks}
                    footer={{ href: "/proposals", label: "All proposals" }}
                    searchPlaceholder="Search proposals"
                  />
                ) : canPropose ? (
                  <NewProposalButton variant="outline">Pick a client to quote</NewProposalButton>
                ) : undefined
              )
            }
          />
        ) : (
          <List label="Email messages">
            {messages.map((message) => {
              const clientName = message.client.company || message.client.name || "Unnamed client";
              return (
                <ListRow
                  key={message.id}
                  icon={<Mail />}
                  tone={STATUS_TONE[message.status]}
                  title={message.subject}
                  meta={
                    <>
                      <EntityLink type="client" id={message.client.id}>
                        {clientName}
                      </EntityLink>
                      <span className="font-mono">{message.toAddress}</span>
                      {message.failureReason && (
                        <span className="min-w-0 truncate text-danger">{message.failureReason}</span>
                      )}
                    </>
                  }
                  trailing={
                    <>
                      <ToneBadge tone={STATUS_TONE[message.status]}>
                        {message.status.toLowerCase()}
                      </ToneBadge>
                      <time
                        dateTime={message.createdAt.toISOString()}
                        className="hidden font-mono text-micro text-subtle-foreground sm:inline"
                      >
                        {dateTime(message.createdAt)}
                      </time>
                    </>
                  }
                  expandable={
                    <div className="space-y-3">
                      <MetaList
                        items={[
                          { label: "To", value: <span className="font-mono text-meta">{message.toAddress}</span> },
                          { label: "Sent", value: dateTime(message.createdAt) },
                          { label: "Transport", value: message.transport ?? "—" },
                          {
                            label: "Provider id",
                            value: (
                              <span className="font-mono text-meta">{message.providerMessageId ?? "—"}</span>
                            ),
                          },
                          ...(message.failureReason
                            ? [{ label: "Refused", value: <span className="text-danger">{message.failureReason}</span> }]
                            : []),
                        ]}
                      />
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-panel-sm border border-border-subtle bg-surface p-3 font-sans text-base text-muted-foreground">
                        {message.body}
                      </pre>
                      <div className="flex flex-wrap gap-2">
                        {message.relatedProposalId && (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/proposals/${message.relatedProposalId}`}>Proposal</Link>
                          </Button>
                        )}
                        {message.relatedContractId && (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/contracts/${message.relatedContractId}`}>Contract</Link>
                          </Button>
                        )}
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/inbox?client=${message.client.id}`}>Conversation</Link>
                        </Button>
                      </div>
                    </div>
                  }
                />
              );
            })}
          </List>
        )}
        {matching > PAGE_SIZE && (
          <Pager
            page={page}
            pageSize={PAGE_SIZE}
            total={matching}
            hrefFor={hrefFor}
            noun="messages"
            className="border-t border-border-subtle px-3 py-2"
          />
        )}
      </Panel>
    </div>
  );
}
