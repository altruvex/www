import Link from "next/link";
import { prisma } from "@repo/database";
import { FileText } from "lucide-react";
import { Button } from "@repo/ui";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { NewProposalButton } from "@/components/os/new-proposal-button";
import { ActiveFilters, FilterBar, FilterChip } from "@/components/os/filter-bar";
import { gateRoute } from "@/lib/page-gate";
import { currentRole } from "@/lib/authorize";
import { can } from "@/lib/rbac";
import { roleCanOpen } from "@/lib/action-center";
import { moneyByCurrency, percent, sumByCurrency } from "@/lib/format";
import { ProposalsTable, type ProposalRow } from "./proposals-table";
import { ProposalInspector } from "./proposal-inspector";

export const dynamic = "force-dynamic";

const OPEN = ["SENT", "DELIVERED", "READ", "VIEWED"];

const STATUS_FILTERS = [
  { value: "open", label: "Awaiting a reply", match: (s: string) => OPEN.includes(s) },
  { value: "DRAFT", label: "Drafts", match: (s: string) => s === "DRAFT" },
  { value: "ACCEPTED", label: "Accepted", match: (s: string) => s === "ACCEPTED" },
  { value: "REJECTED", label: "Rejected", match: (s: string) => s === "REJECTED" },
  { value: "EXPIRED", label: "Expired", match: (s: string) => s === "EXPIRED" },
] as const;

type Params = { client?: string; status?: string; inspect?: string };

function listHref(params: { client?: string | null; status?: string | null }) {
  const query = new URLSearchParams();
  if (params.client) query.set("client", params.client);
  if (params.status) query.set("status", params.status);
  const qs = query.toString();
  return qs ? `/proposals?${qs}` : "/proposals";
}

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const denied = await gateRoute("/proposals");
  if (denied) return denied;

  const params = await searchParams;
  const clientId = params.client?.trim() || null;
  const statusFilter = STATUS_FILTERS.find((f) => f.value === params.status) ?? null;
  const inspectId = params.inspect?.trim() || null;
  const role = await currentRole();

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

  const all: ProposalRow[] = proposals.map((p) => ({
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
    hasDocument: Boolean(p.pdfUrl ?? p.fileUrl),
  }));
  const rows = statusFilter ? all.filter((r) => statusFilter.match(r.status)) : all;

  const sent = all.filter((r) => r.status !== "DRAFT");
  const accepted = all.filter((r) => r.status === "ACCEPTED");
  const open = all.filter((r) => OPEN.includes(r.status));
  const drafts = all.filter((r) => r.status === "DRAFT");
  const openValue = sumByCurrency(open.map((r) => ({ amount: r.totalPrice, currency: r.currency })));
  const acceptedValue = sumByCurrency(
    accepted.map((r) => ({ amount: r.totalPrice, currency: r.currency })),
  );
  const acceptRate = sent.length ? Math.round((accepted.length / sent.length) * 100) : 0;

  const canCreate = can(role, "create", "proposal");
  const canDelete = can(role, "delete", "proposal");
  const canOpenClient = roleCanOpen(role, "/clients");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Proposals"
        description="Every offer, and what the client did with it. Versions are never overwritten — a new price means a new proposal."
        actions={
          canCreate ? (
            scopeClient ? (
              <Button asChild variant="brand">
                <Link href={`/clients/${scopeClient.id}/new-proposal`}>New proposal</Link>
              </Button>
            ) : (
              <NewProposalButton />
            )
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="Awaiting a reply"
          value={open.length}
          sub={moneyByCurrency(openValue, true)}
          tone={open.length ? "warning" : "neutral"}
          href={listHref({ client: clientId, status: "open" })}
        />
        <StatTile
          label="Accepted"
          value={accepted.length}
          sub={moneyByCurrency(acceptedValue, true)}
          tone={accepted.length ? "success" : "neutral"}
          href={listHref({ client: clientId, status: "ACCEPTED" })}
        />
        <StatTile
          label="Acceptance rate"
          value={percent(acceptRate)}
          sub={`${accepted.length} of ${sent.length} sent`}
        />
        <StatTile
          label="Drafts"
          value={drafts.length}
          sub="Not sent to anyone"
          href={listHref({ client: clientId, status: "DRAFT" })}
        />
      </div>

      {all.length > 0 && (
        <div className="space-y-2">
          <FilterBar label="Filter proposals">
            <FilterChip param="status" label="All" count={all.length} />
            {STATUS_FILTERS.map((f) => (
              <FilterChip
                key={f.value}
                param="status"
                value={f.value}
                label={f.label}
                count={all.filter((r) => f.match(r.status)).length}
              />
            ))}
          </FilterBar>
          <ActiveFilters
            labels={{ client: "Client", status: "Status" }}
            valueLabels={{
              status: Object.fromEntries(STATUS_FILTERS.map((f) => [f.value, f.label])),
              ...(clientId ? { client: { [clientId]: scopeName } } : {}),
            }}
          />
        </div>
      )}

      {all.length === 0 ? (
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
              scopeClient && canCreate ? (
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
              canCreate ? (
                <NewProposalButton variant="outline">Pick a client to quote</NewProposalButton>
              ) : undefined
            }
          />
        )
      ) : (
        <ProposalsTable
          rows={rows}
          canDelete={canDelete}
          filtered={statusFilter?.label ?? null}
          canOpenClient={canOpenClient}
          canPropose={canCreate && canOpenClient}
          canSend={can(role, "send", "proposal")}
          canContract={can(role, "create", "contract")}
          canOpenContract={roleCanOpen(role, "/contracts")}
        />
      )}

      <ProposalInspector id={inspectId} role={role} />
    </div>
  );
}
