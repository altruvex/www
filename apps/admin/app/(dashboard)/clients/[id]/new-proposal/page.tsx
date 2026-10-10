import Link from "next/link";
import { prisma } from "@repo/database";
import { Ban } from "lucide-react";
import { Button } from "@repo/ui";
import { EmptyState } from "@/components/os/empty-state";
import { isComplexityId, isServiceId } from "@repo/pricing-schema";
import { getPricing } from "@/lib/pricing-store";
import { gateRoute } from "@/lib/page-gate";
import { proposalContentSchema } from "@/lib/proposal-schema";
import { NewProposalClient, type ProposalInitial } from "./new-proposal-client";

export const dynamic = "force-dynamic";

export default async function NewProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const denied = await gateRoute(
    "/clients/[id]/new-proposal",
    "a new proposal",
  );
  if (denied) return denied;

  const [{ id: clientId }, { from }] = await Promise.all([
    params,
    searchParams,
  ]);
  // POST /api/admin/proposals refuses a SPAM client (409); do not open a builder that cannot save.
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { status: true },
  });
  if (client?.status === "SPAM") {
    return (
      <EmptyState
        icon={Ban}
        title="This client is marked as spam"
        body="This client is marked as spam. Change its status before creating a proposal."
        action={
          <Button asChild variant="outline">
            <Link href={`/clients/${clientId}`}>Back to client</Link>
          </Button>
        }
      />
    );
  }
  const [pricing, initial] = await Promise.all([
    getPricing(),
    loadSource(clientId, from),
  ]);
  return <NewProposalClient pricing={pricing} initial={initial} />;
}

async function loadSource(
  clientId: string,
  from: string | undefined,
): Promise<ProposalInitial | undefined> {
  const sourceId = from?.trim();
  if (!sourceId) return undefined;

  const source = await prisma.proposal.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      clientId: true,
      projectType: true,
      complexity: true,
      currency: true,
      accentName: true,
      content: true,
      createdAt: true,
    },
  });

  if (!source || source.clientId !== clientId) {
    return {
      kind: "ignored",
      sourceId,
      reason: source
        ? "That proposal belongs to a different client, so it was not copied here."
        : "That proposal no longer exists, so the builder opened empty.",
    };
  }

  const parsed = proposalContentSchema.safeParse(source.content);

  return {
    kind: "version",
    sourceId: source.id,
    sourceLabel: `${source.projectType} · ${source.complexity} · ${source.createdAt.toISOString().slice(0, 10)}`,
    projectType: isServiceId(source.projectType) ? source.projectType : null,
    complexity: isComplexityId(source.complexity) ? source.complexity : null,
    currency: source.currency === "USD" ? "USD" : "EGP",
    accentName: source.accentName || null,
    content: parsed.success ? parsed.data : null,
  };
}
