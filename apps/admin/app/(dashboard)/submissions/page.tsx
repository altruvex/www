import { prisma } from "@repo/database";
import { Globe } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { SubmissionsTable, type SubmissionRow } from "./submissions-table";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const submissions = await prisma.contactSubmission.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      message: true,
      serviceInterest: true,
      projectTimeline: true,
      budget: true,
      status: true,
      priority: true,
      locale: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      referrer: true,
      submittedAt: true,
      firstViewedAt: true,
      client: { select: { id: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const rows: SubmissionRow[] = submissions.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    message: s.message,
    serviceInterest: s.serviceInterest,
    projectTimeline: s.projectTimeline,
    budget: s.budget,
    status: s.status,
    priority: s.priority,
    locale: s.locale,
    utmSource: s.utmSource,
    utmMedium: s.utmMedium,
    utmCampaign: s.utmCampaign,
    referrer: s.referrer,
    submittedAt: s.submittedAt.toISOString(),
    viewed: Boolean(s.firstViewedAt),
    clientId: s.client?.id ?? null,
  }));

  const unread = rows.filter((r) => !r.viewed).length;
  const unconverted = rows.filter((r) => !r.clientId && r.status !== "SPAM").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Form submissions"
        description="The raw record of what the website received: exact words, UTM parameters, referrer, locale. Converting one into a lead never edits or deletes it."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total received" value={rows.length} sub="All time" />
        <StatTile label="Unopened" value={unread} sub={unread ? "Nobody has read these" : "All read"} tone={unread ? "warning" : "success"} />
        <StatTile
          label="Not converted"
          value={unconverted}
          sub={unconverted ? "No client record yet" : "All converted"}
          tone={unconverted ? "danger" : "success"}
        />
        <StatTile label="Marked spam" value={rows.filter((r) => r.status === "SPAM").length} sub="Kept, not deleted" />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No submissions received"
          body="Every contact, service-inquiry and project-request form on the public site posts here. The payload is stored exactly as it arrived — attribution and all — before anything is done with it."
        />
      ) : (
        <SubmissionsTable rows={rows} />
      )}
    </div>
  );
}
