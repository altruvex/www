"use client";

import { useLoading } from "@/components/providers/loading-provider";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { MOTION } from "@/lib/motion";
import { memo, startTransition, useEffect, useRef, useState } from "react";
import { Container } from "./container";

const INITIAL_LOAD_KEY = "Altruvex_initial_load_complete";

const BOOT_LINES = [
  { text: "$ altruvex --init", delay: 0, type: "command" },
  { text: "", delay: 300, type: "blank" },
  { label: "runtime", status: "✓", value: "Next.js 16", delay: 420, type: "check" },
  { label: "compiler", status: "✓", value: "TypeScript 6", delay: 560, type: "check" },
  { label: "design system", status: "✓", value: "Tailwind v4", delay: 700, type: "check" },
  { label: "locale", status: "✓", value: "AR / EN", delay: 840, type: "check" },
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
    const holdAfterWordmark = isMobile ? 450 : 900;

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
      dir="ltr"
      ref={containerRef}
      className="fixed inset-0 z-9999 flex flex-col justify-center overflow-hidden bg-background selection:bg-brand/20"
      style={{
        opacity: exiting ? 0 : 1,
        transition: `opacity ${MOTION.duration.fast}s ${MOTION.ease.ui}`,
      }}
      suppressHydrationWarning
      aria-hidden="true"
    >
      <div className="grain-overlay" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_100%)] z-0" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.02] bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-size-[100%_4px] z-0 dark:opacity-[0.04]" />
      <div className="absolute top-0 inset-x-0 h-px bg-border" />
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-6 py-4 md:px-12 md:py-6 opacity-60">
        <Eyebrow>Altruvex / Init</Eyebrow>
        <span className="font-mono text-xs tracking-wider text-brand-text/80">
          v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}
        </span>
      </div>
      <Container className="w-full relative z-10 flex flex-col items-start">
        <div
          className="mb-12 w-full"
          style={{ minHeight: `${BOOT_LINES.length * 1.8}em` }}
        >
          {BOOT_LINES.map((line, i) => (
            <div
              key={i}
              className="flex items-center tracking-wide font-mono text-sm sm:text-base leading-[1.8] min-h-[1.8em] w-full max-w-md"
              style={{
                opacity: reduced ? 1 : 0,
                transform: reduced ? "none" : "translateY(6px)",
                animation: reduced
                  ? "none"
                  : `altruvex-boot-line 0.3s ${MOTION.ease.smooth} ${line.delay}ms forwards`,
              }}
            >
              {line.type === "check" && (
                <div className="flex w-full ml-4 md:ml-6 items-end">
                  <span className="text-muted-foreground shrink-0">{line.label}</span>
                  <span className="grow border-b-2 border-dotted border-border-mid mx-3 mb-[0.4em] opacity-40" />
                  <span className="text-success mx-3 shrink-0 flex items-center justify-center drop-shadow-sm">
                    {line.status}
                  </span>
                  <span className="text-foreground/80 shrink-0 min-w-[100px] text-right">
                    {line.value}
                  </span>
                </div>
              )}
              
              {line.type !== "check" && (
                <span
                  className={`${
                    line.type === "command"
                      ? "text-foreground"
                      : line.type === "ready"
                      ? "text-brand-text ml-4 md:ml-6"
                      : "text-transparent"
                  }`}
                >
                  {line.type === "ready" && <span className="mr-3 opacity-50">{">"}</span>}
                  {line.text}
                  {i === BOOT_LINES.length - 1 && (
                    <span
                      className="inline-block w-[6px] h-[1em] bg-brand-text ml-2 align-middle"
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
          className="will-change-transform"
          style={{
            opacity: showWordmark ? 1 : 0,
            transform: showWordmark ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
            filter: showWordmark ? "blur(0px)" : "blur(8px)",
            transition: `all ${MOTION.duration.slow || 0.8}s cubic-bezier(0.2, 0.8, 0.2, 1)`,
          }}
        >
          <h1 className="font-sans text-foreground text-[clamp(2.5rem,8vw,5.5rem)] tracking-tight leading-none">
            Altruvex
          </h1>
          <Eyebrow className="mt-4 ml-1">Engineering Beyond Standard.</Eyebrow>
        </div>
      </Container>
      <div className="absolute bottom-0 inset-x-0 h-px bg-border" />
      <style>{`
        @keyframes altruvex-boot-line {
          from { 
            opacity: 0; 
            transform: translateY(8px); 
            filter: blur(4px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
            filter: blur(0); 
          }
        }
        @keyframes altruvex-blink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }
      `}</style>
    </div>
  );
});