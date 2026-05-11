"use client";
import { Container } from "@/components/container";
import { DEFAULTS, MOTION, useReveal, useText } from "@/lib/motion";
import { useTranslations } from "next-intl";
import React, { useEffect, useRef, useState } from "react";

const STAGE_COLORS = [
  "74,  110, 212",
  "93,  202, 165",
  "248, 163,  50",
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
  const eyebrowRef = useReveal({ ...DEFAULTS.body, delay: 0 });
  const titleRef = useText(DEFAULTS.heading);
  const descRef = useReveal({ ...DEFAULTS.body, delay: 0.15 });

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
          50%     { opacity: .2;  }
        }
        @keyframes pl-blink {
          0%,100% { opacity: 1; }
          50%     { opacity: 0; }
        }
        @keyframes pl-scan {
          0%   { transform: translateX(-100%); opacity: 0;  }
          8%   { opacity: 1;                               }
          92%  { opacity: 1;                               }
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
        @keyframes pl-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pl-bar-in {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }

        .pl-breathe  { animation: pl-breathe  .9s ease-in-out infinite; }
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
        className="font-mono text-sm leading-normal tracking-wider pt-(--section-y-top) pb-(--section-y-bottom)"
        style={{ background: "hsl(var(--n-8))" }}
      >
        <Container>
          <p
            className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal transition-[opacity,transform]"
            ref={eyebrowRef}
            style={{
              color: "rgba(var(--pipeline-text, 247, 248, 250), 0.22)",
              marginBottom: "11px",
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(6px)",
              transitionDuration: dur(MOTION.duration.base),
              transitionTimingFunction: ease,
            }}
          >
            {t("eyebrow")}
          </p>

          <h2
            ref={titleRef}
            className="font-sans font-light leading-[1.06] transition-[opacity,transform] text-[clamp(2.125rem,4vw,3.25rem)] tracking-[-0.02em]"
            style={{
              color: "hsl(var(--n-0))",
              marginBottom: "32px",
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
              className="text-[clamp(1.0625rem,1.05vw,1.125rem)] text-muted-foreground max-w-md leading-relaxed"
            >
              {t("description")}
            </p>
          </h2>

          <div
            dir="ltr"
            className="transition-[opacity,transform] overflow-hidden rounded-sm"
            style={{
              border: "0.5px solid hsl(var(--border))",
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(16px)",
              transitionDuration: dur(MOTION.duration.base),
              transitionDelay: dur(MOTION.duration.fast),
              transitionTimingFunction: ease,
            }}
          >
            <div
              className="flex items-center justify-between flex-wrap gap-2"
              style={{
                padding: "9px 16px",
                borderBottom: "0.5px solid hsl(var(--border))",
              }}
            >
              <span
                className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal"
                style={{ color: "hsl(var(--n-5))" }}
              >
                system.build.pipeline / production
              </span>
              <div className="flex items-center gap-3 sm:gap-4">
                <span
                  style={{
                    fontSize: "11px",
                    letterSpacing: ".1em",
                    color: "hsl(var(--n-5))",
                  }}
                >
                  <span
                    className="inline-block transition-transform duration-300"
                    style={{
                      color: "hsl(var(--n-3))",
                      transform: doneCount > 0 ? "scale(1.1)" : "scale(1)",
                    }}
                  >
                    {doneCount}
                  </span>
                  /6 deployed
                </span>
                <span
                  className="transition-colors duration-300 font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal"
                  style={{
                    color: complete
                      ? `rgba(${STAGE_COLORS[1]},.65)`
                      : running
                        ? `rgba(${STAGE_COLORS[2]},.65)`
                        : "hsl(var(--n-6))",
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
                    className="pl-row relative items-start cursor-pointer overflow-hidden transition-colors duration-300"
                    style={{
                      padding: "13px 16px",
                      borderBottom: "0.5px solid hsl(var(--border))",
                      backgroundColor: isExp
                        ? `rgba(${color},.055)`
                        : isRunning
                          ? `rgba(${color},.03)`
                          : isActive
                            ? "rgba(var(--pipeline-text, 247, 248, 250), 0.008)"
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
                          background: `linear-gradient(90deg, transparent, rgba(${color},.07), transparent)`,
                          width: "40%",
                        }}
                      />
                    )}
                    <div
                      className="absolute inset-y-0 inset-s-0 transition-opacity duration-300"
                      style={{
                        width: "2.5px",
                        backgroundColor: `rgb(${color})`,
                        opacity: isActive || isExp ? 1 : 0,
                        animation:
                          isActive || isExp
                            ? "pl-bar-in .32s cubic-bezier(.22,1,.36,1) both"
                            : "none",
                      }}
                    />
                    <span
                      className="pl-col-ts tabular-nums transition-colors duration-300"
                      style={{
                        fontSize: "11.5px",
                        letterSpacing: ".06em",
                        paddingTop: "1px",
                        color: isActive
                          ? `rgba(${color},.5)`
                          : "hsl(var(--n-6))",
                      }}
                    >
                      {times[i]}
                    </span>
                    <span
                      className="pl-col-stage items-center gap-1.5 transition-colors duration-300 self-start"
                      style={{
                        fontSize: "11.5px",
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        paddingTop: "1px",
                        color: isActive ? `rgb(${color})` : "hsl(var(--n-5))",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ color: "hsl(var(--n-6))" }}>
                        [{stage.id}]
                      </span>
                      <span className="hidden sm:inline">{stage.key}</span>
                      <span className="sm:hidden">{stage.key.slice(0, 4)}</span>
                      {stage.parallel && (
                        <span
                          className="text-[9px] border px-1 py-px hidden sm:inline"
                          style={{
                            borderRadius: "var(--radius-xs)",
                            color: `rgba(${color},.6)`,
                            borderColor: `rgba(${color},.25)`,
                          }}
                        >
                          ||
                        </span>
                      )}
                    </span>
                    <span
                      className="transition-colors duration-300 text-sm sm:text-[13px] leading-relaxed"
                      style={{
                        letterSpacing: ".01em",
                        paddingTop: "1px",
                        color: isActive ? "hsl(var(--n-3))" : "hsl(var(--n-6))",
                      }}
                    >
                      {stage.desc}
                    </span>
                    <span
                      className="flex items-center gap-1.5 transition-colors duration-300 self-start justify-end"
                      style={{
                        fontSize: "11px",
                        letterSpacing: ".10em",
                        textTransform: "uppercase",
                        paddingTop: "2px",
                        color: isRunning
                          ? `rgba(${color},.75)`
                          : isDone
                            ? `rgba(${color},.55)`
                            : "hsl(var(--n-6))",
                      }}
                    >
                      <span
                        className="relative flex items-center justify-center shrink-0"
                        style={{ width: 8, height: 8, marginTop: 1 }}
                      >
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
                            width: 5,
                            height: 5,
                            backgroundColor: isActive
                              ? `rgb(${color})`
                              : "hsl(var(--n-6))",
                          }}
                        />
                      </span>
                      <span className="hidden sm:inline">{status}</span>
                    </span>
                  </div>

                  <div
                    className="overflow-hidden transition-[max-height,opacity]"
                    style={{
                      maxHeight: isExp ? "280px" : "0px",
                      opacity: isExp ? 1 : 0,
                      transitionDuration: dur(MOTION.duration.fast),
                      transitionTimingFunction: "cubic-bezier(.22,1,.36,1)",
                    }}
                  >
                    <div
                      className="space-y-0.5"
                      style={{
                        padding: "12px 16px 14px",
                        borderTop: "0.5px solid hsl(var(--border))",
                        background: "hsl(var(--n-8))",
                      }}
                    >
                      {stage.logs.map((line, li) => (
                        <div
                          key={li}
                          className="pl-log-line"
                          style={{
                            fontSize: "11.5px",
                            lineHeight: 1.85,
                            letterSpacing: ".04em",
                            animationDelay: `${li * 55}ms`,
                            color: line.startsWith("[ok]")
                              ? `rgba(${STAGE_COLORS[1]},.65)`
                              : line.startsWith("[warn]")
                                ? `rgba(${STAGE_COLORS[2]},.6)`
                                : `rgba(${STAGE_COLORS[3]},.55)`,
                          }}
                        >
                          <span
                            style={{ color: "hsl(var(--n-7))", marginRight: 8 }}
                          >
                            -
                          </span>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            <div
              className="flex items-center justify-between flex-wrap gap-3"
              style={{
                padding: "11px 16px",
                borderTop: "0.5px solid hsl(var(--border))",
              }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[11.5px] transition-colors duration-500"
                  style={{
                    letterSpacing: ".10em",
                    color: complete
                      ? `rgba(${STAGE_COLORS[1]},.65)`
                      : "hsl(var(--n-6))",
                  }}
                >
                  {footerMsg}
                </span>
                <span
                  className="pl-blink inline-block"
                  style={{
                    width: "5px",
                    height: "11px",
                    background: "hsl(var(--n-3))",
                    opacity: running ? 1 : 0,
                    transition: `opacity ${dur(MOTION.duration.instant)}`,
                  }}
                />
              </div>

              <button
                className="cursor-pointer transition-[color,border-color,background-color] disabled:opacity-30 disabled:cursor-not-allowed font-mono text-sm leading-normal tracking-wider rounded-sm"
                disabled={running}
                onClick={complete ? reset : execute}
                style={{
                  fontSize: "11.5px",
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  background: "transparent",
                  border: `0.5px solid ${
                    complete
                      ? `rgba(${STAGE_COLORS[1]},.28)`
                      : "hsl(var(--border))"
                  }`,
                  padding: "7px 16px",
                  color: complete
                    ? `rgba(${STAGE_COLORS[1]},.7)`
                    : "hsl(var(--n-4))",
                  transitionDuration: dur(MOTION.duration.instant),
                }}
                onMouseEnter={(e) => {
                  if (!running) {
                    const btn = e.currentTarget;
                    btn.style.color = "hsl(var(--n-1))";
                    btn.style.borderColor = "hsl(var(--border-mid))";
                    btn.style.background = "rgba(255,255,255,0.04)";
                  }
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget;
                  btn.style.color = complete
                    ? `rgba(${STAGE_COLORS[1]},.7)`
                    : "hsl(var(--n-4))";
                  btn.style.borderColor = complete
                    ? `rgba(${STAGE_COLORS[1]},.28)`
                    : "hsl(var(--border))";
                  btn.style.background = "transparent";
                }}
              >
                {complete ? "↺ re-execute" : running ? "running…" : "▶ execute"}
              </button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
