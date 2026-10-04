import { Num } from "@/components/ui/num";
import { cn } from "@/lib/utils/utils";
import { SpineList } from "./spine-list";
import { BODY, FIGURE, FIGURE_INLINE, FIGURE_KEY, LABEL, SUBHEAD } from "./type";

export type SpineStageKind = "unknown" | "range" | "estimate" | "proposal";

export type SpineStage = {
  id: string;
  name: string;
  does: string;
  cap: string;
  figure: string;
  kind: SpineStageKind;
  was: string | null;
};

function splitExampleLine(line: string) {
  const [head, rest] = line.split(" — ");
  if (!rest) return null;
  const inputs = rest.split(" · ").filter(Boolean);
  return inputs.length > 1 ? { head, inputs } : null;
}

export function PricingSpine({
  stages,
  exampleLine,
  wasLabel,
}: {
  stages: readonly SpineStage[];
  exampleLine: string;
  wasLabel: string;
}) {
  const example = splitExampleLine(exampleLine);

  return (
    <div className="grid gap-(--section-block) min-[1000px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="self-start min-[1000px]:sticky min-[1000px]:top-28">
        {example ? (
          <>
            <p className={LABEL}>{example.head}</p>
            <ul className="mt-6 grid list-none gap-4">
              {example.inputs.map((input) => (
                <li key={input} className={FIGURE_INLINE}>
                  {input}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className={cn(BODY, "max-w-[40ch]")}>{exampleLine}</p>
        )}
      </aside>

      <SpineList className="grid list-none gap-(--stage-gap) [--stage-gap:clamp(5rem,min(11vh,7.7vw),8rem)] max-[759px]:[--stage-gap:3.5rem]">
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1;
          const isKey = stage.kind === "estimate";
          return (
            <li
              key={stage.id}
              data-spine-stage
              className="relative grid gap-5 ps-14"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute start-0 top-3.5 block size-[13px] rounded-full",
                  isKey
                    ? "bg-brand ring-6 ring-brand/15"
                    : "border-[1.5px] border-foreground/60",
                )}
              />
              {!isLast ? (
                <span
                  aria-hidden
                  data-spine-line
                  className="absolute start-[6px] top-[calc(0.875rem+13px+0.375rem)] bottom-[calc(0.875rem-0.375rem-var(--stage-gap))] w-px origin-top bg-foreground/30"
                />
              ) : null}

              <div className="min-w-0">
                <span className={cn(LABEL, "block tabular-nums")}>
                  <Num value={index + 1} pad={2} />
                </span>
                <h3 className={cn(SUBHEAD, "mt-2.5")}>{stage.name}</h3>
                <p className={cn(BODY, "mt-3.5 max-w-[40ch]")}>{stage.does}</p>
              </div>

              <div className="grid min-w-0 justify-items-start gap-2">
                {stage.was ? (
                  <span className={LABEL}>
                    {wasLabel} <span className="tabular-nums">{stage.was}</span>
                  </span>
                ) : null}
                <span
                  data-spine-settle
                  className={cn(
                    "block min-w-0",
                    isKey ? FIGURE_KEY : FIGURE,
                    stage.kind === "unknown" && "text-muted-foreground",
                  )}
                >
                  {stage.figure}
                </span>
                <span
                  data-spine-settle
                  className={cn(LABEL, isKey && "font-medium text-foreground")}
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
