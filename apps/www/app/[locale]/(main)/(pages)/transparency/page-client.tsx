"use client";
import { Container } from "@/components/container";
import { ArrowLabel } from "@/components/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { ProposalNarrativeBlock } from "@/components/sections/transparency-section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BrandIdentity,
  Budget,
  Complexity,
  ContentReadiness,
  DeadlineUrgency,
  ProjectType,
  Timeline,
  useTransparency,
} from "@/hooks/use-transparency";
import { Link } from "@/i18n/navigation";
import { useSectionDescription, useSectionElement, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import {
  buildPDFHtml,
  generateEstimatePdf,
  mapBudgetTier,
  mapProjectType,
  normalisePhone,
  validatePhone,
} from "@/lib/transparency-utils";
import { cn } from "@/lib/utils";
import { Check, Download, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { JSX, useState } from "react";

export default function TransparencyPageClient() {
  const t = useTranslations("transparency");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const incomingTier = searchParams.get("tier") ?? null;
  const incomingProjectType = searchParams.get("projectType");
  const initialProjectType = (
    ["website", "webapp", "ecommerce", "pwa"].includes(
      incomingProjectType ?? "",
    )
      ? incomingProjectType
      : null
  ) as ProjectType;
  const isPreselected = incomingTier !== null;

  const {
    step,
    brandIdentity,
    contentReadiness,
    deadlineUrgency,
    projectType,
    complexity,
    timeline,
    budget,
    setBrandIdentity,
    setContentReadiness,
    setDeadlineUrgency,
    setProjectType,
    setComplexity,
    setTimeline,
    setBudget,
    nextStep,
    prevStep,
    reset,
    canProceed,
    getEstimate,
  } = useTransparency({ initialTier: incomingTier, initialProjectType });

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [phoneDone, setPhoneDone] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const DATA_STEPS = 8;
  const isPhoneStep = step === DATA_STEPS && !phoneDone;
  const isResultsStep = step === DATA_STEPS && phoneDone;
  const TOTAL_STEPS = isPreselected ? 3 : 8;

  const estimate = getEstimate();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const subtitleRef = useSectionDescription<HTMLParagraphElement>();
  const badgeRef = useSectionEyebrow<HTMLDivElement>();
  const progressRef = useSectionElement<HTMLDivElement>();

  const containerKey = `step-${step}-${phoneDone ? "done" : "pending"}`;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(n);

  const visibleStep = isPreselected
    ? step === 5
      ? 1
      : step === 7
        ? 2
        : step === 8
          ? 3
          : 1
    : step;

  const handlePhoneSubmit = async () => {
    if (!validatePhone(phone)) {
      setPhoneError(t("phoneCapture.phoneError"));
      return;
    }
    setPhoneError(null);
    setPhoneSubmitting(true);
    try {
      await fetch(`/${locale}/api/transparency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalisePhone(phone),
          name: name || undefined,
          projectType: projectType ?? undefined,
          complexity: complexity ?? undefined,
          timeline: timeline ?? undefined,
          price: estimate
            ? Math.round((estimate.minPrice + estimate.maxPrice) / 2)
            : undefined,
          priceMin: estimate?.minPrice,
          priceMax: estimate?.maxPrice,
          weeksMin: estimate?.minWeeks,
          weeksMax: estimate?.maxWeeks,
        }),
      });
    } catch {
    } finally {
      setPhoneSubmitting(false);
    }
    setPhoneDone(true);
  };

  const handleDownloadPDF = async () => {
    if (!estimate || !projectType || !budget) return;
    setPdfGenerating(true);
    try {
      const html = buildPDFHtml({
        locale,
        t,
        projectType: mapProjectType(projectType),
        tier: mapBudgetTier(budget),
        timelineKey: timeline ?? "standard",
        priceMin: estimate.minPrice,
        priceMax: estimate.maxPrice,
        weeksMin: estimate.minWeeks,
        weeksMax: estimate.maxWeeks,
        phone: normalisePhone(phone),
        name,
        brandIdentity,
        contentReadiness,
        deadlineUrgency,
      });
      await generateEstimatePdf(html, `altruvex-estimate-${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleBack = () => {
    if (isResultsStep) {
      setPhoneDone(false);
      return;
    }
    prevStep();
  };

  const handleReset = () => {
    reset();
    setPhone("");
    setName("");
    setPhoneDone(false);
    setPhoneError(null);
  };

  return (
    <div className="relative min-h-screen w-full">
      <section className="accent-world-blue min-h-screen flex items-center pt-(--section-y-top) pb-(--section-y-bottom)">
        <Container>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1
                ref={titleRef}
                className="font-sans font-normal text-primary mb-4"
              >
                {t("title")}
              </h1>
              <p
                ref={subtitleRef}
                className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/70"
              >
                {t("subtitle")}
              </p>
              {incomingTier && (
                <div
                  ref={badgeRef}
                  className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-lg border border-foreground/12 bg-foreground/4"
                >
                  <span className="font-mono text-sm leading-normal tracking-wider text-[13px] uppercase text-primary/70">
                    {t("preselected")}
                  </span>
                  <span className="font-mono text-sm leading-normal tracking-wider text-[13px] uppercase text-primary/70">
                    {t(`tierNames.${incomingTier}`)}
                  </span>
                </div>
              )}
            </div>
            <div ref={progressRef} className="mb-12">
              <div className="flex justify-between items-center text-[13px] font-mono tracking-[0.18em] uppercase text-primary/40 mb-2.5">
                <span>
                  {t("step")} {visibleStep} / {TOTAL_STEPS}
                </span>
                <span>{Math.round((visibleStep / TOTAL_STEPS) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(visibleStep / TOTAL_STEPS) * 100}%` }}
                />
              </div>
            </div>
            <div key={containerKey} className="mb-12 animate-step-in">
              {step === 1 && (
                <StepBrandIdentity
                  selected={brandIdentity}
                  onSelect={setBrandIdentity}
                  t={t}
                />
              )}
              {step === 2 && !isPreselected && (
                <StepBudget selected={budget} onSelect={setBudget} t={t} />
              )}
              {step === 3 && (
                <StepContentReadiness
                  selected={contentReadiness}
                  onSelect={setContentReadiness}
                  t={t}
                />
              )}
              {step === 4 && (
                <StepDeadlineUrgency
                  selected={deadlineUrgency}
                  onSelect={setDeadlineUrgency}
                  t={t}
                />
              )}
              {step === 5 && (
                <StepProjectType
                  selected={projectType}
                  onSelect={setProjectType}
                  t={t}
                />
              )}
              {step === 6 && (
                <StepComplexity
                  selected={complexity}
                  onSelect={setComplexity}
                  t={t}
                />
              )}
              {step === DATA_STEPS - 1 && !isPhoneStep && !isResultsStep && (
                <StepTimeline
                  selected={timeline}
                  onSelect={setTimeline}
                  t={t}
                />
              )}
              {isPhoneStep && (
                <StepPhoneCapture
                  phone={phone}
                  name={name}
                  error={phoneError}
                  submitting={phoneSubmitting}
                  onPhoneChange={(v) => {
                    setPhone(v);
                    setPhoneError(null);
                  }}
                  onNameChange={setName}
                  onSubmit={handlePhoneSubmit}
                  t={t}
                />
              )}
              {isResultsStep && estimate && (
                <>
                  <StepResults
                    estimate={estimate}
                    formatCurrency={formatCurrency}
                    t={t}
                    locale={locale}
                    projectType={projectType}
                    budget={budget}
                    timeline={timeline}
                    brandIdentity={brandIdentity}
                    contentReadiness={contentReadiness}
                    deadlineUrgency={deadlineUrgency}
                  />
                  <PDFDownload
                    onDownload={handleDownloadPDF}
                    generating={pdfGenerating}
                    t={t}
                  />
                </>
              )}
            </div>
            <div className="flex items-center justify-between">
              {(isPreselected ? step > 5 : step > 1) || isResultsStep ? (
                <MagneticButton
                  variant="secondary"
                  onClick={isResultsStep ? handleReset : handleBack}
                >
                  {isResultsStep ? t("startOver") : t("back")}
                </MagneticButton>
              ) : (
                <div />
              )}
              {step < DATA_STEPS && !isPhoneStep && (
                <MagneticButton
                  variant="primary"
                  onClick={nextStep}
                  className={cn(
                    !canProceed() && "opacity-50 pointer-events-none",
                  )}
                >
                  {step === DATA_STEPS - 1 ? t("getEstimate") : t("next")}
                </MagneticButton>
              )}
            </div>
          </div>
        </Container>
      </section>
      <TransparencyFaqSection t={t} />
    </div>
  );
}

interface StepProps {
  t: (key: string, values?: Record<string, string | number>) => string;
}

function TransparencyFaqSection({ t }: StepProps) {
  const headerRef = useSectionEyebrow<HTMLDivElement>();
  const contentRef = useSectionDescription<HTMLDivElement>();

  const items = ["1", "2", "3", "4"].map((key) => ({
    answer: t(`faq.a${key}`),
    question: t(`faq.q${key}`),
    value: key,
  }));

  return (
    <section className="border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-24">
          <div ref={headerRef} className="max-w-md">
            <p className="eyebrow text-xs text-muted-foreground mb-4 block">
              {t("faq.title")}
            </p>
            <h2 className="text-[clamp(2.125rem,4vw,3.25rem)] tracking-[-0.02em] font-normal text-foreground leading-[1.1] mb-6">
              {t("faq.subtitle")}
            </h2>
          </div>
          <div
            ref={contentRef}
            className="rounded-2xl border border-border bg-foreground/3 px-5 md:px-8"
          >
            <Accordion type="single" collapsible className="w-full">
              {items.map((item) => (
                <AccordionItem
                  key={item.value}
                  value={item.value}
                  className="border-border"
                >
                  <AccordionTrigger className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] font-sans font-light hover:text-foreground transition-colors py-6 text-start">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-[clamp(0.9375rem,0.98vw,1rem)] text-muted-foreground leading-relaxed pb-8">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </Container>
    </section>
  );
}

const OPTION_BASE =
  "relative border transition-all duration-300 cursor-pointer";

const OPTION_SELECTED = "border-foreground/60 bg-foreground/[0.08] shadow-lg";

const OPTION_DEFAULT =
  "border-foreground/20 hover:border-foreground/40 hover:bg-foreground/[0.04] hover:shadow-md";

function SelectionCheck({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        "absolute -top-2 ltr:-right-1 rtl:-left-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center transition-opacity duration-200 shadow-md",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      <Check className="w-3 h-3 text-background" strokeWidth={2.5} />
    </div>
  );
}

function StepHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-[clamp(1.8rem,2.5vw,2.4rem)] tracking-tight font-normal text-primary mb-4">
        {title}
      </h2>
      {hint && (
        <p className="text-primary/50 text-[clamp(0.9375rem,0.98vw,1rem)] leading-relaxed max-w-xl mx-auto">
          {hint}
        </p>
      )}
    </div>
  );
}

function StepPhoneCapture({
  phone,
  name,
  error,
  submitting,
  onPhoneChange,
  onNameChange,
  onSubmit,
  t,
}: StepProps & {
  phone: string;
  name: string;
  error: string | null;
  submitting: boolean;
  onPhoneChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <StepHeader
        title={t("phoneCapture.title")}
        hint={t("phoneCapture.subtitle")}
      />
      <p className="text-primary/45 text-sm text-center mb-8">
        {t("phoneCapture.trustNote")}
      </p>
      <div className="space-y-4 mb-6">
        <div>
          <Label htmlFor="transparency-page-phone" className="mb-2 block text-muted-foreground eyebrow">
            {t("phoneCapture.phoneLabel")}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 ltr:left-3 rtl:right-3 flex items-center pointer-events-none">
              <Phone className="h-4 w-4 text-primary/30" />
            </div>
            <Input
              id="transparency-page-phone"
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !submitting && onSubmit()}
              placeholder={t("phoneCapture.phonePlaceholder")}
              className={cn(
                "ltr:pl-10 rtl:pr-10 text-primary bg-transparent placeholder:text-primary/30",
                error && "border-destructive",
              )}
            />
          </div>
          {error && (
            <p className="mt-1.5 font-mono text-sm leading-normal tracking-wider text-destructive">
              {error}
            </p>
          )}
          <p className="mt-2 font-mono text-sm leading-normal tracking-wider text-[13px] text-muted-foreground/70 uppercase">
            {t("phoneCapture.phoneHint")}
          </p>
        </div>
        <div>
          <Label htmlFor="transparency-page-name" className="mb-2 block text-muted-foreground eyebrow">
            {t("phoneCapture.nameLabel")}
          </Label>
          <Input
            id="transparency-page-name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t("phoneCapture.namePlaceholder")}
            className="text-primary bg-transparent placeholder:text-primary/30"
          />
        </div>
      </div>
      <MagneticButton
        variant="primary"
        size="lg"
        className="w-full justify-center"
        onClick={onSubmit}
        disabled={submitting || !phone}
      >
        {submitting ? t("phoneCapture.submitting") : t("phoneCapture.button")}
      </MagneticButton>
    </div>
  );
}

function PDFDownload({
  onDownload,
  generating,
  t,
}: {
  onDownload: () => void;
  generating: boolean;
  t: StepProps["t"];
}) {
  return (
    <div className="mt-8 relative overflow-hidden rounded-lg border border-foreground/20 bg-foreground/5 p-6">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-primary/10 to-transparent opacity-40" />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm leading-normal tracking-wider text-[13px] uppercase text-primary/40 mb-1">
            {t("pdf.label")}
          </p>
          <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/70">
            {t("pdf.description")}
          </p>
        </div>
        <MagneticButton
          variant="secondary"
          onClick={onDownload}
          disabled={generating}
          className="shrink-0"
        >
          <span className="flex items-center gap-2">
            {generating ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                {t("pdf.generating")}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t("pdf.button")}
              </>
            )}
          </span>
        </MagneticButton>
      </div>
    </div>
  );
}

function StepResults({
  estimate,
  formatCurrency,
  t,
  locale,
  projectType,
  budget,
  timeline,
  brandIdentity,
  contentReadiness,
  deadlineUrgency,
}: {
  estimate: {
    minWeeks: number;
    maxWeeks: number;
    minPrice: number;
    maxPrice: number;
  };
  formatCurrency: (n: number) => string;
  t: StepProps["t"];
  locale: string;
  projectType: ProjectType;
  budget: Budget;
  timeline: Timeline;
  brandIdentity?: BrandIdentity;
  contentReadiness?: ContentReadiness;
  deadlineUrgency?: DeadlineUrgency;
}) {
  const projKey = mapProjectType(projectType);
  const tierKey = mapBudgetTier(budget);
  const tlKey = timeline ?? "standard";

  return (
    <div>
      <h2 className="text-2xl font-normal text-primary mb-2 text-center">
        {t("results.title")}
      </h2>
      <p className="text-primary/45 text-sm text-center mb-6">
        {t("results.strategicNote")}
      </p>
      <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/90 mb-8 text-center">
        {t("results.rangeCopy", {
          min: formatCurrency(estimate.minPrice),
          max: formatCurrency(estimate.maxPrice),
          weeksMin: estimate.minWeeks,
          weeksMax: estimate.maxWeeks,
        })}
      </p>
      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        <div className="p-8 rounded-lg border border-foreground/25 bg-foreground/5">
          <p className="font-mono text-sm leading-normal tracking-wider text-[13px] uppercase text-primary/40 mb-3">
            {t("results.timeline")}
          </p>
          <p className="text-3xl font-light text-primary">
            {estimate.minWeeks}–{estimate.maxWeeks}{" "}
            <span className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-primary/60">
              {t("results.weeks")}
            </span>
          </p>
        </div>
        <div className="p-8 rounded-lg border border-foreground/50 bg-foreground/10">
          <p className="font-mono text-sm leading-normal tracking-wider text-[13px] uppercase text-primary/40 mb-3">
            {t("results.investment")}
          </p>
          <p className="text-3xl font-light text-primary">
            {formatCurrency(estimate.minPrice)} -{" "}
            {formatCurrency(estimate.maxPrice)}
          </p>
        </div>
      </div>
      <div className="mb-8">
        <ProposalNarrativeBlock
          projectType={projKey}
          tier={tierKey}
          timelineKey={tlKey}
          locale={locale}
          brandIdentity={brandIdentity}
          contentReadiness={contentReadiness}
          deadlineUrgency={deadlineUrgency}
        />
      </div>
      <div className="mb-8 p-6 rounded-lg border border-foreground/20 bg-foreground/5 text-start flex gap-4 items-start">
        <div className="w-1 self-stretch rounded-full bg-primary shrink-0" />
        <div>
          <p className="font-mono text-sm leading-normal tracking-wider uppercase text-primary mb-2">
            {t("results.rangeCtaLabel")}
          </p>
          <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-relaxed text-primary/80">
            {t("results.rangeCta")}
          </p>
        </div>
      </div>
      <p className="text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.7] text-primary/70 mb-8 text-center">
        {t("results.consultationGate")}
      </p>
      <div className="flex flex-col gap-4 justify-center items-center mb-6">
        <MagneticButton asChild size="lg" variant="primary" className="group">
          <Link href="/schedule">
            <ArrowLabel>{t("results.ctaPrimary")}</ArrowLabel>
          </Link>
        </MagneticButton>
      </div>
    </div>
  );
}

function StepBudget({
  selected,
  onSelect,
  t,
}: StepProps & { selected: Budget; onSelect: (v: Budget) => void }) {
  const options: Budget[] = ["small", "medium", "large", "custom"];
  return (
    <div>
      <StepHeader
        title={t("steps.budget.title")}
        hint={t("steps.budget.hint")}
      />
      <div className="grid sm:grid-cols-2 gap-5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={cn(
              OPTION_BASE,
              "rounded-md text-start flex p-3 gap-4",
              selected === opt ? OPTION_SELECTED : OPTION_DEFAULT,
            )}
          >
            <SelectionCheck visible={selected === opt} />
            <div className="p-4 sm:p-5 ">
              <h3 className="font-medium text-primary mb-2">
                {t(`steps.budget.options.${opt}.title`)}
              </h3>
              <p className="text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.7] text-primary/60">
                {t(`steps.budget.options.${opt}.range`)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepBrandIdentity({
  selected,
  onSelect,
  t,
}: StepProps & {
  selected: BrandIdentity;
  onSelect: (v: BrandIdentity) => void;
}) {
  const options: BrandIdentity[] = ["complete", "partial", "scratch"];
  return (
    <div>
      <StepHeader title={t("steps.brand.title")} hint={t("steps.brand.hint")} />
      <div className="grid sm:grid-cols-3 gap-5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={cn(
              OPTION_BASE,
              "rounded-lg text-center p-3",
              selected === opt ? OPTION_SELECTED : OPTION_DEFAULT,
            )}
          >
            <SelectionCheck visible={selected === opt} />
            <div className="p-4 sm:p-5">
              <h3 className="font-medium text-primary mb-3">
                {t(`steps.brand.options.${opt}.title`)}
              </h3>
              <p className="text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.7] text-primary/60">
                {t(`steps.brand.options.${opt}.description`)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepContentReadiness({
  selected,
  onSelect,
  t,
}: StepProps & {
  selected: ContentReadiness;
  onSelect: (v: ContentReadiness) => void;
}) {
  const options: ContentReadiness[] = ["provide", "need-help", "unsure"];
  return (
    <div>
      <StepHeader
        title={t("steps.content.title")}
        hint={t("steps.content.hint")}
      />
      <div className="grid sm:grid-cols-3 gap-5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={cn(
              OPTION_BASE,
              "rounded-lg text-center p-3",
              selected === opt ? OPTION_SELECTED : OPTION_DEFAULT,
            )}
          >
            <SelectionCheck visible={selected === opt} />
            <div className="p-4 sm:p-5">
              <h3 className="font-medium text-primary mb-3">
                {t(`steps.content.options.${opt}.title`)}
              </h3>
              <p className="text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.7] text-primary/60">
                {t(`steps.content.options.${opt}.description`)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepDeadlineUrgency({
  selected,
  onSelect,
  t,
}: StepProps & {
  selected: DeadlineUrgency;
  onSelect: (v: DeadlineUrgency) => void;
}) {
  const options: DeadlineUrgency[] = [
    "flexible",
    "2months",
    "1month",
    "urgent",
  ];
  return (
    <div>
      <StepHeader
        title={t("steps.deadline.title")}
        hint={t("steps.deadline.hint")}
      />
      <div className="grid sm:grid-cols-2 gap-5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={cn(
              OPTION_BASE,
              "rounded-lg text-center p-3",
              selected === opt ? OPTION_SELECTED : OPTION_DEFAULT,
            )}
          >
            <SelectionCheck visible={selected === opt} />
            <div className="p-4 sm:p-5">
              <h3 className="font-medium text-primary mb-3">
                {t(`steps.deadline.options.${opt}.title`)}
              </h3>
              <p className="text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.7] text-primary/60">
                {t(`steps.deadline.options.${opt}.description`)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepProjectType({
  selected,
  onSelect,
  t,
}: StepProps & { selected: ProjectType; onSelect: (v: ProjectType) => void }) {
  const options: { key: ProjectType; icon: JSX.Element }[] = [
    {
      key: "website",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      ),
    },
    {
      key: "webapp",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      key: "ecommerce",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      key: "pwa",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];
  return (
    <div>
      <StepHeader
        title={t("steps.projectType.title")}
        hint={t("steps.projectType.hint")}
      />
      <div className="grid sm:grid-cols-2 gap-5">
        {options.map((option) => (
          <button
            key={option.key}
            onClick={() => onSelect(option.key)}
            className={cn(
              OPTION_BASE,
              "rounded-lg text-start flex p-3 gap-4",
              selected === option.key ? OPTION_SELECTED : OPTION_DEFAULT,
            )}
          >
            <SelectionCheck visible={selected === option.key} />
            <div className="p-4 sm:p-5">
              <div
                className={cn(
                  "w-12 h-12 rounded-md flex items-center justify-center mb-4 transition-colors",
                  selected === option.key
                    ? "bg-foreground/20 text-primary"
                    : "bg-foreground/10 text-primary/70",
                )}
              >
                {option.icon}
              </div>
              <h3 className="font-medium text-primary mb-2">
                {t(`steps.projectType.options.${option.key}.title`)}
              </h3>
              <p className="text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.7] text-primary/60">
                {t(`steps.projectType.options.${option.key}.description`)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepComplexity({
  selected,
  onSelect,
  t,
}: StepProps & { selected: Complexity; onSelect: (v: Complexity) => void }) {
  const options: Complexity[] = ["basic", "standard", "premium"];
  return (
    <div>
      <StepHeader
        title={t("steps.complexity.title")}
        hint={t("steps.complexity.hint")}
      />
      <div className="space-y-5">
        {options.map((option, i) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={cn(
              OPTION_BASE,
              "w-full rounded-lg text-start flex p-3 gap-4",
              selected === option ? OPTION_SELECTED : OPTION_DEFAULT,
            )}
          >
            <SelectionCheck visible={selected === option} />
            <div className="p-4 sm:p-5 flex items-center gap-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-md flex items-center justify-center shrink-0 font-mono text-sm leading-normal tracking-wider",
                  selected === option
                    ? "bg-foreground/20 text-primary"
                    : "bg-foreground/10 text-primary/70",
                )}
              >
                {i + 1}
              </div>
              <div>
                <h3 className="font-medium text-primary mb-2">
                  {t(`steps.complexity.options.${option}.title`)}
                </h3>
                <p className="text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.7] text-primary/60">
                  {t(`steps.complexity.options.${option}.description`)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepTimeline({
  selected,
  onSelect,
  t,
}: StepProps & { selected: Timeline; onSelect: (v: Timeline) => void }) {
  const options: Timeline[] = ["urgent", "standard", "flexible"];
  return (
    <div>
      <StepHeader
        title={t("steps.timeline.title")}
        hint={t("steps.timeline.hint")}
      />
      <div className="grid sm:grid-cols-3 gap-5">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={cn(
              OPTION_BASE,
              "rounded-md text-center p-3",
              selected === option ? OPTION_SELECTED : OPTION_DEFAULT,
            )}
          >
            <SelectionCheck visible={selected === option} />
            <div className="p-4 sm:p-5">
              <h3 className="font-medium text-primary mb-3">
                {t(`steps.timeline.options.${option}.title`)}
              </h3>
              <p className="text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.7] text-primary/60">
                {t(`steps.timeline.options.${option}.description`)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
