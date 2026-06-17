"use client";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { MOTION, useSectionDescription, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { useTranslations } from "next-intl";
import React, { useEffect, useRef, useState } from "react";

/* Stage colors as RGB triplets for rgba() interpolation.
   Values match design tokens: brand indigo, success, warning, info, violet, emerald */
const STAGE_COLORS = [
  "80,  71, 229",
  "5,  150, 105",
  "217, 119,   6",
  "96,  165, 250",
  "167, 139, 250",
  "52,  211, 153",
] as const;

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

function nowStr() {
  return new Date().toTimeString().slice(0, 8);
}

function jitter(stage: Stage) {
  return stage.dur[0] + Math.random() * (stage.dur[1] - stage.dur[0]);
}

export function PipelineSection() {
  const [statuses, setStatuses] = useState<StageStatus[]>(
    STAGES.map(() => "queued"),
  );
  const [times, setTimes] = useState<string[]>(STAGES.map(() => "--:--:--"));
  const [expanded, setExpanded] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [footerMsg, setFooterMsg] = useState("awaiting trigger");
  const [revealed, setRevealed] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const runningRef = useRef(false);
  const t = useTranslations("pipeline");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setRevealed(true);
      },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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
    setTimes(STAGES.map(() => "-- : -- : --"));
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
    setTimes(STAGES.map(() => "--:--:--"));

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

  const dur = (n: number) => `${Math.round(n * 1000)}ms`;
  const ease = MOTION.ease.smooth;

  return (
    <>
      <style>{`
        @keyframes pl-ring {
          0%   { transform: scale(1);   opacity: .65; }
          70%  { transform: scale(2.5); opacity: 0;   }
          100% { transform: scale(2.5); opacity: 0;   }
        }
        @keyframes pl-breathe {
          0%,100% { opacity: 1;   }
          50%     { opacity: .3;  }
        }
        @keyframes pl-blink {
          0%,100% { opacity: 1; }
          50%     { opacity: 0; }
        }
        @keyframes pl-scan {
          0%   { transform: translateX(-100%); opacity: 0;  }
          8%   { opacity: 1;                                }
          92%  { opacity: 1;                                }
          100% { transform: translateX(200%);  opacity: 0;  }
        }
        @keyframes pl-line-in {
          from { opacity: 0; transform: translateX(-5px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes pl-row-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes pl-bar-in {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }

        .pl-breathe  { animation: pl-breathe  1.2s ease-in-out infinite; }
        .pl-blink    { animation: pl-blink    1.1s step-end    infinite; }
        .pl-scan     { animation: pl-scan     2.4s linear      infinite; }
        .pl-log-line { animation: pl-line-in  .28s ease both; }
        .pl-bar-in   { transform-origin: top; animation: pl-bar-in .32s cubic-bezier(.22,1,.36,1) both; }
        
        .pl-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 10px;
        }
        .pl-col-ts     { display: none; }
        .pl-col-stage  { display: flex;  }

        @media (min-width: 640px) {
          .pl-row    { gap: 12px; }
        }
        @media (min-width: 1024px) {
          .pl-row {
            grid-template-columns: 84px 196px 1fr 104px;
            gap: 14px;
          }
          .pl-col-ts { display: block; }
        }
      `}</style>

      <section
        ref={sectionRef}
        id="pipeline"
        className="accent-world-green font-mono text-sm leading-normal tracking-wider pt-(--section-y-top) pb-(--section-y-bottom) bg-surface dark:bg-background transition-colors duration-300"
      >
        <Container>
          <Eyebrow
            className="text-muted-foreground/60 transition-[opacity,transform] mb-3"
            ref={eyebrowRef}
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(6px)",
              transitionDuration: dur(MOTION.duration.base),
              transitionTimingFunction: ease,
            }}
          >
            {t("eyebrow")}
          </Eyebrow>

          <h2
            ref={titleRef}
            className="font-sans font-light leading-[1.06] transition-[opacity,transform] text-[clamp(2.125rem,4vw,3.25rem)] tracking-tight text-foreground mb-8"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(10px)",
              transitionDuration: dur(MOTION.duration.text),
              transitionDelay: dur(MOTION.duration.micro),
              transitionTimingFunction: ease,
            }}
          >
            {t("title")}
            <br />
            <span className="font-serif font-light rtl:font-sans rtl:not-italic rtl:font-bold italic text-muted-foreground">
              {t("titleItalic")}
            </span>
            <p
              ref={descRef}
              className="text-[clamp(1.0625rem,1.05vw,1.125rem)] text-muted-foreground max-w-md leading-relaxed mt-4 font-sans tracking-normal"
            >
              {t("description")}
            </p>
          </h2>

          {/* PIPELINE CARD */}
          <div
            dir="ltr"
            className="transition-[opacity,transform] overflow-hidden rounded-xl border border-border dark:border-white/10 bg-background dark:bg-card shadow-card dark:shadow-none"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(16px)",
              transitionDuration: dur(MOTION.duration.base),
              transitionDelay: dur(MOTION.duration.fast),
              transitionTimingFunction: ease,
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-b border-black/5 dark:border-white/10 bg-black/2 dark:bg-transparent">
              <span className="font-mono text-xs font-semibold leading-normal tracking-widest uppercase text-muted-foreground">
                system.build.pipeline / production
              </span>
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-sm tracking-widest text-muted-foreground">
                  <span
                    className="inline-block transition-transform duration-300 text-foreground font-medium"
                    style={{ transform: doneCount > 0 ? "scale(1.1)" : "scale(1)" }}
                  >
                    {doneCount}
                  </span>
                  /6 deployed
                </span>
                <span
                  className="transition-colors duration-300 font-mono text-xs leading-normal tracking-widest uppercase font-semibold"
                  style={{
                    color: complete
                      ? `rgb(${STAGE_COLORS[1]})`
                      : running
                        ? `rgb(${STAGE_COLORS[2]})`
                        : "currentColor",
                    opacity: complete || running ? 1 : 0.5,
                  }}
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
              const color = STAGE_COLORS[i];

              return (
                <React.Fragment key={stage.id}>
                  <div
                    className="pl-row relative items-start cursor-pointer overflow-hidden transition-all duration-300 border-b border-black/5 dark:border-white/5 px-4 py-3.5 hover:bg-black/2 dark:hover:bg-white/2"
                    style={{
                      backgroundColor: isExp
                        ? `rgba(${color},.04)`
                        : isRunning
                          ? `rgba(${color},.02)`
                          : "transparent",
                      animation: revealed
                        ? `pl-row-in ${dur(MOTION.duration.fast)} cubic-bezier(.22,1,.36,1) ${dur(i * 0.065)} both`
                        : "none",
                    }}
                    onClick={() => setExpanded(isExp ? null : i)}
                  >
                    {isRunning && (
                      <div
                        className="pl-scan pointer-events-none absolute inset-0"
                        style={{
                          background: `linear-gradient(90deg, transparent, rgba(${color},.05), transparent)`,
                          width: "40%",
                        }}
                      />
                    )}
                    <div
                      className="absolute inset-y-0 left-0 transition-opacity duration-300"
                      style={{
                        width: "3px",
                        backgroundColor: `rgb(${color})`,
                        opacity: isActive || isExp ? 1 : 0,
                        animation: isActive || isExp ? "pl-bar-in .32s cubic-bezier(.22,1,.36,1) both" : "none",
                      }}
                    />
                    
                    <span
                      className="pl-col-ts tabular-nums transition-colors duration-300 text-[11.5px] tracking-wider pt-px"
                      style={{ color: isActive ? `rgba(${color},.6)` : "currentColor", opacity: isActive ? 1 : 0.4 }}
                    >
                      {times[i]}
                    </span>

                    <span
                      className="pl-col-stage items-center gap-1.5 transition-colors duration-300 self-start text-[11.5px] tracking-widest uppercase font-semibold whitespace-nowrap pt-px"
                      style={{ color: isActive ? `rgb(${color})` : "currentColor", opacity: isActive ? 1 : 0.5 }}
                    >
                      <span className="opacity-50 font-normal">[{stage.id}]</span>
                      <span className="hidden sm:inline">{stage.key}</span>
                      <span className="sm:hidden">{stage.key.slice(0, 4)}</span>
                      {stage.parallel && (
                        <span
                          className="text-xs border px-1 py-px hidden sm:inline rounded-sm"
                          style={{
                            color: `rgba(${color},.7)`,
                            borderColor: `rgba(${color},.3)`,
                          }}
                        >
                          ||
                        </span>
                      )}
                    </span>

                    <span
                      className="transition-colors duration-300 text-sm sm:text-[13px] leading-relaxed tracking-wide pt-px"
                      style={{ color: isActive ? "var(--foreground)" : "var(--muted-foreground)" }}
                    >
                      {stage.desc}
                    </span>

                    <span
                      className="flex items-center gap-2 transition-colors duration-300 self-start justify-end text-sm tracking-widest uppercase font-semibold pt-[2px]"
                      style={{
                        color: isRunning
                          ? `rgb(${color})`
                          : isDone
                            ? `rgba(${color},.6)`
                            : "currentColor",
                        opacity: isRunning || isDone ? 1 : 0.4,
                      }}
                    >
                      <span className="relative flex items-center justify-center shrink-0 w-2 h-2 mt-px">
                        {isRunning && (
                          <span
                            className="absolute inset-0 rounded-full"
                            style={{
                              backgroundColor: `rgb(${color})`,
                              animation: `pl-ring 1.4s ease-out infinite`,
                            }}
                          />
                        )}
                        <span
                          className={`relative rounded-full transition-colors duration-300 ${isRunning ? "pl-breathe" : ""}`}
                          style={{
                            width: "6px",
                            height: "6px",
                            backgroundColor: isActive ? `rgb(${color})` : "currentColor",
                            opacity: isActive ? 1 : 0.3,
                          }}
                        />
                      </span>
                      <span className="hidden sm:inline">{status}</span>
                    </span>
                  </div>

                  <div
                    className="overflow-hidden transition-all ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      maxHeight: isExp ? "300px" : "0px",
                      opacity: isExp ? 1 : 0,
                      transitionDuration: dur(MOTION.duration.fast),
                    }}
                  >
                    <div className="space-y-1 px-4 py-3 bg-black/2 dark:bg-black/20 border-b border-black/5 dark:border-white/5 shadow-inner">
                      {stage.logs.map((line, li) => (
                        <div
                          key={li}
                          className="pl-log-line text-[11.5px] leading-[1.85] tracking-wide flex items-start"
                          style={{
                            animationDelay: `${li * 55}ms`,
                            color: line.startsWith("[ok]")
                              ? `rgb(${STAGE_COLORS[1]})`
                              : line.startsWith("[warn]")
                                ? `rgb(${STAGE_COLORS[2]})`
                                : `rgba(${STAGE_COLORS[3]},.8)`,
                          }}
                        >
                          <span className="text-muted-foreground/40 mr-2 shrink-0">-</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-black/1 dark:bg-transparent">
              <div className="flex items-center gap-2">
                <span
                  className="text-[11.5px] tracking-widest font-medium transition-colors duration-500 uppercase"
                  style={{
                    color: complete ? `rgb(${STAGE_COLORS[1]})` : "var(--muted-foreground)",
                  }}
                >
                  {footerMsg}
                </span>
                <span
                  className="pl-blink inline-block w-[5px] h-[11px] bg-foreground rounded-sm"
                  style={{
                    opacity: running ? 1 : 0,
                    transition: `opacity ${dur(MOTION.duration.instant)}`,
                  }}
                />
              </div>

              <button
                className="cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed font-mono text-[11.5px] font-semibold leading-normal tracking-[0.18em] uppercase rounded-md px-4 py-2 border hover:shadow-sm"
                disabled={running}
                onClick={complete ? reset : execute}
                style={{
                  borderColor: complete ? `rgba(${STAGE_COLORS[1]},.4)` : "var(--border)",
                  color: complete ? `rgb(${STAGE_COLORS[1]})` : "var(--foreground)",
                  backgroundColor: complete ? `rgba(${STAGE_COLORS[1]},.05)` : "transparent",
                }}
              >
                {complete ? "↺ Re-Execute" : running ? "Running…" : "▶ Execute"}
              </button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}