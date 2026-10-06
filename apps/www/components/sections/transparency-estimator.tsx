"use client";

import { TransparencyChapter } from "@/components/sections/transparency-chapter";
import { Container } from "@/components/shared/container";
import { SectionSkeleton } from "@/components/shared/section-skeleton";
import {
  useTransparency,
  type BrandIdentity,
  type Complexity,
  type ContentReadiness,
  type ProjectType,
  type Timeline,
} from "@/hooks/use-transparency";
import { useReveal } from "@/lib/motion";
import { formatIndex, localizeNumbers } from "@/lib/utils/number";
import {
  fillScopeTokens,
  isValidPhone,
  mapProjectType,
  type TransparencyTranslator,
} from "@/lib/utils/transparency-utils";
import {
  formatMoney,
  formatNumber,
  paymentScheduleView,
  pricingCopy,
  scopeNoteViews,
  type ComplexityId,
  type Locale,
} from "@repo/pricing-schema";
import {
  FORM_ERROR_KEY,
  fieldErrorMessage,
  readApiResult,
} from "@/lib/api-errors";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BUILD_QUESTIONS,
  CONDITION_QUESTIONS,
  COMPLEXITY_TIER,
  ESTIMATOR_STEP,
  TOTAL,
} from "./transparency-estimator/constants";
import { useReached } from "./transparency-estimator/hooks";
import { Instrument } from "./transparency-estimator/instrument";
import { IntroChain } from "./transparency-estimator/intro-chain";
import {
  BuildQuestion,
  ConditionsBlock,
  ScopeNotesStep,
} from "./transparency-estimator/questions";
import {
  resolveEstimatorPricing,
  spanFor,
  type EstimatorPricing,
} from "./transparency-estimator/span";
import type {
  AnswerMap,
  Delta,
  MoneyFormats,
  QuestionKey,
} from "./transparency-estimator/types";
import { toLocale } from "@/i18n/locale-meta";

const ResultPanelLazy = dynamic(
  () =>
    import("./transparency-estimator/result-panel").then((m) => ({
      default: m.ResultPanel,
    })),
  { ssr: false, loading: () => <SectionSkeleton /> },
);

interface TransparencyEstimatorProps {
  pageHeading?: boolean;
  initialProjectType?: ProjectType;
  pricing?: EstimatorPricing;
}

