"use client";

import { useLoading } from "@/components/providers/loading-provider";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { MOTION } from "@/lib/motion";
import { memo, startTransition, useEffect, useRef, useState } from "react";

const INITIAL_LOAD_KEY = "Altruvex_initial_load_complete";

const BOOT_LINES = [
  { text: "$ altruvex --init", delay: 0, type: "command" },
  { text: "", delay: 300, type: "blank" },
  { label: "runtime", dots: "...........", status: "✓", value: "Next.js 16", delay: 420, type: "check" },
  { label: "compiler", dots: "..........", status: "✓", value: "TypeScript 6", delay: 560, type: "check" },
  { label: "design system", dots: ".....", status: "✓", value: "Tailwind v4", delay: 700, type: "check" },
  { label: "locale", dots: "............", status: "✓", value: "AR / EN", delay: 840, type: "check" },
  { text: "", delay: 980, type: "blank" },
  { text: "ready.", delay: 1050, type: "ready" },
] as const;

export const InitialLoader = memo(function InitialLoader() {
  const { isLoading, setIsLoading } = useLoading();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScheduled = useRef(false);

  const [shouldRender, setShouldRender] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showWordmark, setShowWordmark] = useState(false);
  const [hideCursor, setHideCursor] = useState(false);
  const [exiting, setExiting] = useState(false);

  useLockBodyScroll(shouldRender);

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
      if (sessionStorage.getItem(INITIAL_LOAD_KEY)) {
        setIsLoading(false);
        setShouldRender(false);
      } else {
        setShouldRender(true);
      }
    });
  }, [setIsLoading]);

  useEffect(() => {
    if (!mounted || !shouldRender || hasScheduled.current) return;
    hasScheduled.current = true;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timeouts: number[] = [];

    const finish = () => {
      sessionStorage.setItem(INITIAL_LOAD_KEY, "true");
      document.documentElement.setAttribute("data-initial-load", "complete");
      setShouldRender(false);
      setIsLoading(false);
    };

    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches;

    if (reduced) {
      timeouts.push(window.setTimeout(() => setShowWordmark(true), 0));
      timeouts.push(window.setTimeout(finish, isMobile ? 400 : 800));
      return () => timeouts.forEach((id) => window.clearTimeout(id));
    }

    const exitDelay =
      (BOOT_LINES[BOOT_LINES.length - 1].delay + 500) * (isMobile ? 0.55 : 1);
    const wordmarkMs = MOTION.duration.base * 1000 * (isMobile ? 0.7 : 1);
    const containerFadeMs = MOTION.duration.fast * 1000;
    const holdAfterWordmark = isMobile ? 350 : 800;

    timeouts.push(window.setTimeout(() => setShowWordmark(true), exitDelay));
    timeouts.push(
      window.setTimeout(
        () => setHideCursor(true),
        exitDelay + Math.max(0, wordmarkMs - 200),
      ),
    );
    timeouts.push(
      window.setTimeout(
        () => setExiting(true),
        exitDelay + wordmarkMs + holdAfterWordmark,
      ),
    );
    timeouts.push(
      window.setTimeout(
        finish,
        exitDelay + wordmarkMs + holdAfterWordmark + containerFadeMs,
      ),
    );

    return () => timeouts.forEach((id) => window.clearTimeout(id));
  }, [mounted, shouldRender, setIsLoading]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!isLoading || !mounted || !shouldRender) return null;

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      dir={"ltr"}
      ref={containerRef}
      className="fixed inset-0 z-9999 flex flex-col justify-center overflow-hidden bg-background"
      style={{
        opacity: exiting ? 0 : 1,
        transition: `opacity ${MOTION.duration.fast}s ${MOTION.ease.ui}`,
      }}
      suppressHydrationWarning
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_120%)] z-0" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.015] bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-size-[100%_4px] z-0" />
      <div className="absolute top-0 left-0 right-0 h-px bg-foreground/10" />
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 opacity-40">
        <span className="font-mono text-xs leading-normal tracking-[0.28em] uppercase text-foreground">
          Altruvex / Init
        </span>
        <span className="font-mono text-xs leading-normal tracking-wider text-primary">
          v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}
        </span>
      </div>
      <div className="px-8 md:px-16 max-w-2xl relative z-10">
        <div
          className="mb-12"
          style={{ minHeight: `${BOOT_LINES.length * 1.6}em` }}
        >
          {BOOT_LINES.map((line, i) => (
            <div
              key={i}
              className="flex items-center tracking-wide font-mono text-[clamp(11px,1vw,13px)] leading-[1.6] min-h-[1.6em]"
              style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                opacity: reduced ? 1 : 0,
                transform: reduced ? "none" : "translateY(4px)",
                animation: reduced
                  ? "none"
                  : `altruvex-boot-line 0.25s ${MOTION.ease.smooth} ${line.delay}ms forwards`,
              }}
            >
              {line.type === "check" && (
                <div className="flex w-full ml-4">
                  <span className="text-foreground/40 w-32 shrink-0">{line.label}</span>
                  <span className="text-foreground/10 tracking-[0.2em] grow overflow-hidden whitespace-nowrap">
                    {line.dots}
                  </span>
                  <span className="text-emerald-500/80 mx-4 w-4 shrink-0 text-center drop-shadow-[0_0_4px_rgba(34,197,94,0.4)]">
                    {line.status}
                  </span>
                  <span className="text-foreground/60 w-28 shrink-0">{line.value}</span>
                </div>
              )}
              {line.type !== "check" && (
                <span
                  className={`${
                    line.type === "command"
                      ? "text-foreground font-medium"
                      : line.type === "ready"
                      ? "text-primary ml-4"
                      : "text-transparent"
                  }`}
                >
                  {line.type === "ready" && <span className="mr-2 opacity-50">{">"}</span>}
                  {line.text}
                  {i === BOOT_LINES.length - 1 && (
                    <span
                      className="inline-block w-[2px] h-[0.9em] bg-primary ml-2 align-middle"
                      style={{
                        animation: hideCursor ? "none" : "altruvex-blink 1s step-end infinite",
                        opacity: hideCursor ? 0 : 1,
                        transition: `opacity ${MOTION.duration.instant}s ease`,
                      }}
                    />
                  )}
                </span>
              )}
            </div>
          ))}
        </div>
        <div
          style={{
            opacity: showWordmark ? 1 : 0,
            transform: showWordmark ? "translateY(0) scale(1)" : "translateY(12px) scale(0.98)",
            filter: showWordmark ? "blur(0px)" : "blur(4px)",
            transition: `all ${MOTION.duration.slow || 0.8}s ${MOTION.ease.smooth}`,
          }}
        >
          <div className="font-sans font-light text-foreground text-[clamp(36px,6vw,72px)] tracking-tight leading-none">
            Altruvex
          </div>
          <div className="font-mono text-[13px] leading-normal tracking-[0.3em] text-foreground/30 mt-3 uppercase">
            Engineering Beyond Standard.
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-foreground/10" />
      <style>{`
        @keyframes altruvex-boot-line {
          from { opacity: 0; transform: translateY(4px); filter: blur(2px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes altruvex-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
});