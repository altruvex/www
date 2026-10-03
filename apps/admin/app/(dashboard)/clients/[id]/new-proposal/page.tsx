import { prisma } from "@repo/database";
import { isComplexityId, isServiceId } from "@repo/pricing-schema";
import { getPricing } from "@/lib/pricing-store";
import { proposalContentSchema } from "@/lib/proposal-schema";
import { NewProposalClient, type ProposalInitial } from "./new-proposal-client";

export const dynamic = "force-dynamic";

/**
 * Resolves the pricing this proposal is estimated against on the server —
 * override ?? shipped default, the same set /pricing and the public estimator
 * read — and hands it to the editor. The client bundle never carries a
 * pricing table of its own to drift from.
 *
 * `?from=<proposalId>` is "Edit as a new version": the builder opens prefilled
 * from that proposal. Saving still creates a NEW proposal — versions are never
 * overwritten — so the source is only read here, never written.
 */
export default async function NewProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ id: clientId }, { from }] = await Promise.all([params, searchParams]);
  const [pricing, initial] = await Promise.all([getPricing(), loadSource(clientId, from)]);
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

  // A version belongs to the same client. A `from` that names another client's
  // proposal (or nothing) is ignored, and the screen says so instead of
  // silently opening a blank builder.
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
    // Null content (a proposal from before the content document) or content
    // that no longer validates falls back to the scalar fields: the estimator
    // inputs are prefilled and the deck is seeded fresh from them.
    content: parsed.success ? parsed.data : null,
  };
}
