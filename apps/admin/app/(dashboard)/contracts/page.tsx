import Link from "next/link";
import { prisma } from "@repo/database";
import { FileSignature } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { moneyByCurrency, sumByCurrency } from "@/lib/format";
import { ContractsTable, type ContractRow } from "./contracts-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const contracts = await prisma.contract.findMany({
    include: {
      client: { select: { id: true, name: true, company: true } },
      proposal: { select: { id: true, totalPrice: true, currency: true, projectType: true } },
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
    hasProject: Boolean(c.project),
    signToken: c.signToken,
  }));

  const awaiting = rows.filter((r) => r.status === "SENT");
  const signed = rows.filter((r) => r.status === "SIGNED");
  const signedValue = sumByCurrency(signed.map((r) => ({ amount: r.value, currency: r.currency })));
  const awaitingValue = sumByCurrency(
    awaiting.map((r) => ({ amount: r.value, currency: r.currency })),
  );
  const signedNoProject = signed.filter((r) => !r.hasProject);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contracts"
        description="Commitments. A contract can only be generated from an accepted proposal, so it always references an offer the client saw."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Awaiting signature"
          value={awaiting.length}
          sub={awaiting.length ? moneyByCurrency(awaitingValue, true) : "Nothing pending"}
          tone={awaiting.length ? "warning" : "neutral"}
        />
        <StatTile
          label="Signed"
          value={signed.length}
          sub={moneyByCurrency(signedValue, true)}
          tone={signed.length ? "success" : "neutral"}
        />
        <StatTile
          label="Signed, no project"
          value={signedNoProject.length}
          sub={signedNoProject.length ? "Delivery has not started" : "All converted"}
          tone={signedNoProject.length ? "danger" : "success"}
        />
        <StatTile label="Drafts" value={rows.filter((r) => r.status === "DRAFT").length} sub="Not sent yet" />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No contracts yet"
          body="Contracts are generated from accepted proposals. Once a client accepts, the Generate contract action on the proposal turns the offer into a commitment with the same numbers."
          action={
            <Button asChild variant="outline">
              <Link href="/proposals">
                Open proposals
              </Link>
            </Button>
          }
        />
      ) : (
        <ContractsTable rows={rows} />
      )}
    </div>
  );
}
