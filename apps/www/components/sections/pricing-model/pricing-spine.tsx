import { Num } from "@/components/ui/num";
import { cn } from "@/lib/utils/utils";
import { SpineList } from "./spine-list";

export type SpineStageKind = "unknown" | "range" | "estimate" | "proposal";

export type SpineStage = {
  id: string;
  name: string;
  does: string;
  /** The small caption under the figure. */
  cap: string;
  /** Already worded by the schema (or the page's copy for the two ends). */
  figure: string;
  kind: SpineStageKind;
  /** The range this stage narrowed from, when it genuinely narrowed one. */
  was: string | null;
};

/**
 * 01 How pricing works: one project walked from requirements to the binding
 * figure, one stage per row on a vertical spine. Every figure comes from the
 * worked example the page computed from the resolved pricing; the estimate is
 * the one decision figure and the only one in brand blue.
 */
export function PricingSpine({
  stages,
  exampleLine,
  wasLabel,
}: {
  stages: readonly SpineStage[];
  exampleLine: string;
  wasLabel: string;
}) {
  return (
    <div>
      <p className="mb-10 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {exampleLine}
      </p>
      <SpineList className="list-none border-t-2 border-foreground">
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1;
          return (
            <li
              key={stage.id}
              data-spine-stage
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 border-b border-border-subtle py-9 md:grid-cols-[4.5rem_minmax(0,6fr)_minmax(0,5fr)] md:gap-x-8 md:py-12"
            >
              <div className="relative row-span-2 md:row-span-1">
                {/* The number sits beside the dot, off the rail, so the line
                    below never strikes through it. */}
                <span aria-hidden className="mt-2 flex items-center gap-1.5">
                  <span className="relative z-10 block size-[9px] shrink-0 rounded-full bg-foreground" />
                  <span className="text-xs leading-none tabular-nums text-muted-foreground ltr:font-mono">
                    <Num value={index + 1} pad={2} />
                  </span>
                </span>
                {!isLast ? (
                  <span
                    aria-hidden
                    data-spine-line
                    className="absolute start-[4px] top-[calc(0.5rem+9px)] bottom-[calc(-5rem-1px)] w-px origin-top bg-foreground/30 md:bottom-[calc(-6.5rem-1px)]"
                  />
                ) : null}
              </div>

              <div className="min-w-0">
                <h3 className="text-lg leading-snug text-foreground md:text-xl">
                  {stage.name}
                </h3>
                <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem]">
                  {stage.does}
                </p>
              </div>

              <div className="col-start-2 mt-5 flex min-w-0 flex-col items-start gap-2 md:col-start-3 md:row-start-1 md:mt-0 md:items-end md:text-end">
                {stage.was ? (
                  <span className="text-xs text-muted-foreground">
                    {wasLabel}{" "}
                    <span className="tabular-nums">{stage.was}</span>
                  </span>
                ) : null}
                <span
                  data-spine-settle
                  className={cn(
                    "block min-w-0",
                    stage.kind === "proposal"
                      ? "max-w-[24ch] text-base leading-snug text-foreground"
                      : "text-[clamp(1.25rem,2vw,1.75rem)] font-light leading-tight tabular-nums tracking-[-0.02em] rtl:tracking-normal",
                    stage.kind === "unknown" && "text-muted-foreground",
                    stage.kind === "range" && "text-foreground",
                    stage.kind === "estimate" && "text-brand-text",
                  )}
                >
                  {stage.figure}
                </span>
                <span
                  data-spine-settle
                  className={cn(
                    "text-xs leading-snug",
                    stage.kind === "proposal"
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {stage.cap}
                </span>
              </div>
            </li>
          );
        })}
      </SpineList>
    </div>
  );
}
