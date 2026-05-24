"use client";
import { useSectionTitle, useSectionEyebrow, useSectionDescription, useSectionElement, MOTION } from "@/lib/motion";

import { Link } from "@/i18n/navigation";
import { useIsomorphicLayoutEffect } from "@/lib/dom-utils";
import { gsap } from "@/lib/gsap";
import { localizeNumbers } from "@/lib/number";
import {
  DeliverableProject,
  DeliverableTier,
  HOSTING_RENEWAL,
  TransparencyTranslator,
  buildPDFHtml,
  calculateQuickEstimate,
  generateEstimatePdf,
  generateProposalNarrative,
  normalisePhone,
  pickLang,
  validatePhone,
} from "@/lib/transparency-utils";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, Download, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  ChangeEvent,
  KeyboardEvent,
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { Container } from "../container";
import { MagneticButton } from "../magnetic-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type SectionTimeline = "urgent" | "soon" | "flexible";

export const ProposalNarrativeBlock = memo(function ProposalNarrativeBlock({
  projectType,
  tier,
  timelineKey,
  locale,
  brandIdentity,
  contentReadiness,
  deadlineUrgency,
}: {
  projectType: DeliverableProject;
  tier: DeliverableTier;
  timelineKey: string;
  locale: string;
  brandIdentity?: string | null;
  contentReadiness?: string | null;
  deadlineUrgency?: string | null;
}) {
  const narrative = generateProposalNarrative({
    projectType,
    tier,
    timelineKey,
    brandIdentity,
    contentReadiness,
    deadlineUrgency,
  });
  const L = (obj: { ar: string; en: string }) => pickLang(obj, locale);
  const isRtl = locale.startsWith("ar");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground whitespace-nowrap">
          {L({ ar: narrative.headline.ar, en: narrative.headline.en })}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="flex gap-3 p-4 rounded-lg bg-surface border border-border">
        <div className="w-0.5 self-stretch rounded-full bg-border-mid shrink-0" />
        <p
          className={cn(
            "text-[clamp(0.9375rem,0.98vw,1rem)] text-muted-foreground leading-relaxed",
            isRtl
              ? "font-sans"
              : "font-mono text-sm leading-normal tracking-wider",
          )}
        >
          {L(narrative.closing)}
        </p>
      </div>
    </div>
  );
});

