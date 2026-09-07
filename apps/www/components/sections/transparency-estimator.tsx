"use client";

import { TransparencyChapter } from "@/components/sections/transparency-chapter";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import {
  useTransparency,
  type BrandIdentity,
  type Complexity,
  type ContentReadiness,
  type ProjectType,
  type Timeline,
} from "@/hooks/use-transparency";
import { useReveal } from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import {
  buildPDFHtml,
  generateEstimatePdf,
  mapProjectType,
  validatePhone,
  type TransparencyTranslator,
} from "@/lib/utils/transparency-utils";
import { cn } from "@/lib/utils/utils";
import {
  COMPLEXITY_TO_LEGACY_BAND,
  type EstimateResult,
} from "@repo/pricing-schema";
import { Button, Input, Label } from "@repo/ui";
import { Check, Download, Loader2, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

type QuestionKey =
  | "projectType"
  | "complexity"
  | "brandIdentity"
  | "contentReadiness"
  | "timeline";

type AnswerMap = Record<QuestionKey, string | null>;
type Translator = ReturnType<typeof useTranslations<"transparency">>;

type QuestionDef = {
  key: QuestionKey;
  msg: string;
  options: readonly string[];
};

const PRIMARY_QUESTIONS: readonly QuestionDef[] = [
  {
    key: "projectType",
    msg: "projectType",
    options: ["website", "webapp", "ecommerce", "pwa"],
  },
  {
    key: "complexity",
    msg: "complexity",
    options: ["basic", "standard", "premium"],
  },
] as const;

const READINESS_QUESTIONS: readonly QuestionDef[] = [
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
  {
    key: "timeline",
    msg: "timeline",
    options: ["urgent", "standard", "flexible"],
  },
] as const;

const QUESTIONS = [...PRIMARY_QUESTIONS, ...READINESS_QUESTIONS] as const;
const TOTAL = QUESTIONS.length;
const KNOWN_TIERS = new Set([
  "essential",
  "professional",
  "commerce",
  "flagship",
]);

// The PDF's deliverables tables are keyed by the legacy band names. The
// mapping lives in the schema so this is the only place that consumes it,
// rather than a fourth copy of the same three pairs.
const COMPLEXITY_TIER = COMPLEXITY_TO_LEGACY_BAND;

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

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const estimatorRef = useReveal<HTMLDivElement>();

  const answers: AnswerMap = {
    projectType,
    complexity,
    brandIdentity,
    contentReadiness,
    timeline,
  };

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const complete = answeredCount === TOTAL;
  const hasEnoughContext = Boolean(projectType && complexity);
  const estimate = getEstimate();

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
    (n: string | number) => localizeNumbers(String(n), locale),
    [locale],
  );

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
      setBrandIdentity,
      setComplexity,
      setContentReadiness,
      setProjectType,
      setTimeline,
    ],
  );

  const startOver = useCallback(() => {
    reset();
    setName("");
    setPhone("");
    setPhoneError(null);
    setSubmitted(false);
  }, [reset]);

  const submit = useCallback(async () => {
    if (!validatePhone(phone)) {
      setPhoneError(t("phoneCapture.phoneError"));
      return;
    }

    if (!estimate || !projectType || !complexity) return;

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
          timeline: timeline ?? "standard",
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

      setSubmitted(true);
    } catch {
      setPhoneError(t("phoneCapture.phoneError"));
    } finally {
      setSubmitting(false);
    }
  }, [complexity, estimate, isAr, name, phone, projectType, t, timeline]);

  const downloadPdf = useCallback(async () => {
    if (!estimate || !projectType || !complexity) return;

    setDownloading(true);
    try {
      const html = buildPDFHtml({
        locale: isAr ? "ar" : "en",
        t: t as unknown as TransparencyTranslator,
        projectType: mapProjectType(projectType),
        tier: COMPLEXITY_TIER[complexity],
        timelineKey: timeline ?? "standard",
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
  }, [
    complexity,
    estimate,
    isAr,
    locale,
    name,
    phone,
    projectType,
    t,
    timeline,
  ]);

  const deliverables =
    projectType && complexity
      ? ((t.raw(
          `pdfContent.deliverables.${mapProjectType(projectType)}.${COMPLEXITY_TIER[complexity]}`,
        ) as string[]) ?? [])
      : (t.raw("results.fallbackDeliverables") as string[]);

  return (
    <section
      id="transparency-estimator"
      aria-labelledby="transparency-estimator-heading"
      className="accent-world-blue border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        {/* No chapter index: the estimator is the instrument that produces the
            figure, not one of the three chapters that then explain it. */}
        <TransparencyChapter
          titleId="transparency-estimator-heading"
          titleAs={pageHeading ? "h1" : "h2"}
          eyebrow={t("badge")}
          title={t("title")}
          titleItalic={t("titleItalic")}
          lede={t("subtitle")}
        />
        {initialTier && KNOWN_TIERS.has(initialTier) ? (
          <PreselectedTier label={t(`tierNames.${initialTier}`)} t={t} />
        ) : null}

        <div
          ref={estimatorRef}
          className="mt-14 lg:mt-20 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12 xl:gap-16"
        >
          {/* Input rail. */}
          <div className="lg:col-span-7">
            <div className="space-y-12 lg:space-y-16">
              {PRIMARY_QUESTIONS.map((question, i) => (
                <QuestionBlock
                  key={question.key}
                  index={i + 1}
                  question={question}
                  selected={answers[question.key]}
                  onSelect={(val) => select(question.key, val)}
                  t={t}
                  num={num}
                />
              ))}

              {/* The instrument travels with the reader on desktop; on a phone
                  it belongs here, where the first two answers have just made
                  it meaningful and the readiness questions follow. */}
              <div className="lg:hidden">
                <LiveReadout
                  answeredCount={answeredCount}
                  hasEnoughContext={hasEnoughContext}
                  estimate={estimate}
                  answers={answers}
                  money={money}
                  num={num}
                  t={t}
                />
              </div>

              {/* Stage break: the first two questions describe the build, the
                  last three describe what the client brings to it. */}
              <div className="flex items-center gap-4 pt-2">
                <Eyebrow className="shrink-0 text-[11px] leading-none">
                  {t("readiness.title")}
                </Eyebrow>
                <span aria-hidden className="h-px min-w-6 flex-1 bg-border" />
              </div>

              {READINESS_QUESTIONS.map((question, i) => (
                <QuestionBlock
                  key={question.key}
                  index={PRIMARY_QUESTIONS.length + i + 1}
                  question={question}
                  selected={answers[question.key]}
                  onSelect={(val) => select(question.key, val)}
                  t={t}
                  num={num}
                />
              ))}
            </div>
          </div>

          <aside className="sticky top-28 hidden lg:col-span-5 lg:block">
            <LiveReadout
              answeredCount={answeredCount}
              hasEnoughContext={hasEnoughContext}
              estimate={estimate}
              answers={answers}
              money={money}
              num={num}
              t={t}
            />
          </aside>
        </div>

        {/* The payoff spans the container. Left inside the input rail it
            rendered at half width with the instrument column empty beside it —
            the number the reader came for, set narrower than the questions
            that produced it. */}
        {complete && estimate ? (
          <ResultPanel
            estimate={estimate}
            deliverables={deliverables}
            money={money}
            num={num}
            t={t}
            name={name}
            setName={setName}
            phone={phone}
            setPhone={setPhone}
            phoneError={phoneError}
            submitting={submitting}
            submitted={submitted}
            downloading={downloading}
            onSubmit={submit}
            onDownload={downloadPdf}
            onStartOver={startOver}
          />
        ) : null}
      </Container>
    </section>
  );
}

function PreselectedTier({ label, t }: { label: string; t: Translator }) {
  return (
    <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2">
      <span className="size-2 rounded-full bg-local-accent" aria-hidden />
      <span className="eyebrow text-[11px] text-muted-foreground">
        {t("preselected")} / {label}
      </span>
    </div>
  );
}

/**
 * One question, as an indexed rule and a hairline-ruled list of answers.
 *
 * The options were a two-column grid of bordered cards with a radio dot — the
 * default shape of every SaaS form, and one that leaves a hole in the grid
 * whenever a question has three answers instead of four. Rows never leave a
 * hole, hold the whole answer on two lines instead of four, and let the reader
 * compare answers down a single column rather than across a broken grid.
 *
 * Selection carries three signals, not one: an accent edge, a tinted ground,
 * and a check (principles C13 — colour is never the only signal). The radio
 * semantics are unchanged.
 */
function QuestionBlock({
  index,
  question,
  selected,
  onSelect,
  t,
  num,
}: {
  index: number;
  question: QuestionDef;
  selected: string | null;
  onSelect: (val: string) => void;
  t: Translator;
  num: (n: string | number) => string;
}) {
  const base = `steps.${question.msg}`;

  return (
    <section
      aria-labelledby={`question-${question.key}`}
      className="scroll-mt-32"
    >
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="eyebrow shrink-0 text-[11px] leading-none tabular-nums text-local-accent-text ltr:font-mono"
          >
            {num(String(index).padStart(2, "0"))}
          </span>
          <span aria-hidden className="h-px min-w-6 flex-1 bg-border" />
        </div>
        <h3
          id={`question-${question.key}`}
          className="mt-5 text-[clamp(1.35rem,1.9vw,1.7rem)] font-medium leading-[1.15] tracking-[-0.02em] text-balance text-foreground"
        >
          {t(`${base}.title`)}
        </h3>
        {/* Already written and translated in both locales, and never shown
            until now: the sentence that says why the question is asked. */}
        <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
          {t.rich(`${base}.hint`, bodyMarks)}
        </p>
      </header>

      <div
        role="radiogroup"
        aria-label={t(`${base}.title`)}
        className="grid list-none gap-px overflow-hidden rounded-lg border border-border bg-border"
      >
        {question.options.map((option) => {
          const isSelected = selected === option;

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(option)}
              className={cn(
                "group relative flex w-full items-start gap-4 px-5 py-5 text-start outline-none transition-colors duration-200 ease-smooth sm:px-6 sm:py-6",
                "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                isSelected
                  ? "bg-local-accent-soft"
                  : "bg-background hover:bg-surface/70",
              )}
            >
              {/* Selection edge — the first of three signals. */}
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-y-0 start-0 w-0.5 transition-colors",
                  isSelected ? "bg-local-accent" : "bg-transparent",
                )}
              />
              <span className="grid min-w-0 flex-1 gap-x-6 gap-y-1.5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:items-baseline">
                <span
                  className={cn(
                    "block text-[0.9375rem] font-medium transition-colors sm:text-base",
                    isSelected
                      ? "text-local-accent-text"
                      : "text-foreground/85 group-hover:text-foreground",
                  )}
                >
                  {t(`${base}.options.${option}.title`)}
                </span>
                <span className="block max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
                  {t(`${base}.options.${option}.description`)}
                </span>
              </span>
              <Check
                aria-hidden
                strokeWidth={2}
                className={cn(
                  "mt-0.5 size-4 shrink-0 transition-opacity",
                  isSelected ? "text-local-accent opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * The instrument: the figure, how far the reader is from settling it, and what
 * every answer so far has been.
 *
 * This was a small grey box parked at the top of a two-thousand-pixel column.
 * It is now the panel the section is built around — the number set at display
 * scale, a five-segment meter that fills as answers land (the count beside it
 * carries the same state without relying on colour), and the answer ledger
 * underneath. It is `aria-live="polite"`, so a screen reader hears the range
 * settle rather than having to hunt for it.
 */
function LiveReadout({
  answeredCount,
  hasEnoughContext,
  estimate,
  answers,
  money,
  num,
  t,
}: {
  answeredCount: number;
  hasEnoughContext: boolean;
  estimate: EstimateResult | null;
  answers: AnswerMap;
  money: (n: number) => string;
  num: (n: string | number) => string;
  t: Translator;
}) {
  const settled = answeredCount === TOTAL;

  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-surface"
      aria-live="polite"
    >
      <div className="border-b border-border bg-background px-7 py-7 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <Eyebrow className="text-[11px] leading-none">
            {hasEnoughContext
              ? t("live.estimateLabel")
              : t("live.projectEstimateLabel")}
          </Eyebrow>
          <span
            className="eyebrow shrink-0 text-[11px] leading-none tabular-nums text-muted-foreground ltr:font-mono"
            aria-hidden
          >
            {num(String(answeredCount).padStart(2, "0"))} /{" "}
            {num(String(TOTAL).padStart(2, "0"))}
          </span>
        </div>

        {hasEnoughContext && estimate ? (
          <div className="mt-6">
            <p className="text-[clamp(1.75rem,2.6vw,2.25rem)] font-medium leading-[1.1] tracking-[-0.03em] tabular-nums text-foreground">
              {money(estimate.minPrice)} – {money(estimate.maxPrice)}
            </p>
            <p className="mt-2 text-sm tabular-nums text-muted-foreground">
              {num(estimate.minWeeks)}–{num(estimate.maxWeeks)}{" "}
              {t("results.weeks")}
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <p
              aria-hidden
              className="text-[clamp(1.75rem,2.6vw,2.25rem)] font-medium leading-[1.1] tracking-[-0.03em] text-foreground/15"
            >
              —
            </p>
            <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
              {t("live.pickTypeFirst")}
            </p>
          </div>
        )}

        {/* Meter. Five segments, one per question — the same state the count
            above states in words, so neither colour nor shape carries it alone. */}
        <div aria-hidden className="mt-7 flex gap-1.5">
          {QUESTIONS.map((q, i) => (
            <span
              key={q.key}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300 ease-smooth",
                i < answeredCount ? "bg-local-accent" : "bg-border-mid",
              )}
            />
          ))}
        </div>
      </div>

      <dl className="divide-y divide-border">
        {QUESTIONS.map((q, i) => {
          const answerKey = answers[q.key];
          return (
            <div
              key={q.key}
              className="flex items-baseline justify-between gap-4 px-7 py-3.5 md:px-8"
            >
              <dt className="flex min-w-0 items-baseline gap-3 text-sm text-muted-foreground">
                <span
                  aria-hidden
                  className="shrink-0 text-[11px] tabular-nums ltr:font-mono"
                >
                  {num(String(i + 1).padStart(2, "0"))}
                </span>
                <span className="truncate">
                  {t(`readiness.labels.${q.key}`)}
                </span>
              </dt>
              <dd
                className={cn(
                  "shrink-0 text-end text-sm",
                  answerKey
                    ? "font-medium text-foreground"
                    : "text-muted-foreground/40",
                )}
              >
                {answerKey
                  ? t(`steps.${q.msg}.options.${answerKey}.title`)
                  : "—"}
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="border-t border-border px-7 py-4 text-xs leading-relaxed text-muted-foreground md:px-8">
        {settled ? t("live.settled") : t("live.updatesAsYouShape")}
      </p>
    </div>
  );
}

/**
 * The payoff, as one object.
 *
 * The result used to be four detached fragments stacked at the bottom of the
 * page — a range, a checklist, a paragraph, then a form in a box of its own —
 * so the number the reader came for arrived as the least designed thing on the
 * page. It is now a single panel that opens on the figure at display scale,
 * splits the evidence from the reasoning, and closes on the one action it
 * wants.
 */
function ResultPanel({
  estimate,
  deliverables,
  money,
  num,
  t,
  name,
  setName,
  phone,
  setPhone,
  phoneError,
  submitting,
  submitted,
  downloading,
  onSubmit,
  onDownload,
  onStartOver,
}: {
  estimate: EstimateResult;
  deliverables: string[];
  money: (n: number) => string;
  num: (n: string | number) => string;
  t: Translator;
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  phoneError: string | null;
  submitting: boolean;
  submitted: boolean;
  downloading: boolean;
  onSubmit: () => void;
  onDownload: () => void;
  onStartOver: () => void;
}) {
  return (
    <div className="mt-16 overflow-hidden rounded-lg border border-border bg-background animate-in fade-in slide-in-from-bottom-4 duration-700 ease-smooth lg:mt-20">
      {/* The verdict. */}
      <div className="border-b border-border bg-surface/60 px-7 py-9 sm:px-9 md:px-11 md:py-11">
        <Eyebrow tone="accent" className="text-[11px] leading-none">
          {t("results.estimateLabel")}
        </Eyebrow>
        <p className="mt-6 text-[clamp(2rem,4.4vw,3.25rem)] font-medium leading-[1.05] tracking-[-0.035em] tabular-nums text-foreground">
          {money(estimate.minPrice)} – {money(estimate.maxPrice)}
        </p>
        <p className="mt-3 text-[clamp(1rem,1.1vw,1.125rem)] tabular-nums text-muted-foreground">
          {num(estimate.minWeeks)}–{num(estimate.maxWeeks)} {t("results.weeks")}
        </p>
      </div>

      {/* Evidence beside reasoning, so neither reads as a footnote to the other. */}
      <div className="grid gap-px bg-border md:grid-cols-2">
        <div className="bg-background px-7 py-8 sm:px-9 md:px-11 md:py-10">
          <Eyebrow className="text-[11px] leading-none">
            {t("results.includesLabel")}
          </Eyebrow>
          <ul className="mt-6 space-y-3.5">
            {deliverables.slice(0, 5).map((item) => (
              <li
                key={item}
                className="flex items-start gap-3.5 text-[0.9375rem] leading-relaxed text-foreground"
              >
                <Check
                  aria-hidden
                  strokeWidth={2}
                  className="mt-1 size-4 shrink-0 text-local-accent"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {deliverables.length > 5 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              {t("results.moreInPdf", { count: num(deliverables.length - 5) })}
            </p>
          ) : null}
        </div>

        <div className="bg-background px-7 py-8 sm:px-9 md:px-11 md:py-10">
          <Eyebrow className="text-[11px] leading-none">
            {t("results.whyTitle")}
          </Eyebrow>
          <p className="mt-6 max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
            {t("results.whyCopy")}
          </p>
        </div>
      </div>

      {/* The one action the panel wants. */}
      <div className="border-t border-border bg-surface/60 px-7 py-9 sm:px-9 md:px-11 md:py-11">
        <div className="grid gap-x-16 gap-y-8 lg:grid-cols-12">
          <header className="lg:col-span-5">
            <h4 className="text-[clamp(1.25rem,2vw,1.5rem)] font-medium leading-[1.2] tracking-[-0.015em] text-foreground">
              {t("results.detailedEstimateTitle")}
            </h4>
            <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
              {t("phoneCapture.subtitle")}
            </p>
          </header>

          <div className="lg:col-span-7">
            {!submitted ? (
              <div className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label
                      htmlFor="estimate-name"
                      className="mb-2 block font-sans text-xs font-medium normal-case tracking-normal text-muted-foreground"
                    >
                      {t("phoneCapture.nameLabel")}
                    </Label>
                    <Input
                      id="estimate-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("phoneCapture.namePlaceholder")}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="estimate-phone"
                      className="mb-2 block font-sans text-xs font-medium normal-case tracking-normal text-muted-foreground"
                    >
                      {t("phoneCapture.phoneLabel")}
                    </Label>
                    <Input
                      id="estimate-phone"
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("phoneCapture.phonePlaceholder")}
                      aria-invalid={phoneError !== null}
                      aria-describedby="estimate-phone-hint"
                    />
                    <p
                      id="estimate-phone-hint"
                      className={cn(
                        "mt-2 text-xs leading-relaxed",
                        phoneError
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                      role={phoneError ? "alert" : undefined}
                    >
                      {phoneError ?? t("phoneCapture.phoneHint")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                  <Button
                    variant="brand"
                    size="lg"
                    onClick={onSubmit}
                    loading={submitting}
                    className="w-full sm:w-auto"
                  >
                    {submitting
                      ? t("phoneCapture.submitting")
                      : t("pdf.button")}
                  </Button>
                  <StartOverButton
                    label={t("startOver")}
                    onClick={onStartOver}
                  />
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-500">
                <p className="font-medium text-foreground">
                  {t("results.badge")}
                </p>
                <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                  <Button
                    variant="brand"
                    size="lg"
                    onClick={onDownload}
                    disabled={downloading}
                    className="w-full sm:w-auto"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        {t("pdf.generating")}
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 size-4" />
                        {t("pdf.button")}
                      </>
                    )}
                  </Button>
                  <StartOverButton
                    label={t("startOver")}
                    onClick={onStartOver}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StartOverButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center gap-2 text-sm text-muted-foreground transition-colors ease-smooth hover:text-foreground sm:justify-start"
    >
      <RotateCcw aria-hidden className="size-3.5" />
      <span>{label}</span>
    </button>
  );
}
