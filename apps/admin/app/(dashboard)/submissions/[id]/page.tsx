import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { PageHeader, MetaItem } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { DetailLayout, MetaList } from "@/components/os/detail-layout";
import { Timeline } from "@/components/os/timeline";
import { EntityAudit } from "@/components/os/entity-audit";
import { EntityLink } from "@/components/os/entity-link";
import { NextSteps } from "@/components/os/next-steps";
import { BeforeTheCall } from "@/components/os/before-the-call";
import { loadPreCall } from "@/lib/precall";
import { StatusPill } from "@/components/ui/badge";
import { buildActivity } from "@/lib/activity";
import { currentRole } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { statusOf } from "@/lib/status";
import { dateTime, phone as fmtPhone } from "@/lib/format";
import { leadStepPermissions } from "../lead-permissions";
import { convertedLeadSteps } from "../lead-steps";
import { ConvertButton } from "./convert-button";
import { NotesPanel } from "./notes-panel";
import { TriagePanel } from "./triage-panel";
import { ViewedMarker } from "./viewed-marker";
import { Button } from "@repo/ui";
import { FilePlus2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const denied = await gateRoute("/submissions/[id]", "this submission");
  if (denied) return denied;

  const { id } = await params;
  const role = await currentRole();
  const canConvert = can(role, "create", "client");
  const canTriage = can(role, "edit", "lead");
  const canDelete = can(role, "delete", "lead");
  const allowed = leadStepPermissions(role);

  const team = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const submission = await prisma.contactSubmission.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true, status: true } },
      notes: {
        include: { createdBy: { select: { name: true, email: true } } },
      },
      tags: true,
      meetings: true,
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
  if (!submission) notFound();

  const preCall = await loadPreCall({ submissionId: submission.id });

  const activity = buildActivity({
    submission,
    meetings: submission.meetings,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[
          { label: "Form submissions", href: "/submissions" },
          { label: submission.name },
        ]}
        title={submission.name}
        status={
          <StatusPill registry="submissionStatus" value={submission.status} />
        }
        meta={
          <>
            <MetaItem label="Received">
              {dateTime(submission.submittedAt)}
            </MetaItem>
            <MetaItem label="Locale">{submission.locale}</MetaItem>
            <MetaItem label="Phone">{fmtPhone(submission.phone)}</MetaItem>
            <MetaItem label="Email">
              {submission.email ? (
                <a
                  href={`mailto:${submission.email}`}
                  className="text-brand hover:underline"
                >
                  {submission.email}
                </a>
              ) : (
                "—"
              )}
            </MetaItem>
            {submission.client && (
              <MetaItem label="Client">
                <EntityLink type="client" id={submission.client.id}>
                  {submission.client.company ||
                    submission.client.name ||
                    "Unnamed client"}
                </EntityLink>
              </MetaItem>
            )}
          </>
        }
        actions={
          <>
            {submission.client ? (
              <>
                <Button asChild variant="outline">
                  <Link href={`/clients/${submission.client.id}`}>
                    Open client record
                  </Link>
                </Button>
                {allowed.propose && (
                  <Button asChild variant="brand">
                    <Link href={`/clients/${submission.client.id}/new-proposal`}>
                      <FilePlus2 className="size-3.5" aria-hidden />
                      New proposal
                    </Link>
                  </Button>
                )}
              </>
            ) : canConvert && submission.status !== "SPAM" ? (
              <ConvertButton submissionId={submission.id} />
            ) : null}
            {canDelete && (
              <DeleteRecordButton
                entity="submission"
                id={submission.id}
                label={submission.name}
                redirectTo="/submissions"
              />
            )}
          </>
        }
      />

      {!submission.firstViewedAt && (
        <ViewedMarker submissionId={submission.id} />
      )}

      <DetailLayout
        aside={
          <>
            {submission.client && (
              <NextSteps
                steps={convertedLeadSteps(submission.client.id, allowed)}
              />
            )}
            {canTriage ? (
              <TriagePanel
                key={`${submission.status}|${submission.priority}|${submission.assignedToId ?? ""}`}
                submissionId={submission.id}
                status={submission.status}
                priority={submission.priority}
                assignedToId={submission.assignedToId}
                team={team.map((member) => ({
                  id: member.id,
                  label: member.name || member.email,
                }))}
              />
            ) : (
              <Panel
                title="Triage"
                description="Who owns this and how urgent it is"
                flush
              >
                <MetaList
                  items={[
                    {
                      label: "Status",
                      value: (
                        <StatusPill
                          registry="submissionStatus"
                          value={submission.status}
                        />
                      ),
                    },
                    {
                      label: "Priority",
                      value: statusOf("priority", submission.priority).label,
                    },
                    {
                      label: "Assigned to",
                      value: submission.assignedTo
                        ? submission.assignedTo.name ||
                          submission.assignedTo.email
                        : "Unassigned",
                    },
                  ]}
                />
              </Panel>
            )}

            <Panel
              title="Attribution"
              description="How they found the site"
              flush
            >
              <MetaList
                items={[
                  { label: "utm_source", value: submission.utmSource ?? "—" },
                  { label: "utm_medium", value: submission.utmMedium ?? "—" },
                  {
                    label: "utm_campaign",
                    value: submission.utmCampaign ?? "—",
                  },
                  {
                    label: "Referrer",
                    value: submission.referrer ? (
                      <span className="break-all font-mono text-micro">
                        {submission.referrer}
                      </span>
                    ) : (
                      "direct"
                    ),
                  },
                  { label: "Locale", value: submission.locale },
                ]}
              />
            </Panel>

            <Panel
              title="Request metadata"
              description="Kept for abuse triage only"
              flush
            >
              <MetaList
                items={[
                  {
                    label: "IP",
                    value: submission.ipAddress ? (
                      <span className="font-mono text-micro">
                        {submission.ipAddress}
                      </span>
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
                  {
                    label: "First opened",
                    value: submission.firstViewedAt
                      ? dateTime(submission.firstViewedAt)
                      : "never",
                  },
                  {
                    label: "First contacted",
                    value: submission.firstContactedAt
                      ? dateTime(submission.firstContactedAt)
                      : "never",
                  },
                ]}
              />
            </Panel>
          </>
        }
      >
        <Panel
          title="What they wrote"
          description="Unedited, exactly as submitted"
        >
          <p className="max-w-prose whitespace-pre-wrap text-md">
            {submission.message}
          </p>
          <dl className="mt-4 grid gap-3 border-t border-border-subtle pt-3 sm:grid-cols-3">
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
              {submission.budget
                ? statusOf("budgetRange", submission.budget).label
                : "not stated"}
            </Fact>
          </dl>
          {submission.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border-subtle pt-3">
              {submission.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-ctl-xs border border-border-subtle bg-surface px-1.5 py-0.5 text-meta text-muted-foreground"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </Panel>

        <NotesPanel
          submissionId={submission.id}
          initialNotes={submission.notes}
          canWrite={canTriage}
          canDelete={can(role, "delete", "note")}
        />

        {preCall && (
          <section aria-labelledby="before-the-call" className="space-y-3">
            <h2 id="before-the-call" className="text-md font-semibold">
              Before the call
            </h2>
            {preCall.clientId && (
              <p className="text-base text-muted-foreground">
                Owner and next action are edited on the{" "}
                <Link
                  href={`/clients/${preCall.clientId}#lead-record`}
                  className="underline underline-offset-2"
                >
                  client record
                </Link>
                .
              </p>
            )}
            <BeforeTheCall view={preCall} />
          </section>
        )}

        <Panel title="Activity" flush bodyClassName="p-2">
          <Timeline
            events={activity}
            emptyLabel="Nothing beyond the submission itself."
          />
        </Panel>

        <EntityAudit type="submission" id={submission.id} />
      </DetailLayout>
    </div>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="telemetry text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 text-base">{children}</dd>
    </div>
  );
}
