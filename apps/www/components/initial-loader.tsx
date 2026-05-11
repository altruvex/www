"use client";

import { useLoading } from "@/components/providers/loading-provider";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { MOTION } from "@/lib/motion";
import { memo, startTransition, useEffect, useRef, useState } from "react";

const INITIAL_LOAD_KEY = "Altruvex_initial_load_complete";

const BOOT_LINES = [
  { text: "$ altruvex --init", delay: 0, type: "command" },
  { text: "", delay: 300, type: "blank" },
  { text: "  runtime...........  ✓     Next.js 16", delay: 420, type: "check" },
  {
    text: "  compiler..........  ✓     TypeScript 6",
    delay: 560,
    type: "check",
  },
  {
    text: "  design system.....  ✓     Tailwind v4",
    delay: 700,
    type: "check",
  },
  { text: "  locale............  ✓     AR / EN", delay: 840, type: "check" },
  { text: "", delay: 980, type: "blank" },
  { text: "  ready.", delay: 1050, type: "ready" },
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

    if (reduced) {
      timeouts.push(window.setTimeout(() => setShowWordmark(true), 0));
      timeouts.push(window.setTimeout(finish, 800));
      return () => timeouts.forEach((id) => window.clearTimeout(id));
    }

    const exitDelay = BOOT_LINES[BOOT_LINES.length - 1].delay + 500;
    const wordmarkMs = MOTION.duration.base * 1000;
    const containerFadeMs = MOTION.duration.fast * 1000;
    const holdAfterWordmark = 600;

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
      className="fixed inset-0 z-9999 flex flex-col justify-center overflow-hidden "
      style={{
        background: "hsl(var(--background))",
        opacity: exiting ? 0 : 1,
        transition: `opacity ${MOTION.duration.fast}s ${MOTION.ease.ui}`,
      }}
      suppressHydrationWarning
      aria-hidden="true"
    >
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: "0.5px",
          background:
            "color-mix(in srgb, hsl(var(--foreground)) 8%, transparent)",
        }}
      />

      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5"
        style={{ opacity: 0.22 }}
      >
        <span
          className="font-mono text-sm leading-normal tracking-wider uppercase"
          style={{
            fontSize: "9px",
            letterSpacing: "0.28em",
            color: "var(--foreground)",
          }}
        >
          Altruvex / Init
        </span>
        <span className="font-mono text-xs leading-normal tracking-wider text-primary">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </span>
      </div>

      <div className="px-8 md:px-16 max-w-2xl">
        <div
          className="mb-10"
          style={{ minHeight: `${BOOT_LINES.length * 1.6}em` }}
        >
          {BOOT_LINES.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: "clamp(11px, 1vw, 13px)",
                lineHeight: 1.6,
                color:
                  line.type === "command"
                    ? "var(--foreground)"
                    : line.type === "check"
                      ? "color-mix(in srgb, hsl(var(--foreground)) 55%, transparent)"
                      : line.type === "ready"
                        ? "var(--foreground)"
                        : "transparent",
                letterSpacing: "0.02em",
                minHeight: "1.6em",
                display: "flex",
                alignItems: "center",
                gap: "0.5em",
                opacity: reduced ? 1 : 0,
                transform: reduced ? "none" : "translateY(3px)",
                animation: reduced
                  ? "none"
                  : `altruvex-boot-line 0.2s ${MOTION.ease.smooth} ${line.delay}ms forwards`,
              }}
            >
              {line.type === "check" && (
                <span style={{ color: "rgba(34,197,94,0.7)" }}>
                  {line.text.includes("✓")
                    ? line.text
                        .replace("✓", "")
                        .split("  ")
                        .map((part, j) =>
                          j === 0 ? (
                            <span key={j} style={{ opacity: 0.35 }}>
                              {part}
                            </span>
                          ) : j === 1 ? (
                            <span
                              key={j}
                              style={{ color: "rgba(34,197,94,0.7)" }}
                            >
                              ✓
                            </span>
                          ) : (
                            <span
                              key={j}
                              style={{
                                color:
                                  "color-mix(in srgb, hsl(var(--foreground)) 55%, transparent)",
                              }}
                            >
                              {part}
                            </span>
                          ),
                        )
                    : line.text}
                </span>
              )}
              {line.type !== "check" && (
                <span>
                  {line.text}
                  {i === BOOT_LINES.length - 1 && (
                    <span
                      style={{
                        display: "inline-block",
                        width: "2px",
                        height: "0.9em",
                        background: "var(--foreground)",
                        marginLeft: "2px",
                        verticalAlign: "middle",
                        animation: hideCursor
                          ? "none"
                          : "altruvex-blink 1s step-end infinite",
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
            transform: showWordmark ? "translateY(0)" : "translateY(8px)",
            transition: `opacity ${MOTION.duration.base}s ${MOTION.ease.smooth}, transform ${MOTION.duration.base}s ${MOTION.ease.smooth}`,
          }}
        >
          <div
            className="font-sans font-light text-foreground"
            style={{
              fontSize: "clamp(36px, 6vw, 72px)",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            Altruvex
          </div>
          <div
            className="font-mono text-sm leading-normal tracking-wider text-foreground/25 mt-2"
            style={{
              fontSize: "10px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            Engineering Beyond Standard.
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "0.5px",
          background:
            "color-mix(in srgb, hsl(var(--foreground)) 8%, transparent)",
        }}
      />

      <style>{`
        @keyframes altruvex-boot-line {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes altruvex-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
});
