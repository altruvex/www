"use client";
import { Container } from "@/components/shared/container";
import { ArrowIcon } from "@/components/shared/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { DatePicker, Input, Label, TimePicker } from "@repo/ui/www";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Accent } from "@/components/ui/emphasis";
import { useRouter } from "@/i18n/navigation";
import { HeroHeadline, HeroReveal } from "@/components/sections/hero-motion-wrappers";
import { cn } from "@/lib/utils/utils";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
} from "lucide-react";
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

  return (
    <>
      <section className="accent-world-orange pt-(--section-y-top) pb-(--section-y-bottom) lg:min-h-dvh">
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
          {/* The homepage hero's stack in the start columns, the form in the
              end columns under the same 2px ink rule /contact opens its letter
              with. The back link sits above both, so the rule starts on the
              eyebrow's line. */}
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-16">
            <div className="lg:col-span-5">
              <HeroReveal delay={0.2} className="mb-6">
                <Eyebrow>{t("eyebrow")}</Eyebrow>
              </HeroReveal>
              <HeroHeadline
                as="h1"
                className="mb-7 font-sans text-[clamp(3rem,4.5vw,4.5rem)] leading-[1.05] font-light tracking-[-0.03em] text-foreground select-none md:mb-8 lg:leading-[1.02] rtl:tracking-normal"
              >
                <span className="block">{t("title")}</span>
                <Accent gradient="ember">{t("titleAccent")}</Accent>
              </HeroHeadline>
              <HeroReveal delay={0.5}>
                <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
                  {t.rich("subtitle", bodyMarks)}
                </p>
              </HeroReveal>
            </div>
            <HeroReveal delay={0.65} className="border-t-2 border-foreground pt-8 lg:col-span-7">
              <form onSubmit={onSubmit} className="space-y-7" noValidate>
                <div className="form-field">
                  <Label htmlFor="schedule-name" className="mb-2 block text-muted-foreground eyebrow">
                    {t("form.name.label")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="schedule-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder={t("form.name.placeholder")}
                    className={cn(
                      "w-full text-primary placeholder:text-muted-foreground bg-transparent",
                      errors.name && "border-destructive",
                    )}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && <FieldError msg={errors.name} />}
                </div>
                <div className="form-field">
                  <Label htmlFor="schedule-phone" className="mb-2 block text-muted-foreground eyebrow">
                    {t("form.phone.label")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 ltr:left-3 rtl:right-3 flex items-center pointer-events-none text-primary/30">
                      <Phone className="h-4 w-4" />
                    </div>
                    <Input
                      id="schedule-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder={t("form.phone.placeholder")}
                      className={cn(
                        "w-full ltr:pl-10 rtl:pr-10 text-primary placeholder:text-muted-foreground bg-transparent",
                        errors.phone && "border-destructive",
                      )}
                      aria-invalid={!!errors.phone}
                    />
                  </div>
                  {errors.phone && <FieldError msg={errors.phone} />}
                </div>
                <div className="grid md:grid-cols-2 gap-7">
                  <div className="form-field">
                    <Label className="mb-2 text-muted-foreground eyebrow flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {t("form.date.label")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
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
                      className={cn(errors.date && "border-destructive")}
                    />
                    {errors.date && <FieldError msg={errors.date} />}
                  </div>
                  <div className="form-field">
                    <Label className="mb-2 text-muted-foreground eyebrow flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {t("form.time.label")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <TimePicker
                      value={formData.time}
                      onChange={(time) => handleInputChange("time", time)}
                      hourPlaceholder={t("form.time.hourPlaceholder")}
                      minutePlaceholder={t("form.time.minutePlaceholder")}
                      locale={locale}
                      disabled={isSubmitting}
                      className={cn(errors.time && "border-destructive")}
                    />
                    {errors.time && <FieldError msg={errors.time} />}
                    <p className="mt-1.5 text-muted-foreground eyebrow">
                      {t("form.time.availableHours")}
                    </p>
                  </div>
                </div>
                <div className="pt-4 form-field space-y-4">
                  <MagneticButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t("submit.submitting") : t("submit.button")}
                  </MagneticButton>
                  <p className="mt-1.5 text-muted-foreground eyebrow">
                    {t("form.riskReversal")}
                  </p>
                  {submitSuccess && (
                    <div className="p-4 rounded-panel-sm bg-success/8 border border-success/15">
                      <p className="text-center font-mono leading-normal tracking-wider text-sm text-primary flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        {t("submit.success")}
                      </p>
                    </div>
                  )}
                  {submitError && (
                    <div className="p-4 rounded-panel-sm bg-destructive/8 border border-destructive/15">
                      <p className="text-center font-mono leading-normal tracking-wider text-sm text-primary flex items-center justify-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        {submitError}
                      </p>
                    </div>
                  )}
                </div>
              </form>
            </HeroReveal>
          </div>
        </Container>
      </section>
    </>
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
