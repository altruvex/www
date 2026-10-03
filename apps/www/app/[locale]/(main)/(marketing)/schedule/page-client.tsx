"use client";
import { Container } from "@/components/shared/container";
import { ArrowIcon } from "@/components/shared/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import {
  DatePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/www";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useRouter } from "@/i18n/navigation";
import { HeroHeadline, HeroReveal } from "@/components/sections/hero-motion-wrappers";
import { cn } from "@/lib/utils/utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { bodyMarks } from "@/components/ui/rich-text";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("schedule");
  // next-intl's usePathname strips the locale prefix, so reading the locale
  // off the path sent "schedule" to the API and every booking fell back to en.
  const locale = useLocale();

  const [formData, setFormData] = useState({
    name: searchParams.get("name") || "",
    phone: searchParams.get("phone") || "",
    date: undefined as Date | undefined,
    time: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);


  const handleInputChange = (
    field: string,
    value: string | Date | undefined,
  ) => {
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
      // The date check is by day, so today with an hour already gone got
      // through here and was refused by the server after submit.
      const [h, m] = formData.time.split(":").map(Number);
      const at = new Date(formData.date);
      at.setHours(h, m, 0, 0);
      if (at < new Date()) e.time = t("form.time.errorPast");
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
      const [hours, minutes] = formData.time.split(":");
      const dt = new Date(formData.date!);
      dt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          locale,
          message: "",
          scheduledDate: dt.toISOString(),
          scheduledTime: formData.time,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSubmitSuccess(true);
        setTimeout(() => router.push("/"), 2000);
      } else {
        setSubmitError(result.message || t("submit.errorGeneric"));
      }
    } catch {
      setSubmitError(t("submit.errorNetwork"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const blank =
    "rounded-none border-0 border-b border-foreground/45 bg-transparent px-[0.12em] py-0 font-light text-brand-text outline-none transition-colors duration-(--motion-drawer) placeholder:text-muted-foreground/70 focus-visible:border-brand focus-visible:shadow-[0_1px_0_hsl(var(--brand))] aria-invalid:border-destructive";
  // Radix triggers carry their own height, type size and ring; the sentence
  // needs them to read as text, so those are reset to inherit here.
  const blankTrigger = cn(
    blank,
    "inline-flex h-auto! w-auto gap-0 align-baseline text-[length:inherit]! leading-[inherit] shadow-none focus-visible:ring-0 hover:text-brand-text [&_svg]:hidden data-placeholder:text-muted-foreground/70",
  );
  const timeLabel = new Intl.DateTimeFormat(locale.startsWith("ar") ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const fieldErrors = [errors.name, errors.phone, errors.date, errors.time].filter(Boolean);

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
            className="mb-6 max-w-[16ch] font-sans text-[clamp(2.25rem,5vw,4.75rem)] leading-[1.04] font-light tracking-[-0.035em] text-foreground select-none rtl:leading-[1.3] rtl:tracking-normal"
          >
            {t("title")}
          </HeroHeadline>
          <HeroReveal delay={0.5}>
            <p className="max-w-[44ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
              {t.rich("subtitle", bodyMarks)}
            </p>
            <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-sm text-muted-foreground">
              <li className="font-medium text-foreground">{t("facts.free")}</li>
              <li className="font-medium text-foreground">{t("facts.noCommitment")}</li>
              <li>{t("facts.hours")}</li>
            </ul>
          </HeroReveal>
          {/* The whole form is one sentence the visitor completes: four blanks
              at display size under the 2px ink rule /contact opens with. */}
          <HeroReveal delay={0.65} className="mt-12 border-t-2 border-foreground pt-10 md:mt-16 md:pt-14">
            <form onSubmit={onSubmit} noValidate>
              <p className="max-w-[26ch] font-sans text-[clamp(1.625rem,3.6vw,3.375rem)] leading-[1.5] font-light tracking-[-0.025em] text-foreground rtl:leading-[1.8] rtl:tracking-normal">
                {t.rich("sentence", {
                  name: () => (
                    <input
                      type="text"
                      autoComplete="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder={t("form.name.placeholder")}
                      aria-label={t("form.name.label")}
                      aria-invalid={!!errors.name}
                      disabled={isSubmitting}
                      className={cn(blank, "w-[9ch] max-w-full")}
                    />
                  ),
                  phone: () => (
                    <input
                      type="tel"
                      dir="ltr"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder={t("form.phone.placeholder")}
                      aria-label={t("form.phone.label")}
                      aria-invalid={!!errors.phone}
                      disabled={isSubmitting}
                      className={cn(blank, "w-[14ch] max-w-full")}
                    />
                  ),
                  date: () => (
                    <DatePicker
                      date={formData.date}
                      onDateChange={(date) => handleInputChange("date", date)}
                      disabled={isSubmitting}
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
                        !formData.date && "text-muted-foreground/70 hover:text-muted-foreground",
                        errors.date && "border-destructive",
                      )}
                    />
                  ),
                  time: () => (
                    <Select
                      value={formData.time}
                      onValueChange={(time) => handleInputChange("time", time)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        aria-label={t("form.time.label")}
                        className={cn(blankTrigger, errors.time && "border-destructive")}
                      >
                        <SelectValue placeholder={t("form.time.placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMES.map((time) => {
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
                <MagneticButton type="submit" variant="primary" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? t("submit.submitting") : t("submit.button")}
                </MagneticButton>
                {submitSuccess && (
                  <p role="status" className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                    {t("submit.success")}
                  </p>
                )}
                {submitError && (
                  <p role="alert" className="flex items-center gap-2 text-sm text-foreground">
                    <AlertCircle className="h-4 w-4 text-destructive" aria-hidden />
                    {submitError}
                  </p>
                )}
              </div>
            </form>
          </HeroReveal>
        </Container>
      </section>
    </>
  );
}

// The hours the call can start in, in the steps the booking API has always taken.
const TIMES = Array.from({ length: 10 }, (_, i) => i + 9).flatMap((h) =>
  ["00", "15", "30", "45"].map((m) => `${String(h).padStart(2, "0")}:${m}`),
);

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
