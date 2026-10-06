import Link from "next/link";
import { CalendarClock, ListChecks } from "lucide-react";
import { PROJECT_PHASE_ORDER, statusOf, toneDot, toneText } from "@/lib/status";
import { dueLabel, daysFromNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Panel, PanelLink } from "@/components/os/panel";
import { List, ListRow } from "@/components/os/list-row";
import { EmptyInline } from "@/components/os/empty-state";
import { PickToOpen, type PickOption } from "@/components/os/pick-to-open";
import { Button } from "@repo/ui";

type Launch = { id: string; name: string; targetLaunchDate: Date | null };
type Task = {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  project: { id: string; name: string };
};

export interface ActiveWorkProps {
  byPhase: { phase: string; count: number }[];
  launches: Launch[];
  launchCount: number;
  tasks: Task[];
  taskCount: number;
  /** Signed contracts with no project yet; each opens its Delivery section. */
  startable?: PickOption[];
  /** The operator may record a project by hand. */
  canRecord?: boolean;
}

function dueTone(value: Date | null) {
  const days = daysFromNow(value);
  if (days == null) return "neutral" as const;
  if (days < 0) return "danger" as const;
  if (days <= 3) return "warning" as const;
  return "neutral" as const;
}

export function ActiveWork({
  byPhase,
  launches,
  launchCount,
  tasks,
  taskCount,
  startable = [],
  canRecord = false,
}: ActiveWorkProps) {
  const counts = new Map(byPhase.map((row) => [row.phase, row.count]));
  const active = byPhase.reduce((sum, row) => sum + row.count, 0);

  return (
    <Panel
      title="Active work"
      description={active === 0 ? "No active project" : `${active} active project${active === 1 ? "" : "s"}`}
      action={<PanelLink href="/projects">Projects</PanelLink>}
      flush
    >
      {active === 0 ? (
        <EmptyInline
          action={
            startable.length > 0 ? (
              <PickToOpen
                label="Start a project"
                size="sm"
                options={startable}
                searchPlaceholder="Search signed contracts"
                footer={canRecord ? { href: "/projects?new=recorded", label: "Record a project by hand" } : undefined}
              />
            ) : canRecord ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/projects?new=recorded">Record a project</Link>
              </Button>
            ) : null
          }
        >
          Nothing is in delivery. A project starts when a signed contract is turned into one on its contract page
          {startable.length > 0
            ? ` — ${startable.length} signed contract${startable.length === 1 ? " is" : "s are"} waiting.`
            : "."}
        </EmptyInline>
      ) : (
        <ul aria-label="Active projects by phase" className="flex flex-wrap gap-1.5 px-3 py-2.5">
          {PROJECT_PHASE_ORDER.filter((phase) => (counts.get(phase) ?? 0) > 0).map((phase) => {
            const def = statusOf("projectPhase", phase);
            return (
              <li key={phase}>
                <Link
                  href={`/projects?phase=${phase}`}
                  className="inline-flex h-[var(--control-h-sm)] items-center gap-1.5 rounded-ctl-sm border border-border-subtle px-2 text-meta text-muted-foreground no-underline transition-colors duration-[var(--dur-state)] hover:border-border-mid hover:text-foreground"
                >
                  <span className={cn("size-1.5 rounded-full", toneDot[def.tone])} aria-hidden />
                  {def.label}
                  <span className="font-mono tabular-nums text-foreground">{counts.get(phase)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <section aria-labelledby="today-launches" className="border-t border-border-subtle">
        <h3 id="today-launches" className="telemetry px-3 pt-2.5 pb-1 text-subtle-foreground">
          Launches · next 30 days{launchCount > launches.length && ` · ${launchCount}`}
        </h3>
        {launches.length === 0 ? (
          <p className="px-3 pb-2.5 text-base text-muted-foreground">No launch is due in the next 30 days.</p>
        ) : (
          <List label="Launches in the next 30 days">
            {launches.map((p) => {
              const tone = dueTone(p.targetLaunchDate);
              return (
                <ListRow
                  key={p.id}
                  dense
                  href={`/projects/${p.id}`}
                  icon={<CalendarClock />}
                  tone={tone}
                  title={p.name}
                  trailing={
                    <span className={cn("font-mono text-micro tabular-nums", tone !== "neutral" && toneText[tone])}>
                      {dueLabel(p.targetLaunchDate)}
                    </span>
                  }
                />
              );
            })}
          </List>
        )}
      </section>

      <section aria-labelledby="today-tasks" className="border-t border-border-subtle">
        <h3 id="today-tasks" className="telemetry px-3 pt-2.5 pb-1 text-subtle-foreground">
          Tasks due this week{taskCount > tasks.length && ` · ${taskCount}`}
        </h3>
        {tasks.length === 0 ? (
          <p className="px-3 pb-2.5 text-base text-muted-foreground">No open task is due this week.</p>
        ) : (
          <List label="Tasks due this week">
            {tasks.map((t) => {
              const tone = dueTone(t.dueDate);
              return (
                <ListRow
                  key={t.id}
                  dense
                  href={`/tasks?task=${t.id}`}
                  icon={<ListChecks />}
                  tone={tone}
                  title={t.title}
                  meta={t.project.name}
                  trailing={
                    <span className={cn("font-mono text-micro tabular-nums", tone !== "neutral" && toneText[tone])}>
                      {dueLabel(t.dueDate)}
                    </span>
                  }
                />
              );
            })}
          </List>
        )}
        {taskCount > tasks.length && (
          <div className="border-t border-border-subtle px-3 py-2">
            <PanelLink href="/tasks">All {taskCount} due</PanelLink>
          </div>
        )}
      </section>
    </Panel>
  );
}
