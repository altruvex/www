"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { usePricingTokens } from "@/components/providers/pricing-tokens-provider";
import { ArrowIcon } from "@/components/shared/directional-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import { Link } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/config/commercial";
import { motion, useSectionCardGrid } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { getWhatsAppUrl } from "@/lib/utils/whatsapp";
import {
  BRAND_FACTORS,
  CONTENT_FACTORS,
  MAX_DELIVERY_WEEKS,
  TIMELINE_FACTORS,
  deliveryWindowFrom,
  type BrandIdentityId,
  type ContentReadinessId,
  type EstimateResult,
  type Factor,
  type TimelineId,
} from "@repo/pricing-schema";
import { Input, Label } from "@repo/ui/www";
import { Check, Download, RotateCcw } from "lucide-react";
import { BUILD_QUESTIONS, QUESTIONS } from "./constants";
import type { AnswerMap, MoneyFormats, QuestionKey, Translator } from "./types";

function FactorTable({
  answers,
  num,
  t,
}: {
  answers: AnswerMap;
  num: (n: string | number) => string;
  t: Translator;
}) {
  const factorFor = (key: QuestionKey): Factor | null => {
    const value = answers[key];
    if (!value) return null;
    if (key === "brandIdentity") return BRAND_FACTORS[value as BrandIdentityId];
    if (key === "contentReadiness")
      return CONTENT_FACTORS[value as ContentReadinessId];
    if (key === "timeline") return TIMELINE_FACTORS[value as TimelineId];
    return null;
  };

  return (
    <dl className="mt-6 divide-y divide-border-subtle border-y border-border-subtle">
      {QUESTIONS.map((q) => {
        const value = answers[q.key];
        const factor = factorFor(q.key);
        const percent = factor ? Math.round((factor.price - 1) * 100) : 0;
        const isBuild = BUILD_QUESTIONS.some((b) => b.key === q.key);

        return (
          <div
            key={q.key}
            className="flex items-baseline justify-between gap-4 py-3"
          >
            <dt className="shrink-0 text-xs text-muted-foreground">
              {t(`ledger.labels.${q.key}`)}
            </dt>
            <dd className="flex min-w-0 items-baseline justify-end gap-3 text-end">
              <span className="truncate text-sm font-medium text-foreground">
                {value ? t(`steps.${q.msg}.options.${value}.title`) : "—"}
              </span>
              <span
                className={cn(
                  "shrink-0 text-xs tabular-nums ltr:font-mono",
                  factor === null
                    ? "text-muted-foreground/60"
                    : percent > 0
                      ? "text-local-accent-text"
                      : "text-muted-foreground",
                )}
                dir="ltr"
              >
                {factor === null
                  ? isBuild
                    ? t("factors.base")
                    : t("factors.pending")
                  : percent === 0
                    ? t("factors.none")
                    : `${percent > 0 ? "+" : "−"}${num(Math.abs(percent))}%`}
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

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
    <div className="border-t border-border-subtle bg-surface/60 px-7 py-9 sm:px-9 md:px-11">
      <div className="max-w-2xl">
        <h4 className="text-[clamp(1.125rem,1.6vw,1.35rem)] font-medium leading-[1.2] tracking-[-0.015em] text-foreground">
          {t("results.detailedEstimateTitle")}
        </h4>
        <p className="mt-2.5 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
          {t("phoneCapture.subtitle")}
        </p>
        <form
          className="mt-7"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
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
              id="estimate-name"
              label={t("phoneCapture.nameLabel")}
              value={name}
              onChange={setName}
              placeholder={t("phoneCapture.namePlaceholder")}
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
            <MagneticButton
              type="submit"
              variant="primary"
              size="lg"
              isLoading={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? t("phoneCapture.submitting") : t("pdf.button")}
            </MagneticButton>
            <StartOverButton label={t("startOver")} onClick={onStartOver} />
          </div>
        </form>
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
    <div className="border-t border-border-subtle bg-surface/60 px-7 py-9 animate-in fade-in duration-(--motion-fast) sm:px-9 md:px-11 md:py-11">
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
            <MagneticButton
              variant="primary"
              size="lg"
              onClick={onDownload}
              isLoading={downloading}
              className="w-full sm:w-auto"
            >
              {downloading ? (
                t("pdf.generating")
              ) : (
                <>
                  <Download className="mr-2 size-4" />
                  {t("pdf.button")}
                </>
              )}
            </MagneticButton>
            <StartOverButton label={t("startOver")} onClick={onStartOver} />
          </div>
        </div>
        <div className="lg:col-span-7 lg:border-s lg:border-border-subtle lg:ps-16">
          <div className="flex items-center gap-3">
            <Eyebrow className="shrink-0 text-micro leading-none">
              {t("results.nextStepTitle")}
            </Eyebrow>
            <span aria-hidden className="h-px min-w-6 flex-1 bg-border-subtle" />
          </div>
          <p className="mt-5 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
            {t("results.nextStepBody")}
          </p>
          <ul className="mt-7 grid list-none gap-px overflow-hidden rounded-panel-sm border border-border-subtle bg-border-subtle">
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

export function ResultPanel({
  answers,
  estimate,
  deliverables,
  fmt,
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
  answers: AnswerMap;
  estimate: EstimateResult;
  deliverables: string[];
  fmt: MoneyFormats;
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
  // The matrix's own window, so the 12-week cap reads as a stretch of the
  // 2-8 weeks the price ranges quote, not as a contradiction of them.
  const pricingTokens = usePricingTokens();
  const matrixWindow = deliveryWindowFrom();
  const windowMin = pricingTokens.deliveryWeeksMin ?? num(matrixWindow.min);
  const windowMax = pricingTokens.deliveryWeeksMax ?? num(matrixWindow.max);
  const scopeRef = useSectionCardGrid<HTMLUListElement>({
    ...motion.listItems(),
    selector: "[data-scope-line]",
  });

  const visibleDeliverables = submitted
    ? deliverables
    : deliverables.slice(0, 5);
  const hiddenCount = deliverables.length - visibleDeliverables.length;

  return (
    <div className="mt-16 overflow-hidden rounded-panel-sm border border-border-subtle bg-background animate-in fade-in slide-in-from-bottom-4 duration-(--motion-base) ease-smooth lg:mt-24">
      <div className="border-b border-border-subtle bg-surface/60 px-7 py-8 sm:px-9 md:px-11 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <Eyebrow tone="accent" className="text-micro leading-none">
            {t("results.estimateLabel")}
          </Eyebrow>
          {submitted && reference ? (
            <p className="flex items-baseline gap-2.5 text-micro leading-none">
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
        <p className="mt-5 text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.05] tracking-[-0.035em] tabular-nums text-foreground">
          {fmt.lead(estimate.minPrice)}
          <span className="mx-1.5 text-muted-foreground">–</span>
          {fmt.trail(estimate.maxPrice)}
        </p>
        <p className="mt-3 tabular-nums text-muted-foreground">
          {num(estimate.minWeeks)}–{num(estimate.maxWeeks)} {t("results.weeks")}
        </p>
        <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
          {t("results.deliveryCeiling", {
            weeks: num(MAX_DELIVERY_WEEKS),
            windowMin,
            windowMax,
          })}
        </p>
      </div>
      <div className="grid gap-px bg-border-subtle md:grid-cols-2">
        <div className="bg-background px-7 py-8 sm:px-9 md:px-11 md:py-10">
          <Eyebrow className="text-micro leading-none">
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
          <Eyebrow className="text-micro leading-none">
            {t("factors.title")}
          </Eyebrow>
          <FactorTable answers={answers} num={num} t={t} />
          <p className="mt-6 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
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