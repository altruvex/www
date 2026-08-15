"use client";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useTransparency,
  type BrandIdentity,
  type Complexity,
  type ContentReadiness,
  type ProjectType,
  type Timeline,
} from "@/hooks/use-transparency";
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
import { type EstimateResult } from "@repo/pricing";
import { Check, Download, Loader2, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { SectionHeading } from "./section-heading";

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

const COMPLEXITY_TIER: Record<
  NonNullable<Complexity>,
  Exclude<DeliverableTier, "enterprise">
> = {
  basic: "small",
  standard: "medium",
  premium: "large",
};

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

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();
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
    (n: number) => localizeNumbers(String(n), locale),
    [locale],
  );

  const select = useCallback(
    (key: QuestionKey, value: string) => {
      if (key === "projectType") setProjectType(value as ProjectType);
      if (key === "complexity") setComplexity(value as Complexity);
      if (key === "brandIdentity") setBrandIdentity(value as BrandIdentity);
      if (key === "contentReadiness") setContentReadiness(value as ContentReadiness);
      if (key === "timeline") setTimeline(value as Timeline);
    },
    [setBrandIdentity, setComplexity, setContentReadiness, setProjectType, setTimeline],
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
  }, [complexity, estimate, isAr, locale, name, phone, projectType, t, timeline]);

  const deliverables =
    projectType && complexity
      ? ((t.raw(`pdfContent.deliverables.${mapProjectType(projectType)}.${COMPLEXITY_TIER[complexity]}`) as string[]) ?? [])
      : (t.raw("results.fallbackDeliverables") as string[]);

  return (
    <section
      id="transparency-estimator"
      aria-labelledby="transparency-estimator-heading"
      className="border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div>
          <header className="mb-20">
            <SectionHeading
              titleId="transparency-estimator-heading"
              titleAs={pageHeading ? "h1" : "h2"}
              eyebrowRef={eyebrowRef}
              titleRef={titleRef}
              descriptionRef={descRef}
              eyebrow={t("badge")}
              firstTitle={t("title")}
              secondTitle={t("titleItalic")}
              description={t("subtitle")}
            />
            {initialTier && KNOWN_TIERS.has(initialTier) ? (
              <PreselectedTier label={t(`tierNames.${initialTier}`)} t={t} />
            ) : null}
          </header>
          <div ref={estimatorRef} className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem] lg:gap-20 lg:items-start">
            <div className="space-y-16">
              <QuestionBlock
                index={1}
                question={QUESTIONS[0]}
                selected={answers.projectType}
                onSelect={(val) => select(QUESTIONS[0].key, val)}
                t={t}
                num={num}
              />
              <QuestionBlock
                index={2}
                question={QUESTIONS[1]}
                selected={answers.complexity}
                onSelect={(val) => select(QUESTIONS[1].key, val)}
                t={t}
                num={num}
              />
              <div className="block lg:hidden">
                <LiveReadout
                  hasEnoughContext={hasEnoughContext}
                  estimate={estimate}
                  answers={answers}
                  money={money}
                  num={num}
                  t={t}
                />
              </div>
              <QuestionBlock
                index={3}
                question={QUESTIONS[2]}
                selected={answers.brandIdentity}
                onSelect={(val) => select(QUESTIONS[2].key, val)}
                t={t}
                num={num}
              />
              <QuestionBlock
                index={4}
                question={QUESTIONS[3]}
                selected={answers.contentReadiness}
                onSelect={(val) => select(QUESTIONS[3].key, val)}
                t={t}
                num={num}
              />
              <QuestionBlock
                index={5}
                question={QUESTIONS[4]}
                selected={answers.timeline}
                onSelect={(val) => select(QUESTIONS[4].key, val)}
                t={t}
                num={num}
              />
              {complete && estimate && (
                <div className="mt-24 border-t border-border pt-16 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-smooth">
                  <div className="mb-14">
                    <Eyebrow tone="muted" className="mb-6">Estimate</Eyebrow>
                    <p className="text-[clamp(2.25rem,4vw,3.25rem)] font-medium leading-[1.1] tabular-nums text-foreground mb-4">
                      {money(estimate.minPrice)} – {money(estimate.maxPrice)}
                    </p>
                    <p className="text-lg text-muted-foreground">
                      {num(estimate.minWeeks)}–{num(estimate.maxWeeks)} {t("results.weeks")}
                    </p>
                  </div>
                  <div className="h-px w-full bg-border mb-14" />
                  <div className="mb-14">
                    <Eyebrow tone="foreground" className="mb-6">What this includes</Eyebrow>
                    <ul className="space-y-4 max-w-2xl">
                      {deliverables.slice(0, 5).map((item) => (
                        <li key={item} className="flex items-start gap-4 text-base leading-relaxed text-foreground">
                          <Check aria-hidden className="mt-1 size-4 shrink-0 text-local-accent" strokeWidth={2} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="h-px w-full bg-border mb-14" />
                  <div className="mb-16">
                    <Eyebrow tone="foreground" className="mb-6">{t("results.whyTitle")}</Eyebrow>
                    <p className="text-base leading-relaxed text-muted-foreground max-w-2xl">
                      {t("results.whyCopy")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface/40 p-8 md:p-10">
                    <header className="mb-8">
                      <h4 className="text-[clamp(1.25rem,2vw,1.5rem)] font-medium leading-[1.2] tracking-[-0.01em] text-foreground mb-2">Get the detailed estimate</h4>
                      <p className="text-sm text-muted-foreground max-w-md">{t("phoneCapture.subtitle")}</p>
                    </header>
                    {!submitted ? (
                      <div className="space-y-6 max-w-xl">
                        <div className="grid gap-6 sm:grid-cols-2">
                          <div>
                            <Label htmlFor="estimate-name" className="normal-case tracking-normal font-sans text-xs font-medium text-muted-foreground block mb-2">
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
                            <Label htmlFor="estimate-phone" className="normal-case tracking-normal font-sans text-xs font-medium text-muted-foreground block mb-2">
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
                            {phoneError && (
                              <p id="estimate-phone-hint" className="mt-2 text-xs text-destructive" role="alert">
                                {phoneError}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-5 pt-2">
                          <Button variant="brand" size="lg" onClick={submit} loading={submitting} className="w-full sm:w-auto">
                            {submitting ? t("phoneCapture.submitting") : t("pdf.button")}
                          </Button>
                          <button
                            type="button"
                            onClick={startOver}
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ease-smooth"
                          >
                            <RotateCcw className="size-3.5" />
                            <span>{t("startOver")}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="animate-in fade-in duration-500 max-w-xl">
                        <p className="text-foreground font-medium mb-6">{t("results.badge")}</p>
                        <div className="flex flex-col sm:flex-row items-center gap-5">
                          <Button variant="brand" size="lg" onClick={downloadPdf} disabled={downloading} className="w-full sm:w-auto">
                            {downloading ? <><Loader2 className="animate-spin mr-2 size-4" />{t("pdf.generating")}</> : <><Download className="mr-2 size-4" />{t("pdf.button")}</>}
                          </Button>
                          <button
                            type="button"
                            onClick={startOver}
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ease-smooth"
                          >
                            <RotateCcw className="size-3.5" />
                            <span>{t("startOver")}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <aside className="hidden lg:block sticky top-32">
              <LiveReadout
                hasEnoughContext={hasEnoughContext}
                estimate={estimate}
                answers={answers}
                money={money}
                num={num}
                t={t}
              />
            </aside>
          </div>
        </div>
      </Container>
    </section>
  );
}



function PreselectedTier({ label, t }: { label: string; t: Translator }) {
  return (
    <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2">
      <span className="size-2 rounded-full bg-local-accent" aria-hidden />
      <span className="eyebrow text-muted-foreground">
        {t("preselected")} / {label}
      </span>
    </div>
  );
}

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
  num: (n: number) => string;
}) {
  const base = `steps.${question.msg}`;

  return (
    <section aria-labelledby={`question-${question.key}`} className="scroll-mt-32">
      <header className="mb-8">
        <p className="text-sm tabular-nums text-muted-foreground mb-3 font-mono">
          {num(index).padStart(2, "0")} / {num(TOTAL).padStart(2, "0")}
        </p>
        <h3 id={`question-${question.key}`} className="text-[clamp(1.35rem,1.9vw,1.7rem)] font-medium leading-[1.15] tracking-[-0.02em] text-foreground">
          {t(`${base}.title`)}
        </h3>
      </header>

      <div role="radiogroup" aria-label={t(`${base}.title`)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                "group relative text-left p-6 rounded-lg border transition-all duration-200 ease-smooth outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-local-accent bg-local-accent/5"
                  : "border-border bg-transparent hover:border-border-mid hover:bg-surface/50"
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "mt-1 shrink-0 flex items-center justify-center size-4 rounded-full border transition-colors",
                    isSelected ? "border-local-accent" : "border-border-mid group-hover:border-foreground/30"
                  )}
                >
                  {isSelected && <div className="size-2 rounded-full bg-local-accent" />}
                </div>
                <div>
                  <span className={cn(
                    "block text-base font-medium mb-1.5 transition-colors",
                    isSelected ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                  )}>
                    {t(`${base}.options.${option}.title`)}
                  </span>
                  <span className="block text-sm text-muted-foreground leading-relaxed">
                    {t(`${base}.options.${option}.description`)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function LiveReadout({
  hasEnoughContext,
  estimate,
  answers,
  money,
  num,
  t,
}: {
  hasEnoughContext: boolean;
  estimate: EstimateResult | null;
  answers: AnswerMap;
  money: (n: number) => string;
  num: (n: number) => string;
  t: Translator;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-7 md:p-8" aria-live="polite">
      {!hasEnoughContext ? (
        <div className="animate-in fade-in duration-500">
          <Eyebrow tone="muted" className="mb-5">
            Project Estimate
          </Eyebrow>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            {t("live.pickTypeFirst")} {t("live.updatesAsYouShape")}
          </p>
          <div className="space-y-3.5">
            {QUESTIONS.map((q, i) => (
              <div key={q.key} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground/50">{num(i + 1).padStart(2, "0")}</span>
                <span className="text-muted-foreground">{t(`readiness.labels.${q.key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <Eyebrow tone="muted" className="mb-5">
            Estimate
          </Eyebrow>
          <div className="mb-7">
            <p className="text-2xl xl:text-[1.75rem] font-medium leading-tight tabular-nums text-foreground mb-1.5">
              {money(estimate!.minPrice)} – {money(estimate!.maxPrice)}
            </p>
            <p className="text-sm text-muted-foreground">
              {num(estimate!.minWeeks)}–{num(estimate!.maxWeeks)} {t("results.weeks")}
            </p>
          </div>
          <div className="h-px w-full bg-border mb-7" />
          <div className="space-y-3.5">
            {QUESTIONS.map((q, i) => {
              const answerKey = answers[q.key];
              return (
                <div key={q.key} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-muted-foreground flex items-center gap-2.5">
                    <span className="font-mono text-xs opacity-50">{num(i + 1).padStart(2, "0")}</span>
                    {t(`readiness.labels.${q.key}`)}
                  </span>
                  <span className={cn("text-right", answerKey ? "text-foreground font-medium" : "text-muted-foreground/40")}>
                    {answerKey ? t(`steps.${q.msg}.options.${answerKey}.title`) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-xs text-muted-foreground italic leading-relaxed">
            {Object.values(answers).every(Boolean) ? t("live.settled") : t("live.updatesAsYouShape")}
          </p>
        </div>
      )}
    </div>
  );
}