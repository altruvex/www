"use client";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Accent, Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bodyMarks } from "@/components/ui/rich-text";
import {
  useTransparency,
  type BrandIdentity,
  type Complexity,
  type ContentReadiness,
  type ProjectType,
  type Timeline,
} from "@/hooks/use-transparency";
import { Link } from "@/i18n/navigation";
import {
  useReveal,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import {
  buildPDFHtml,
  generateEstimatePdf,
  mapProjectType,
  validatePhone,
  type DeliverableTier,
  type TransparencyTranslator,
} from "@/lib/utils/transparency-utils";
import { cn } from "@/lib/utils/utils";
import { ArrowRight, Check, Download, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionHeading } from "./section-heading";

type QuestionKey =
  | "projectType"
  | "complexity"
  | "brandIdentity"
  | "contentReadiness"
  | "timeline";

interface QuestionDef {
  key: QuestionKey;
  msg: string;
  options: readonly string[];
}

const QUESTIONS: readonly QuestionDef[] = [
  {
    key: "projectType",
    msg: "projectType",
    options: ["website", "webapp", "ecommerce", "pwa"],
  },
  { key: "complexity", msg: "complexity", options: ["basic", "standard", "premium"] },
  {
    key: "brandIdentity",
    msg: "brand",
    options: ["complete", "partial", "scratch"],
  },
  {
    key: "contentReadiness",
    msg: "content",
    options: ["provide", "need-help", "unsure"],
  },
  { key: "timeline", msg: "timeline", options: ["urgent", "standard", "flexible"] },
] as const;

const TOTAL = QUESTIONS.length;

const KNOWN_TIERS = new Set([
  "essential",
  "professional",
  "commerce",
  "flagship",
]);

const COMPLEXITY_TIER: Record<
  NonNullable<Complexity>,
  Exclude<DeliverableTier, "enterprise">
> = {
  basic: "small",
  standard: "medium",
  premium: "large",
};

const TIMELINE_SCALE_MAX = 32;

const ROW_DELAY = [
  "",
  "[animation-delay:70ms]",
  "[animation-delay:140ms]",
  "[animation-delay:210ms]",
] as const;

type Phase = "quiz" | "capture" | "result";

export interface TransparencyEstimatorProps {
  pageHeading?: boolean;
  initialTier?: string | null;
  initialProjectType?: ProjectType;
}

export function TransparencyEstimator({
  pageHeading = false,
  initialTier = null,
  initialProjectType = null,
}: TransparencyEstimatorProps = {}) {
  const t = useTranslations("transparency");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");

  const {
    projectType,
    complexity,
    brandIdentity,
    contentReadiness,
    timeline,
    setProjectType,
    setComplexity,
    setBrandIdentity,
    setContentReadiness,
    setTimeline,
    getEstimate,
    reset,
  } = useTransparency({ initialTier, initialProjectType });

  const [phase, setPhase] = useState<Phase>("quiz");

  const [stepIndex, setStepIndex] = useState(() => {
    const first = [
      projectType,
      complexity,
      brandIdentity,
      contentReadiness,
      timeline,
    ].findIndex((v) => v === null);
    return first === -1 ? 0 : first;
  });

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();
  const stageRef = useReveal<HTMLDivElement>();

  const answers: Record<QuestionKey, string | null> = {
    projectType,
    complexity,
    brandIdentity,
    contentReadiness,
    timeline,
  };
  const answeredCount = Object.values(answers).filter(Boolean).length;

  const select = useCallback(
    (key: QuestionKey, value: string) => {
      if (key === "projectType") setProjectType(value as ProjectType);
      if (key === "complexity") setComplexity(value as Complexity);
      if (key === "brandIdentity") setBrandIdentity(value as BrandIdentity);
      if (key === "contentReadiness")
        setContentReadiness(value as ContentReadiness);
      if (key === "timeline") setTimeline(value as Timeline);
    },
    [
      setProjectType,
      setComplexity,
      setBrandIdentity,
      setContentReadiness,
      setTimeline,
    ],
  );

  const currency = useMemo(
    () =>
      new Intl.NumberFormat(isAr ? "ar-EG" : "en-EG", {
        style: "currency",
        currency: "EGP",
        maximumFractionDigits: 0,
      }),
    [isAr],
  );
  const money = useCallback((n: number) => currency.format(n), [currency]);
  const num = useCallback(
    (n: number) => localizeNumbers(String(n), locale),
    [locale],
  );

  const estimate = getEstimate();

  const question = QUESTIONS[stepIndex];
  const answered = answers[question.key] !== null;
  const isLast = stepIndex === TOTAL - 1;

  const goNext = useCallback(() => {
    if (isLast) setPhase("capture");
    else setStepIndex((i) => Math.min(i + 1, TOTAL - 1));
  }, [isLast]);

  const goBack = useCallback(() => {
    if (phase === "capture") {
      setPhase("quiz");
      return;
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  }, [phase]);

  const startOver = useCallback(() => {
    reset();
    setPhase("quiz");
    setStepIndex(0);
    setPhone("");
    setName("");
    setPhoneError(null);
  }, [reset]);

  const submit = useCallback(async () => {
    if (!validatePhone(phone)) {
      setPhoneError(t("phoneCapture.phoneError"));
      return;
    }
    if (!estimate || !projectType || !complexity || !timeline) return;

    setSubmitting(true);
    setPhoneError(null);
    try {
      const res = await fetch("/api/transparency-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: isAr ? "ar" : "en",
          phone,
          name: name || undefined,
          projectType,
          complexity,
          timeline,
          priceMin: estimate.minPrice,
          priceMax: estimate.maxPrice,
          weeksMin: estimate.minWeeks,
          weeksMax: estimate.maxWeeks,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPhoneError(data?.errors?.phone ?? t("phoneCapture.phoneError"));
        return;
      }
      setPhase("result");
    } catch {
      setPhoneError(t("phoneCapture.phoneError"));
    } finally {
      setSubmitting(false);
    }
  }, [phone, name, estimate, projectType, complexity, timeline, isAr, t]);

  const downloadPdf = useCallback(async () => {
    if (!estimate || !projectType || !complexity || !timeline) return;
    setDownloading(true);
    try {
      const html = buildPDFHtml({
        locale: isAr ? "ar" : "en",
        t: t as unknown as TransparencyTranslator,
        projectType: mapProjectType(projectType),
        tier: COMPLEXITY_TIER[complexity],
        timelineKey: timeline,
        priceMin: estimate.minPrice,
        priceMax: estimate.maxPrice,
        weeksMin: estimate.minWeeks,
        weeksMax: estimate.maxWeeks,
        phone,
        name,
      });
      await generateEstimatePdf(html, `altruvex-estimate-${locale}.pdf`);
    } finally {
      setDownloading(false);
    }
  }, [estimate, projectType, complexity, timeline, isAr, locale, t, phone, name]);

  return (
    <section
      id="transparency-estimator"
      className="accent-world-blue border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        {pageHeading ? (
          <div className="mb-10 text-center md:mb-14">
            <Eyebrow ref={eyebrowRef} tone="accent" className="justify-center">
              {t("badge")}
            </Eyebrow>
            <h1
              ref={titleRef}
              className="mt-4 section-title font-normal text-foreground"
            >
              {t("title")} <Highlight>{t("titleItalic")}</Highlight>
            </h1>
            <p
              ref={descRef}
              className="mx-auto mt-5 max-w-2xl text-[clamp(1rem,1.1vw,1.125rem)] leading-relaxed text-muted-foreground"
            >
              {t("subtitle")}
            </p>
            {initialTier && KNOWN_TIERS.has(initialTier) && (
              <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
                <span className="size-1.5 rounded-full bg-local-accent" />
                <span className="eyebrow text-muted-foreground">
                  {t("preselected")} · {t(`tierNames.${initialTier}`)}
                </span>
              </span>
            )}
          </div>
        ) : (
          <SectionHeading
            eyebrow={t("badge")}
            firstTitle={t("title")}
            secondTitle={t("titleItalic")}
            description={t("subtitle")}
            className="mb-10 md:mb-14"
          />
        )}
        <div
          ref={stageRef}
          className="grid gap-10 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-16 xl:gap-20"
        >
          <Ledger
            answers={answers}
            answeredCount={answeredCount}
            activeIndex={stepIndex}
            phase={phase}
            t={t}
            num={num}
          />
          <div className="min-w-0">
            {phase === "quiz" && (
              <QuizStep
                key={question.key}
                question={question}
                selected={answers[question.key]}
                onSelect={(v) => select(question.key, v)}
                t={t}
                num={num}
                index={stepIndex}
              />
            )}
            {phase === "capture" && (
              <Capture
                t={t}
                phone={phone}
                name={name}
                phoneError={phoneError}
                onPhone={setPhone}
                onName={setName}
              />
            )}
            {phase === "result" && estimate && (
              <ResultReceipt
                t={t}
                money={money}
                num={num}
                estimate={estimate}
                deliverables={
                  projectType && complexity
                    ? ((t.raw(
                      `pdfContent.deliverables.${mapProjectType(
                        projectType,
                      )}.${COMPLEXITY_TIER[complexity]}`,
                    ) as string[]) ?? [])
                    : []
                }
                onDownload={downloadPdf}
                downloading={downloading}
              />
            )}
            <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
              {phase === "result" ? (
                <button
                  type="button"
                  onClick={startOver}
                  className="eyebrow text-muted-foreground transition-all hover:text-foreground"
                >
                  {t("startOver")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={phase === "quiz" && stepIndex === 0}
                  className="eyebrow text-muted-foreground transition-all hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
                >
                  {t("back")}
                </button>
              )}
              {phase === "quiz" && (
                <Button
                  variant="brand"
                  size="lg"
                  onClick={goNext}
                  disabled={!answered}
                  className="group"
                >
                  {isLast ? t("getEstimate") : t("next")}
                  <ArrowRight className="transition-all duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                </Button>
              )}
              {phase === "capture" && (
                <Button
                  variant="brand"
                  size="lg"
                  onClick={submit}
                  loading={submitting}
                >
                  {submitting
                    ? t("phoneCapture.submitting")
                    : t("phoneCapture.button")}
                  {!submitting && <ArrowRight className="rtl:rotate-180" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

type Translator = ReturnType<typeof useTranslations<"transparency">>;

function Ledger({
  answers,
  answeredCount,
  activeIndex,
  phase,
  t,
  num,
}: {
  answers: Record<QuestionKey, string | null>;
  answeredCount: number;
  activeIndex: number;
  phase: Phase;
  t: Translator;
  num: (n: number) => string;
}) {
  const resolved = phase === "result";
  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <Eyebrow tone="accent">{t("ledger.eyebrow")}</Eyebrow>
      <p className="mt-3 text-xs text-muted-foreground">
        {resolved ? t("ledger.resolved") : t("ledger.forming")}
        <span className="mx-2 text-muted-foreground/40">·</span>
        <span className="tabular-nums text-foreground">
          {num(answeredCount)}/{num(TOTAL)}
        </span>
      </p>

      <ol className="mt-6">
        {QUESTIONS.map((q, i) => {
          const value = answers[q.key];
          const done = value != null;
          const active = phase === "quiz" && i === activeIndex;
          return (
            <li
              key={q.key}
              className="relative flex items-baseline gap-4 border-t border-border p-3.5 first:border-t-0"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-1 inset-s-0 w-0.5 origin-top rounded-full bg-local-accent transition-transform duration-500 ease-smooth",
                  active ? "scale-y-100" : "scale-y-0",
                )}
              />
              <span
                className={cn(
                  "w-5 shrink-0 text-[11px] tabular-nums transition-colors",
                  done
                    ? "text-local-accent"
                    : active
                      ? "text-foreground"
                      : "text-muted-foreground/50",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-[10px] transition-colors",
                    done || active
                      ? "text-muted-foreground"
                      : "text-muted-foreground/45",
                  )}
                >
                  {t(`ledger.labels.${q.key}`)}
                </span>
                <span
                  className={cn(
                    "mt-1 block truncate text-sm transition-colors",
                    done ? "text-foreground" : "text-muted-foreground/40",
                  )}
                >
                  {done ? (
                    <Highlight>{t(`steps.${q.msg}.options.${value}.title`)}</Highlight>
                  ) : active ? (
                    t("ledger.pending")
                  ) : (
                    "—"
                  )}
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "size-1.5 shrink-0 self-center rounded-full transition-colors",
                  done
                    ? "bg-local-accent"
                    : active
                      ? "bg-local-accent/40 motion-safe:animate-pulse"
                      : "bg-border",
                )}
              />
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function QuizStep({
  question,
  selected,
  onSelect,
  t,
  num,
  index,
}: {
  question: QuestionDef;
  selected: string | null;
  onSelect: (value: string) => void;
  t: Translator;
  num: (n: number) => string;
  index: number;
}) {
  const base = `steps.${question.msg}`;
  return (
    <div>
      <p className="text-xs text-local-accent motion-safe:animate-in motion-safe:fade-in">
        {t("step")} {num(index + 1)}{" "}
        <span className="text-muted-foreground/50">/ {num(TOTAL)}</span>
      </p>
      <h3 className="mt-4 section-title text-[clamp(1.6rem,3.4vw,2.6rem)] font-normal leading-[1.1] text-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
        {t(`${base}.title`)}
      </h3>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
        {t.rich(`${base}.hint`, bodyMarks)}
      </p>

      <div
        role="radiogroup"
        aria-label={t(`${base}.title`)}
        className="mt-8"
      >
        {question.options.map((opt, i) => {
          const active = selected === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(opt)}
              className={cn(
                "group relative flex w-full items-start gap-4 border-t border-border p-5 text-start transition-all duration-300 ease-smooth first:border-t-0 hover:bg-surface/60 focus-visible:outline-none focus-visible:bg-surface/60 md:gap-6",
                "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
                ROW_DELAY[i] ?? "",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-2 inset-s-0 w-[3px] origin-top rounded-full bg-local-accent transition-transform duration-300 ease-smooth",
                  active ? "scale-y-100" : "scale-y-0",
                )}
              />
              <span
                className={cn(
                  "w-7 shrink-0 pt-0.5 text-xs tabular-nums transition-colors duration-300",
                  active
                    ? "text-local-accent"
                    : "transition-all text-muted-foreground/60 group-hover:text-local-accent",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-medium text-foreground md:text-xl">
                  {active ? (
                    <Highlight>{t(`${base}.options.${opt}.title`)}</Highlight>
                  ) : (
                    t(`${base}.options.${opt}.title`)
                  )}
                </span>
                <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                  {t(`${base}.options.${opt}.description`)}
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border transition-[color,background-color,border-color] duration-300",
                  active
                    ? "border-local-accent bg-local-accent text-local-accent-fg"
                    : "transition-all border-border text-transparent group-hover:border-border-mid",
                )}
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Capture({
  t,
  phone,
  name,
  phoneError,
  onPhone,
  onName,
}: {
  t: Translator;
  phone: string;
  name: string;
  phoneError: string | null;
  onPhone: (v: string) => void;
  onName: (v: string) => void;
}) {
  return (
    <div className="max-w-xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <p className="text-xs text-local-accent">
        {t("ledger.resolved")}
      </p>
      <h3 className="mt-4 section-title text-[clamp(1.6rem,3.4vw,2.6rem)] font-normal leading-[1.1] text-foreground">
        {t("phoneCapture.title")}
      </h3>
      <p className="mt-4 text-[clamp(1rem,1.1vw,1.125rem)] leading-relaxed text-muted-foreground">
        {t("phoneCapture.subtitle")}
      </p>
      <div className="mt-8 space-y-6">
        <div>
          <Label htmlFor="tx-phone">{t("phoneCapture.phoneLabel")}</Label>
          <Input
            id="tx-phone"
            type="tel"
            inputMode="tel"
            normalize
            dir="ltr"
            className="mt-2 text-start"
            placeholder={t("phoneCapture.phonePlaceholder")}
            value={phone}
            onChange={(e) => onPhone(e.target.value)}
            aria-invalid={phoneError ? true : undefined}
          />
          <p
            className={cn(
              "mt-2 text-xs",
              phoneError ? "text-error" : "text-muted-foreground",
            )}
          >
            {phoneError ?? t("phoneCapture.phoneHint")}
          </p>
        </div>
        <div>
          <Label htmlFor="tx-name">{t("phoneCapture.nameLabel")}</Label>
          <Input
            id="tx-name"
            className="mt-2"
            placeholder={t("phoneCapture.namePlaceholder")}
            value={name}
            onChange={(e) => onName(e.target.value)}
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t.rich("phoneCapture.trustNote", bodyMarks)}
        </p>
      </div>
    </div>
  );
}

function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 900;
    let raf = 0;
    let startTs = 0;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = duration === 0 ? 1 : Math.min((ts - startTs) / duration, 1);
      if (p < 1) {
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round((target * eased) / 1000) * 1000);
        raf = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

function ResultReceipt({
  t,
  money,
  num,
  estimate,
  deliverables,
  onDownload,
  downloading,
}: {
  t: Translator;
  money: (n: number) => string;
  num: (n: number) => string;
  estimate: {
    minPrice: number;
    maxPrice: number;
    minWeeks: number;
    maxWeeks: number;
  };
  deliverables: string[];
  onDownload: () => void;
  downloading: boolean;
}) {
  const minLive = useCountUp(estimate.minPrice);
  const maxLive = useCountUp(estimate.maxPrice);

  const preview = deliverables.slice(0, 6);
  const remaining = Math.max(deliverables.length - preview.length, 0);

  const left = Math.max(
    0,
    Math.min((estimate.minWeeks / TIMELINE_SCALE_MAX) * 100, 100),
  );
  const width = Math.max(
    6,
    Math.min(
      ((estimate.maxWeeks - estimate.minWeeks) / TIMELINE_SCALE_MAX) * 100,
      100 - left,
    ),
  );

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
      <Eyebrow tone="accent">{t("results.badge")}</Eyebrow>
      <h3 className="mt-4 section-title text-[clamp(1.75rem,3.4vw,2.6rem)] font-normal leading-[1.05] text-foreground">
        {t("results.title")}
      </h3>
      <div className="mt-8 border-t border-border pt-6">
        <Eyebrow tone="muted">{t("results.investment")}</Eyebrow>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-[clamp(2.25rem,5.5vw,3.75rem)] font-medium leading-[0.95] tracking-[-0.03em] tabular-nums text-foreground">
            {money(minLive)}
          </span>
          <span className="text-[clamp(1.25rem,2.4vw,1.75rem)] font-light text-muted-foreground tabular-nums">
            – {money(maxLive)}
          </span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {t("results.hostingIncluded")}
        </p>
      </div>
      <div className="mt-8 border-t border-border pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <Eyebrow tone="muted">{t("results.timeline")}</Eyebrow>
          <p className="text-lg font-medium tabular-nums text-foreground">
            {num(estimate.minWeeks)}–{num(estimate.maxWeeks)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {t("results.weeks")}
            </span>
          </p>
        </div>
        <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <span
            className="absolute inset-y-0 rounded-full bg-local-accent"
            style={{ insetInlineStart: `${left}%`, width: `${width}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {t("results.disclaimer")}
        </p>
      </div>
      <p className="mt-8 text-[clamp(1rem,1.1vw,1.125rem)] leading-relaxed text-muted-foreground">
        {t.rich("results.rangeCopy", {
          ...bodyMarks,
          min: money(estimate.minPrice),
          max: money(estimate.maxPrice),
          weeksMin: num(estimate.minWeeks),
          weeksMax: num(estimate.maxWeeks),
        })}
      </p>
      {preview.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <Eyebrow tone="muted">{t("results.whatYouGet")}</Eyebrow>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {preview.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Check
                  className="mt-1 size-4 shrink-0 text-local-accent"
                  strokeWidth={2.5}
                />
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {item}
                </span>
              </li>
            ))}
          </ul>
          {remaining > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              {t("results.moreInPdf", { count: num(remaining) })}
            </p>
          )}
        </div>
      )}
      <p className="mt-8 border-s-2 border-local-accent/40 ps-5 text-sm leading-relaxed text-muted-foreground">
        <Accent gradient="iris" className="font-medium">
          {t("results.rangeCtaLabel")}
        </Accent>
        {" — "}
        {t.rich("results.rangeCta", bodyMarks)}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-border pt-6">
        <Button variant="brand" size="lg" asChild>
          <Link href="/schedule">{t("results.ctaPrimary")}</Link>
        </Button>
        <Button variant="outline" size="lg" onClick={onDownload} loading={downloading}>
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {downloading ? t("pdf.generating") : t("pdf.button")}
        </Button>
      </div>
    </div>
  );
}
