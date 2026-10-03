import { PROJECT_PHASE_ORDER, statusOf, toneText } from "@/lib/status";
import { dueLabel, daysFromNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Panel, PanelLink } from "@/components/os/panel";
import { EntityLink } from "@/components/os/entity-link";
import { EmptyInline } from "@/components/os/empty-state";
import { CountCell } from "@/components/today/count-cell";

type Launch = { id: string; name: string; targetLaunchDate: Date | null };
type Task = {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  project: { id: string; name: string };
};

/** Late is danger, inside three days is warning, anything further is quiet. */
function dueTone(value: Date | null) {
  const days = daysFromNow(value);
  if (days == null) return "text-muted-foreground";
  if (days < 0) return toneText.danger;
  if (days <= 3) return toneText.warning;
  return "text-muted-foreground";
}

/**
 * Today → delivery: where the active work sits, what is about to ship, and
 * which tasks are due this week. Late launches and overdue tasks are included
 * on purpose — they are the reason to open this panel.
 */
export function DeliveryPanel({
  byPhase,
  launches,
  launchCount,
  tasks,
  taskCount,
}: {
  byPhase: { phase: string; count: number }[];
  launches: Launch[];
  launchCount: number;
  tasks: Task[];
  taskCount: number;
}) {
  const counts = new Map(byPhase.map((row) => [row.phase, row.count]));
  const active = byPhase.reduce((sum, row) => sum + row.count, 0);

  return (
    <Panel
      title="Delivery"
      description={
        active === 0
          ? "No active project"
          : `${active} active project${active === 1 ? "" : "s"}`
      }
      action={<PanelLink href="/projects">Projects</PanelLink>}
    >
      {active === 0 ? (
        <EmptyInline>
          Nothing is in delivery. A project starts when a signed contract is turned into one.
        </EmptyInline>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {PROJECT_PHASE_ORDER.map((phase) => {
            const def = statusOf("projectPhase", phase);
            return (
              <CountCell
                key={phase}
                label={def.label}
                value={counts.get(phase) ?? 0}
                tone={def.tone}
                title={def.hint}
                href={`/projects?phase=${phase}`}
              />
            );
          })}
        </div>
      )}

      <div className="mt-3 grid gap-4 border-t border-border pt-3 md:grid-cols-2">
        <section aria-labelledby="today-launches">
          <h3 id="today-launches" className="telemetry mb-1.5 text-subtle-foreground">
            Launches · next 30 days
            {launchCount > launches.length && ` · ${launchCount}`}
          </h3>
          {launches.length === 0 ? (
            <p className="text-base text-muted-foreground">No launch is due in the next 30 days.</p>
          ) : (
            <ul className="space-y-1">
              {launches.map((p) => (
                <li key={p.id} className="flex items-baseline gap-2 text-base">
                  <EntityLink type="project" id={p.id} className="min-w-0 truncate">
                    {p.name}
                  </EntityLink>
                  <span
                    className={cn(
                      "ms-auto shrink-0 font-mono text-micro tabular-nums",
                      dueTone(p.targetLaunchDate),
                    )}
                  >
                    {dueLabel(p.targetLaunchDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="today-tasks">
          <h3 id="today-tasks" className="telemetry mb-1.5 text-subtle-foreground">
            Tasks due this week
            {taskCount > tasks.length && ` · ${taskCount}`}
          </h3>
          {tasks.length === 0 ? (
            <p className="text-base text-muted-foreground">No open task is due this week.</p>
          ) : (
            <ul className="space-y-1">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-baseline gap-2 text-base">
                  <EntityLink type="task" id={t.id} className="min-w-0 truncate">
                    {t.title}
                  </EntityLink>
                  <EntityLink
                    type="project"
                    id={t.project.id}
                    muted
                    className="hidden min-w-0 shrink truncate text-meta sm:inline"
                  >
                    {t.project.name}
                  </EntityLink>
                  <span
                    className={cn(
                      "ms-auto shrink-0 font-mono text-micro tabular-nums",
                      dueTone(t.dueDate),
                    )}
                  >
                    {dueLabel(t.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {taskCount > tasks.length && (
            <PanelLink href="/tasks">All {taskCount} due</PanelLink>
          )}
        </section>
      </div>
    </Panel>
  );
}
