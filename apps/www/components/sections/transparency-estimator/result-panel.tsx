"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { ArrowIcon, Input, Label, Textarea } from "@repo/ui";
import { Eyebrow } from "@repo/ui/www";
import { Link } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/config/commercial";
import { motion, scrollToY, useSectionCardGrid } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { getWhatsAppUrl } from "@/lib/utils/whatsapp";
import {
  MAX_DELIVERY_WEEKS,
  deliveryWindowFrom,
  factorViews,
  formatRange,
  paymentScheduleView,
  pricingCopy,
  scopeNoteViews,
  type ComplexityId,
  type EstimateResult,
  type FactorGroupId,
  type Locale,
  type ResolvedPricing,
  type ScopeNoteId,
  type ServiceId,
} from "@repo/pricing-schema";
import { Check, Download, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { CONDITION_QUESTIONS, ESTIMATE_METHOD_ID } from "./constants";
import type { HeadingLevel } from "./questions";
import type { AnswerMap, MoneyFormats, QuestionKey, Translator } from "./types";
import { toLocale } from "@/i18n/locale-meta";

const NOTE_MAX = 1000;

const FACTOR_GROUP: Partial<Record<QuestionKey, FactorGroupId>> = {
  brandIdentity: "brand",
  contentReadiness: "content",
  timeline: "timeline",
};


function DriverRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-3 gap-y-1 text-end">
        {children}
      </dd>
    </div>
  );
}

