import * as React from "react";
import { MetaList } from "@/components/os/detail-layout";
import { EmptyInline } from "@/components/os/empty-state";
import { Panel } from "@/components/os/panel";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { date, money, when } from "@/lib/format";
import { bandTone } from "@/lib/lead-score";
import type { PreCallView } from "@/lib/precall";
import { statusOf } from "@/lib/status";

/**
 * "Before the call": what the operator should know before speaking to a lead.
 * Every value comes from a stored record; a missing one says so instead of
 * guessing. `editor` is the owner / next-action form where the viewer may edit.
 */
export function BeforeTheCall({
  view,
  editor,
}: {
  view: PreCallView;
  editor?: React.ReactNode;
}) {
  const q = view.qualification;
  const brief = view.meeting?.brief ?? null;
  const a = view.attribution;
  const hasAttribution =
    a && (a.utmSource || a.utmMedium || a.utmCampaign || a.referrer || a.landingPath);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title="Score"
        description={view.action ?? undefined}
        action={
          view.band ? <ToneBadge tone={bandTone(view.band)}>{view.band}</ToneBadge> : null
        }
      >
        {view.score == null ? (
          <EmptyInline>No score yet — there is nothing on file to score.</EmptyInline>
        ) : (
          <div className="space-y-1.5 px-3 py-2">
            <p className="telemetry text-subtle-foreground">Score {view.score} / 100</p>
            {view.reasons.length > 0 ? (
              <ul className="space-y-0.5">
                {view.reasons.map((reason) => (
                  <li key={reason} className="font-mono text-meta text-muted-foreground">
                    {reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-muted-foreground">
                Nothing has moved the score yet.
              </p>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Lead record" description="Stage, owner and the next follow-up">
        <MetaList
          items={[
            {
              label: "Stage",
              value: view.stage ? (
                <StatusPill registry="pipelineStage" value={view.stage} variant="dot" />
              ) : (
                "Not a client yet"
              ),
            },
            { label: "Owner", value: view.owner ?? "Nobody yet" },
            {
              label: "Next action",
              value: view.nextActionAt
                ? `${date(view.nextActionAt)}${view.nextActionNote ? ` — ${view.nextActionNote}` : ""}`
                : "None set",
            },
            ...(view.lostReason
              ? [
                  {
                    label: "Lost because",
                    value: `${statusOf("lostReason", view.lostReason).label}${view.lostNote ? ` — ${view.lostNote}` : ""}`,
                  },
                ]
              : []),
          ]}
        />
        {editor && <div className="border-t border-border-subtle px-3 py-3">{editor}</div>}
      </Panel>

      <Panel title="Qualification answers">
        {!q || (!q.situation && !q.budget && !q.timeline && !q.decisionRole) ? (
          <EmptyInline>
            They have not answered the qualification questions.
          </EmptyInline>
        ) : (
          <MetaList
            items={[
              {
                label: "Situation",
                value: q.situation ? statusOf("projectSituation", q.situation).label : null,
              },
              { label: "Budget", value: q.budget },
              {
                label: "Timeline",
                value: q.timeline ? statusOf("projectTimeline", q.timeline).label : null,
              },
              {
                label: "Decision",
                value: q.decisionRole ? statusOf("decisionRole", q.decisionRole).label : null,
              },
              { label: "Answered", value: q.qualifiedAt ? when(q.qualifiedAt) : null },
            ]}
          />
        )}
      </Panel>

      <Panel
        title="The call"
        action={
          view.meeting ? (
            <StatusPill registry="meetingStatus" value={view.meeting.status} variant="dot" />
          ) : null
        }
      >
        {!view.meeting ? (
          <EmptyInline>No call has been booked.</EmptyInline>
        ) : (
          <>
            <MetaList
              items={[
                {
                  label: "When",
                  value: `${date(view.meeting.scheduledDate)} · ${view.meeting.scheduledTime}`,
                },
              ]}
            />
            {brief ? (
              <MetaList
                className="border-t border-border-subtle"
                items={[
                  { label: "Today", hint: "What they run now", value: brief.current },
                  { label: "Change", hint: "What they want changed", value: brief.change },
                  { label: "Stakes", hint: "What it costs if nothing changes", value: brief.stakes },
                ]}
              />
            ) : (
              <p className="border-t border-border-subtle px-3 py-2 text-base text-muted-foreground">
                No pre-call brief was sent with this booking.
              </p>
            )}
          </>
        )}
      </Panel>

      <Panel title="Estimator">
        {view.estimate ? (
          <MetaList
            items={[
              {
                label: "Range shown",
                hint: "What the public estimator showed this visitor, not a stated budget",
                value: (
                  <span className="font-mono tabular-nums">
                    {money(view.estimate.min, "EGP", { compact: true })}–
                    {money(view.estimate.max, "EGP", { compact: true })}
                  </span>
                ),
              },
            ]}
          />
        ) : (
          <EmptyInline>No estimator run is linked to this lead.</EmptyInline>
        )}
      </Panel>

      <Panel title="Where they came from">
        {hasAttribution && a ? (
          <MetaList
            items={[
              { label: "UTM source", value: a.utmSource },
              { label: "UTM medium", value: a.utmMedium },
              { label: "UTM campaign", value: a.utmCampaign },
              {
                label: "Referrer",
                value: a.referrer ? <span className="break-all">{a.referrer}</span> : null,
              },
              {
                label: "Landing page",
                value: a.landingPath ? (
                  <span className="break-all font-mono text-meta">{a.landingPath}</span>
                ) : null,
              },
            ]}
          />
        ) : (
          <EmptyInline>No campaign, referrer or landing page was recorded.</EmptyInline>
        )}
      </Panel>
    </div>
  );
}
