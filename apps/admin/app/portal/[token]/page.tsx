import { Check, ExternalLink, Globe, Receipt } from "lucide-react";
import type { Metadata } from "next";

import { List, ListRow } from "@/components/os/list-row";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { loadPortalContact, loadProjectPortal } from "@/lib/client-portal";
import { date, money } from "@/lib/format";
import { PROJECT_PHASE_ORDER, statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";

import { CopyLinkButton } from "./copy-link-button";
import { PortalInvalid, PortalShell } from "./portal-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project portal",
  robots: { index: false, follow: false },
};

export default async function ProjectPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [view, contact] = await Promise.all([loadProjectPortal(token), loadPortalContact()]);

  if (!view) return <PortalInvalid kind="project" contact={contact} />;

  const phaseIndex = (PROJECT_PHASE_ORDER as readonly string[]).indexOf(view.phase);
  const launched = view.actualLaunchDate !== null;
  const outstanding = view.scheduleTotal - view.paidTotal;

  const launchLine = launched
    ? `Launched ${date(view.actualLaunchDate)}`
    : view.targetLaunchDate
      ? `Target launch ${date(view.targetLaunchDate)}`
      : null;

  return (
    <PortalShell
      kind="project"
      title={view.clientName}
      subtitle={
        <>
          Status of <span className="font-medium text-foreground">{view.projectName}</span>
          {launchLine && <> · {launchLine}</>}
        </>
      }
      trailing={
        <>
          <StatusPill registry="projectPhase" value={view.phase} />
          {view.status !== "ACTIVE" && <StatusPill registry="projectStatus" value={view.status} />}
          <CopyLinkButton />
        </>
      }
      contact={contact}
      contactSubject={`About ${view.projectName}`}
    >
      {(view.stagingUrl || view.liveUrl) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {view.stagingUrl && (
            <PortalLink
              href={view.stagingUrl}
              eyebrow="Preview"
              label="Staging build"
              icon={<ExternalLink aria-hidden />}
            />
          )}
          {view.liveUrl && (
            <PortalLink
              href={view.liveUrl}
              eyebrow="Production"
              label="Live site"
              icon={<Globe aria-hidden />}
            />
          )}
        </div>
      )}

      <Panel
        title="Where the project is"
        description={
          phaseIndex === -1
            ? undefined
            : `Phase ${phaseIndex + 1} of ${PROJECT_PHASE_ORDER.length}`
        }
      >
        <ol className="relative space-y-4 before:absolute before:inset-y-2 before:start-3 before:w-px before:bg-border">
          {PROJECT_PHASE_ORDER.map((phase, i) => {
            const def = statusOf("projectPhase", phase);
            const done = phaseIndex > i;
            const active = phaseIndex === i;
            return (
              <li key={phase} className="relative flex items-start gap-3">
                <span
                  className={cn(
                    "z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-meta font-medium",
                    done && "border-success bg-success text-white",
                    active && "border-brand bg-brand text-brand-foreground",
                    !done && !active && "border-border-subtle bg-background text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span
                    className={cn(
                      "block text-base",
                      active ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {def.label}
                    {active && <span className="sr-only"> (current phase)</span>}
                  </span>
                  {active && (
                    <span className="block text-meta text-muted-foreground">
                      {phase === "STAGING_REVIEW"
                        ? "Waiting on your sign-off of the staging build"
                        : "In progress now"}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel
        title="Payment schedule"
        description={
          view.payments.length === 0
            ? undefined
            : `${money(view.paidTotal, view.currency)} paid · ${money(outstanding, view.currency)} outstanding`
        }
        flush
      >
        {view.payments.length === 0 ? (
          <p className="p-3 text-base text-muted-foreground">
            No payments are scheduled yet. The schedule appears here once the agreement is signed.
          </p>
        ) : (
          <List label="Payments">
            {view.payments.map((payment) => {
              const milestone = statusOf("paymentMilestone", payment.milestone);
              const status = statusOf("paymentStatus", payment.status);
              return (
                <ListRow
                  key={payment.id}
                  icon={<Receipt />}
                  tone={status.tone === "info" ? "neutral" : status.tone}
                  title={milestone.label}
                  meta={
                    <>
                      {payment.paidAt ? (
                        <span>Paid {date(payment.paidAt)}</span>
                      ) : payment.dueDate ? (
                        <span>Due {date(payment.dueDate)}</span>
                      ) : (
                        <span>No due date yet</span>
                      )}
                    </>
                  }
                  trailing={
                    <>
                      <span className="tabular-nums text-foreground">
                        {money(payment.amount, view.currency)}
                      </span>
                      <StatusPill registry="paymentStatus" value={payment.status} />
                    </>
                  }
                />
              );
            })}
          </List>
        )}
      </Panel>
    </PortalShell>
  );
}

function PortalLink({
  href,
  eyebrow,
  label,
  icon,
}: {
  href: string;
  eyebrow: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="plane group flex min-h-11 items-center justify-between gap-3 p-4 no-underline transition-colors duration-[var(--dur-state)] hover:border-border-strong"
    >
      <span className="min-w-0">
        <span className="telemetry block text-subtle-foreground">{eyebrow}</span>
        <span className="mt-0.5 block text-base font-semibold text-foreground">{label}</span>
      </span>
      <span className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground [&_svg]:size-4">
        {icon}
      </span>
    </a>
  );
}
