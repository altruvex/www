"use client";

import { Container } from "@/components/container";
import { Link } from "@/i18n/navigation";
import { useIsomorphicLayoutEffect } from "@/lib/dom-utils";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DEFAULTS, MOTION, useReveal, useText } from "@/lib/motion";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { MagneticButton } from "./magnetic-button";

const INK = {
  red: "rgba(210, 68,  68,  0.82)",
  amber: "rgba(190, 145, 32,  0.78)",
  green: "rgba(42,  168, 100, 0.72)",
  gray: "rgba(105, 105, 105, 0.55)",
} as const;

type InkColor = keyof typeof INK;

const CB_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const STAGGER = 150;
const SCROLL_THROTTLE = 80;
const BREAKPOINTS = { md: 768, lg: 1024 } as const;
const SHORT_VIEWPORT_HEIGHT = 780;
const VERY_SHORT_VIEWPORT_HEIGHT = 700;
const SSR_VIEWPORT = { width: 1280, height: 900 } as const;

const BRIEF_STYLES = `
  .cb-underline { opacity: 0; }
  .cb-underline path {
    fill: none;
    stroke-dasharray:  var(--path-len, 9999);
    stroke-dashoffset: var(--path-len, 9999);
  }
  .cb-underline.drawn { opacity: 1; }
  .cb-underline.drawn path {
    stroke-dashoffset: 0;
    transition: stroke-dashoffset 0.62s ${CB_EASE};
  }
  .cb-strike {
    position: absolute; top: 50%; left: 0; right: 0;
    height: 1.5px; pointer-events: none;
    background: color-mix(in srgb, hsl(var(--foreground)) 45%, transparent);
    transform-origin: left;
    transform: scaleX(0);
    transition: transform 0.36s ${CB_EASE};
  }
  [dir="rtl"] .cb-strike { transform-origin: right; }
  .cb-strike.drawn { transform: scaleX(1); }
  .cb-hl {
    border-radius: 2px; padding: 0 1px;
    transition: background 0.52s ${CB_EASE};
  }
  .cb-hl.drawn { background: rgba(190, 145, 32, 0.14); }
  .cb-conn {
    stroke-dasharray:  var(--path-len, 9999);
    stroke-dashoffset: var(--path-len, 9999);
    opacity: 0;
  }
  .cb-conn.drawn {
    stroke-dashoffset: 0;
    opacity: 1;
    filter: drop-shadow(0 0 2.5px rgba(105,105,105,0.5));
    transition:
      opacity           0.22s ease,
      stroke-dashoffset 1.1s  ${CB_EASE} 0.22s;
  }
  .cb-note {
    opacity: 0.46;
    transform: translateX(0);
    filter: blur(0);
    transition:
      opacity   0.44s ${CB_EASE},
      transform 0.44s ${CB_EASE},
      filter    0.44s ${CB_EASE};
    will-change: opacity, transform, filter;
  }
  .cb-note.shown { opacity: 1; transform: translateX(0); filter: blur(0); }
  .cb-mobile-note {
    display: block;
    position: sticky;
    bottom: max(10px, env(safe-area-inset-bottom));
    z-index: 6;
    margin-top: clamp(10px, 1.4vh, 16px);
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.38s ${CB_EASE}, transform 0.38s ${CB_EASE};
    pointer-events: none;
  }
  .cb-mobile-note.shown { opacity: 1; transform: translateY(0); pointer-events: auto; }
  .cb-mobile-note > div { box-shadow: 0 8px 28px rgba(0,0,0,0.12); }
  @media (min-width: 768px) { .cb-mobile-note { display: none; } }
  .cb-doc-grid { display: grid; grid-template-columns: 1fr; width: 100%; }
  @media (min-width: 768px) {
    .cb-doc-grid { grid-template-columns: 1fr clamp(172px, 22vw, 320px); }
  }
  @media (min-width: 1024px) {
    .cb-doc-grid { grid-template-columns: 1fr clamp(200px, 20vw, 300px); }
  }
  .cb-body-text { font-size: clamp(11px, 1.05vw, 14px); line-height: 1.8; }
  @media (max-width: 479px) { .cb-body-text { font-size: 11px; line-height: 1.65; } }
  .cb-progress-fill {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    width: 0%;
    background: hsl(var(--foreground));
    transition: width 0.08s linear;
  }
  @media (prefers-reduced-motion: reduce) {
    .cb-underline path, .cb-strike, .cb-hl, .cb-conn, .cb-note {
      transition: none !important; filter: none !important; animation: none !important;
    }
    .cb-underline.drawn path { stroke-dashoffset: 0 !important; }
    .cb-strike.drawn         { transform: scaleX(1) !important; }
    .cb-conn.drawn           { stroke-dashoffset: 0 !important; opacity: 1 !important; }
    .cb-note.shown           { opacity: 1 !important; transform: none !important; }
    .cb-progress-fill        { transition: none !important; }
  }
`;

