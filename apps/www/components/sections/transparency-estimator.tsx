"use client";

/**
 * The estimator, orchestrating the pieces split out under
 * `./transparency-estimator/`:
 *
 *   types.ts          — shared types, no React
 *   constants.ts       — the question list and its lookup tables, no React
 *   span.ts            — the pricing math (`spanFor`), no React
 *   hooks.ts            — useStuck / useReached / useRadioKeys
 *   instrument.tsx       — the pinned readout
 *   intro-chain.tsx       — pricing → estimate → proposal, before the figure
 *   questions.tsx         — the build questions, scope notes + conditions
 *   result-panel.tsx       — the post-completion payoff, loaded lazily below
 *
 * All of these still ship to the client: every one is reached only through
 * this "use client" entry point, and a file boundary alone does not change
 * which bundle a module lands in — Next draws that line at "use client" plus
 * whatever `next/dynamic` explicitly defers, not at the filesystem. The split
 * is for the 1,800-line file it used to be: nine call-graphs mixed into one
 * function-per-section listing, each needing its neighbours' types re-scanned
 * on every edit. The one piece that *does* change what ships before first
 * interaction is `ResultPanelLazy` below — see its own comment.
 */
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
  paymentScheduleView,
  pricingCopy,
  scopeNoteViews,
  type ComplexityId,
  type Locale,
} from "@repo/pricing-schema";
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

/**
 * The post-completion payoff, deferred.
 *
 * `ResultPanel` pulls in the WhatsApp link builder, the commercial-CTA
 * config, and the list-stagger animation from `@/lib/motion` — none of which
 * a visitor who has answered zero, one, or four of five questions needs yet.
 * `next/dynamic({ ssr: false })` keeps that whole branch, and its imports,
 * out of both the server-rendered HTML and the client bundle evaluated on
 * first paint; it is fetched only once `complete && estimate` is about to
 * render it for the first time. `ssr: false` is correct (not just faster)
 * here specifically because the panel is never visible on first paint by
 * construction — there is no no-JS fallback to preserve.
 */
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
  /**
   * The services + terms slice of the pricing the page resolved (admin
   * overrides applied). Omitted, the estimator prices from the defaults.
   */
  pricing?: EstimatorPricing;
}