export const TransparencySection = memo(function TransparencySection() {
  const t = useTranslations("transparency");
  const tCommon = useTranslations("common");
  const translate = t as TransparencyTranslator;
  const locale = useLocale();

  const sectionRef = useRef<HTMLElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const tweenCtxRef = useRef<gsap.Context | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const badgeRef = useSectionEyebrow<HTMLParagraphElement>();
  const descriptionRef = useSectionDescription<HTMLParagraphElement>();
  const formRef = useSectionElement<HTMLDivElement>();

  useIsomorphicLayoutEffect(() => {
    if (!formContainerRef.current) return;
    tweenCtxRef.current = gsap.context(() => {}, formContainerRef);
    return () => {
      tweenCtxRef.current?.revert();
      tweenCtxRef.current = null;
    };
  }, []);

  const [step, setStep] = useState(1);
  const [isGenerating, setIsGen] = useState(false);
  const [isSubmitting, setIsSub] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const hasAutoDownloadedRef = useRef(false);

  const [sel, setSel] = useState<{
    projectType: DeliverableProject | null;
    tier: DeliverableTier | null;
    timeline: SectionTimeline | null;
    phone: string;
    name: string;
  }>({ projectType: null, tier: null, timeline: null, phone: "", name: "" });

  const animateStep = useCallback(
    (dir: "forward" | "back", cb: () => void) => {
      if (!formContainerRef.current || isAnimating) return;
      setIsAnimating(true);
      const fromY =
        dir === "forward" ? MOTION.distance.md : -MOTION.distance.md;
      const toY = dir === "forward" ? -MOTION.distance.md : MOTION.distance.md;
      gsap.killTweensOf(formContainerRef.current);
      tweenCtxRef.current?.add(() => {
        gsap.to(formContainerRef.current!, {
          opacity: 0,
          y: toY,
          duration: MOTION.duration.fast,
          ease: MOTION.ease.ui,
          onComplete: () => {
            cb();
            gsap.fromTo(
              formContainerRef.current!,
              { opacity: 0, y: fromY },
              {
                opacity: 1,
                y: 0,
                duration: MOTION.duration.base,
                ease: MOTION.ease.gentle,
                onComplete: () => setIsAnimating(false),
              },
            );
          },
        });
      });
    },
    [isAnimating],
  );

  const goNext = useCallback(
    () => animateStep("forward", () => setStep((s) => s + 1)),
    [animateStep],
  );
  const goPrev = useCallback(
    () => animateStep("back", () => setStep((s) => s - 1)),
    [animateStep],
  );

  const estimate =
    sel.projectType && sel.tier && sel.timeline
      ? calculateQuickEstimate(sel.projectType, sel.tier, sel.timeline)
      : null;

  const selection = useMemo(
    () =>
      sel.projectType && sel.tier && sel.timeline
        ? {
            projectType: sel.projectType,
            tier: sel.tier,
            timeline: sel.timeline,
          }
        : null,
    [sel.projectType, sel.tier, sel.timeline],
  );

  const formatEGP = useCallback(
    (n: number) =>
      new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
        style: "currency",
        currency: "EGP",
        maximumFractionDigits: 0,
      }).format(n),
    [locale],
  );

  const handlePhoneSubmit = useCallback(async () => {
    if (!selection || !estimate) return;
    if (!validatePhone(sel.phone)) {
      setPhoneError(t("phoneCapture.phoneError"));
      return;
    }
    setPhoneError(null);
    setIsSub(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        await fetch(`/${locale}/api/transparency`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: normalisePhone(sel.phone),
            name: sel.name || undefined,
            projectType: selection.projectType,
            complexity: selection.tier,
            timeline: selection.timeline,
            price: Math.round((estimate.priceMin + estimate.priceMax) / 2),
            priceMin: estimate.priceMin,
            priceMax: estimate.priceMax,
            weeksMin: estimate.weeksMin,
            weeksMax: estimate.weeksMax,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
    } finally {
      setIsSub(false);
    }
    setLeadCaptured(true);
    animateStep("forward", () => setStep(5));
  }, [animateStep, estimate, locale, sel.name, sel.phone, selection, t]);

  const handleDownloadPDF = useCallback(async () => {
    if (!selection || !estimate) return;
    setIsGen(true);
    try {
      const html = buildPDFHtml({
        locale,
        t: translate,
        projectType: selection.projectType,
        tier: selection.tier,
        timelineKey: selection.timeline,
        priceMin: estimate.priceMin,
        priceMax: estimate.priceMax,
        weeksMin: estimate.weeksMin,
        weeksMax: estimate.weeksMax,
        phone: normalisePhone(sel.phone),
        name: sel.name,
      });
      await generateEstimatePdf(html, `altruvex-estimate-${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsGen(false);
    }
  }, [estimate, locale, sel.name, sel.phone, selection, translate]);

  useIsomorphicLayoutEffect(() => {
    if (
      !leadCaptured ||
      hasAutoDownloadedRef.current ||
      !estimate ||
      !sel.phone
    )
      return;
    hasAutoDownloadedRef.current = true;
    void handleDownloadPDF();
  }, [leadCaptured, handleDownloadPDF, estimate, sel.phone]);

  const canProceed =
    (step === 1 && !!sel.projectType) ||
    (step === 2 && !!sel.tier) ||
    (step === 3 && !!sel.timeline);

  const optCls = (selected: boolean) =>
    cn(
      "relative p-5 rounded-lg border text-start transition-all duration-300",
      selected
        ? "border-foreground/40 bg-surface ring-1 ring-foreground/30"
        : "border-border bg-surface/50 hover:border-foreground/20 hover:bg-surface",
    );

  return (
    <section
      suppressHydrationWarning
      id="transparency"
      ref={sectionRef}
      className="flex w-full items-center pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="mb-12 space-y-3 text-center max-w-3xl mx-auto">
          <p
            ref={badgeRef}
            className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground block"
          >
            {t("badge")}
          </p>
          <h2
            ref={titleRef}
            className="text-[clamp(2.125rem,4vw,3.25rem)] leading-[1.08] tracking-[-0.02em] font-normal text-foreground"
          >
            {t("title")}
          </h2>
          <p
            ref={descriptionRef}
            className="text-[clamp(1.0625rem,1.05vw,1.125rem)] text-muted-foreground leading-relaxed"
          >
            {t("description")}
          </p>
        </div>

        <div className="h-px w-full bg-border mb-12 max-w-3xl mx-auto" />

        <div
          ref={formRef}
          className="max-w-3xl mx-auto bg-background rounded-lg border border-border p-6 md:p-10 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-border">
            <div
              className="h-full bg-brand transition-all duration-500 ease-out"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>

          <div ref={formContainerRef} className="pt-4">
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-normal text-foreground">
                  <span className="mb-2 block font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground">
                    {tCommon("stepOf", { current: 1, total: 3 })}
                  </span>
                  {t("step1.question")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(
                    [
                      "ecommerce",
                      "corporate",
                      "custom",
                      "performance",
                    ] as DeliverableProject[]
                  ).map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        setSel((s) => ({ ...s, projectType: type }))
                      }
                      className={optCls(sel.projectType === type)}
                    >
                      <h4 className="font-medium text-foreground mb-1 text-base">
                        {translate(`step1.options.${type}.title`)}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {translate(`step1.options.${type}.desc`)}
                      </p>
                      {sel.projectType === type && (
                        <div className="absolute top-4 inset-e-4 text-muted-foreground">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-normal text-foreground">
                  <span className="mb-2 block font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground">
                    {tCommon("stepOf", { current: 2, total: 3 })}
                  </span>
                  {t("step2.question")}
                </h3>
                <div className="flex flex-col gap-3">
                  {(
                    [
                      "small",
                      "medium",
                      "large",
                      "enterprise",
                    ] as DeliverableTier[]
                  ).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setSel((s) => ({ ...s, tier }))}
                      className={optCls(sel.tier === tier)}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground text-base">
                          {translate(`step2.options.${tier}`)}
                        </h4>
                        {sel.tier === tier && (
                          <Check className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-normal text-foreground">
                  <span className="mb-2 block font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground">
                    {tCommon("stepOf", { current: 3, total: 3 })}
                  </span>
                  {t("step3.question")}
                </h3>
                <div className="flex flex-col gap-3">
                  {(["urgent", "soon", "flexible"] as SectionTimeline[]).map(
                    (timeline) => (
                      <button
                        key={timeline}
                        onClick={() => setSel((s) => ({ ...s, timeline }))}
                        className={optCls(sel.timeline === timeline)}
                      >
                        <h4 className="font-medium text-foreground text-base">
                          {translate(`step3.options.${timeline}.title`)}
                        </h4>
                        <p className="text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.7] text-muted-foreground mt-0.5">
                          {translate(`step3.options.${timeline}.desc`)}
                        </p>
                        {sel.timeline === timeline && (
                          <div className="absolute top-1/2 -translate-y-1/2 inset-e-4 text-muted-foreground">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-normal text-foreground mb-2">
                    {t("phoneCapture.title")}
                  </h3>
                  <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] text-muted-foreground leading-relaxed">
                    {t("phoneCapture.subtitle")}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-2 block">
                      {t("phoneCapture.phoneLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 inset-s-3 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input
                        type="tel"
                        dir="ltr"
                        value={sel.phone}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setSel((s) => ({ ...s, phone: e.target.value }));
                          setPhoneError(null);
                        }}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
                          e.key === "Enter" &&
                          !isSubmitting &&
                          !leadCaptured &&
                          handlePhoneSubmit()
                        }
                        placeholder={t("phoneCapture.phonePlaceholder")}
                        className={`ps-10 text-foreground bg-transparent placeholder:text-muted-foreground ${phoneError ? "border-destructive" : ""}`}
                      />
                    </div>
                    {phoneError && (
                      <p className="mt-1.5 font-mono text-xs text-destructive">
                        {phoneError}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground">
                      {t("phoneCapture.phoneHint")}
                    </p>
                  </div>
                  <div>
                    <Label className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-2 block">
                      {t("phoneCapture.nameLabel")}
                    </Label>
                    <Input
                      type="text"
                      value={sel.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setSel((s) => ({ ...s, name: e.target.value }))
                      }
                      placeholder={t("phoneCapture.namePlaceholder")}
                      className="text-foreground bg-transparent placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <MagneticButton
                  variant="primary"
                  size="lg"
                  className="w-full justify-center"
                  onClick={handlePhoneSubmit}
                  disabled={isSubmitting || !sel.phone}
                >
                  {isSubmitting
                    ? t("phoneCapture.submitting")
                    : t("phoneCapture.button")}
                </MagneticButton>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-7 py-2">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 mb-4">
                    <Check
                      className="h-3 w-3 text-muted-foreground"
                      strokeWidth={2.5}
                    />
                    <span className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground">
                      {t("results.badge")}
                    </span>
                  </div>
                  <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-normal text-foreground">
                    {t("results.title")}
                  </h3>
                </div>
                {estimate && (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="p-6 rounded-lg bg-foreground text-background">
                        <p className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal opacity-40 mb-3">
                          {t("results.investment")}
                        </p>
                        <p
                          className="font-sans font-light leading-none mb-1"
                          style={{
                            fontSize: "clamp(18px,3.5vw,26px)",
                            letterSpacing: "-0.03em",
                          }}
                        >
                          {formatEGP(estimate.priceMin)} –{" "}
                          {formatEGP(estimate.priceMax)}
                        </p>
                        <p className="font-mono text-xs opacity-40">
                          {t("results.vatExcluded")}
                        </p>
                        <p className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal opacity-30 mt-3">
                          {t("results.hostingIncluded")}
                        </p>
                      </div>
                      <div className="p-6 rounded-lg bg-surface border border-border">
                        <p className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-3">
                          {t("results.timeline")}
                        </p>
                        <p
                          className="font-sans font-light text-foreground leading-none mb-1"
                          style={{
                            fontSize: "clamp(18px,3.5vw,26px)",
                            letterSpacing: "-0.03em",
                          }}
                        >
                          {localizeNumbers(
                            estimate.weeksMin.toString(),
                            locale,
                          )}
                          –
                          {localizeNumbers(
                            estimate.weeksMax.toString(),
                            locale,
                          )}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {t("results.weeks")}
                        </p>
                      </div>
                    </div>
                    {selection && (
                      <ProposalNarrativeBlock
                        projectType={selection.projectType}
                        tier={selection.tier}
                        timelineKey={selection.timeline}
                        locale={locale}
                      />
                    )}
                    <div>
                      <p className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-3">
                        {t("results.whatYouGet")}
                      </p>
                      <div className="space-y-2.5">
                        {(() => {
                          if (!selection) return [];
                          const rawItems = translate.raw?.(
                            `pdfContent.deliverables.${selection.projectType}.${selection.tier}`,
                          );
                          const items = Array.isArray(rawItems)
                            ? rawItems.filter(
                                (item): item is string =>
                                  typeof item === "string",
                              )
                            : [];
                          return (
                            <>
                              {items.slice(0, 5).map((d: string, i: number) => (
                                <div key={i} className="flex items-start gap-3">
                                  <div className="h-1.5 w-1.5 rounded-full bg-border-mid mt-[7px] shrink-0" />
                                  <p className="text-[clamp(0.9375rem,0.98vw,1rem)] text-muted-foreground leading-relaxed">
                                    {d}
                                  </p>
                                </div>
                              ))}
                              {items.length > 5 && (
                                <p className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground ps-5 pt-1">
                                  {t("results.moreInPdf", {
                                    count: items.length - 5,
                                  })}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-3 p-4 rounded-lg bg-surface border border-border">
                      <div className="h-1.5 w-1.5 rounded-full bg-border-mid mt-2 shrink-0" />
                      <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                        <span className="text-foreground font-medium">
                          {t("results.infraLabel")}:
                        </span>{" "}
                        {selection
                          ? t("results.infraDescription", {
                              amount: formatEGP(
                                HOSTING_RENEWAL[selection.tier],
                              ),
                            })
                          : null}
                      </p>
                    </div>
                    <div className="p-6 rounded-lg border border-border bg-surface flex gap-5 items-start">
                      <div className="w-1.5 self-stretch rounded-full bg-border-mid shrink-0" />
                      <div>
                        <p className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground mb-2">
                          {t("results.rangeCtaLabel")}
                        </p>
                        <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] text-muted-foreground leading-relaxed font-sans">
                          {t("results.rangeCta")}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3 pt-1">
                      <MagneticButton
                        variant="primary"
                        size="lg"
                        className="w-full justify-center group"
                        onClick={handleDownloadPDF}
                        disabled={isGenerating}
                      >
                        <span className="flex items-center gap-2">
                          {isGenerating ? (
                            t("pdf.generating")
                          ) : (
                            <>
                              <Download className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                              {t("pdf.button")}
                            </>
                          )}
                        </span>
                      </MagneticButton>
                      <MagneticButton
                        variant="secondary"
                        size="lg"
                        className="w-full justify-center group"
                      >
                        <Link href="/schedule">
                          <span className="flex items-center gap-2">
                            {t("results.ctaPrimary")}
                            <ArrowRight className="h-4 w-4 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:-rotate-180" />
                          </span>
                        </Link>
                      </MagneticButton>
                    </div>
                    <p className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground text-center">
                      {t("results.disclaimer")}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {step < 5 && step !== 4 && (
            <div className="mt-8 flex justify-between items-center border-t border-border pt-6">
              {step > 1 ? (
                <button
                  onClick={goPrev}
                  disabled={isAnimating}
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-base font-mono leading-normal tracking-wider group disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="h-3.5 w-3.5 ltr:group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform rtl:-rotate-180" />
                  {t("back")}
                </button>
              ) : (
                <div />
              )}
              <span className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground">
                {step} / 5
              </span>
              <button
                onClick={goNext}
                disabled={!canProceed || isAnimating}
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-base font-mono leading-normal tracking-wider disabled:opacity-20 disabled:cursor-not-allowed group"
              >
                {t("next")}
                <ArrowRight className="h-3.5 w-3.5 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:-rotate-180" />
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="mt-6 border-t border-border pt-6 flex justify-between items-center">
              <button
                onClick={() => animateStep("back", () => setStep(4))}
                disabled={isAnimating}
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-base font-mono leading-normal tracking-wider group"
              >
                <ArrowLeft className="h-3.5 w-3.5 ltr:group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform rtl:-rotate-180" />
                {t("back")}
              </button>
              <Link href="/transparency">
                <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-base font-mono leading-normal tracking-wider group">
                  {t("startOver")}
                </button>
              </Link>
            </div>
          )}
        </div>

        <div className="mt-32 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-normal text-foreground mb-3">
              {t("faq.title")}
            </h3>
            <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {t("faq.subtitle")}
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {[
              { q: t("faq.q1"), a: t("faq.a1") },
              { q: t("faq.q2"), a: t("faq.a2") },
              { q: t("faq.q3"), a: t("faq.a3") },
              { q: t("faq.q4"), a: t("faq.a4") },
            ].map((item, i) => (
              <AccordionItem
                key={i + 1}
                value={`item-${i + 1}`}
                className="border-border"
              >
                <AccordionTrigger className="text-foreground font-sans text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75]">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-[clamp(0.9375rem,0.98vw,1rem)] text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Container>
    </section>
  );
});
