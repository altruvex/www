"use client";
import { Container } from "@/components/shared/container";
import { DirectionalLink } from "@/components/shared/directional-link";
import { TrackedCtaLink } from "@/components/interactive/tracked-cta-link";
import {
  ArrowIcon,
  DatePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { MagneticButton } from "@/components/magnetic-button";
import { Eyebrow } from "@repo/ui/www";
import { useRouter } from "@/i18n/navigation";
import {
  FORM_ERROR_KEY,
  fieldErrorMessage,
  readApiResult,
} from "@/lib/api-errors";
import {
  BUSINESS_SLOTS,
  businessSlotToDate,
  businessZoneOffsetLabel,
  formatBusinessHoursRange,
} from "@/lib/config/business-hours";
import { getCommercialCta } from "@/lib/config/commercial";
import {
  HeroHeadline,
  HeroReveal,
} from "@/components/sections/hero-motion-wrappers";
import { cn } from "@/lib/utils/utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { bodyMarks } from "@/components/ui/rich-text";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { attributionPayload } from "@/lib/attribution";
import { intentPayload } from "@/lib/intent";
import { localeMeta } from "@/i18n/locale-meta";
import { PreCallBrief } from "./precall-brief";

export default function SchedulePage() {
  const router = useRouter();
  const t = useTranslations("schedule");
  const tValidations = useTranslations("validations");
  const tCta = useTranslations("commercial.ctas");
  const locale = useLocale();

  // Never prefilled from the URL: a name or phone in a query string leaks
  // into logs, analytics and the Referer header.
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    date: undefined as Date | undefined,
    time: "",
  });
  const startedRef = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepToken, setStepToken] = useState<string | null>(null);
  const confirmRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (submitSuccess) confirmRef.current?.focus();
  }, [submitSuccess]);

  const handleInputChange = (
    field: string,
    value: string | Date | undefined,
  ) => {
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent("schedule_started", { locale });
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field])
      setErrors((prev) => {
        const e = { ...prev };
        delete e[field];
        return e;
      });
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!formData.name || formData.name.length < 2)
      e.name = t("form.name.error");
    if (!formData.phone || formData.phone.length < 10)
      e.phone = t("form.phone.error");
    if (!formData.date) {
      e.date = t("form.date.errorRequired");
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (formData.date < today) e.date = t("form.date.errorPast");
      const max = new Date();
      max.setMonth(max.getMonth() + 3);
      if (formData.date > max) e.date = t("form.date.errorFuture");
    }
    if (!formData.time) {
      e.time = t("form.time.error");
    } else if (formData.date && !e.date) {
      if (slotInstant(formData.date, formData.time) < new Date())
        e.time = t("form.time.errorPast");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      // The picked slot is Cairo wall-clock time, whatever the visitor's zone.
      const dt = slotInstant(formData.date!, formData.time);
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          locale,
          scheduledDate: dt.toISOString(),
          scheduledTime: formData.time,
          ...attributionPayload(),
          ...intentPayload(),
        }),
      });
      const result = await readApiResult<{ stepToken?: string }>(res);
      if (result.ok) {
        setStepToken(
          typeof result.stepToken === "string" ? result.stepToken : null,
        );
        setSubmitSuccess(true);
        trackEvent("schedule_completed", { locale });
        return;
      }
      // The server sends codes, never copy: each maps to a localized line.
      if (result.code === "validation" && result.fields) {
        const fallback: Record<string, [string, string]> = {
          name: ["name", t("form.name.error")],
          phone: ["phone", t("form.phone.error")],
          scheduledDate: [
            "date",
            tValidations("contact.scheduled-datetime-invalid"),
          ],
          scheduledTime: ["time", t("form.time.error")],
        };
        const next: Record<string, string> = {};
        for (const [key, code] of Object.entries(result.fields)) {
          const target = fallback[key];
          if (target)
            next[target[0]] = fieldErrorMessage(tValidations, code, target[1]);
        }
        if (Object.keys(next).length > 0) {
          setErrors(next);
          return;
        }
      }
      setSubmitError(tValidations(FORM_ERROR_KEY[result.code]));
    } catch {
      setSubmitError(tValidations(FORM_ERROR_KEY.network));
    } finally {
      setIsSubmitting(false);
    }
  };

  const blank =
    "rounded-none border-0 border-b border-foreground/45 bg-transparent px-[0.12em] py-0 font-light text-brand-text outline-none transition-colors duration-(--motion-drawer) placeholder:text-muted-foreground/70 focus-visible:border-brand focus-visible:shadow-[0_1px_0_hsl(var(--brand))] aria-invalid:border-destructive";
  const blankTrigger = cn(
    blank,
    "inline-flex h-auto! w-auto gap-0 align-baseline text-[length:inherit]! leading-[inherit] shadow-none focus-visible:ring-0 hover:text-brand-text [&_svg]:hidden data-[placeholder]:text-muted-foreground/70",
  );
  const timeLabel = new Intl.DateTimeFormat(localeMeta(locale).intl, {
    hour: "numeric",
    minute: "2-digit",
  });
  const locked = isSubmitting || submitSuccess;
  const hoursLine = t("facts.hours", {
    range: formatBusinessHoursRange(),
    zone: businessZoneOffsetLabel(),
  });
  const fieldErrors = [
    errors.name,
    errors.phone,
    errors.date,
    errors.time,
  ].filter(Boolean);

  return (
    <>
      <section className="pt-(--section-y-top) pb-(--section-y-bottom) lg:min-h-dvh">
        <Container>
          <HeroReveal delay={0.1} className="mb-10">
            <button
              type="button"
              onClick={() => router.back()}
              className="eyebrow inline-flex items-center gap-2 text-muted-foreground transition-colors duration-(--motion-drawer) hover:text-foreground"
            >
              <ArrowIcon direction="back" className="h-3.5 w-3.5" />
              {t("back")}
            </button>
          </HeroReveal>
          <HeroReveal delay={0.2} className="mb-6">
            <Eyebrow>{t("eyebrow")}</Eyebrow>
          </HeroReveal>
          <HeroHeadline
            as="h1"
            className="mb-6 max-w-5xl text-balance font-sans text-[clamp(2.75rem,6vw,6.25rem)] leading-[1.04] font-light tracking-[-0.035em] text-foreground select-none rtl:leading-[1.3] rtl:tracking-normal"
          >
            {t("title")}
          </HeroHeadline>
          <HeroReveal delay={0.5}>
            <p className="max-w-[44ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {t.rich("subtitle", bodyMarks)}
            </p>
            <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-sm text-muted-foreground">
              <li className="font-medium text-foreground">
                {t("facts.duration")}
              </li>
              <li className="font-medium text-foreground">
                {t("facts.noCharge")}
              </li>
              <li className="font-medium text-foreground">
                {t("facts.noCommitment")}
              </li>
              <li>{hoursLine}</li>
            </ul>
          </HeroReveal>
          <HeroReveal
            delay={0.65}
            className="mt-12 border-t-2 border-foreground pt-10 md:mt-16 md:pt-14"
          >
            <div className="grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-20 xl:gap-28">
              <div className="min-w-0">
                <form onSubmit={onSubmit} noValidate>
                  <p className="max-w-[46ch] font-sans text-[clamp(1.625rem,3.6vw,3.375rem)] leading-[1.5] font-light tracking-[-0.025em] text-foreground rtl:leading-[1.8] rtl:tracking-normal">
                    {t.rich("sentence", {
                      name: () => (
                        <input
                          type="text"
                          autoComplete="name"
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                          placeholder={t("form.name.placeholder")}
                          aria-label={t("form.name.label")}
                          aria-invalid={!!errors.name}
                          disabled={locked}
                          className={cn(
                            blank,
                            "w-[7ch] min-w-[4ch] max-w-full field-sizing-content supports-[field-sizing:content]:w-auto",
                          )}
                        />
                      ),
                      phone: () => (
                        <input
                          type="tel"
                          dir="ltr"
                          autoComplete="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            handleInputChange("phone", e.target.value)
                          }
                          placeholder={t("form.phone.placeholder")}
                          aria-label={t("form.phone.label")}
                          aria-invalid={!!errors.phone}
                          disabled={locked}
                          className={cn(
                            blank,
                            "w-[11.5ch] min-w-[4ch] max-w-full field-sizing-content supports-[field-sizing:content]:w-auto",
                          )}
                        />
                      ),
                      date: () => (
                        <DatePicker
                          date={formData.date}
                          onDateChange={(date) => handleInputChange("date", date)}
                          disabled={locked}
                          placeholder={t("form.date.placeholder")}
                          locale={locale}
                          minDate={new Date()}
                          maxDate={(() => {
                            const d = new Date();
                            d.setMonth(d.getMonth() + 3);
                            return d;
                          })()}
                          className={cn(
                            blankTrigger,
                            !formData.date &&
                              "text-muted-foreground/70 hover:text-muted-foreground",
                            errors.date && "border-destructive",
                          )}
                        />
                      ),
                      time: () => (
                        <Select
                          value={formData.time}
                          onValueChange={(time) => handleInputChange("time", time)}
                          disabled={locked}
                        >
                          <SelectTrigger
                            aria-label={t("form.time.label")}
                            className={cn(
                              blankTrigger,
                              errors.time && "border-destructive",
                            )}
                          >
                            <SelectValue placeholder={t("form.time.placeholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {BUSINESS_SLOTS.map((time) => {
                              const [h, m] = time.split(":").map(Number);
                              return (
                                <SelectItem key={time} value={time}>
                                  {timeLabel.format(new Date(2000, 0, 1, h, m))}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      ),
                    })}
                  </p>
                  {fieldErrors.length > 0 && (
                    <div className="mt-6 space-y-1">
                      {fieldErrors.map((msg) => (
                        <FieldError key={msg} msg={msg} />
                      ))}
                    </div>
                  )}
                  <div className="mt-10 flex flex-wrap items-center gap-6 md:mt-14">
                    <MagneticButton
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={locked}
                    >
                      {isSubmitting ? t("submit.submitting") : t("submit.button")}
                    </MagneticButton>
                    {submitError && (
                      <p
                        role="alert"
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <AlertCircle
                          className="h-4 w-4 text-destructive"
                          aria-hidden
                        />
                        {submitError}
                      </p>
                    )}
                  </div>
                </form>
                {submitSuccess && (
                  <div className="mt-12 border-t border-border-subtle pt-8 md:mt-16">
                    <div role="status">
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2
                          className="h-4 w-4 text-success"
                          aria-hidden
                        />
                        {t("confirm.eyebrow")}
                      </p>
                      <h2
                        ref={confirmRef}
                        tabIndex={-1}
                        className="mt-3 max-w-[24ch] text-[clamp(1.75rem,3.2vw,2.75rem)] font-light leading-[1.1] tracking-[-0.03em] text-foreground outline-none rtl:leading-[1.35] rtl:tracking-normal"
                      >
                        {t("confirm.title")}
                      </h2>
                      <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
                        {t("submit.success")}
                      </p>
                    </div>
                    {stepToken ? <PreCallBrief token={stepToken} /> : null}
                  </div>
                )}
                <div className="mt-8 max-w-xl space-y-3 border-t border-border-subtle pt-6 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    {t("privacy")}{" "}
                    <DirectionalLink
                      href="/privacy"
                      className="text-foreground underline decoration-border underline-offset-4 transition-colors duration-(--motion-hover) hover:text-brand-text hover:decoration-current"
                    >
                      {t("privacyLink")}
                    </DirectionalLink>
                  </p>
                  <p>
                    {t("writeLead")}{" "}
                    <DirectionalLink
                      href={getCommercialCta("describeTheBuild").href}
                      className="text-foreground underline decoration-border underline-offset-4 transition-colors duration-(--motion-hover) hover:text-brand-text hover:decoration-current"
                    >
                      {tCta("describeTheBuild")}
                    </DirectionalLink>
                  </p>
                </div>
              </div>
              <aside className="mt-16 lg:mt-0">
                <CallPrep />
              </aside>
            </div>
          </HeroReveal>
        </Container>
      </section>
    </>
  );
}

const SIDE_LINK =
  "text-foreground underline decoration-border underline-offset-4 transition-colors duration-(--motion-hover) hover:text-brand-text hover:decoration-current";

/** What is worth having to hand for the call, then the two other doors. */
function CallPrep() {
  const t = useTranslations("schedule.prep");
  const tCta = useTranslations("commercial.ctas");
  const items = t.raw("items") as string[];

  return (
    <div className="lg:sticky lg:top-24">
      <Eyebrow className="m-0">{t("heading")}</Eyebrow>
      <ol className="mt-5 divide-y divide-border-subtle border-y border-border-subtle">
        {items.map((item, index) => (
          <li key={item} className="flex items-baseline gap-4 py-3 text-sm leading-relaxed text-foreground">
            <span aria-hidden className="font-mono text-xs tabular-nums text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {t("enough")}
      </p>
      <div className="mt-8 space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          {t("notReady")}{" "}
          <TrackedCtaLink
            href={getCommercialCta("projectRange").href}
            ctaKey="projectRange"
            ctaContext="source=schedule-prep"
            className={SIDE_LINK}
          >
            {tCta("projectRange")}
          </TrackedCtaLink>
        </p>
        <p>
          {t("liveBuild")}{" "}
          <TrackedCtaLink
            href={getCommercialCta("technicalAudit").href}
            ctaKey="technicalAudit"
            ctaContext="source=schedule-prep"
            className={SIDE_LINK}
          >
            {tCta("technicalAudit")}
          </TrackedCtaLink>
        </p>
      </div>
    </div>
  );
}

/** The chosen calendar day at "HH:MM" business time, as an instant. */
function slotInstant(day: Date, time: string): Date {
  return businessSlotToDate(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    time,
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p
      role="alert"
      className="mt-1.5 font-mono text-sm leading-normal tracking-wider text-destructive flex items-center gap-1"
    >
      <AlertCircle className="h-3 w-3" aria-hidden />
      {msg}
    </p>
  );
}