interface StageAction {
  type: "underline" | "strike" | "highlight" | "note" | "connector";
  target: string;
  delay: number;
}
interface Stage {
  key: string;
  label: string;
  actions: StageAction[];
}
interface Note {
  id: string;
  label: string;
  body: string;
  color: InkColor;
}

const D = (n: number) => `${Math.round(n * 1000)}ms`;

function getSectionHeight(width: number, height: number): string {
  const isNarrow = width < BREAKPOINTS.md;
  const isMedium = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isVeryShort = height < VERY_SHORT_VIEWPORT_HEIGHT;
  const isShort = height < SHORT_VIEWPORT_HEIGHT;

  if (isNarrow) return isVeryShort ? "420vh" : isShort ? "380vh" : "340vh";
  if (isMedium) return isVeryShort ? "390vh" : isShort ? "350vh" : "320vh";
  return isVeryShort ? "350vh" : isShort ? "320vh" : "300vh";
}

function useViewportSize() {
  const [size, setSize] = useState<{ width: number; height: number }>(
    SSR_VIEWPORT,
  );
  useEffect(() => {
    const update = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

function BriefUnderline({
  id,
  color,
  drawn,
}: {
  id: string;
  color: string;
  drawn: boolean;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  useIsomorphicLayoutEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    try {
      p.style.setProperty("--path-len", String(Math.ceil(p.getTotalLength())));
    } catch {}
  }, []);
  return (
    <svg
      id={id}
      className={`cb-underline${drawn ? " drawn" : ""}`}
      style={{
        position: "absolute",
        bottom: "-2px",
        left: 0,
        width: "100%",
        height: "3px",
        overflow: "visible",
        pointerEvents: "none",
      }}
      viewBox="0 0 100 3"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d="M0 1.5 Q50 3 100 1.5"
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ConnectorsSvg({
  conn1Drawn,
  conn2Drawn,
  isRtl,
}: {
  conn1Drawn: boolean;
  conn2Drawn: boolean;
  isRtl: boolean;
}) {
  const conn1Ref = useRef<SVGPathElement>(null);
  const conn2Ref = useRef<SVGPathElement>(null);
  useIsomorphicLayoutEffect(() => {
    for (const ref of [conn1Ref, conn2Ref]) {
      const p = ref.current;
      if (!p) continue;
      try {
        p.style.setProperty(
          "--path-len",
          String(Math.ceil(p.getTotalLength())),
        );
      } catch {}
    }
  }, []);
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
      style={{ transform: isRtl ? "scaleX(-1)" : undefined }}
      viewBox="0 0 420 280"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <path
        ref={conn1Ref}
        id="conn-1"
        className={`cb-conn${conn1Drawn ? " drawn" : ""}`}
        d="M 58 66 C 95 82, 172 95, 58 126"
        fill="none"
        stroke={INK.gray}
        strokeWidth={0.8}
      />
      <path
        ref={conn2Ref}
        id="conn-2"
        className={`cb-conn${conn2Drawn ? " drawn" : ""}`}
        d="M 198 165 C 235 185, 198 208, 120 226"
        fill="none"
        stroke={INK.gray}
        strokeWidth={0.8}
      />
    </svg>
  );
}

function NoteCard({
  note,
  isRtl,
  size = "sm",
}: {
  note: Note;
  isRtl: boolean;
  size?: "sm" | "md";
}) {
  const accentPx = size === "md" ? 3 : 2;
  const borderSide = isRtl
    ? {
        borderRight: `${accentPx}px solid ${INK[note.color]}`,
        borderLeft: "none",
      }
    : {
        borderLeft: `${accentPx}px solid ${INK[note.color]}`,
        borderRight: "none",
      };

  return (
    <div
      className="rounded-sm bg-background"
      style={{
        padding: size === "md" ? "10px 14px" : "8px 11px",
        border:
          "0.5px solid color-mix(in srgb, hsl(var(--foreground)) 12%, transparent)",
        ...borderSide,
      }}
    >
      <p
        className="font-mono uppercase mb-1 tracking-[.18em]"
        style={{ fontSize: "clamp(7px, 0.72vw, 10px)", color: INK[note.color] }}
      >
        {note.label}
      </p>
      <p
        className="leading-relaxed"
        style={{
          fontSize:
            size === "md"
              ? "clamp(12px, 3.2vw, 13px)"
              : "clamp(10px, 0.88vw, 13px)",
          color: "color-mix(in srgb, hsl(var(--foreground)) 62%, transparent)",
        }}
      >
        {note.body}
      </p>
    </div>
  );
}

function BriefNote({
  note,
  shown,
  isRtl,
}: {
  note: Note;
  shown: boolean;
  isRtl: boolean;
}) {
  return (
    <div id={note.id} className={`cb-note${shown ? " shown" : ""}`}>
      <NoteCard note={note} isRtl={isRtl} size="sm" />
    </div>
  );
}

function MobileNoteCard({
  note,
  visible,
  isRtl,
}: {
  note: Note;
  visible: boolean;
  isRtl: boolean;
}) {
  return (
    <div
      className={`cb-mobile-note${visible ? " shown" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <NoteCard note={note} isRtl={isRtl} size="md" />
    </div>
  );
}

interface StageNavProps {
  stages: Stage[];
  activeStage: number;
  mounted: boolean;
  isRtl: boolean;
  progressBarRef: React.RefObject<HTMLDivElement | null>;
  onStage: (i: number) => void;
  onSkip: () => void;
  skipped: boolean;
  hintVisible: boolean;
}

function StageNav({
  stages,
  activeStage,
  mounted,
  isRtl,
  progressBarRef,
  onStage,
  onSkip,
  skipped,
  hintVisible,
}: StageNavProps) {
  const t = useTranslations("serviceDetails.consulting");

  return (
    <div className="shrink-0 mb-[clamp(4px,0.8vh,12px)]">
      <div
        className="flex border border-foreground/12 overflow-hidden"
        style={{
          opacity: mounted ? 1 : 0,
          transition: `opacity ${D(MOTION.duration.base)}`,
        }}
        role="tablist"
        aria-label={t("brief.stageNavLabel")}
      >
        {stages.map((s, i) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={i === activeStage}
            aria-controls={`cb-panel-${s.key}`}
            id={`cb-tab-${s.key}`}
            className="flex-1 relative font-mono leading-normal tracking-wider uppercase cursor-pointer min-w-0"
            style={{
              padding: "clamp(7px, 1.1vw, 9px) clamp(2px, 0.6vw, 6px)",
              fontSize: "clamp(8px, 0.80vw, 14px)",
              letterSpacing: "0.12em",
              background:
                i === activeStage
                  ? "color-mix(in srgb, hsl(var(--foreground)) 6%, transparent)"
                  : "transparent",
              color:
                i <= activeStage
                  ? "hsl(var(--foreground))"
                  : "color-mix(in srgb, hsl(var(--foreground)) 28%, transparent)",
              borderInlineEnd:
                i < stages.length - 1
                  ? "0.5px solid color-mix(in srgb, hsl(var(--foreground)) 10%, transparent)"
                  : "none",
              transition: `color 0.22s ${CB_EASE}, background 0.28s ${CB_EASE}`,
            }}
            onKeyDown={(e) => {
              const nextKey = isRtl ? "ArrowLeft" : "ArrowRight";
              const prevKey = isRtl ? "ArrowRight" : "ArrowLeft";
              if (e.key === nextKey || e.key === "ArrowDown") {
                e.preventDefault();
                onStage(Math.min(i + 1, stages.length - 1));
              }
              if (e.key === prevKey || e.key === "ArrowUp") {
                e.preventDefault();
                onStage(Math.max(i - 1, 0));
              }
              if (e.key === "Home") {
                e.preventDefault();
                onStage(0);
              }
              if (e.key === "End") {
                e.preventDefault();
                onStage(stages.length - 1);
              }
            }}
            onClick={() => onStage(i)}
          >
            <span
              className="absolute inset-x-0 bottom-0 h-[1.5px] bg-foreground"
              aria-hidden="true"
              style={{
                transformOrigin: isRtl ? "right" : "left",
                transform: i <= activeStage ? "scaleX(1)" : "scaleX(0)",
                transition:
                  i === activeStage
                    ? `transform 0.48s ${MOTION.ease.smooth}`
                    : "none",
              }}
            />
            <span className="inline md:hidden">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="hidden md:inline">{s.label}</span>
          </button>
        ))}
      </div>

      <div
        className="relative h-[2px] w-full overflow-hidden"
        style={{
          background:
            "color-mix(in srgb, hsl(var(--foreground)) 7%, transparent)",
        }}
        aria-hidden="true"
      >
        <div ref={progressBarRef} className="cb-progress-fill" />
      </div>

      {mounted && activeStage >= 0 && (
        <div
          className="flex items-center justify-between mt-2 md:hidden"
          aria-live="polite"
          aria-atomic="true"
        >
          <p
            className="font-mono text-foreground/40 max-w-[calc(100vw-96px)] truncate"
            style={{
              fontSize: "10px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {t("brief.stepIndicator", {
              current: activeStage + 1,
              total: stages.length,
              label: stages[activeStage]?.label ?? "",
            })}
          </p>
          <div className="flex items-center gap-1" aria-hidden="true">
            {stages.map((_, i) => (
              <span
                key={i}
                className="inline-block rounded-full"
                style={{
                  width: 5,
                  height: 5,
                  background:
                    i <= activeStage
                      ? "hsl(var(--foreground))"
                      : "color-mix(in srgb, hsl(var(--foreground)) 18%, transparent)",
                  transition: `background 0.28s ${CB_EASE}`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {mounted && !skipped && hintVisible && (
        <div className="flex justify-end mt-1.5">
          <button
            onClick={onSkip}
            className="font-mono text-foreground/30 hover:text-foreground/55 transition-colors bg-transparent border-none cursor-pointer py-0.5 px-0"
            style={{
              fontSize: "clamp(8px, 0.7vw, 10px)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {t("brief.skipAction")}
          </button>
        </div>
      )}
    </div>
  );
}

function AnnotationsPanel({
  notes,
  activeTargets,
  label,
  isRtl,
  allActive,
}: {
  notes: Note[];
  activeTargets: Set<string>;
  label: string;
  isRtl: boolean;
  allActive: boolean;
}) {
  return (
    <div
      className="hidden md:flex flex-col"
      style={{
        background:
          "color-mix(in srgb, hsl(var(--foreground)) 3.5%, transparent)",
      }}
      aria-label={label}
    >
      <div className="flex-none px-3 pt-3 pb-2 border-b border-foreground/8">
        <p
          className="font-mono text-foreground/30 uppercase tracking-[0.2em]"
          style={{ fontSize: "clamp(8px, 0.7vw, 10px)" }}
        >
          {label}
        </p>
      </div>
      <div className="flex flex-col gap-[clamp(4px,0.6vh,10px)] p-[clamp(6px,1vh,14px)]">
        {notes.map((note) => (
          <BriefNote
            key={note.id}
            note={note}
            shown={allActive || activeTargets.has(note.id)}
            isRtl={isRtl}
          />
        ))}
      </div>
    </div>
  );
}

function StageCTA({
  visible,
  ctaBody,
  ctaAction,
}: {
  visible: boolean;
  ctaBody: string;
  ctaAction: string;
}) {
  return (
    <div
      className="flex items-stretch sm:items-center justify-between flex-col sm:flex-row flex-wrap gap-3 rounded-sm border border-foreground/14"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: `opacity 0.52s ${CB_EASE}, transform 0.52s ${CB_EASE}`,
        pointerEvents: visible ? "auto" : "none",
        marginTop: "clamp(8px, 1.5vh, 18px)",
        padding: "14px 18px",
        background:
          "color-mix(in srgb, hsl(var(--foreground)) 3%, transparent)",
      }}
      aria-hidden={!visible}
    >
      <p
        className="leading-normal max-w-[48ch] text-foreground/70"
        style={{ fontSize: "clamp(12px, 1vw, 14px)" }}
      >
        {ctaBody}
      </p>
      <a
        href="#contact"
        className="font-mono rounded-xs bg-foreground text-background no-underline whitespace-nowrap shrink-0 text-center"
        style={{
          fontSize: "clamp(9px, 0.8vw, 12px)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          padding: "8px 18px",
        }}
      >
        {ctaAction}
      </a>
    </div>
  );
}

function BriefDocument({
  a,
  isRtl,
  t,
}: {
  a: Set<string>;
  isRtl: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div
      className="relative p-3 sm:p-4 md:p-5 lg:p-7"
      style={{
        borderRight: isRtl
          ? "none"
          : "0.5px solid color-mix(in srgb, hsl(var(--foreground)) 10%, transparent)",
        borderLeft: isRtl
          ? "0.5px solid color-mix(in srgb, hsl(var(--foreground)) 10%, transparent)"
          : "none",
      }}
    >
      <ConnectorsSvg
        conn1Drawn={a.has("conn-1")}
        conn2Drawn={a.has("conn-2")}
        isRtl={isRtl}
      />

      <div className="flex items-center justify-between mb-2 md:mb-3 lg:mb-4">
        <span
          className="font-mono text-foreground/45 uppercase tracking-[0.2em]"
          style={{ fontSize: "clamp(8px, 0.75vw, 12px)" }}
        >
          {t("brief.docMeta")}
        </span>
        <span
          className="hidden sm:block font-mono text-foreground/35 uppercase tracking-[0.18em]"
          style={{ fontSize: "clamp(8px, 0.75vw, 12px)" }}
        >
          {t("brief.docRef")}
        </span>
      </div>

      <p
        className="font-mono text-foreground/55 uppercase tracking-[0.12em] mb-2 md:mb-3 lg:mb-4 pb-2 md:pb-3 border-b border-foreground/8"
        style={{ fontSize: "clamp(9px, 0.80vw, 14px)" }}
      >
        {t("brief.docTitle")}
      </p>

      <div className="cb-body-text text-muted-foreground space-y-2 md:space-y-3">
        <p>
          {t("brief.body.p1")}{" "}
          <span className="relative inline-block">
            <span className={`cb-hl${a.has("hl-release") ? " drawn" : ""}`}>
              {t("brief.body.p1_hl1")}
            </span>
            <BriefUnderline
              id="ul-release"
              color={INK.red}
              drawn={a.has("ul-release")}
            />
          </span>{" "}
          {t("brief.body.p1_extra")}{" "}
          <span className="relative inline-block">
            {t("brief.body.p1_hl2")}
            <BriefUnderline
              id="ul-monolith"
              color={INK.red}
              drawn={a.has("ul-monolith")}
            />
          </span>
        </p>

        <p>
          {t("brief.body.p2")}{" "}
          <span style={{ position: "relative" }}>
            <span className={`cb-hl${a.has("hl-decompose") ? " drawn" : ""}`}>
              {t("brief.body.p2_hl")}{" "}
            </span>
            <span className="relative inline-block">
              <span className={`cb-hl${a.has("hl-decompose") ? " drawn" : ""}`}>
                {t("brief.body.p2_strike")}
              </span>
              <BriefUnderline
                id="ul-decompose"
                color={INK.red}
                drawn={a.has("ul-decompose")}
              />
            </span>
            <span
              className={`cb-strike${a.has("st-decompose") ? " drawn" : ""}`}
              style={{ left: 0, right: 0 }}
            />
          </span>{" "}
          {t("brief.body.p2_extra")}
        </p>

        <p>
          {t("brief.body.p3")}{" "}
          <span className="relative inline-block">
            {t("brief.body.p3_hl")}
            <BriefUnderline
              id="ul-shareddb"
              color={INK.amber}
              drawn={a.has("ul-shareddb")}
            />
          </span>{" "}
          {t("brief.body.p3_extra")}{" "}
          <span className={`cb-hl${a.has("hl-tracing") ? " drawn" : ""}`}>
            {t("brief.body.p3_tracing")}
          </span>
        </p>

        <p>
          {t("brief.body.p4")}{" "}
          <span className="relative inline-block">
            {t("brief.body.p4_hl")}
            <BriefUnderline
              id="ul-load"
              color={INK.green}
              drawn={a.has("ul-load")}
            />
          </span>{" "}
          {t("brief.body.p4_extra")}
        </p>
      </div>
    </div>
  );
}

export function ConsultingBriefSection() {
  const t = useTranslations("serviceDetails.consulting");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const STAGES: Stage[] = useMemo(
    () => [
      {
        key: "discovery",
        label: t("brief.stages.discovery"),
        actions: [
          { type: "underline", target: "ul-release", delay: 0 },
          { type: "note", target: "note-symptom", delay: STAGGER * 2 },
          { type: "underline", target: "ul-monolith", delay: STAGGER * 4 },
        ],
      },
      {
        key: "audit",
        label: t("brief.stages.audit"),
        actions: [
          { type: "underline", target: "ul-decompose", delay: 0 },
          { type: "strike", target: "st-decompose", delay: STAGGER },
          { type: "note", target: "note-rflag", delay: STAGGER * 2 },
          { type: "connector", target: "conn-1", delay: STAGGER * 3 },
          { type: "note", target: "note-question", delay: STAGGER * 4 },
        ],
      },
      {
        key: "roadmap",
        label: t("brief.stages.roadmap"),
        actions: [
          { type: "underline", target: "ul-shareddb", delay: 0 },
          { type: "highlight", target: "hl-tracing", delay: STAGGER },
          { type: "note", target: "note-connected", delay: STAGGER * 2 },
          { type: "connector", target: "conn-2", delay: STAGGER * 3 },
          { type: "note", target: "note-finding", delay: STAGGER * 4 },
        ],
      },
      {
        key: "delivery",
        label: t("brief.stages.delivery"),
        actions: [
          { type: "underline", target: "ul-load", delay: 0 },
          { type: "highlight", target: "hl-release", delay: STAGGER },
          { type: "highlight", target: "hl-decompose", delay: STAGGER * 2 },
          { type: "note", target: "note-action", delay: STAGGER * 3 },
        ],
      },
    ],
    [t],
  );

  const NOTES: Note[] = useMemo(
    () => [
      {
        id: "note-symptom",
        color: "red",
        label: t("brief.notes.symptom.label"),
        body: t("brief.notes.symptom.body"),
      },
      {
        id: "note-rflag",
        color: "red",
        label: t("brief.notes.rflag.label"),
        body: t("brief.notes.rflag.body"),
      },
      {
        id: "note-question",
        color: "amber",
        label: t("brief.notes.question.label"),
        body: t("brief.notes.question.body"),
      },
      {
        id: "note-connected",
        color: "amber",
        label: t("brief.notes.connected.label"),
        body: t("brief.notes.connected.body"),
      },
      {
        id: "note-finding",
        color: "green",
        label: t("brief.notes.finding.label"),
        body: t("brief.notes.finding.body"),
      },
      {
        id: "note-action",
        color: "green",
        label: t("brief.notes.action.label"),
        body: t("brief.notes.action.body"),
      },
    ],
    [t],
  );

  const getPrimaryNote = useCallback(
    (stageIndex: number): Note | null => {
      if (stageIndex < 0) return null;
      const noteActions = STAGES[stageIndex].actions.filter(
        (a) => a.type === "note",
      );
      if (!noteActions.length) return null;
      const id = noteActions[noteActions.length - 1].target;
      return NOTES.find((n) => n.id === id) ?? null;
    },
    [STAGES, NOTES],
  );

  const collectTargets = useCallback(
    (upToIndex: number): Set<string> => {
      const targets = new Set<string>();
      for (let i = 0; i <= upToIndex; i++) {
        STAGES[i].actions.forEach((a) => targets.add(a.target));
      }
      return targets;
    },
    [STAGES],
  );

  const wrapperRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<SVGSVGElement>(null);
  const chevronAnim = useRef<gsap.core.Tween | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const currentStage = useRef(-1);
  const lastScrollTime = useRef(0);

  const headerRef = useReveal<HTMLDivElement>({ ...DEFAULTS.body });
  const headRef = useText({
    ...DEFAULTS.heading,
    trigger: MOTION.trigger.late,
    delay: 0.15,
  });

  const [activeStage, setActiveStage] = useState(-1);
  const [scrollStage, setScrollStage] = useState(-1);
  const [activeTargets, setActiveTargets] = useState<Set<string>>(new Set());
  const [hintVisible, setHintVisible] = useState(true);
  const [skipped, setSkipped] = useState(false);

  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const viewport = useViewportSize();
  const showCTA = activeStage === STAGES.length - 1;
  const sectionHeight = getSectionHeight(viewport.width, viewport.height);

  const pinDistance = useMemo(() => {
    const vh = Number.parseFloat(sectionHeight);
    if (Number.isNaN(vh)) return Math.round(viewport.height * 3.2);
    return Math.round((vh / 100) * viewport.height);
  }, [sectionHeight, viewport.height]);

  useEffect(() => {
    const el = chevronRef.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      chevronAnim.current = gsap.to(el, {
        y: -3,
        repeat: -1,
        yoyo: true,
        duration: 0.9,
        ease: "sine.inOut",
      });
    });
    return () => mm.revert();
  }, []);

  useEffect(() => {
    if (!hintVisible) {
      chevronAnim.current?.kill();
      chevronAnim.current = null;
    }
  }, [hintVisible]);

  useEffect(() => {
    if (!mounted) return;
    const id = setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => clearTimeout(id);
  }, [mounted, viewport.width, viewport.height, sectionHeight]);

  const goStage = useCallback(
    (index: number) => {
      if (index === currentStage.current) return;
      tlRef.current?.kill();
      const prev = currentStage.current;
      currentStage.current = index;
      setActiveStage(index);
      setHintVisible(false);

      if (index > prev) {
        if (index - prev > 1) {
          setActiveTargets((current) => {
            const next = new Set(current);
            collectTargets(index - 1).forEach((t) => next.add(t));
            return next;
          });
        }
        const tl = gsap.timeline();
        STAGES[index].actions.forEach((action) => {
          tl.call(
            () =>
              setActiveTargets((current) => {
                const next = new Set(current);
                next.add(action.target);
                return next;
              }),
            undefined,
            action.delay / 1000,
          );
        });
        tlRef.current = tl;
      } else {
        setActiveTargets(new Set());
        const tl = gsap.timeline({ delay: 0.032 });
        tl.call(() => setActiveTargets(collectTargets(index)));
        tlRef.current = tl;
      }
    },
    [STAGES, collectTargets],
  );

  const handleSkip = useCallback(() => {
    setSkipped(true);
    setHintVisible(false);
    tlRef.current?.kill();
    currentStage.current = STAGES.length - 1;
    setActiveStage(STAGES.length - 1);
    setActiveTargets(collectTargets(STAGES.length - 1));
  }, [STAGES, collectTargets]);

  useIsomorphicLayoutEffect(() => {
    if (!mounted || !wrapperRef.current || !stickyRef.current) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrapperRef.current!,
        start: "top top",
        end: () => `+=${pinDistance}`,
        pin: stickyRef.current!,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onEnter: () => {
          setScrollStage(0);
        },
        onEnterBack: () => {
          setScrollStage(0);
        },
        onLeaveBack: () => setScrollStage(-1),
        onUpdate: (self) => {
          const now = Date.now();
          if (now - lastScrollTime.current < SCROLL_THROTTLE) return;
          lastScrollTime.current = now;
          if (progressBarRef.current) {
            progressBarRef.current.style.width = `${self.progress * 100}%`;
          }
          setScrollStage(
            Math.min(
              STAGES.length - 1,
              Math.floor(self.progress * STAGES.length),
            ),
          );
        },
      });
    }, wrapperRef);
    return () => {
      tlRef.current?.kill();
      ctx.revert();
    };
  }, [mounted, STAGES.length, pinDistance]);

  useEffect(() => {
    if (scrollStage < 0) {
      const id = window.requestAnimationFrame(() => {
        tlRef.current?.kill();
        currentStage.current = -1;
        setActiveStage(-1);
        setHintVisible(true);
        setActiveTargets(new Set());
        setSkipped(false);
        if (progressBarRef.current) progressBarRef.current.style.width = "0%";
      });
      return () => window.cancelAnimationFrame(id);
    }
    const id = window.requestAnimationFrame(() => goStage(scrollStage));
    return () => window.cancelAnimationFrame(id);
  }, [scrollStage, goStage]);

  const a = activeTargets;
  const mobileNote = getPrimaryNote(activeStage);
  const showMobileCard = activeStage >= 0 && !!mobileNote;

  return (
    <>
      <style>{BRIEF_STYLES}</style>

      <div
        ref={wrapperRef}
        className="relative p-0 m-0 w-full min-h-screen"
        id="brief"
      >
        <Container>
          <div
            ref={stickyRef}
            className="flex flex-col w-full pt-(--section-y-top) pb-(--section-y-bottom)"
            style={{ minHeight: "100dvh" }}
          >
            <div
              ref={headerRef}
              className="shrink-0 mb-[clamp(6px,1.2vh,20px)]"
            >
              <p className="font-mono text-sm leading-normal tracking-wider uppercase text-foreground/40 mb-2 md:mb-3 block">
                {t("brief.eyebrow")}
              </p>

              <div className="flex items-end justify-between gap-4 md:gap-6 flex-wrap">
                <h2
                  ref={headRef}
                  className="font-sans font-normal text-foreground"
                  style={{
                    fontSize: "clamp(28px, 4.5vw, 52px)",
                    letterSpacing: "-0.022em",
                  }}
                >
                  {t("brief.title")}
                  <br />
                  <span className="font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-foreground/45">
                    {t("brief.titleItalic")}
                  </span>
                </h2>

                <div className="hidden lg:flex flex-col items-end gap-2">
                  <p className="font-mono text-sm text-foreground/45 max-w-[38ch] text-right leading-normal tracking-wider">
                    {t("brief.subtitle")}
                  </p>
                  <p
                    className="font-mono text-foreground/60 max-w-[38ch] text-right uppercase tracking-[0.13em] leading-relaxed"
                    style={{ fontSize: "clamp(9px, 0.78vw, 11px)" }}
                  >
                    {t("brief.hook")}
                  </p>
                </div>
              </div>

              <p
                className="font-mono text-foreground/45 mt-1.5 lg:hidden"
                style={{ fontSize: "11px", lineHeight: 1.55 }}
              >
                {t("brief.hook")}
              </p>
            </div>

            <StageNav
              stages={STAGES}
              activeStage={activeStage}
              mounted={mounted}
              isRtl={isRtl}
              progressBarRef={progressBarRef}
              onStage={goStage}
              onSkip={handleSkip}
              skipped={skipped}
              hintVisible={hintVisible}
            />

            {mounted && (
              <div className="w-full">
                <div
                  className="cb-doc-grid border border-foreground/12"
                  role="tabpanel"
                  id={`cb-panel-${STAGES[Math.max(0, activeStage)]?.key ?? STAGES[0].key}`}
                  aria-labelledby={`cb-tab-${STAGES[Math.max(0, activeStage)]?.key ?? STAGES[0].key}`}
                >
                  <BriefDocument a={a} isRtl={isRtl} t={t} />
                  <AnnotationsPanel
                    notes={NOTES}
                    activeTargets={a}
                    label={t("brief.annotationsLabel")}
                    isRtl={isRtl}
                    allActive={showCTA}
                  />
                </div>

                {mobileNote && (
                  <MobileNoteCard
                    note={mobileNote}
                    visible={showMobileCard}
                    isRtl={isRtl}
                  />
                )}

                <StageCTA
                  visible={showCTA}
                  ctaBody={t("brief.cta.body")}
                  ctaAction={t("brief.cta.action")}
                />
              </div>
            )}

            <div
              className="mt-auto pt-2 md:pt-3 text-center"
              style={{
                opacity: hintVisible ? 1 : 0,
                transition: `opacity ${D(MOTION.duration.slow)}`,
                pointerEvents: hintVisible ? "auto" : "none",
              }}
              aria-hidden={!hintVisible}
            >
              <MagneticButton
                size="lg"
                variant="secondary"
                aria-label={t("cta.button")}
              >
                <Link
                  href="/schedule"
                  className="font-mono text-foreground/35 inline-flex items-center gap-1.5 whitespace-nowrap uppercase tracking-[0.2em]"
                  style={{ fontSize: "clamp(8px, 0.75vw, 10px)" }}
                >
                  <span className="hidden sm:inline">
                    {t("brief.scrollHintDesktop")}
                  </span>
                  <span className="sm:hidden">
                    {t("brief.scrollHintMobile")}
                  </span>
                  <svg
                    ref={chevronRef}
                    width="6"
                    height="10"
                    viewBox="0 0 6 10"
                    fill="none"
                    aria-hidden="true"
                    className="shrink-0"
                  >
                    <polyline
                      points="1,1 5,5 1,9"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </MagneticButton>
            </div>
          </div>
        </Container>
      </div>
    </>
  );
}