export function TransparencyEstimator({
  pageHeading = false,
  initialProjectType = null,
  pricing: pricingSlice,
}: TransparencyEstimatorProps = {}) {
  const t = useTranslations("transparency");
  const tPM = useTranslations("pricingModel");
  const tValidations = useTranslations("validations");
  const locale = useLocale();
  const schemaLocale: Locale = toLocale(locale);
  const pricing = useMemo(
    () => resolveEstimatorPricing(pricingSlice),
    [pricingSlice],
  );
  const copy = pricingCopy(schemaLocale);
  const notes = useMemo(() => scopeNoteViews(schemaLocale), [schemaLocale]);
  const headingLevel = pageHeading ? 2 : 3;

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
    scopeNotes,
    toggleScopeNote,
    getEstimate,
    reset,
  } = useTransparency({ initialProjectType, pricing });

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [note, setNote] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [delta, setDelta] = useState<Delta | null>(null);

  const questionsRef = useReveal<HTMLDivElement>();

  const { sentinel: verdictSentinel, reached: handedOff } = useReached();

  const answers: AnswerMap = useMemo(
    () => ({
      projectType,
      complexity,
      brandIdentity,
      contentReadiness,
      timeline,
    }),
    [brandIdentity, complexity, contentReadiness, projectType, timeline],
  );

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const complete = answeredCount === TOTAL;
  const estimate = getEstimate();
  const shown = useMemo(() => spanFor(answers, pricing), [answers, pricing]);

  // One currency format with /pricing (#33): the schema's formatter, so a
  // range reads "min – max EGP" / "min – max جنيه" on both pages.
  const money = useCallback(
    (n: number) => formatMoney(n, schemaLocale),
    [schemaLocale],
  );
  const plain = useCallback(
    (n: number) => formatNumber(n, schemaLocale),
    [schemaLocale],
  );
  const fmt: MoneyFormats = useMemo(
    () => ({ money, lead: plain, trail: money }),
    [money, plain],
  );
  const num = useCallback(
    (n: string | number, pad?: number) =>
      pad ? formatIndex(n, pad, locale) : localizeNumbers(String(n), locale),
    [locale],
  );

  const select = useCallback(
    (key: QuestionKey, value: string) => {
      const before = spanFor(answers, pricing);
      const after = spanFor({ ...answers, [key]: value }, pricing);
      const minChange = after.minPrice - before.minPrice;
      const maxChange = after.maxPrice - before.maxPrice;

      setDelta(
        minChange === 0 && maxChange === 0
          ? null
          : {
              label:
                key === "complexity"
                  ? copy.bands[value as ComplexityId]
                  : t(
                      `steps.${[...BUILD_QUESTIONS, ...CONDITION_QUESTIONS].find((q) => q.key === key)!.msg}.options.${value}.title`,
                    ),
              minChange,
              maxChange,
            },
      );

      if (key === "projectType") setProjectType(value as ProjectType);
      if (key === "complexity") setComplexity(value as Complexity);
      if (key === "brandIdentity") setBrandIdentity(value as BrandIdentity);
      if (key === "contentReadiness")
        setContentReadiness(value as ContentReadiness);
      if (key === "timeline") setTimeline(value as Timeline);
    },
    [
      answers,
      copy,
      pricing,
      setBrandIdentity,
      setComplexity,
      setContentReadiness,
      setProjectType,
      setTimeline,
      t,
    ],
  );

  useEffect(() => {
    if (!delta) return;
    const id = window.setTimeout(() => setDelta(null), 2600);
    return () => window.clearTimeout(id);
  }, [delta]);

  const startOver = useCallback(() => {
    reset();
    setName("");
    setPhone("");
    setEmail("");
    setCompany("");
    setNote("");
    setPhoneError(null);
    setEmailError(null);
    setSubmitted(false);
    setReference(null);
    setDelta(null);
  }, [reset]);

  const submit = useCallback(async () => {
    if (!phone.trim()) {
      setPhoneError(tPM("form.errors.phoneEmpty"));
      return;
    }
    if (!isValidPhone(phone)) {
      setPhoneError(tPM("form.errors.phoneInvalid"));
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
          locale: schemaLocale,
          phone,
          name: name || undefined,
          email: email || undefined,
          company: company || undefined,
          projectType,
          complexity,
          timeline: timeline ?? "standard",
          brandIdentity: brandIdentity ?? undefined,
          contentReadiness: contentReadiness ?? undefined,
          scopeNotes,
          note: note.trim() || undefined,
          priceMin: estimate.minPrice,
          priceMax: estimate.maxPrice,
          weeksMin: estimate.minWeeks,
          weeksMax: estimate.maxWeeks,
        }),
      });
      const result = await readApiResult<{ reference?: unknown }>(res);

      if (!result.ok) {
        // Codes, never server copy. The form has one message slot (under the
        // phone field) for anything that is not a field error.
        const fields = result.code === "validation" ? (result.fields ?? {}) : {};
        if (fields.email) {
          setEmailError(
            fieldErrorMessage(tValidations, fields.email, tValidations("transparency-lead.email")),
          );
        }
        if (fields.phone) {
          setPhoneError(
            fieldErrorMessage(tValidations, fields.phone, tPM("form.errors.phoneInvalid")),
          );
        } else if (!fields.email) {
          setPhoneError(tValidations(FORM_ERROR_KEY[result.code]));
        }
        return;
      }

      setReference(typeof result.reference === "string" ? result.reference : null);
      setSubmitted(true);
    } catch {
      setPhoneError(tValidations(FORM_ERROR_KEY.network));
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
    name,
    note,
    phone,
    projectType,
    schemaLocale,
    scopeNotes,
    timeline,
    tPM,
    tValidations,
  ]);

  const downloadPdf = useCallback(async () => {
    if (!estimate || !projectType || !complexity) return;

    setDownloading(true);
    try {
      const { buildPDFHtml, collectPdfFonts, generateEstimatePdf } =
        await import("@/lib/utils/transparency-pdf");

      const schedule = paymentScheduleView(schemaLocale, pricing);
      const html = buildPDFHtml({
        locale: schemaLocale,
        t: t as unknown as TransparencyTranslator,
        projectType: mapProjectType(projectType),
        band: COMPLEXITY_TIER[complexity],
        serviceLabel: copy.services[projectType].documentName,
        bandLabel: copy.bands[complexity],
        timelineLabel: timeline
          ? t(`steps.timeline.options.${timeline}.title`)
          : "",
        timelineKey: timeline ?? "standard",
        scopeNotes: notes
          .filter((n) => scopeNotes.includes(n.id))
          .map((n) => n.name),
        disclaimer: tPM("result.disclaimer", {
          days: schedule.validityDaysLabel,
          vat: schedule.vatExcluded,
        }),
        pricing,
        fonts: collectPdfFonts(),
        priceMin: estimate.minPrice,
        priceMax: estimate.maxPrice,
        weeksMin: estimate.minWeeks,
        weeksMax: estimate.maxWeeks,
        name,
        brandIdentity,
        contentReadiness,
      });

      await generateEstimatePdf(html, `altruvex-estimate-${locale}.pdf`);
    } finally {
      setDownloading(false);
    }
  }, [
    brandIdentity,
    complexity,
    contentReadiness,
    copy,
    estimate,
    locale,
    name,
    notes,
    pricing,
    projectType,
    schemaLocale,
    scopeNotes,
    t,
    timeline,
    tPM,
  ]);

  const deliverables = (
    projectType && complexity
      ? ((t.raw(
          `pdfContent.deliverables.${mapProjectType(projectType)}.${COMPLEXITY_TIER[complexity]}`,
        ) as string[]) ?? [])
      : (t.raw("results.fallbackDeliverables") as string[])
  ).map((item) => fillScopeTokens(item, locale, pricing));

  return (
    <section
      id="transparency-estimator"
      aria-labelledby="transparency-estimator-heading"
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <TransparencyChapter
          titleId="transparency-estimator-heading"
          titleAs={pageHeading ? "h1" : "h2"}
          eyebrow={t("badge")}
          title={t("title")}
          lede={t("subtitle")}
        />
        <IntroChain t={t} />

        <Instrument
          shown={shown}
          resolved={answeredCount > 0}
          settled={complete}
          answeredCount={answeredCount}
          delta={delta}
          handedOff={handedOff}
          fmt={fmt}
          num={num}
          t={t}
        />

        <div ref={questionsRef} className="mt-(--section-block)">
          <div className="space-y-16 lg:space-y-24">
            {BUILD_QUESTIONS.map((question, i) => (
              <BuildQuestion
                key={question.key}
                index={i + 1}
                stage={i === 0 ? t("stages.build") : null}
                stageNote={i === 0 ? t("stages.buildNote") : null}
                question={question}
                selected={answers[question.key]}
                onSelect={(val) => select(question.key, val)}
                t={t}
                num={num}
                headingLevel={headingLevel}
                titleFor={
                  question.key === "complexity"
                    ? (option) => copy.bands[option as ComplexityId]
                    : undefined
                }
              />
            ))}

            <ScopeNotesStep
              index={ESTIMATOR_STEP.scopeNotes}
              title={tPM("scopeNotes.title")}
              lead={tPM("scopeNotes.lead")}
              badge={tPM("scopeNotes.badge")}
              notes={notes}
              selected={scopeNotes}
              onToggle={toggleScopeNote}
              num={num}
              headingLevel={headingLevel}
            />

            <ConditionsBlock
              index={ESTIMATOR_STEP.conditions}
              questions={CONDITION_QUESTIONS}
              answers={answers}
              onSelect={select}
              t={t}
              num={num}
              headingLevel={headingLevel}
            />
          </div>
        </div>

        {complete && estimate ? (
          <>
            <div ref={verdictSentinel} aria-hidden className="h-px" />

            <ResultPanelLazy
              index={ESTIMATOR_STEP.result}
              headingLevel={headingLevel}
              pricing={pricing}
              answers={answers}
              scopeNotes={scopeNotes}
              estimate={estimate}
              deliverables={deliverables}
              fmt={fmt}
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
              note={note}
              setNote={setNote}
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
          </>
        ) : null}
      </Container>
    </section>
  );
}
