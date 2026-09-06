import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { PageHeader, MetaItem } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { DetailLayout, MetaList } from "@/components/os/detail-layout";
import { Timeline } from "@/components/os/timeline";
import { EmptyInline } from "@/components/os/empty-state";
import { StatusPill } from "@/components/ui/badge";
import { buildActivity } from "@/lib/activity";
import { statusOf } from "@/lib/status";
import { dateTime, phone as fmtPhone } from "@/lib/format";
import { ConvertButton } from "./convert-button";
import { NotesPanel } from "./notes-panel";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

/**
 * §16 — the immutable record.
 *
 * This page shows what the website received, byte for byte, plus the metadata
 * that lets you tell a real lead from a bot: locale, referrer, UTM, user agent,
 * IP. Nothing here is editable. Working the lead happens on the client record.
 */
export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const submission = await prisma.contactSubmission.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true, status: true } },
      notes: { include: { createdBy: { select: { name: true, email: true } } } },
      tags: true,
      meetings: true,
      assignedTo: { select: { name: true, email: true } },
    },
  });
  if (!submission) notFound();

  const activity = buildActivity({
    submission,
    meetings: submission.meetings,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[{ label: "Form submissions", href: "/submissions" }, { label: submission.name }]}
        title={submission.name}
        status={<StatusPill registry="submissionStatus" value={submission.status} />}
        meta={
          <>
            <MetaItem label="Received">{dateTime(submission.submittedAt)}</MetaItem>
            <MetaItem label="Locale">{submission.locale}</MetaItem>
            <MetaItem label="Phone">{fmtPhone(submission.phone)}</MetaItem>
          </>
        }
        actions={
          submission.client ? (
            <Button asChild variant="outline">
              <Link href={`/clients/${submission.client.id}`}>
                Open client record
              </Link>
            </Button>
          ) : (
            <ConvertButton submissionId={submission.id} />
          )
        }
      />

      <DetailLayout
        aside={
          <>
            <Panel title="Attribution" description="How they found the site" flush>
              <MetaList
                items={[
                  { label: "utm_source", value: submission.utmSource ?? "—" },
                  { label: "utm_medium", value: submission.utmMedium ?? "—" },
                  { label: "utm_campaign", value: submission.utmCampaign ?? "—" },
                  {
                    label: "Referrer",
                    value: submission.referrer ? (
                      <span className="break-all font-mono text-micro">{submission.referrer}</span>
                    ) : (
                      "direct"
                    ),
                  },
                  { label: "Locale", value: submission.locale },
                ]}
              />
            </Panel>

            <Panel title="Request metadata" description="Kept for abuse triage only" flush>
              <MetaList
                items={[
                  {
                    label: "IP",
                    value: submission.ipAddress ? (
                      <span className="font-mono text-micro">{submission.ipAddress}</span>
                    ) : (
                      "not recorded"
                    ),
                  },
                  {
                    label: "Agent",
                    value: submission.userAgent ? (
                      <span className="break-all font-mono text-micro">
                        {submission.userAgent.slice(0, 90)}
                      </span>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Assigned", value: submission.assignedTo?.name ?? "unassigned" },
                  {
                    label: "First opened",
                    value: submission.firstViewedAt ? dateTime(submission.firstViewedAt) : "never",
                  },
                  {
                    label: "First contacted",
                    value: submission.firstContactedAt ? dateTime(submission.firstContactedAt) : "never",
                  },
                ]}
              />
            </Panel>
          </>
        }
      >
        <Panel title="What they wrote" description="Unedited, exactly as submitted">
          <p className="max-w-prose whitespace-pre-wrap text-md">{submission.message}</p>
          <dl className="mt-4 grid gap-3 border-t border-border pt-3 sm:grid-cols-3">
            <Fact label="Service">
              {submission.serviceInterest
                ? statusOf("serviceType", submission.serviceInterest).label
                : "not stated"}
            </Fact>
            <Fact label="Timeline">
              {submission.projectTimeline
                ? statusOf("projectTimeline", submission.projectTimeline).label
                : "not stated"}
            </Fact>
            <Fact label="Budget">
              {submission.budget ? statusOf("budgetRange", submission.budget).label : "not stated"}
            </Fact>
          </dl>
          {submission.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
              {submission.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-meta text-muted-foreground"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </Panel>

        <NotesPanel submissionId={submission.id} initialNotes={submission.notes} />

        <Panel title="Activity" flush bodyClassName="p-2">
          <Timeline events={activity} emptyLabel="Nothing beyond the submission itself." />
        </Panel>
      </DetailLayout>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="telemetry text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 text-base">{children}</dd>
    </div>
  );
}
