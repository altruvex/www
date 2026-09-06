import Link from "next/link";
import { prisma } from "@repo/database";
import { Target } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { EmptyState } from "@/components/os/empty-state";
import { StatTile } from "@/components/os/stat-tile";
import { scoreLead } from "@/lib/lead-score";
import { deriveClientStage } from "@/lib/dashboard-data";
import { LeadsTable, type LeadRow } from "./leads-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * Leads = demand that has not become an opportunity yet.
 *
 * A Client row at stage NEW / VIEWED / CONTACTED / QUALIFIED is a lead. The
 * moment a proposal goes out the same record becomes an opportunity and moves
 * to /pipeline. There is ONE record throughout (§32) — the two screens are two
 * questions asked of it, not two copies of it.
 */
export default async function LeadsPage() {
  const [clients, unconvertedSubmissions, unconvertedEstimates] = await Promise.all([
    prisma.client.findMany({
      where: { status: { in: ["NEW", "VIEWED", "CONTACTED", "QUALIFIED"] } },
      select: {
        id: true,
        name: true,
        company: true,
        phone: true,
        email: true,
        industry: true,
        source: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        contactSubmission: {
          select: {
            budget: true,
            projectTimeline: true,
            serviceInterest: true,
            message: true,
            utmSource: true,
          },
        },
        transparencyLead: {
          select: { priceMin: true, priceMax: true, projectType: true, timeline: true },
        },
        proposals: {
          select: { status: true, readAt: true, totalPrice: true, currency: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        contracts: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
        // Inbound only. Counting every message would mean our own proposal send
        // raised the lead's score — the score would measure our activity, not theirs.
        messages: { where: { direction: "INBOUND" }, select: { id: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contactSubmission.count({ where: { client: null, status: { not: "SPAM" } } }),
    prisma.transparencyLead.count({ where: { client: null } }),
  ]);

  const rows: LeadRow[] = clients.map((client) => {
    const { score, reasons } = scoreLead({
      budget: client.contactSubmission?.budget ?? null,
      timeline:
        client.contactSubmission?.projectTimeline ?? client.transparencyLead?.timeline ?? null,
      source: client.source,
      serviceInterest: client.contactSubmission?.serviceInterest ?? null,
      hasCompany: Boolean(client.company),
      hasEmail: Boolean(client.email),
      messageLength: client.contactSubmission?.message?.length ?? 0,
      estimatorPriceMax: client.transparencyLead?.priceMax ?? null,
      proposalCount: client.proposals.length,
      readProposal: Boolean(client.proposals[0]?.readAt),
      inboundMessages: client.messages.length,
    });

    return {
      id: client.id,
      name: client.name,
      company: client.company,
      phone: client.phone,
      email: client.email,
      industry: client.industry,
      source: client.source,
      status: client.status,
      priority: client.priority,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
      budget: client.contactSubmission?.budget ?? null,
      timeline:
        client.contactSubmission?.projectTimeline ?? client.transparencyLead?.timeline ?? null,
      serviceInterest: client.contactSubmission?.serviceInterest ?? null,
      utmSource: client.contactSubmission?.utmSource ?? null,
      estimateMin: client.transparencyLead?.priceMin ?? null,
      estimateMax: client.transparencyLead?.priceMax ?? null,
      stage: deriveClientStage(client),
      score,
      scoreReasons: reasons,
      messageCount: client._count.messages,
      inboundCount: client.messages.length,
    };
  });

  const uncontacted = rows.filter((r) => r.status === "NEW" || r.status === "VIEWED").length;
  const qualified = rows.filter((r) => r.status === "QUALIFIED").length;
  const hot = rows.filter((r) => r.score >= 65).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leads"
        description="Demand that has not become an opportunity yet. A lead leaves this list the moment a proposal is sent."
        meta={
          unconvertedSubmissions + unconvertedEstimates > 0 ? (
            <span>
              {unconvertedSubmissions + unconvertedEstimates} website submission
              {unconvertedSubmissions + unconvertedEstimates === 1 ? "" : "s"} not yet
              converted into a lead ·{" "}
              <Link href="/submissions" className="text-brand hover:underline">
                review them
              </Link>
            </span>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Open leads" value={rows.length} sub="Pre-proposal" />
        <StatTile
          label="Uncontacted"
          value={uncontacted}
          sub={uncontacted ? "Nobody has replied yet" : "All contacted"}
          tone={uncontacted > 0 ? "danger" : "success"}
        />
        <StatTile label="Qualified" value={qualified} sub="Ready for a proposal" tone={qualified ? "progress" : "neutral"} />
        <StatTile label="Score ≥ 65" value={hot} sub="Worth calling today" tone={hot ? "success" : "neutral"} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No open leads"
          body={
            <>
              Every lead has either been qualified into an opportunity or closed out.
              New leads land here automatically when a website submission is converted
              into a client record.
            </>
          }
          action={
            <Button asChild variant="outline">
              <Link href="/submissions">
                Review website submissions
              </Link>
            </Button>
          }
        />
      ) : (
        <LeadsTable rows={rows} />
      )}
    </div>
  );
}
