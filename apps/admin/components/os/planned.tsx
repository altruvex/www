import * as React from "react";
import Link from "next/link";
import { ArrowRight, Construction } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";

/**
 * The honesty valve.
 *
 * Modules in the IA that have no Prisma model behind them render THIS instead
 * of a screen full of invented clients. It states what the module does, what
 * must exist before it can be built, and where the work currently happens.
 * A fake dashboard is worse than an empty one: it teaches the operator to trust
 * numbers that are not real.
 */
export function PlannedModule({
  title,
  blurb,
  purpose,
  blockedBy,
  today,
  crumbs,
}: {
  title: string;
  blurb: string;
  purpose: string[];
  blockedBy: string[];
  today?: { label: string; href: string };
  crumbs?: { label: string; href?: string }[];
}) {
  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        crumbs={crumbs}
        description={blurb}
        status={
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-1.5 py-0.5 text-meta text-muted-foreground">
            <Construction className="size-3" />
            Planned
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="What this module will do">
          <ul className="space-y-2">
            {purpose.map((line) => (
              <li key={line} className="flex gap-2 text-base text-muted-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-border-strong" aria-hidden />
                <span className="text-foreground">{line}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Blocked by"
          description="This screen stays empty until these exist"
        >
          <ul className="space-y-2">
            {blockedBy.map((line) => (
              <li key={line} className="flex gap-2 text-base">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-warning" aria-hidden />
                <span className="text-foreground">{line}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {today && (
        <Panel title="Where this happens today">
          <Link
            href={today.href}
            className="inline-flex items-center gap-1.5 text-base text-brand hover:underline"
          >
            {today.label}
            <ArrowRight className="size-3.5" />
          </Link>
        </Panel>
      )}
    </div>
  );
}
