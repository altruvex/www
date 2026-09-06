import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { Download, ExternalLink, FileText } from "lucide-react";
import { PageHeader, MetaItem } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { TabNav } from "@/components/os/tab-nav";
import { DetailLayout, MetaList, QuickActions } from "@/components/os/detail-layout";
import { Timeline } from "@/components/os/timeline";
import { EmptyInline } from "@/components/os/empty-state";
import { AlertBar } from "@/components/os/error-state";
import { StatusPill } from "@/components/ui/badge";
import { buildActivity } from "@/lib/activity";
import {
  discountAmount,
  investmentTotal,
  proposalContentSchema,
} from "@/lib/proposal-schema";
import { statusOf } from "@/lib/status";
import { date, dateTime, daysFromNow, money, when } from "@/lib/format";
import { LifecycleButton } from "@/app/(dashboard)/clients/[id]/client-actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Content" },
  { id: "pricing", label: "Pricing" },
  { id: "versions", label: "Versions" },
  { id: "activity", label: "Activity" },
];

interface LineItem {
  item?: string;
  label?: string;
  amount?: number;
}

export default async function ProposalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam! : "overview";

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true, phone: true } },
      contract: { select: { id: true, status: true, signedAt: true } },
    },
  });
  if (!proposal) notFound();

  // `createdBy` stores a user id. Showing the raw uuid in the sidebar leaks an
  // internal identifier where a person's name belongs.
  const author = await prisma.user.findUnique({
    where: { id: proposal.createdBy },
    select: { name: true, email: true },
  });

  // Every proposal ever issued to this client — the version history (§7).
  const siblings = await prisma.proposal.findMany({
    where: { clientId: proposal.clientId },
    select: {
      id: true,
      totalPrice: true,
      currency: true,
      status: true,
      createdAt: true,
      timelineWeeks: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const clientName = proposal.client.company || proposal.client.name || "Unnamed client";
  const parsed = proposalContentSchema.safeParse(proposal.content);
  const content = parsed.success ? parsed.data : null;

  // The stored lineItems carry the discount as a negative row so a reader of
  // that column alone cannot mistake the subtotal for the fee. The table below
  // wants the two separated again.
  const storedItems = Array.isArray(proposal.lineItems)
    ? (proposal.lineItems as LineItem[])
    : [];
  const lineItems = storedItems.filter((item) => (item.amount ?? 0) >= 0);
  const reduction = content
    ? discountAmount(content.investmentItems, content.discount)
    : storedItems.reduce(
        (sum, item) => sum + ((item.amount ?? 0) < 0 ? -(item.amount ?? 0) : 0),
        0,
      );
  const subtotal = content
    ? investmentTotal(content.investmentItems)
    : proposal.totalPrice + reduction;
  const discountLabel =
    content && content.discount.mode !== "none"
      ? content.discount.label.trim() || "Discount"
      : (storedItems.find((item) => (item.amount ?? 0) < 0)?.item ??
        storedItems.find((item) => (item.amount ?? 0) < 0)?.label ??
        "Discount");
  const split = proposal.paymentSplit as { first?: number; second?: number; final?: number };

  const expiresIn = daysFromNow(proposal.validUntil);
  const isOpen = ["SENT", "DELIVERED", "READ", "VIEWED"].includes(proposal.status);

  const activity = buildActivity({ proposals: [proposal] });

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[
          { label: "Proposals", href: "/proposals" },
          { label: clientName, href: `/clients/${proposal.clientId}` },
          { label: proposal.projectType },
        ]}
        title={`${proposal.projectType} · ${clientName}`}
        status={<StatusPill registry="proposalStatus" value={proposal.status} />}
        meta={
          <>
            <MetaItem label="Value">{money(proposal.totalPrice, proposal.currency)}</MetaItem>
            {reduction > 0 && (
              <MetaItem label={discountLabel}>
                <span className="text-danger">−{money(reduction, proposal.currency)}</span>
              </MetaItem>
            )}
            <MetaItem label="Timeline">{proposal.timelineWeeks} weeks</MetaItem>
            <MetaItem label="Valid until">{date(proposal.validUntil)}</MetaItem>
            {proposal.sentAt && <MetaItem label="Sent">{when(proposal.sentAt)}</MetaItem>}
          </>
        }
        actions={
          <>
            {proposal.pdfUrl && (
              <Button asChild variant="outline">
                <a href={proposal.pdfUrl} target="_blank" rel="noreferrer">
                  <Download className="size-3.5" />
                  PDF
                </a>
              </Button>
            )}
            {proposal.status === "DRAFT" && (
              <LifecycleButton
                label="Send via WhatsApp"
                busyLabel="Sending…"
                endpoint={`/api/admin/proposals/${proposal.id}/send`}
                variant="brand"
              />
            )}
            {proposal.status === "ACCEPTED" && !proposal.contract && (
              <LifecycleButton
                label="Generate contract"
                busyLabel="Generating…"
                endpoint="/api/admin/contracts"
                body={{ proposalId: proposal.id }}
                variant="brand"
              />
            )}
          </>
        }
        alert={
          isOpen && expiresIn != null && expiresIn <= 7 ? (
            <AlertBar tone={expiresIn < 0 ? "danger" : "warning"}>
              {expiresIn < 0
                ? `This proposal expired ${Math.abs(expiresIn)} day${Math.abs(expiresIn) === 1 ? "" : "s"} ago. The price is no longer committed — reissue it before the client accepts.`
                : `Expires in ${expiresIn} day${expiresIn === 1 ? "" : "s"}. Chase it or extend the validity.`}
            </AlertBar>
          ) : null
        }
        tabs={<TabNav tabs={TABS} active={tab} basePath={`/proposals/${proposal.id}`} />}
      />

      <DetailLayout
        aside={
          <>
            <Panel title="Record" flush>
              <MetaList
                items={[
                  {
                    label: "Client",
                    value: (
                      <Link href={`/clients/${proposal.clientId}`} className="hover:text-brand">
                        {clientName}
                      </Link>
                    ),
                  },
                  { label: "Scope", value: proposal.projectType },
                  { label: "Complexity", value: proposal.complexity },
                  { label: "Accent", value: `${proposal.accentName} (${proposal.colorWorld})` },
                  { label: "Created", value: dateTime(proposal.createdAt) },
                  { label: "Sent", value: proposal.sentAt ? dateTime(proposal.sentAt) : "—" },
                  { label: "Read", value: proposal.readAt ? dateTime(proposal.readAt) : "—" },
                  { label: "Answered", value: proposal.respondedAt ? dateTime(proposal.respondedAt) : "—" },
                  {
                    label: "Author",
                    value:
                      author?.name ??
                      author?.email ?? (
                        <span className="font-mono text-micro">
                          {proposal.createdBy.slice(0, 8)}
                        </span>
                      ),
                  },
                ]}
              />
            </Panel>

            <Panel title="Next step" flush>
              <QuickActions>
                {proposal.contract ? (
                  <Button asChild variant="outline">
                    <Link href={`/contracts/${proposal.contract.id}`}>
                      <ExternalLink className="size-3.5 text-subtle-foreground" />
                      Open contract ({statusOf("contractStatus", proposal.contract.status).label})
                    </Link>
                  </Button>
                ) : (
                  <p className="text-base text-muted-foreground">
                    {proposal.status === "ACCEPTED"
                      ? "Accepted. Generate the contract to turn this offer into a commitment."
                      : "A contract can be generated once the client accepts."}
                  </p>
                )}
                <Button asChild variant="outline">
                  <Link href={`/whatsapp/${proposal.clientId}`}>
                    Open conversation
                  </Link>
                </Button>
              </QuickActions>
            </Panel>
          </>
        }
      >
        {tab === "overview" && (
          <>
            <Panel title="Delivery and engagement" description="What happened after it was sent">
              <ol className="space-y-2.5">
                <Stage label="Drafted" at={proposal.createdAt} done />
                <Stage label="Sent" at={proposal.sentAt} done={Boolean(proposal.sentAt)} />
                <Stage label="Delivered" at={proposal.deliveredAt} done={Boolean(proposal.deliveredAt)} />
                <Stage label="Read by client" at={proposal.readAt} done={Boolean(proposal.readAt)} />
                <Stage
                  label={proposal.status === "REJECTED" ? "Rejected" : "Accepted"}
                  at={proposal.respondedAt}
                  done={Boolean(proposal.respondedAt)}
                  tone={proposal.status === "REJECTED" ? "danger" : "success"}
                />
              </ol>
            </Panel>

            {content && (
              <Panel title="The argument" description="How the deck frames the work">
                <div className="space-y-3">
                  <div>
                    <p className="telemetry text-subtle-foreground">Problems named</p>
                    <ul className="mt-1 space-y-1">
                      {content.problems.map((problem) => (
                        <li key={problem.title} className="text-base">
                          <span className="font-medium">{problem.title}</span>
                          <span className="text-muted-foreground"> — {problem.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="telemetry text-subtle-foreground">Modules proposed</p>
                    <ul className="mt-1 space-y-1">
                      {content.solutionModules.map((module) => (
                        <li key={module.title} className="text-base">
                          <span className="font-medium">{module.title}</span>
                          <span className="text-muted-foreground"> — {module.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Panel>
            )}
          </>
        )}

        {tab === "content" && (
          <Panel
            title="Deck content"
            description="Every string the generated document renders"
            action={
              <Link
                href={`/clients/${proposal.clientId}/new-proposal?from=${proposal.id}`}
                className="text-meta text-muted-foreground hover:text-foreground"
              >
                Edit as a new version →
              </Link>
            }
          >
            {!content ? (
              <EmptyInline>
                This proposal predates the structured content editor, or its stored
                content does not match the current schema. The generated PDF is still
                the record of what the client received — open it from the header.
              </EmptyInline>
            ) : (
              <div className="space-y-4">
                <Block title="Timeline">
                  <ul className="rows -mx-3">
                    {content.timelinePhases.map((phase) => (
                      <li key={phase.name} className="flex items-center gap-3 px-3 py-1.5">
                        <span className="w-32 shrink-0 truncate text-base font-medium">{phase.name}</span>
                        <span className="min-w-0 flex-1 truncate text-meta text-muted-foreground">
                          {phase.deliverable}
                        </span>
                        <span className="shrink-0 font-mono text-micro text-subtle-foreground">
                          {phase.durationLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Block>
                <Block title="In scope">
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {content.scopeIncluded.map((entry) => (
                      <li key={entry} className="flex gap-1.5 text-base">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-success" aria-hidden />
                        {entry}
                      </li>
                    ))}
                  </ul>
                </Block>
                <Block title="Explicitly not in scope">
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {content.scopeNotIncluded.map((entry) => (
                      <li key={entry} className="flex gap-1.5 text-base text-muted-foreground">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-danger" aria-hidden />
                        {entry}
                      </li>
                    ))}
                  </ul>
                </Block>
              </div>
            )}
          </Panel>
        )}

        {tab === "pricing" && (
          <>
            <Panel title="Line items" flush>
              {lineItems.length === 0 ? (
                <EmptyInline>
                  This proposal stores a total but no itemised breakdown.
                </EmptyInline>
              ) : (
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className="telemetry h-8 px-3 text-start font-normal text-subtle-foreground">
                        Item
                      </th>
                      <th className="telemetry h-8 px-3 text-end font-normal text-subtle-foreground">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={`${item.item ?? item.label ?? i}`} className="border-b border-border">
                        <td className="px-3 py-2">{item.item ?? item.label ?? "—"}</td>
                        <td className="px-3 py-2 text-end font-mono text-meta tabular-nums">
                          {money(item.amount ?? 0, proposal.currency)}
                        </td>
                      </tr>
                    ))}
                    {reduction > 0 && (
                      <>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2 text-muted-foreground">Subtotal</td>
                          <td className="px-3 py-2 text-end font-mono text-meta tabular-nums text-muted-foreground">
                            {money(subtotal, proposal.currency)}
                          </td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2 text-danger">
                            {discountLabel}
                            <span className="ms-2 font-mono text-micro tabular-nums text-subtle-foreground">
                              {subtotal > 0
                                ? `${((reduction / subtotal) * 100).toFixed(
                                    ((reduction / subtotal) * 100) % 1 === 0 ? 0 : 1,
                                  )}%`
                                : ""}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-end font-mono text-meta tabular-nums text-danger">
                            −{money(reduction, proposal.currency)}
                          </td>
                        </tr>
                      </>
                    )}
                    <tr className="bg-surface">
                      <td className="px-3 py-2 font-medium">
                        {reduction > 0 ? "Total after discount" : "Total"}
                      </td>
                      <td className="px-3 py-2 text-end font-mono text-md font-medium tabular-nums">
                        {money(proposal.totalPrice, proposal.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title="Payment schedule" description="What triggers each instalment">
              <div className="space-y-2">
                {[
                  { label: "On signature", pct: split.first ?? 50 },
                  { label: "At the agreed milestone", pct: split.second ?? 30 },
                  { label: "On handover", pct: split.final ?? 20 },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="w-44 shrink-0 text-base text-muted-foreground">{row.label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${row.pct}%` }} />
                    </span>
                    <span className="w-28 shrink-0 text-end font-mono text-meta tabular-nums">
                      {row.pct}% · {money(Math.round((proposal.totalPrice * row.pct) / 100), proposal.currency)}
                    </span>
                  </div>
                ))}
              </div>
              {reduction > 0 && (
                <p className="mt-3 border-t border-border pt-3 text-meta text-subtle-foreground">
                  Percentages are of the discounted total, not of the{" "}
                  {money(subtotal, proposal.currency)} subtotal.
                </p>
              )}
            </Panel>
          </>
        )}

        {tab === "versions" && (
          <Panel
            title="Every proposal issued to this client"
            description="Nothing is overwritten — a new price is a new record"
            flush
          >
            <ul className="rows">
              {siblings.map((sibling) => (
                <li
                  key={sibling.id}
                  className={
                    sibling.id === proposal.id
                      ? "flex items-center gap-3 bg-brand-soft px-3 py-2.5"
                      : "flex items-center gap-3 px-3 py-2.5"
                  }
                >
                  <FileText className="size-3.5 shrink-0 text-subtle-foreground" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/proposals/${sibling.id}`} className="text-base font-medium hover:text-brand">
                      {money(sibling.totalPrice, sibling.currency)} · {sibling.timelineWeeks} weeks
                      {sibling.id === proposal.id && (
                        <span className="ms-2 text-meta font-normal text-muted-foreground">this one</span>
                      )}
                    </Link>
                    <p className="text-meta text-muted-foreground">{dateTime(sibling.createdAt)}</p>
                  </div>
                  <StatusPill registry="proposalStatus" value={sibling.status} variant="dot" />
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {tab === "activity" && (
          <Panel title="Activity" flush bodyClassName="p-2">
            <Timeline events={activity} emptyLabel="Nothing recorded for this proposal." />
          </Panel>
        )}
      </DetailLayout>
    </div>
  );
}

function Stage({
  label,
  at,
  done,
  tone = "success",
}: {
  label: string;
  at: Date | null;
  done: boolean;
  tone?: "success" | "danger";
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={
          done
            ? tone === "danger"
              ? "size-2 shrink-0 rounded-full bg-danger"
              : "size-2 shrink-0 rounded-full bg-success"
            : "size-2 shrink-0 rounded-full border border-border-mid"
        }
        aria-hidden
      />
      <span className={done ? "text-base" : "text-base text-subtle-foreground"}>{label}</span>
      <span className="ms-auto font-mono text-micro tabular-nums text-subtle-foreground">
        {at ? dateTime(at) : "—"}
      </span>
    </li>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="telemetry mb-1.5 text-subtle-foreground">{title}</p>
      {children}
    </div>
  );
}