function ScopeDrivers({
  answers,
  pricing,
  locale,
  tPM,
}: {
  answers: AnswerMap;
  pricing: ResolvedPricing;
  locale: Locale;
  tPM: ReturnType<typeof useTranslations<"pricingModel">>;
}) {
  const copy = pricingCopy(locale);
  const groups = factorViews(locale);
  const service = answers.projectType as ServiceId | null;
  const complexity = answers.complexity as ComplexityId | null;
  const pending = (
    <span className="text-xs text-muted-foreground/80">
      {tPM("result.pending")}
    </span>
  );

  return (
    <dl className="mt-6 divide-y divide-border-subtle border-y border-border-subtle">
      <DriverRow label={tPM("result.projectType")}>
        {service ? (
          <>
            <span className="text-sm font-medium text-foreground">
              {copy.services[service].name}
            </span>
            <span className="text-xs text-muted-foreground">
              {tPM("result.setsRange")}
            </span>
          </>
        ) : (
          pending
        )}
      </DriverRow>
      <DriverRow label={tPM("result.complexity")}>
        {complexity ? (
          <>
            <span className="text-sm font-medium text-foreground">
              {copy.bands[complexity]}
            </span>
            {service ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {tPM("result.cellOf")}{" "}
                <bdi>
                  {formatRange(pricing.services[service].price[complexity], locale)}
                </bdi>
              </span>
            ) : null}
          </>
        ) : (
          pending
        )}
      </DriverRow>
      {CONDITION_QUESTIONS.map((q) => {
        const group = groups.find((g) => g.id === FACTOR_GROUP[q.key]);
        if (!group) return null;
        const option = group.options.find((o) => o.id === answers[q.key]);

        return (
          <DriverRow key={q.key} label={tPM(`factors.${group.id}`)}>
            {option ? (
              <>
                <span className="text-sm font-medium text-foreground">
                  {option.label}
                </span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    option.isNeutral
                      ? "text-muted-foreground"
                      : "text-foreground",
                  )}
                >
                  <bdi>{option.deltaLabel}</bdi>
                </span>
              </>
            ) : (
              pending
            )}
          </DriverRow>
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
  type,
  inputMode,
  error,
  required = false,
  autoComplete,
  inputRef,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: "tel" | "email";
  error?: string | null;
  required?: boolean;
  autoComplete?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const messageId = `${id}-error`;

  return (
    <div>
      <Label
        htmlFor={id}
        className="mb-2 block font-sans text-xs font-medium normal-case tracking-normal text-muted-foreground"
      >
        {label}
      </Label>
      <Input
        ref={inputRef}
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        normalize={type === "tel"}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
      />
      {error ? (
        <p
          id={messageId}
          className="mt-2 text-xs leading-relaxed text-destructive"
          role="alert"
        >
          {error}
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

// Lenis overrides a native #anchor jump, so in-page links scroll explicitly.
function goToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  scrollToY(target.getBoundingClientRect().top + window.scrollY);
}

function SecondaryLink({
  href,
  label,
  external = false,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const className =
    "group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground transition-colors ease-smooth hover:text-local-accent-text";

  if (href.startsWith("#")) {
    return (
      <a
        href={href}
        onClick={(event) => goToSection(event, href.slice(1))}
        className={className}
      >
        <span>{label}</span>
        <ArrowIcon />
      </a>
    );
  }

  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      <span>{label}</span>
      <ArrowIcon />
    </a>
  ) : (
    <Link href={href} className={className}>
      <span>{label}</span>
      <ArrowIcon />
    </Link>
  );
}

export function ResultPanel({
  index,
  headingLevel,
  pricing,
  answers,
  scopeNotes,
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
  note,
  setNote,
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
  index: number;
  headingLevel: HeadingLevel;
  pricing: ResolvedPricing;
  answers: AnswerMap;
  scopeNotes: readonly ScopeNoteId[];
  estimate: EstimateResult;
  deliverables: string[];
  fmt: MoneyFormats;
  num: (n: string | number, pad?: number) => string;
  t: Translator;
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
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
  const tPM = useTranslations("pricingModel");
  const tCta = useTranslations("commercial.ctas");
  const locale: Locale = toLocale(useLocale());
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const Subheading = headingLevel === 2 ? "h3" : "h4";

  const [formOpen, setFormOpen] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (formOpen) phoneRef.current?.focus();
  }, [formOpen]);
  useEffect(() => {
    if (phoneError) phoneRef.current?.focus();
  }, [phoneError]);

  const matrixWindow = deliveryWindowFrom(pricing);
  const schedule = paymentScheduleView(locale, pricing);
  const chosenNotes = scopeNoteViews(locale).filter((n) =>
    scopeNotes.includes(n.id),
  );
  const technicalCallHref = getCommercialCta("technicalCall").href;

  const scopeRef = useSectionCardGrid<HTMLUListElement>({
    ...motion.listItems(),
    selector: "[data-scope-line]",
  });

  const visibleDeliverables = submitted
    ? deliverables
    : deliverables.slice(0, 5);
  const hiddenCount = deliverables.length - visibleDeliverables.length;

  const whatsappHref = `${getWhatsAppUrl()}?text=${encodeURIComponent(
    t("results.whatsappMessage", { reference: reference ?? "—" }),
  )}`;

  const labelFor = (key: "phone" | "name" | "email" | "company" | "note") =>
    `${tPM(`form.${key}`)} — ${tPM(key === "phone" ? "form.required" : "form.optional")}`;

  return (
    <section
      aria-labelledby="estimate-result-heading"
      className="mt-(--section-block) border-t border-border-subtle pt-10 animate-in fade-in slide-in-from-bottom-4 duration-(--motion-base) ease-smooth"
    >
      <div className="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16">
        <header className="lg:col-span-4">
          <span
            aria-hidden
            className="eyebrow text-micro leading-none tabular-nums text-muted-foreground ltr:font-mono"
          >
            {num(index, 2)}
          </span>
          <Eyebrow className="mt-4 text-micro leading-none">
            {t("results.eyebrow")}
          </Eyebrow>
          <Heading
            id="estimate-result-heading"
            className="mt-3 text-[clamp(1.35rem,1.9vw,1.7rem)] font-medium leading-[1.15] tracking-[-0.02em] text-balance text-foreground"
          >
            {t("results.title")}
          </Heading>
          {submitted && reference ? (
            <p className="mt-4 flex items-baseline gap-2.5 text-micro leading-none">
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
        </header>
        <div className="mt-7 lg:col-span-8 lg:mt-0">
          <p className="text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.05] tracking-[-0.035em] tabular-nums text-brand-text">
            {fmt.lead(estimate.minPrice)}
            <span className="mx-1.5 text-muted-foreground">–</span>
            {fmt.trail(estimate.maxPrice)}
          </p>
          <p className="mt-3 tabular-nums text-muted-foreground">
            {num(estimate.minWeeks)}–{num(estimate.maxWeeks)}{" "}
            {t("results.weeks")}
          </p>
          <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
            {t("results.deliveryCeiling", {
              weeks: num(MAX_DELIVERY_WEEKS),
              windowMin: num(matrixWindow.min),
              windowMax: num(matrixWindow.max),
            })}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-px border-y border-border-subtle bg-border-subtle md:grid-cols-2">
        <div className="bg-background py-8 md:pe-10">
          <Subheading className="text-base font-medium text-foreground">
            {tPM("result.driversTitle")}
          </Subheading>
          <ScopeDrivers
            answers={answers}
            pricing={pricing}
            locale={locale}
            tPM={tPM}
          />
          <p className="mt-7 text-xs font-medium text-muted-foreground">
            {tPM("result.notesTitle")}
          </p>
          {chosenNotes.length > 0 ? (
            <ul className="mt-3 divide-y divide-border-subtle border-y border-border-subtle">
              {chosenNotes.map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 py-3"
                >
                  <span className="text-sm font-medium text-foreground">
                    {n.name}
                  </span>
                  <span className="flex flex-wrap justify-end gap-2">
                    <span className="rounded-full border border-border-subtle px-3 py-1 text-xs text-muted-foreground">
                      {tPM("result.confirmed")}
                    </span>
                    {n.id === "maintenance" ? (
                      <span className="rounded-full border border-border-subtle px-3 py-1 text-xs text-muted-foreground">
                        {tPM("result.monthly")}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {tPM("result.noNotes")}
            </p>
          )}
        </div>
        <div className="bg-background py-8 md:ps-10">
          <Subheading className="text-base font-medium text-foreground">
            {submitted
              ? t("results.fullScopeLabel")
              : t("results.includesLabel")}
          </Subheading>
          <ul ref={scopeRef} className="mt-6 space-y-3.5">
            {visibleDeliverables.map((item) => (
              <li
                key={item}
                data-scope-line
                className="flex items-start gap-3.5 text-base leading-relaxed text-foreground"
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
      </div>

      <p className="mt-6 max-w-[72ch] text-sm leading-relaxed text-muted-foreground">
        {tPM("result.disclaimer", {
          days: schedule.validityDaysLabel,
          vat: schedule.vatExcluded,
        })}
      </p>

      {submitted ? (
        <div className="mt-10 grid gap-x-16 gap-y-9 border-t border-border-subtle pt-9 animate-in fade-in duration-(--motion-fast) lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p
              role="status"
              className="flex items-start gap-2.5 text-base font-medium leading-relaxed text-foreground"
            >
              <Check
                aria-hidden
                strokeWidth={2}
                className="mt-1 size-4 shrink-0 text-local-accent"
              />
              {tPM("form.success")}
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
                    <Download aria-hidden className="me-2 size-4" />
                    {t("pdf.button")}
                  </>
                )}
              </MagneticButton>
              <StartOverButton label={t("startOver")} onClick={onStartOver} />
            </div>
          </div>
          <div className="lg:col-span-7 lg:border-s lg:border-border-subtle lg:ps-16">
            <Subheading className="text-base font-medium text-foreground">
              {t("results.nextStepTitle")}
            </Subheading>
            <ol className="mt-5 divide-y divide-border-subtle border-y border-border-subtle">
              {[
                t("results.nextScopeReview"),
                t("results.nextProposal", { days: schedule.validityDaysLabel }),
              ].map((step, i) => (
                <li
                  key={step}
                  className="flex items-baseline gap-4 py-3.5 text-sm leading-relaxed text-foreground"
                >
                  <span
                    aria-hidden
                    className="shrink-0 text-micro tabular-nums text-muted-foreground ltr:font-mono"
                  >
                    {num(i + 1, 2)}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
              <SecondaryLink
                href={technicalCallHref}
                label={tCta("technicalCall")}
              />
              <SecondaryLink
                href={whatsappHref}
                external
                label={t("results.talkNow")}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-10 border-t border-border-subtle pt-9">
          {!formOpen ? (
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
              <MagneticButton
                variant="primary"
                size="lg"
                onClick={() => setFormOpen(true)}
                aria-expanded={false}
                aria-controls="estimate-request-form"
                className="w-full sm:w-auto"
              >
                {tPM("result.requestProposal")}
              </MagneticButton>
              <SecondaryLink
                href={technicalCallHref}
                label={tCta("technicalCall")}
              />
              <SecondaryLink
                href={`#${ESTIMATE_METHOD_ID}`}
                label={t("results.howCalculated")}
              />
              <StartOverButton label={t("startOver")} onClick={onStartOver} />
            </div>
          ) : (
            <form
              id="estimate-request-form"
              className="max-w-2xl"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
              }}
            >
              <p className="max-w-[56ch] text-sm leading-relaxed text-muted-foreground">
                {tPM("form.intro")}
              </p>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <Field
                  id="estimate-phone"
                  label={labelFor("phone")}
                  value={phone}
                  onChange={setPhone}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  error={phoneError}
                  inputRef={phoneRef}
                />
                <Field
                  id="estimate-name"
                  label={labelFor("name")}
                  value={name}
                  onChange={setName}
                  autoComplete="name"
                />
                <Field
                  id="estimate-email"
                  label={labelFor("email")}
                  value={email}
                  onChange={setEmail}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  error={emailError}
                />
                <Field
                  id="estimate-company"
                  label={labelFor("company")}
                  value={company}
                  onChange={setCompany}
                  autoComplete="organization"
                />
                <div className="sm:col-span-2">
                  <Label
                    htmlFor="estimate-note"
                    className="mb-2 block font-sans text-xs font-medium normal-case tracking-normal text-muted-foreground"
                  >
                    {labelFor("note")}
                  </Label>
                  <Textarea
                    id="estimate-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={NOTE_MAX}
                    rows={3}
                  />
                </div>
              </div>
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                {tPM("form.attached")}
              </p>
              <div className="mt-7 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                <MagneticButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={submitting}
                  className="w-full sm:w-auto"
                >
                  {tPM("form.send")}
                </MagneticButton>
                <StartOverButton label={t("startOver")} onClick={onStartOver} />
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
