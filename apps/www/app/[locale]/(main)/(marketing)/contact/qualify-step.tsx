"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { readApiResult } from "@/lib/api-errors";
import { trackEvent } from "@/lib/analytics";
import {
  QUALIFY_DECISION_ROLES,
  QUALIFY_SITUATIONS,
  QUALIFY_TIMELINES,
} from "@/lib/validations/contact";
import type { BudgetAnswerId } from "@repo/pricing-schema";
import { SegmentedControl } from "@repo/ui";
import { Eyebrow } from "@repo/ui/www";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

export type BudgetChoice = { id: BudgetAnswerId; label: string };

type Situation = (typeof QUALIFY_SITUATIONS)[number];
type Timeline = (typeof QUALIFY_TIMELINES)[number];
type DecisionRole = (typeof QUALIFY_DECISION_ROLES)[number];

type Answers = {
  situation?: Situation;
  budget?: BudgetAnswerId;
  projectTimeline?: Timeline;
  decisionRole?: DecisionRole;
};

type Status = "idle" | "sending" | "error" | "expired" | "done";

/**
 * The optional second step under the receipt: four single-choice questions,
 * each skippable, sent once with the step token from the first response.
 */
export function QualifyStep({
  token,
  budgetOptions,
}: {
  token: string;
  budgetOptions: readonly BudgetChoice[];
}) {
  const t = useTranslations("contactPage.receipt.qualify");
  const locale = useLocale();

  const [answers, setAnswers] = useState<Answers>({});
  const [status, setStatus] = useState<Status>("idle");

  const answered = Object.values(answers).filter(Boolean).length;
  const sending = status === "sending";

  const set =
    <K extends keyof Answers>(key: K) =>
    (value: NonNullable<Answers[K]>) => {
      setAnswers((current) => ({ ...current, [key]: value }));
      if (status === "error") setStatus("idle");
    };

  const send = async () => {
    if (answered === 0 || sending) return;
    setStatus("sending");
    try {
      const response = await fetch("/api/contact/qualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...answers }),
      });
      const result = await readApiResult(response);
      if (result.ok) {
        setStatus("done");
        trackEvent("qualification_completed", { locale, answered });
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
      aria-labelledby="contact-qualify-heading"
      data-receipt-part
      className="mt-16 border-t border-border-subtle pt-6"
    >
      <Eyebrow className="m-0">{t("eyebrow")}</Eyebrow>
      <h3
        id="contact-qualify-heading"
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
          <span>
            {t("success")}{" "}
            <span className="text-muted-foreground">{t("successNote")}</span>
          </span>
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-8">
          <SegmentedControl<Situation>
            label={t("situation.legend")}
            options={QUALIFY_SITUATIONS.map((value) => ({
              value,
              label: t(`situation.options.${value}`),
            }))}
            value={answers.situation}
            onChange={set("situation")}
            disabled={sending}
          />
          <SegmentedControl<BudgetAnswerId>
            label={t("budget.legend")}
            columns={2}
            options={budgetOptions.map(({ id, label }) => ({
              value: id,
              label,
            }))}
            value={answers.budget}
            onChange={set("budget")}
            disabled={sending}
          />
          <SegmentedControl<Timeline>
            label={t("timeline.legend")}
            columns={2}
            options={QUALIFY_TIMELINES.map((value) => ({
              value,
              label: t(`timeline.options.${value}`),
            }))}
            value={answers.projectTimeline}
            onChange={set("projectTimeline")}
            disabled={sending}
          />
          <SegmentedControl<DecisionRole>
            label={t("role.legend")}
            options={QUALIFY_DECISION_ROLES.map((value) => ({
              value,
              label: t(`role.options.${value}`),
            }))}
            value={answers.decisionRole}
            onChange={set("decisionRole")}
            disabled={sending}
          />

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
