"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Link } from "@/i18n/navigation";
import { monoCaps } from "@/lib/utils/mono-caps";
import { cn } from "@/lib/utils/utils";
import { useEffect, useState } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const getErrorInfo = () => {
    const errorMessage = error.message?.toLowerCase() || "";

    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("timed out")
    ) {
      return {
        code: "504",
        title1: "Request",
        title2: "Timeout",
        message: "The request took too long to complete. Please try again.",
      };
    }
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      return {
        code: "404",
        title1: "Page Not",
        title2: "Found",
        message: "The requested resource could not be found.",
      };
    }
    if (errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
      return {
        code: "401",
        title1: "Access",
        title2: "Unauthorized",
        message: "You are not authorized to access this resource.",
      };
    }
    if (errorMessage.includes("forbidden") || errorMessage.includes("403")) {
      return {
        code: "403",
        title1: "Access",
        title2: "Forbidden",
        message: "You do not have permission to access this resource.",
      };
    }

    return {
      code: "500",
      title1: "System",
      title2: "Error",
      message: "An unexpected error occurred. Please try again later.",
    };
  };

  const errorInfo = getErrorInfo();

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background pt-(--section-y-top) pb-(--section-y-bottom)">
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute bottom-0 ltr:right-0 rtl:left-0 leading-none font-sans font-semibold tracking-tighter text-foreground/1.5"
        style={{ fontSize: "clamp(120px, 22vw, 340px)", lineHeight: 0.85 }}
      >
        {errorInfo.code}
      </div>

      <Container>
        <main
          className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center text-center"
          role="main"
          aria-label="Error page"
        >
          <div
            className={`flex flex-col items-center transition-all duration-700 ease-out ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <div className="mb-8 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-destructive/80 animate-pulse" />
              <span className={cn(monoCaps, "text-foreground/20")}>
                Error Code {errorInfo.code}
              </span>
            </div>
            <h1
              className="mb-8 font-sans font-normal text-primary leading-[1.05] tracking-tight"
              style={{
                fontSize: "clamp(40px, 6vw, 72px)",
                letterSpacing: "-0.02em",
              }}
            >
              {errorInfo.title1}
              <br />
              <Highlight>{errorInfo.title2}</Highlight>
            </h1>

            <div className="h-px w-24 bg-foreground/8 mb-8" />
            <p className="mb-12 max-w-md text-base text-primary/60 leading-relaxed">
              {errorInfo.message}
            </p>
            {error.digest && (
              <div className="mb-12 w-full max-w-md text-left rtl:text-right">
                <details className="group rounded-lg border border-foreground/8 bg-foreground/1.5 p-4 transition-colors hover:border-foreground/20 hover:bg-foreground/2">
                  <summary
                    className={cn(
                      monoCaps,
                      "cursor-pointer text-muted-foreground group-hover:text-primary/70 transition-colors select-none",
                    )}
                  >
                    Error Digest
                  </summary>
                  <pre className="mt-4 overflow-auto rounded-lg bg-foreground/5 p-3 font-mono text-[13px] text-primary/70 leading-relaxed">
                    <code>{error.digest}</code>
                  </pre>
                </details>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <MagneticButton
                size="lg"
                variant="primary"
                onClick={reset}
                className="group min-w-[160px] justify-center"
              >
                <span className="flex items-center gap-2">
                  Try Again
                  <svg
                    className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </span>
              </MagneticButton>
              <MagneticButton
                asChild
                size="lg"
                variant="secondary"
                className="min-w-[160px] justify-center group"
              >
                <Link href="/">
                  <span className="flex items-center gap-2">
                    Go Home
                    <svg
                      className="h-4 w-4 transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:-rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </span>
                </Link>
              </MagneticButton>
            </div>
            <span className={cn(monoCaps, "mt-10 text-primary/20")}>
              System Diagnostics
            </span>
          </div>
        </main>
      </Container>
    </div>
  );
}
