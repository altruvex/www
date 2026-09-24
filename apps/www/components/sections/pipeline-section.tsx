"use client";

import { Container } from "@/components/shared/container";
import {
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { Fragment, useRef, useState } from "react";
import { SectionHeading } from "./section-heading";

type StageStatus = "queued" | "running" | "done";

interface Stage {
  id: string;
  key: string;
  desc: string;
  dur: [number, number];
  parallel?: boolean;
  logs: string[];
}

const STAGES: Stage[] = [
  {
    id: "01",
    key: "DISCOVERY",
    desc: "Requirements locked, scope defined",
    dur: [800, 1200],
    logs: [
      "[info] Scanning stakeholder requirements",
      "[info] Auditing existing systems",
      "[ok]   Scope document finalised - 14 constraints identified",
    ],
  },
  {
    id: "02",
    key: "ARCHITECTURE",
    desc: "Service boundaries, API contracts set",
    dur: [900, 1400],
    logs: [
      "[info] Defining service boundaries",
      "[info] Generating OpenAPI schemas",
      "[ok]   Data contracts locked - 6 services mapped",
    ],
  },
  {
    id: "03",
    key: "DEVELOPMENT",
    desc: "Iterative build, CI enforced",
    dur: [1000, 1600],
    parallel: true,
    logs: [
      "[info] Sprint 1 initiated - 24 tickets",
      "[info] CI pipeline active",
      "[warn] Coverage threshold: 82% (target 90%)",
      "[ok]   Build passing - 3 sprints complete",
    ],
  },
  {
    id: "04",
    key: "TESTING",
    desc: "Unit · integration · load coverage",
    dur: [800, 1300],
    parallel: true,
    logs: [
      "[info] Unit suite: 847 tests",
      "[info] Integration: 134 scenarios",
      "[ok]   Load test passed - p99: 142 ms",
    ],
  },
  {
    id: "05",
    key: "DEPLOYMENT",
    desc: "Blue-green release, rollback armed",
    dur: [700, 1100],
    logs: [
      "[info] Provisioning blue environment",
      "[info] Health checks passing",
      "[ok]   Traffic shifted - zero downtime",
    ],
  },
  {
    id: "06",
    key: "SCALE",
    desc: "Observability live, auto-scaling active",
    dur: [600, 1000],
    logs: [
      "[info] Dashboards provisioned",
      "[info] Tracing enabled across 6 services",
      "[ok]   Auto-scaling policies active",
    ],
  },
];

const EMPTY_TIME = "--:--:--";

/* One accent marks "active"; semantic tokens mark the log verdicts. The
   six per-stage RGB colours this replaced sat outside the token system and
   did not track dark mode. */
const LOG_TAG_TONE: Record<string, string> = {
  "[ok]": "text-success",
  "[warn]": "text-warning",
};

function nowStr() {
  return new Date().toTimeString().slice(0, 8);
}

function jitter(stage: Stage) {
  return stage.dur[0] + Math.random() * (stage.dur[1] - stage.dur[0]);
}

function LogLine({ line }: { line: string }) {
  const match = /^(\[\w+\])\s*(.*)$/.exec(line);
  const tag = match?.[1] ?? "";
  const text = match?.[2] ?? line;

  return (
    <div className="flex items-start gap-2 text-xs leading-relaxed">
      <span
        className={cn(
          "w-12 shrink-0",
          LOG_TAG_TONE[tag] ?? "text-muted-foreground",
        )}
      >
        {tag}
      </span>
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}

export function PipelineSection() {
  const [statuses, setStatuses] = useState<StageStatus[]>(
    STAGES.map(() => "queued"),
  );
  const [times, setTimes] = useState<string[]>(STAGES.map(() => EMPTY_TIME));
  const [expanded, setExpanded] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [footerMsg, setFooterMsg] = useState("awaiting trigger");

  const runningRef = useRef(false);
  const t = useTranslations("pipeline");
  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();
  const frameRef = useSectionElement<HTMLDivElement>();

  const doneCount = statuses.filter((s) => s === "done").length;
  const statusLabel = complete ? "complete" : running ? "running" : "idle";

  const setStageStatus = (i: number, status: StageStatus) => {
    setStatuses((prev) => prev.map((s, j) => (j === i ? status : s)));
    if (status !== "queued") {
      const ts = nowStr();
      setTimes((prev) => prev.map((s, j) => (j === i ? ts : s)));
    }
  };

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const reset = () => {
    setStatuses(STAGES.map(() => "queued"));
    setTimes(STAGES.map(() => EMPTY_TIME));
    setExpanded(null);
    setComplete(false);
    setRunning(false);
    setFooterMsg("awaiting trigger");
    runningRef.current = false;
  };

  const execute = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setComplete(false);
    setStatuses(STAGES.map(() => "queued"));
    setTimes(STAGES.map(() => EMPTY_TIME));

    setStageStatus(0, "running");
    setFooterMsg("discovery in progress");
    await sleep(jitter(STAGES[0]));
    setStageStatus(0, "done");

    setStageStatus(1, "running");
    setFooterMsg("architecture phase");
    await sleep(jitter(STAGES[1]));
    setStageStatus(1, "done");

    setStageStatus(2, "running");
    setStageStatus(3, "running");
    setFooterMsg("build ∥ test running in parallel");
    await Promise.all([
      sleep(jitter(STAGES[2])).then(() => setStageStatus(2, "done")),
      sleep(jitter(STAGES[3])).then(() => setStageStatus(3, "done")),
    ]);

    setStageStatus(4, "running");
    setFooterMsg("deploying to production");
    await sleep(jitter(STAGES[4]));
    setStageStatus(4, "done");

    setStageStatus(5, "running");
    setFooterMsg("enabling observability");
    await sleep(jitter(STAGES[5]));
    setStageStatus(5, "done");

    setFooterMsg("all services deployed");
    setComplete(true);
    setRunning(false);
    runningRef.current = false;
  };

  return (
    <section
      id="pipeline"
      aria-labelledby="pipeline-heading"
      className="accent-world-blue bg-surface pt-(--section-y-top) pb-(--section-y-bottom) transition-colors duration-(--motion-drawer) dark:bg-background"
    >
      <Container>
        <SectionHeading
          titleId="pipeline-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleAccent")}
          accent="world"
          description={t("description")}
          className="mb-10 md:mb-14"
        />

        <div
          ref={frameRef}
          dir="ltr"
          className="overflow-hidden rounded-panel-sm border border-border-subtle bg-background font-mono text-sm dark:bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              system.build.pipeline / example
            </span>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-xs tabular-nums tracking-wider text-muted-foreground">
                <span className="font-medium text-foreground">{doneCount}</span>
                /{STAGES.length} deployed
              </span>
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-widest transition-colors duration-(--motion-drawer)",
                  complete
                    ? "text-success"
                    : running
                      ? "text-local-accent-text"
                      : "text-muted-foreground",
                )}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          {STAGES.map((stage, i) => {
            const status = statuses[i];
            const isExp = expanded === i;
            const isRunning = status === "running";
            const isDone = status === "done";
            const isActive = isRunning || isDone;

            return (
              <Fragment key={stage.id}>
                <button
                  type="button"
                  aria-expanded={isExp}
                  onClick={() => setExpanded(isExp ? null : i)}
                  className={cn(
                    "relative grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-2.5 border-b border-border-subtle/60 px-4 py-3.5 text-start transition-colors duration-(--motion-drawer) hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-local-accent sm:gap-3 lg:grid-cols-[84px_196px_1fr_104px] lg:gap-3.5",
                    isExp && "bg-muted/40",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-y-0 start-0 w-0.5 bg-local-accent transition-opacity duration-(--motion-drawer)",
                      isActive || isExp ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span
                    className={cn(
                      "hidden pt-px text-xs tabular-nums tracking-wider transition-colors duration-(--motion-drawer) lg:block",
                      isActive
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60",
                    )}
                  >
                    {times[i]}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 self-start whitespace-nowrap pt-px text-xs font-semibold uppercase tracking-widest transition-colors duration-(--motion-drawer)",
                      isRunning
                        ? "text-local-accent-text"
                        : isDone
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    <span className="font-normal opacity-60">[{stage.id}]</span>
                    <span className="hidden sm:inline">{stage.key}</span>
                    <span className="sm:hidden">{stage.key.slice(0, 4)}</span>
                    {stage.parallel ? (
                      <span className="hidden rounded-ctl-xs border border-border-subtle px-1 text-[10px] font-normal text-muted-foreground sm:inline">
                        ||
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "pt-px text-[13px] leading-relaxed tracking-wide transition-colors duration-(--motion-drawer)",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {stage.desc}
                  </span>
                  <span
                    className={cn(
                      "flex items-center justify-end gap-2 self-start pt-0.5 text-xs font-semibold uppercase tracking-widest transition-colors duration-(--motion-drawer)",
                      isRunning
                        ? "text-local-accent-text"
                        : isDone
                          ? "text-foreground/70"
                          : "text-muted-foreground",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 shrink-0 rounded-full transition-colors duration-(--motion-drawer)",
                        isRunning
                          ? "bg-local-accent motion-safe:animate-pulse"
                          : isDone
                            ? "bg-local-accent/60"
                            : "bg-foreground/20",
                      )}
                    />
                    <span className="hidden sm:inline">{status}</span>
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-[max-height,opacity] duration-(--motion-drawer) ease-default motion-reduce:transition-none"
                  style={{
                    maxHeight: isExp ? "300px" : "0px",
                    opacity: isExp ? 1 : 0,
                  }}
                >
                  {/* Simulated log flavour text — decorative, so hidden from AT. */}
                  <div
                    aria-hidden="true"
                    className="space-y-1 border-b border-border-subtle/60 bg-muted/40 px-4 py-3"
                  >
                    {stage.logs.map((line) => (
                      <LogLine key={line} line={line} />
                    ))}
                  </div>
                </div>
              </Fragment>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span
              aria-live="polite"
              className={cn(
                "text-xs font-medium uppercase tracking-widest transition-colors duration-(--motion-fast)",
                complete ? "text-success" : "text-muted-foreground",
              )}
            >
              {footerMsg}
            </span>
            <button
              type="button"
              disabled={running}
              onClick={complete ? reset : execute}
              className={cn(
                "inline-flex min-h-9 cursor-pointer items-center rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-(--motion-instant) disabled:cursor-not-allowed disabled:opacity-40 pointer-coarse:min-h-11",
                complete
                  ? "border-success/40 text-success hover:bg-success/5"
                  : "border-border-subtle text-foreground hover:bg-muted",
              )}
            >
              {complete ? "↺ Re-Execute" : running ? "Running…" : "▶ Execute"}
            </button>
          </div>
        </div>
        {/* The run is a demonstration of the pipeline's shape; its counts and
            latencies are not measured on a client project, so it says so. */}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {t("exampleNote")}
        </p>
      </Container>
    </section>
  );
}
