import Link from "next/link";
import { prisma } from "@repo/database";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { FilterChip } from "@/components/os/data-table";
import { moneyByCurrency, percent, sumByCurrency } from "@/lib/format";
import { ProposalsTable, type ProposalRow } from "./proposals-table";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client: clientParam } = await searchParams;
  const clientId = clientParam?.trim() || null;

  // A list reached from a client hub (`?client=`) is that client's book, not
  // the whole one — the scope is applied in the query, and the chip names it.
  const [scopeClient, proposals] = await Promise.all([
    clientId
      ? prisma.client.findUnique({
          where: { id: clientId },
          select: { id: true, name: true, company: true },
        })
      : null,
    prisma.proposal.findMany({
      where: clientId ? { clientId } : undefined,
      include: {
        client: { select: { id: true, name: true, company: true } },
        contract: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const scopeName = scopeClient
    ? scopeClient.company || scopeClient.name || "Unnamed client"
    : "Unknown client";

  const rows: ProposalRow[] = proposals.map((p) => ({
    id: p.id,
    clientId: p.clientId,
    clientName: p.client.company || p.client.name || "Unnamed client",
    projectType: p.projectType,
    complexity: p.complexity,
    totalPrice: p.totalPrice,
    currency: p.currency,
    timelineWeeks: p.timelineWeeks,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    sentAt: p.sentAt?.toISOString() ?? null,
    deliveredAt: p.deliveredAt?.toISOString() ?? null,
    readAt: p.readAt?.toISOString() ?? null,
    respondedAt: p.respondedAt?.toISOString() ?? null,
    validUntil: p.validUntil.toISOString(),
    contractId: p.contract?.id ?? null,
    pdfUrl: p.pdfUrl,
  }));

  const sent = rows.filter((r) => r.status !== "DRAFT");
  const accepted = rows.filter((r) => r.status === "ACCEPTED");
  const open = rows.filter((r) => ["SENT", "DELIVERED", "READ", "VIEWED"].includes(r.status));
  const openValue = sumByCurrency(
    open.map((r) => ({ amount: r.totalPrice, currency: r.currency })),
  );
  const acceptedValue = sumByCurrency(
    accepted.map((r) => ({ amount: r.totalPrice, currency: r.currency })),
  );
  const acceptRate = sent.length ? Math.round((accepted.length / sent.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Proposals"
        description="Every offer, and what the client did with it. Versions are never overwritten — a new price means a new proposal."
        actions={
          scopeClient ? (
            <Button asChild variant="brand">
              <Link href={`/clients/${scopeClient.id}/new-proposal`}>New proposal</Link>
            </Button>
          ) : undefined
        }
      />

      {clientId && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip label="Client" value={scopeName} clearHref="/proposals" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Awaiting a reply"
          value={open.length}
          sub={moneyByCurrency(openValue, true)}
          tone={open.length ? "warning" : "neutral"}
        />
        <StatTile
          label="Accepted"
          value={accepted.length}
          sub={moneyByCurrency(acceptedValue, true)}
          tone={accepted.length ? "success" : "neutral"}
        />
        <StatTile label="Acceptance rate" value={percent(acceptRate)} sub={`${accepted.length} of ${sent.length} sent`} />
        <StatTile label="Drafts" value={rows.filter((r) => r.status === "DRAFT").length} sub="Not sent to anyone" />
      </div>

      {rows.length === 0 ? (
        clientId ? (
          <EmptyState
            icon={FileText}
            title={scopeClient ? `No proposals for ${scopeName} yet` : "This client no longer exists"}
            body={
              scopeClient
                ? "Quote this client from their record: the builder prices the scope with the same table the public estimator uses."
                : "The link points at a client record that was deleted or never existed. Clear the filter to see every proposal."
            }
            action={
              scopeClient ? (
                <Button asChild variant="outline">
                  <Link href={`/clients/${scopeClient.id}/new-proposal`}>New proposal</Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/proposals">All proposals</Link>
                </Button>
              )
            }
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="No proposals yet"
            body="A proposal is built from a client record and priced with the same table the public estimator uses, so the figure a client was quoted online and the figure you send cannot disagree."
            action={
              <Button asChild variant="outline">
                <Link href="/clients">Pick a client to quote</Link>
              </Button>
            }
          />
        )
      ) : (
        <ProposalsTable rows={rows} />
      )}
    </div>
  );
}
