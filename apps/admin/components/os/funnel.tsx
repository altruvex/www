import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toneDot, type Tone } from "@/lib/status";

/**
 * Horizontal stage bars. Chosen over a funnel chart on purpose: the funnel
 * shape encodes the same number twice (width AND position) and makes small
 * stages unreadable. A labelled bar with the count at the end is scannable and
 * survives dark mode, greyscale and a phone (docs/design-principles.md C4).
 */
export function FunnelBars({
  stages,
  hrefBase,
}: {
  stages: { id: string; label: string; count: number; tone: Tone }[];
  hrefBase?: string;
}) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  const total = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-1.5">
      {stages.map((stage) => {
        const pct = total ? Math.round((stage.count / total) * 100) : 0;
        const row = (
          <>
            <span className="flex w-28 shrink-0 items-center gap-1.5 text-meta text-muted-foreground">
              <span className={cn("size-1.5 shrink-0 rounded-full", toneDot[stage.tone])} aria-hidden />
              <span className="truncate">{stage.label}</span>
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span
                className={cn("block h-full rounded-full", toneDot[stage.tone])}
                style={{ width: `${(stage.count / max) * 100}%` }}
              />
            </span>
            <span className="flex w-[4.5rem] shrink-0 items-baseline justify-end gap-1.5 font-mono text-micro tabular-nums text-foreground">
              {stage.count}
              <span className="w-8 text-end text-subtle-foreground">{pct}%</span>
            </span>
          </>
        );
        return hrefBase ? (
          <Link
            key={stage.id}
            href={`${hrefBase}${stage.id}`}
            className="-mx-1 flex items-center gap-2 rounded-sm px-1 py-0.5 transition-colors duration-[var(--dur-state)] hover:bg-surface"
          >
            {row}
          </Link>
        ) : (
          <div key={stage.id} className="flex items-center gap-2 py-0.5">
            {row}
          </div>
        );
      })}
    </div>
  );
}
