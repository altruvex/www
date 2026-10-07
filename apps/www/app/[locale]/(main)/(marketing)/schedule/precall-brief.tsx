"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { readApiResult } from "@/lib/api-errors";
import { trackEvent } from "@/lib/analytics";
import { localizeNumbers } from "@/lib/utils/number";
import { PRECALL_BRIEF_MAX } from "@/lib/validations/contact";
import { Eyebrow, Textarea } from "@repo/ui/www";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

const QUESTIONS = ["current", "change", "stakes"] as const;

type Question = (typeof QUESTIONS)[number];

type Status = "idle" | "sending" | "error" | "expired" | "done";

/**
 * The optional pre-call brief under a booked call: three short answers, each
 * skippable, sent once with the step token from the booking response.
 */
export function PreCallBrief({ token }: { token: string }) {
  const t = useTranslations("schedule.brief");
  const locale = useLocale();

  const [answers, setAnswers] = useState<Record<Question, string>>({
    current: "",
    change: "",
    stakes: "",
  });
  const [status, setStatus] = useState<Status>("idle");

  const answered = QUESTIONS.filter((key) => answers[key].trim()).length;
  const sending = status === "sending";

  const send = async () => {
    if (answered === 0 || sending) return;
    setStatus("sending");
    try {
      const response = await fetch("/api/schedule/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...answers }),
      });
      const result = await readApiResult(response);
      if (result.ok) {
        setStatus("done");
        trackEvent("precall_brief_completed", { locale, answered });
        return;
      }
      setStatus(result.code === "not_found" ? "expired" : "error");
    } catch {
      setStatus("error");
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send();
  };

  return (
    <section
      aria-labelledby="schedule-brief-heading"
      className="mt-12 max-w-3xl border-t border-border-subtle pt-8 md:mt-16"
    >
      <Eyebrow className="m-0">{t("eyebrow")}</Eyebrow>
      <h3
        id="schedule-brief-heading"
        className="mt-3 text-[clamp(1.375rem,2.4vw,2rem)] font-light leading-[1.2] tracking-[-0.02em] text-foreground rtl:leading-[1.4] rtl:tracking-normal"
      >
        {t("title")}
      </h3>
      <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
        {t("intro")}
      </p>

      {status === "done" ? (
        <p
          role="status"
          className="mt-8 flex items-start gap-2 text-base text-foreground"
        >
          <CheckCircle2
            aria-hidden
            className="mt-1 size-4 shrink-0 text-brand"
          />
          {t("success")}
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-8">
          {QUESTIONS.map((key) => (
            <div key={key}>
              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor={`schedule-brief-${key}`}
                  className="text-sm font-medium text-foreground"
                >
                  {t(`${key}.label`)}
                </label>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {t("count", {
                    count: localizeNumbers(String(answers[key].length), locale),
                    max: localizeNumbers(String(PRECALL_BRIEF_MAX), locale),
                  })}
                </span>
              </div>
              <Textarea
                id={`schedule-brief-${key}`}
                rows={3}
                maxLength={PRECALL_BRIEF_MAX}
                value={answers[key]}
                onChange={(event) => {
                  const value = event.target.value;
                  setAnswers((current) => ({ ...current, [key]: value }));
                  if (status === "error") setStatus("idle");
                }}
                placeholder={t(`${key}.placeholder`)}
                disabled={sending}
                className="mt-3 min-h-[6rem] resize-y rounded-none border-0 border-b border-border-subtle bg-transparent px-0 py-3 text-base leading-relaxed text-foreground shadow-none transition-colors duration-(--motion-hover) placeholder:text-muted-foreground/60 focus-visible:border-brand focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          ))}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <MagneticButton
              type="submit"
              variant="primary"
              disabled={answered === 0 || sending || status === "expired"}
              aria-busy={sending}
            >
              {sending ? t("submitting") : t("submit")}
            </MagneticButton>
            <div aria-live="polite" className="min-h-5 text-sm">
              {status === "error" ? (
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-destructive">
                  <AlertCircle aria-hidden className="size-4 shrink-0" />
                  {t("error")}
                  <button
                    type="button"
                    onClick={() => void send()}
                    className="text-foreground underline decoration-border underline-offset-4 transition-colors duration-(--motion-hover) hover:text-brand-text hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                  >
                    {t("retry")}
                  </button>
                </p>
              ) : status === "expired" ? (
                <p className="flex items-start gap-2 text-muted-foreground">
                  <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {t("expired")}
                </p>
              ) : answered === 0 ? (
                <p className="text-muted-foreground">{t("skipNote")}</p>
              ) : null}
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
