import Link from "next/link";
import { prisma, type ContractStatus } from "@repo/database";
import { FileSignature } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { FilterChip } from "@/components/os/data-table";
import { moneyByCurrency, sumByCurrency } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { ContractsTable, type ContractRow } from "./contracts-table";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

const CONTRACT_STATUSES: readonly ContractStatus[] = [
  "DRAFT",
  "SENT",
  "SIGNED",
  "DECLINED",
  "EXPIRED",
];

/** The list URL with one scope changed; both scopes travel together. */
function contractsHref(scope: {
  client?: string | null;
  status?: string | null;
}) {
  const params = new URLSearchParams();
  if (scope.client) params.set("client", scope.client);
  if (scope.status) params.set("status", scope.status);
  const query = params.toString();
  return query ? `/contracts?${query}` : "/contracts";
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; status?: string }>;
}) {
  const { client: clientParam, status: statusParam } = await searchParams;
  const clientId = clientParam?.trim() || null;
  // `?status=` (from Today and the tiles below) narrows the table only; an
  // unknown value is ignored rather than rendering an empty list that looks real.
  const status =
    CONTRACT_STATUSES.find((s) => s === statusParam?.trim().toUpperCase()) ??
    null;

  // `?client=` (from the client hub) scopes the query itself; the chip names it.
  const scopeClient = clientId
    ? await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, company: true },
      })
    : null;
  const scopeName = scopeClient
    ? scopeClient.company || scopeClient.name || "Unnamed client"
    : "Unknown client";

  const contracts = await prisma.contract.findMany({
    where: clientId ? { clientId } : undefined,
    include: {
      client: { select: { id: true, name: true, company: true } },
      proposal: {
        select: {
          id: true,
          totalPrice: true,
          currency: true,
          projectType: true,
        },
      },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: ContractRow[] = contracts.map((c) => ({
    id: c.id,
    clientId: c.clientId,
    clientName: c.client.company || c.client.name || "Unnamed client",
    projectType: c.proposal.projectType,
    value: c.proposal.totalPrice,
    currency: c.proposal.currency,
    status: c.status,
    signatureMethod: c.signatureMethod,
    createdAt: c.createdAt.toISOString(),
    signedAt: c.signedAt?.toISOString() ?? null,
    signedByName: c.signedByName,
    onboardingSent: Boolean(c.onboardingMessageSentAt),
    projectId: c.project?.id ?? null,
    projectName: c.project?.name ?? null,
    // The sign token is deliberately not carried: this row is serialised into
    // a client component, and the token is the signing credential.
  }));

  // The tiles summarise the whole scope (all statuses), so they stay a map of
  // where contracts stand while the table shows the status picked.
  const visible = status ? rows.filter((r) => r.status === status) : rows;
  const awaiting = rows.filter((r) => r.status === "SENT");
  const signed = rows.filter((r) => r.status === "SIGNED");
  const signedValue = sumByCurrency(
    signed.map((r) => ({ amount: r.value, currency: r.currency })),
  );
  const awaitingValue = sumByCurrency(
    awaiting.map((r) => ({ amount: r.value, currency: r.currency })),
  );
  const signedNoProject = signed.filter((r) => !r.projectId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contracts"
        description="Commitments. A contract can only be generated from an accepted proposal, so it always references an offer the client saw."
      />

      {(clientId || status) && (
        <div className="flex flex-wrap items-center gap-2">
          {clientId && (
            <FilterChip
              label="Client"
              value={scopeName}
              clearHref={contractsHref({ status })}
            />
          )}
          {status && (
            <FilterChip
              label="Status"
              value={statusOf("contractStatus", status).label}
              clearHref={contractsHref({ client: clientId })}
            />
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Awaiting signature"
          value={awaiting.length}
          sub={
            awaiting.length
              ? moneyByCurrency(awaitingValue, true)
              : "Nothing pending"
          }
          tone={awaiting.length ? "warning" : "neutral"}
          href={contractsHref({ client: clientId, status: "SENT" })}
        />
        <StatTile
          label="Signed"
          value={signed.length}
          sub={moneyByCurrency(signedValue, true)}
          tone={signed.length ? "success" : "neutral"}
          href={contractsHref({ client: clientId, status: "SIGNED" })}
        />
        <StatTile
          label="Signed, no project"
          value={signedNoProject.length}
          sub={
            signedNoProject.length
              ? "Delivery has not started"
              : "All converted"
          }
          tone={signedNoProject.length ? "danger" : "success"}
        />
        <StatTile
          label="Drafts"
          value={rows.filter((r) => r.status === "DRAFT").length}
          sub="Not sent yet"
          href={contractsHref({ client: clientId, status: "DRAFT" })}
        />
      </div>

      {rows.length === 0 && clientId ? (
        <EmptyState
          icon={FileSignature}
          title={
            scopeClient
              ? `No contracts for ${scopeName} yet`
              : "This client no longer exists"
          }
          body={
            scopeClient
              ? "A contract is generated from an accepted proposal. Open this client's proposals to find the one they accepted, or quote them first."
              : "The link points at a client record that was deleted or never existed. Clear the filter to see every contract."
          }
          action={
            <Button asChild variant="outline">
              <Link
                href={
                  scopeClient
                    ? `/proposals?client=${scopeClient.id}`
                    : "/contracts"
                }
              >
                {scopeClient ? "Their proposals" : "All contracts"}
              </Link>
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No contracts yet"
          body="Contracts are generated from accepted proposals. Once a client accepts, the Generate contract action on the proposal turns the offer into a commitment with the same numbers."
          action={
            <Button asChild variant="outline">
              <Link href="/proposals">Open proposals</Link>
            </Button>
          }
        />
      ) : visible.length === 0 && status ? (
        <EmptyState
          icon={FileSignature}
          title={`No ${statusOf("contractStatus", status).label.toLowerCase()} contracts${clientId ? ` for ${scopeName}` : ""}`}
          body="Nothing matches this status right now. Clear the status filter to see the rest."
          action={
            <Button asChild variant="outline">
              <Link href={contractsHref({ client: clientId })}>
                Clear the status filter
              </Link>
            </Button>
          }
        />
      ) : (
        <ContractsTable rows={visible} />
      )}
    </div>
  );
}