export function TransparencyEstimator({
  pageHeading = false,
  initialProjectType = null,
  pricing: pricingSlice,
}: TransparencyEstimatorProps = {}) {
  const t = useTranslations("transparency");
  const tPM = useTranslations("pricingModel");
  const locale = useLocale();
  const isAr = locale.startsWith("ar");
  const schemaLocale: Locale = isAr ? "ar" : "en";
  // One pricing object for the instrument, the deltas, the result and the PDF
  // — the same figures the lead route recomputes on the server.
  const pricing = useMemo(
    () => resolveEstimatorPricing(pricingSlice),
    [pricingSlice],
  );
  const copy = pricingCopy(schemaLocale);
  const notes = useMemo(() => scopeNoteViews(schemaLocale), [schemaLocale]);
  /** Step headings sit one level under the section title. */
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
  /** The handle the estimate is discussed by, allocated server-side on
   * submit. */
  const [reference, setReference] = useState<string | null>(null);
  /** The transient "this answer did that" chip. Cleared on a timer. */
  const [delta, setDelta] = useState<Delta | null>(null);

  // Kept off the instrument: a GSAP reveal puts a transform on its host, and
  // a transformed ancestor becomes the containing block of anything sticky
  // inside it — the readout would scroll away with the questions.
  const questionsRef = useReveal<HTMLDivElement>();

  // Fires once the verdict clears the viewport, which is the moment the
  // pinned readout and the display-size verdict would otherwise be showing
  // the same number at once.
  const { sentinel: verdictSentinel, reached: handedOff } = useReached();

  // Memoised because `select` closes over it to compute the delta: a fresh
  // object per render would rebuild every option handler on every keystroke
  // in the lead form.
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
  /** Only ever read when complete, where it equals `spanFor` exactly. */
  const estimate = getEstimate();
  /** What the instrument prints, at every stage of answering. */
  const shown = useMemo(() => spanFor(answers, pricing), [answers, pricing]);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat(isAr ? "ar-EG" : "en-EG", {
        style: "currency",
        currency: "EGP",
        maximumFractionDigits: 0,
      }),
    [isAr],
  );

  /**
   * The bare number, for the end of a range that already carries its unit.
   *
   * `EGP 22,000 - EGP 385,000` reads as two prices rather than one range. The
   * unit is printed once, on the side the script puts it: leading in
   * English, trailing in Arabic — which is where `ar-EG` puts the currency
   * anyway.
   */
  const decimal = useMemo(
    () =>
      new Intl.NumberFormat(isAr ? "ar-EG" : "en-EG", {
        maximumFractionDigits: 0,
      }),
    [isAr],
  );

  const money = useCallback((n: number) => currency.format(n), [currency]);
  const plain = useCallback((n: number) => decimal.format(n), [decimal]);
  const fmt: MoneyFormats = useMemo(
    () => ({
      money,
      lead: isAr ? plain : money,
      trail: isAr ? money : plain,
    }),
    [isAr, money, plain],
  );
  const num = useCallback(
    (n: string | number, pad?: number) =>
      pad ? formatIndex(n, pad, locale) : localizeNumbers(String(n), locale),
    [locale],
  );

  const select = useCallback(
    (key: QuestionKey, value: string) => {
      // The delta is computed here rather than from a render-to-render diff:
      // the answer that caused it is only known at the call site, and a chip
      // that cannot name its cause is decoration.
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

  // The chip states a cause, and a cause stops being news. It clears itself
  // so it never reads as a standing property of the estimate.
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
    // The same rule the lead route's zod schema applies.
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
          locale: isAr ? "ar" : "en",
          phone,
          name: name || undefined,
          email: email || undefined,
          company: company || undefined,
          projectType,
          complexity,
          timeline: timeline ?? "standard",
          // Asked of every visitor since this estimator shipped, and until
          // now discarded on submit. They are what says how much groundwork
          // a deal carries before engineering starts.
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
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // A rejected email must say so on the email field, not under the
        // phone.
        if (data?.errors?.email) setEmailError(data.errors.email);
        if (data?.errors?.phone || !data?.errors?.email) {
          setPhoneError(data?.errors?.phone ?? tPM("form.errors.phoneInvalid"));
        }
        return;
      }

      setReference(typeof data?.reference === "string" ? data.reference : null);
      setSubmitted(true);
    } catch {
      setPhoneError(tPM("form.errors.phoneInvalid"));
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
    note,
    phone,
    projectType,
    scopeNotes,
    timeline,
    tPM,
  ]);

  /**
   * The PDF, generated on demand.
   *
   * `buildPDFHtml` and `generateEstimatePdf` live in `transparency-pdf.ts`
   * — an ~900-line module whose PDF-markup half is only ever read from this
   * one callback, itself only reachable after all five questions are
   * answered *and* the lead form is submitted. Importing it at module scope
   * would ship that markup to everyone who opens the page; the dynamic
   * import here ships it only to the person who clicked Download.
   */
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
        // Label = service + band, both named by the schema (R13).
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

  // Scope lines quote the post-launch warranty window as a `{token}`; the
  // downloadable PDF fills it the same way, from the same term.
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
        {/* No chapter index: the estimator is the instrument that produces
            the figure, not one of the chapters that then explain it. */}
        <TransparencyChapter
          titleId="transparency-estimator-heading"
          titleAs={pageHeading ? "h1" : "h2"}
          eyebrow={t("badge")}
          title={t("title")}
          lede={t("subtitle")}
        />
        <IntroChain t={t} />

        {/* The instrument, before the first question and pinned for the rest
            of the section. The reader sees the figure they came for at its
            widest honest value, then watches their own answers narrow it. */}
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

        <div ref={questionsRef} className="mt-14 lg:mt-20">
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

        {/* Not a second page: the figure is not repeated here — it lives in
            the instrument above, which stands down the moment this arrives.
            What follows is only what registering was for. */}
        {complete && estimate ? (
          <>
            {/* The handoff boundary, immediately above the verdict — and
                only when there is a verdict. Rendered unconditionally it sat
                at the foot of the section and crossed the line while the
                reader was still on the last question, taking the readout
                away for no reason. */}
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
