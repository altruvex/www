"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { ArrowLabel } from "@/components/shared/directional-link";
import { Container } from "@/components/shared/container";
import { Highlight } from "@repo/ui/www";
import { Link } from "@/i18n/navigation";
import { monoCaps } from "@/lib/utils/mono-caps";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type ErrorKind = "timeout" | "notFound" | "unauthorized" | "forbidden" | "generic";

const KIND_CODE: Record<ErrorKind, string> = {
  timeout: "504",
  notFound: "404",
  unauthorized: "401",
  forbidden: "403",
  generic: "500",
};

// The thrown message is developer text and never shown; it only picks which
// localized explanation fits.
function kindOf(error: Error): ErrorKind {
  const message = error.message?.toLowerCase() || "";
  if (message.includes("timeout") || message.includes("timed out")) return "timeout";
  if (message.includes("not found") || message.includes("404")) return "notFound";
  if (message.includes("unauthorized") || message.includes("401")) return "unauthorized";
  if (message.includes("forbidden") || message.includes("403")) return "forbidden";
  return "generic";
}

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

  const t = useTranslations("validations.errorPage");
  const kind = kindOf(error);
  const errorInfo = {
    code: KIND_CODE[kind],
    title1: t(`kinds.${kind}.title1`),
    title2: t(`kinds.${kind}.title2`),
    message: t(`kinds.${kind}.message`),
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background pt-(--section-y-top) pb-(--section-y-bottom)">
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute bottom-0 end-0 leading-none font-sans font-semibold tracking-tighter text-foreground/1.5"
        style={{ fontSize: "clamp(120px, 22vw, 340px)", lineHeight: 0.85 }}
      >
        {errorInfo.code}
      </div>

      <Container>
        <main
          className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center text-center"
          role="main"
          aria-label={t("ariaLabel")}
        >
          <div
            className={`flex flex-col items-center transition-[transform,opacity] duration-(--motion-base) ease-default ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <div className="mb-8 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-destructive/80 animate-pulse" />
              <span className={cn(monoCaps, "text-foreground/20")}>
                {t("code", { code: errorInfo.code })}
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
              <div className="mb-12 w-full max-w-md text-start">
                <details className="group rounded-panel-sm border border-border-subtle bg-foreground/1.5 p-4 transition-all hover:border-foreground/20 hover:bg-foreground/2">
                  <summary
                    className={cn(
                      monoCaps,
                      "cursor-pointer text-muted-foreground group-hover:text-primary/70 transition-all select-none",
                    )}
                  >
                    {t("digest")}
                  </summary>
                  <pre className="mt-4 overflow-auto rounded-panel-inset bg-foreground/5 p-3 text-md text-primary/70 leading-relaxed">
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
                  {t("tryAgain")}
                  <svg
                    className="h-4 w-4 transition-all duration-(--motion-drawer) group-hover:rotate-180"
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
                  <ArrowLabel>{t("goHome")}</ArrowLabel>
                </Link>
              </MagneticButton>
            </div>
            <span className={cn(monoCaps, "mt-10 text-primary/20")}>
              {t("diagnostics")}
            </span>
          </div>
        </main>
      </Container>
    </div>
  );
}
