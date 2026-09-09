"use client";

import { TransparencyChapter } from "@/components/sections/transparency-chapter";
import { Container } from "@/components/shared/container";
import { ArrowIcon } from "@/components/shared/directional-link";
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
import { getCommercialCta } from "@/lib/config/commercial";
import { Link } from "@/i18n/navigation";
import {
  motion,
  useCounter,
  useReveal,
  useSectionCardGrid,
} from "@/lib/motion";
import { getWhatsAppUrl } from "@/lib/utils/whatsapp";
import { localizeNumbers } from "@/lib/utils/number";
import {
  buildPDFHtml,
  fillScopeTokens,
  generateEstimatePdf,
  mapProjectType,
  validatePhone,
  type TransparencyTranslator,
} from "@/lib/utils/transparency-utils";
import { cn } from "@/lib/utils/utils";
import {
  COMPLEXITY_TO_LEGACY_BAND,
  MAX_DELIVERY_WEEKS,
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
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  /** The handle the estimate is discussed by, allocated server-side on submit. */
  const [reference, setReference] = useState<string | null>(null);

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
    setEmail("");
    setCompany("");
    setPhoneError(null);
    setEmailError(null);
    setSubmitted(false);
    setReference(null);
  }, [reset]);

  const submit = useCallback(async () => {
    if (!validatePhone(phone)) {
      setPhoneError(t("phoneCapture.phoneError"));
      return;
    }

    if (!estimate || !projectType || !complexity) return;

    setSubmitting(true);
    setPhoneError(null);
    setEmailError(null);

    try {
      const res = await fetch("/api/transparency-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: isAr ? "ar" : "en",
          phone,
          name: name || undefined,
          email: email || undefined,
          company: company || undefined,
          projectType,
          complexity,
          timeline: timeline ?? "standard",
          // Asked of every visitor since this estimator shipped, and until now
          // discarded on submit. They are what says how much groundwork a
          // deal carries before engineering starts.
          brandIdentity: brandIdentity ?? undefined,
          contentReadiness: contentReadiness ?? undefined,
          priceMin: estimate.minPrice,
          priceMax: estimate.maxPrice,
          weeksMin: estimate.minWeeks,
          weeksMax: estimate.maxWeeks,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // A rejected email must say so on the email field, not under the phone.
        if (data?.errors?.email) setEmailError(data.errors.email);
        if (data?.errors?.phone || !data?.errors?.email) {
          setPhoneError(data?.errors?.phone ?? t("phoneCapture.phoneError"));
        }
        return;
      }

      setReference(typeof data?.reference === "string" ? data.reference : null);
      setSubmitted(true);
    } catch {
      setPhoneError(t("phoneCapture.phoneError"));
    } finally {
      setSubmitting(false);
    }
  }, [
    brandIdentity,
    company,
    complexity,
    contentReadiness,
    email,
    estimate,
    isAr,
    name,
    phone,
    projectType,
    t,
    timeline,
  ]);

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

  // Scope lines quote the post-launch warranty window as a `{token}`; the
  // downloadable PDF fills it the same way, from the same term.
  const deliverables = (
    projectType && complexity
      ? ((t.raw(
          `pdfContent.deliverables.${mapProjectType(projectType)}.${COMPLEXITY_TIER[complexity]}`,
        ) as string[]) ?? [])
      : (t.raw("results.fallbackDeliverables") as string[])
  ).map((item) => fillScopeTokens(item, locale));

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
            email={email}
            setEmail={setEmail}
            company={company}
            setCompany={setCompany}
            phoneError={phoneError}
            emailError={emailError}
            submitting={submitting}
            submitted={submitted}
            downloading={downloading}
            reference={reference}
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
              <span className="mx-2 text-border-mid" aria-hidden>
                ·
              </span>
              {t("live.deliveryCeiling", {
                weeks: num(MAX_DELIVERY_WEEKS),
              })}
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
 * The payoff, as one object, in two states.
 *
 * The result used to be four detached fragments stacked at the bottom of the
 * page — a range, a checklist, a paragraph, then a form in a box of its own —
 * so the number the reader came for arrived as the least designed thing on the
 * page, and the only action offered was the one worth least to the studio.
 *
 * The exchange is now explicit and, importantly, not a gate. Everything the
 * page promises — the range, the weeks, the reasoning, the answers that
 * produced them — is open before anything is asked. What registering buys is
 * real and stated up front: the full scope rather than the first five lines of
 * it, a reference the estimate can be discussed by, and a way to reach a human
 * about it. Withholding the number instead would have made the page named
 * Transparency a lie, and the number is published on /pricing regardless.
 *
 * The PDF stays the primary action after submitting because the PDF is what
 * the form promised; the invitation to talk sits beneath it as its own band —
 * the end of the page, not a second button competing with it (CI2, P12).
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
  email,
  setEmail,
  company,
  setCompany,
  phoneError,
  emailError,
  submitting,
  submitted,
  downloading,
  reference,
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
  email: string;
  setEmail: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  phoneError: string | null;
  emailError: string | null;
  submitting: boolean;
  submitted: boolean;
  downloading: boolean;
  reference: string | null;
  onSubmit: () => void;
  onDownload: () => void;
  onStartOver: () => void;
}) {
  // Counted rather than printed. The value is one the reader has already
  // watched settle in the instrument, so this stages an arrival — it does not
  // pretend to compute something. The formatter is the section's own `money`,
  // so the currency and the numeral system stay the reading locale's.
  const minRef = useCounter<HTMLSpanElement>(
    motion.counter(estimate.minPrice, { formatter: money }),
  );
  const maxRef = useCounter<HTMLSpanElement>(
    motion.counter(estimate.maxPrice, { formatter: money }),
  );

  // Scope lines strike in as a sequence, the way a record is written.
  const scopeRef = useSectionCardGrid<HTMLUListElement>({
    ...motion.listItems(),
    selector: "[data-scope-line]",
  });

  // Before submitting the list is truncated and says so; after, it is whole.
  const visibleDeliverables = submitted
    ? deliverables
    : deliverables.slice(0, 5);
  const hiddenCount = deliverables.length - visibleDeliverables.length;

  return (
    <div className="mt-16 overflow-hidden rounded-lg border border-border bg-background animate-in fade-in slide-in-from-bottom-4 duration-700 ease-smooth lg:mt-20">
      {/* The verdict. */}
      <div className="relative border-b border-border bg-surface/60 px-7 py-9 sm:px-9 md:px-11 md:py-11">
        {/* One highlight travelling the panel's top edge as it settles.
            Decorative and non-repeating; it claims nothing. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden rtl:-scale-x-100"
        >
          <span className="block h-px w-1/3 animate-edge-sweep bg-gradient-to-r from-transparent via-local-accent to-transparent" />
        </span>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <Eyebrow tone="accent" className="text-[11px] leading-none">
            {t("results.estimateLabel")}
          </Eyebrow>
          {submitted && reference ? (
            <p className="flex items-baseline gap-2.5 text-[11px] leading-none">
              <span className="eyebrow text-muted-foreground">
                {t("results.referenceLabel")}
              </span>
              <span
                dir="ltr"
                className="font-medium tabular-nums text-foreground ltr:font-mono"
              >
                {reference}
              </span>
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-[clamp(2rem,4.4vw,3.25rem)] font-medium leading-[1.05] tracking-[-0.035em] tabular-nums text-foreground">
          <span ref={minRef} /> – <span ref={maxRef} />
        </p>
        <p className="mt-3 text-[clamp(1rem,1.1vw,1.125rem)] tabular-nums text-muted-foreground">
          {num(estimate.minWeeks)}–{num(estimate.maxWeeks)} {t("results.weeks")}
        </p>
        {/* The ceiling is a published promise, not a property of this answer
            set — it reads next to the window it bounds rather than in a
            footnote nobody scrolls to. */}
        <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
          {t("results.deliveryCeiling", { weeks: num(MAX_DELIVERY_WEEKS) })}
        </p>
      </div>

      {/* Evidence beside reasoning, so neither reads as a footnote to the other. */}
      <div className="grid gap-px bg-border md:grid-cols-2">
        <div className="bg-background px-7 py-8 sm:px-9 md:px-11 md:py-10">
          <Eyebrow className="text-[11px] leading-none">
            {submitted
              ? t("results.fullScopeLabel")
              : t("results.includesLabel")}
          </Eyebrow>
          <ul ref={scopeRef} className="mt-6 space-y-3.5">
            {visibleDeliverables.map((item) => (
              <li
                key={item}
                data-scope-line
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
          {hiddenCount > 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              {t("results.moreInPdf", { count: num(hiddenCount) })}
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

      {!submitted ? (
        <LeadCapture
          t={t}
          name={name}
          setName={setName}
          phone={phone}
          setPhone={setPhone}
          email={email}
          setEmail={setEmail}
          company={company}
          setCompany={setCompany}
          phoneError={phoneError}
          emailError={emailError}
          submitting={submitting}
          onSubmit={onSubmit}
          onStartOver={onStartOver}
        />
      ) : (
        <NextSteps
          t={t}
          reference={reference}
          downloading={downloading}
          onDownload={onDownload}
          onStartOver={onStartOver}
        />
      )}
    </div>
  );
}

/** The single ask, stated with what it buys. */
function LeadCapture({
  t,
  name,
  setName,
  phone,
  setPhone,
  email,
  setEmail,
  company,
  setCompany,
  phoneError,
  emailError,
  submitting,
  onSubmit,
  onStartOver,
}: {
  t: Translator;
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  phoneError: string | null;
  emailError: string | null;
  submitting: boolean;
  onSubmit: () => void;
  onStartOver: () => void;
}) {
  return (
    <div className="border-t border-border bg-surface/60 px-7 py-9 sm:px-9 md:px-11 md:py-11">
      <div className="grid gap-x-16 gap-y-8 lg:grid-cols-12">
        <header className="lg:col-span-5">
          <h4 className="text-[clamp(1.25rem,2vw,1.5rem)] font-medium leading-[1.2] tracking-[-0.015em] text-foreground">
            {t("results.detailedEstimateTitle")}
          </h4>
          <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
            {t("phoneCapture.subtitle")}
          </p>
          {/* Written and translated when this form was built, and never shown.
              It is the sentence that says what happens to the number. */}
          <p className="mt-5 max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
            {t.rich("phoneCapture.trustNote", bodyMarks)}
          </p>
        </header>

        <form
          className="lg:col-span-7"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="estimate-name"
              label={t("phoneCapture.nameLabel")}
              value={name}
              onChange={setName}
              placeholder={t("phoneCapture.namePlaceholder")}
            />
            <Field
              id="estimate-phone"
              label={t("phoneCapture.phoneLabel")}
              value={phone}
              onChange={setPhone}
              placeholder={t("phoneCapture.phonePlaceholder")}
              type="tel"
              inputMode="tel"
              dir="ltr"
              error={phoneError}
              hint={t("phoneCapture.phoneHint")}
            />
            <Field
              id="estimate-email"
              label={t("phoneCapture.emailLabel")}
              value={email}
              onChange={setEmail}
              placeholder={t("phoneCapture.emailPlaceholder")}
              type="email"
              inputMode="email"
              dir="ltr"
              error={emailError}
            />
            <Field
              id="estimate-company"
              label={t("phoneCapture.companyLabel")}
              value={company}
              onChange={setCompany}
              placeholder={t("phoneCapture.companyPlaceholder")}
            />
          </div>

          <div className="mt-7 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            <Button
              type="submit"
              variant="brand"
              size="lg"
              loading={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? t("phoneCapture.submitting") : t("pdf.button")}
            </Button>
            <StartOverButton label={t("startOver")} onClick={onStartOver} />
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * What registering opened.
 *
 * The PDF keeps the primary button — it is what the form asked for. The ways
 * to reach a person sit below it under their own rule, so the page ends on the
 * invitation rather than on a download that closes the conversation.
 */
function NextSteps({
  t,
  reference,
  downloading,
  onDownload,
  onStartOver,
}: {
  t: Translator;
  reference: string | null;
  downloading: boolean;
  onDownload: () => void;
  onStartOver: () => void;
}) {
  const whatsappHref = `${getWhatsAppUrl()}?text=${encodeURIComponent(
    t("results.whatsappMessage", { reference: reference ?? "—" }),
  )}`;

  return (
    <div className="border-t border-border bg-surface/60 px-7 py-9 animate-in fade-in duration-500 sm:px-9 md:px-11 md:py-11">
      <div className="grid gap-x-16 gap-y-9 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="flex items-center gap-2.5 text-[0.9375rem] font-medium text-foreground">
            <Check
              aria-hidden
              strokeWidth={2}
              className="size-4 shrink-0 text-local-accent"
            />
            {t("results.badge")}
          </p>
          <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
            {t.rich("pdf.description", bodyMarks)}
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
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
            <StartOverButton label={t("startOver")} onClick={onStartOver} />
          </div>
        </div>

        <div className="lg:col-span-7 lg:border-s lg:border-border lg:ps-16">
          <div className="flex items-center gap-3">
            <Eyebrow className="shrink-0 text-[11px] leading-none">
              {t("results.nextStepTitle")}
            </Eyebrow>
            <span aria-hidden className="h-px min-w-6 flex-1 bg-border" />
          </div>
          <p className="mt-5 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
            {t("results.nextStepBody")}
          </p>
          <ul className="mt-7 grid list-none gap-px overflow-hidden rounded-md border border-border bg-border">
            <li>
              <NextStepLink
                href={whatsappHref}
                external
                label={t("results.talkNow")}
              />
            </li>
            <li>
              <NextStepLink
                href={getCommercialCta("technicalCall").href}
                label={t("results.bookCall")}
              />
            </li>
            <li>
              <NextStepLink
                href={getCommercialCta("technicalAudit").href}
                label={t("results.requestAudit")}
              />
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function NextStepLink({
  href,
  label,
  external = false,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const className =
    "group flex min-h-12 w-full items-center justify-between gap-4 bg-background px-5 py-4 text-[0.9375rem] font-medium text-foreground transition-colors ease-smooth hover:bg-surface/70 hover:text-local-accent-text";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        <span>{label}</span>
        <ArrowIcon />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <span>{label}</span>
      <ArrowIcon />
    </Link>
  );
}

/**
 * One labelled input with the space for its message already reserved, so a
 * validation error does not shift the row it appears in.
 */
function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type,
  inputMode,
  dir,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: "tel" | "email";
  dir?: "ltr";
  error?: string | null;
  hint?: string;
}) {
  const messageId = `${id}-hint`;
  const message = error ?? hint;

  return (
    <div>
      <Label
        htmlFor={id}
        className="mb-2 block font-sans text-xs font-medium normal-case tracking-normal text-muted-foreground"
      >
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
      />
      {message ? (
        <p
          id={messageId}
          className={cn(
            "mt-2 text-xs leading-relaxed",
            error ? "text-destructive" : "text-muted-foreground",
          )}
          role={error ? "alert" : undefined}
        >
          {message}
        </p>
      ) : null}
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
