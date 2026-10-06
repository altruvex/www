import Link from "next/link";
import { prisma, type ContractStatus } from "@repo/database";
import { FileSignature } from "lucide-react";
import { Button } from "@repo/ui";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { ActiveFilters, FilterBar, FilterChip } from "@/components/os/filter-bar";
import { gateRoute } from "@/lib/page-gate";
import { currentRole } from "@/lib/authorize";
import { can } from "@/lib/rbac";
import { moneyByCurrency, sumByCurrency } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { PickToOpen } from "@/components/os/pick-to-open";
import { ContractsTable, type ContractRow } from "./contracts-table";
import { ContractInspector } from "./contract-inspector";
import { contractStepPermissions } from "./contract-permissions";

export const dynamic = "force-dynamic";

const CONTRACT_STATUSES: readonly ContractStatus[] = [
  "DRAFT",
  "SENT",
  "SIGNED",
  "DECLINED",
  "EXPIRED",
];

type Params = { client?: string; status?: string; delivery?: string; inspect?: string };

function contractsHref(scope: {
  client?: string | null;
  status?: string | null;
  delivery?: string | null;
}) {
  const params = new URLSearchParams();
  if (scope.client) params.set("client", scope.client);
  if (scope.status) params.set("status", scope.status);
  if (scope.delivery) params.set("delivery", scope.delivery);
  const query = params.toString();
  return query ? `/contracts?${query}` : "/contracts";
}

export default async function ContractsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const denied = await gateRoute("/contracts");
  if (denied) return denied;

  const params = await searchParams;
  const clientId = params.client?.trim() || null;
  const status =
    CONTRACT_STATUSES.find((s) => s === params.status?.trim().toUpperCase()) ?? null;
  const noProject = params.delivery === "none";
  const inspectId = params.inspect?.trim() || null;
  const role = await currentRole();

  const [scopeClient, contracts, readyProposals] = await Promise.all([
    clientId
      ? prisma.client.findUnique({
          where: { id: clientId },
          select: { id: true, name: true, company: true },
        })
      : null,
    prisma.contract.findMany({
      where: clientId ? { clientId } : undefined,
      include: {
        client: { select: { id: true, name: true, company: true } },
        proposal: {
          select: { id: true, totalPrice: true, currency: true, projectType: true },
        },
        project: { select: { id: true, name: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    can(role, "create", "contract")
      ? prisma.proposal.findMany({
          where: { status: "ACCEPTED", contract: { is: null }, ...(clientId ? { clientId } : {}) },
          select: {
            id: true,
            projectType: true,
            client: { select: { name: true, company: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
        })
      : [],
  ]);
  const generateOptions = readyProposals.map((p) => ({
    label: p.projectType,
    hint: p.client.company || p.client.name || "Unnamed client",
    href: `/proposals/${p.id}`,
  }));
  const scopeName = scopeClient
    ? scopeClient.company || scopeClient.name || "Unnamed client"
    : "Unknown client";

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
    proposalId: c.proposalId,
    projectId: c.project?.id ?? null,
    projectName: c.project?.name ?? null,
    projectStatus: c.project?.status ?? null,
  }));

  const awaiting = rows.filter((r) => r.status === "SENT");
  const signed = rows.filter((r) => r.status === "SIGNED");
  const signedNoProject = signed.filter((r) => !r.projectId);
  const drafts = rows.filter((r) => r.status === "DRAFT");
  const signedValue = sumByCurrency(signed.map((r) => ({ amount: r.value, currency: r.currency })));
  const awaitingValue = sumByCurrency(
    awaiting.map((r) => ({ amount: r.value, currency: r.currency })),
  );

  const visible = rows.filter(
    (r) => (!status || r.status === status) && (!noProject || (r.status === "SIGNED" && !r.projectId)),
  );
  const filterLabel = [
    status ? statusOf("contractStatus", status).label : null,
    noProject ? "Signed, no project" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const canDelete = can(role, "delete", "contract");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contracts"
        description="Commitments. A contract can only be generated from an accepted proposal, so it always references an offer the client saw."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="Awaiting signature"
          value={awaiting.length}
          sub={awaiting.length ? moneyByCurrency(awaitingValue, true) : "Nothing pending"}
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
          sub={signedNoProject.length ? "Delivery has not started" : "All converted"}
          tone={signedNoProject.length ? "danger" : "success"}
          href={contractsHref({ client: clientId, delivery: "none" })}
        />
        <StatTile
          label="Drafts"
          value={drafts.length}
          sub="Not sent yet"
          href={contractsHref({ client: clientId, status: "DRAFT" })}
        />
      </div>

      {rows.length > 0 && (
        <div className="space-y-2">
          <FilterBar label="Filter contracts">
            <FilterChip param="status" label="All" count={rows.length} />
            {CONTRACT_STATUSES.map((s) => (
              <FilterChip
                key={s}
                param="status"
                value={s}
                label={statusOf("contractStatus", s).label}
                count={rows.filter((r) => r.status === s).length}
              />
            ))}
            <FilterChip
              param="delivery"
              value="none"
              label="Signed, no project"
              count={signedNoProject.length}
            />
          </FilterBar>
          <ActiveFilters
            labels={{ client: "Client", status: "Status", delivery: "Delivery" }}
            valueLabels={{
              ...(clientId ? { client: { [clientId]: scopeName } } : {}),
              status: Object.fromEntries(
                CONTRACT_STATUSES.map((s) => [s, statusOf("contractStatus", s).label]),
              ),
              delivery: { none: "Signed, no project" },
            }}
          />
        </div>
      )}

      {rows.length === 0 && clientId ? (
        <EmptyState
          icon={FileSignature}
          title={scopeClient ? `No contracts for ${scopeName} yet` : "This client no longer exists"}
          body={
            scopeClient
              ? generateOptions.length > 0
                ? "A contract is generated from an accepted proposal. Pick the one they accepted to generate it."
                : "A contract is generated from an accepted proposal, and this client has not accepted one yet. Quote them first."
              : "The link points at a client record that was deleted or never existed. Clear the filter to see every contract."
          }
          action={
            scopeClient && generateOptions.length > 0 ? (
              <PickToOpen
                label="Generate a contract"
                options={generateOptions}
                footer={{ label: "Their proposals", href: `/proposals?client=${scopeClient.id}` }}
              />
            ) : scopeClient && can(role, "create", "proposal") ? (
              <Button asChild variant="outline">
                <Link href={`/clients/${scopeClient.id}/new-proposal`}>New proposal</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href={scopeClient ? `/proposals?client=${scopeClient.id}` : "/contracts"}>
                  {scopeClient ? "Their proposals" : "All contracts"}
                </Link>
              </Button>
            )
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No contracts yet"
          body="Contracts are generated from accepted proposals. Once a client accepts, Generate contract on the proposal turns the offer into a commitment with the same numbers."
          action={
            generateOptions.length > 0 ? (
              <PickToOpen
                label="Generate a contract"
                options={generateOptions}
                footer={{ label: "All accepted proposals", href: "/proposals?status=ACCEPTED" }}
              />
            ) : (
              <Button asChild variant="outline">
                <Link href="/proposals?status=ACCEPTED">Open accepted proposals</Link>
              </Button>
            )
          }
        />
      ) : (
        <ContractsTable
          rows={visible}
          canDelete={canDelete}
          filtered={filterLabel || null}
          allowed={contractStepPermissions(role)}
          generateOptions={generateOptions}
        />
      )}

      <ContractInspector id={inspectId} role={role} />
    </div>
  );
}
