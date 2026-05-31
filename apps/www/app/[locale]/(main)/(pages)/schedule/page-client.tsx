"use client";
import { Container } from "@/components/container";
import { MagneticButton } from "@/components/magnetic-button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSectionDescription, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SchedulePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("schedule");
  const locale = pathname.split("/")[1] || "en";

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

  const backRef = useSectionEyebrow<HTMLDivElement>();
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const subtitleRef = useSectionDescription();

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
    if (!formData.time) e.time = t("form.time.error");
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
      const res = await fetch(`/${locale}/api/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
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
      <section className="flex min-h-screen items-center pt-(--section-y-top) pb-(--section-y-bottom)">
        <Container>
          <div className="mx-auto max-w-2xl">
            <div className="mb-10 text-center flex flex-col items-center">
              <div ref={backRef} className="w-full flex justify-start mb-8">
                <button
                  onClick={() => router.back()}
                  className="group inline-flex items-center gap-2 text-muted-foreground transition-colors duration-300 hover:text-foreground font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal mb-10"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 ltr:group-hover:-translate-x-1 rtl:group-hover:translate-x-1 rtl:-rotate-180" />
                  {t("back")}
                </button>
              </div>
              <div className="mb-12">
                <p
                  ref={eyebrowRef}
                  className="font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70 mb-4 block"
                >
                  {t("eyebrow")}
                </p>
                <h1
                  ref={titleRef}
                  className="font-sans font-normal text-primary leading-[1.03] mb-4"
                  style={{
                    fontSize: "clamp(36px, 5vw, 64px)",
                    letterSpacing: "-0.025em",
                  }}
                >
                  {t("title")}
                </h1>
                <p
                  ref={subtitleRef}
                  className="font-mono text-sm leading-normal tracking-wider text-primary/70"
                >
                  {t("subtitle")}
                </p>
              </div>
              <div className="h-px w-full bg-foreground/8 mb-10" />
              <form onSubmit={onSubmit} className="space-y-7" noValidate>
                <div className="form-field">
                  <Label className="mb-2 block text-muted-foreground font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal">
                    {t("form.name.label")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder={t("form.name.placeholder")}
                    className={cn(
                      "w-full text-primary placeholder:text-muted-foreground/70 bg-transparent",
                      errors.name && "border-destructive",
                    )}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && <FieldError msg={errors.name} />}
                </div>
                <div className="form-field">
                  <Label className="mb-2 block text-muted-foreground font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal">
                    {t("form.phone.label")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 ltr:left-3 rtl:right-3 flex items-center pointer-events-none text-primary/30">
                      <Phone className="h-4 w-4" />
                    </div>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder={t("form.phone.placeholder")}
                      className={cn(
                        "w-full ltr:pl-10 rtl:pr-10 text-primary placeholder:text-muted-foreground/70 bg-transparent",
                        errors.phone && "border-destructive",
                      )}
                      aria-invalid={!!errors.phone}
                    />
                  </div>
                  {errors.phone && <FieldError msg={errors.phone} />}
                </div>
                <div className="grid md:grid-cols-2 gap-7">
                  <div className="form-field">
                    <Label className="mb-2 text-muted-foreground font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {t("form.date.label")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <DatePicker
                      date={formData.date}
                      onDateChange={(date) => handleInputChange("date", date)}
                      disabled={isSubmitting}
                      placeholder={t("form.date.placeholder")}
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
                    <Label className="mb-2 text-muted-foreground font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {t("form.time.label")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <TimePicker
                      value={formData.time}
                      onChange={(time) => handleInputChange("time", time)}
                      disabled={isSubmitting}
                      className={cn(errors.time && "border-destructive")}
                    />
                    {errors.time && <FieldError msg={errors.time} />}
                    <p className="mt-1.5 text-muted-foreground/80 font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal">
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
                  <p className="mt-1.5 text-muted-foreground/80 font-mono text-sm leading-normal tracking-wider uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-center">
                    {t("form.riskReversal")}
                  </p>
                  {submitSuccess && (
                    <div className="p-4 rounded-lg bg-success/8 border border-success/15">
                      <p className="text-center font-mono leading-normal tracking-wider text-sm text-primary flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        {t("submit.success")}
                      </p>
                    </div>
                  )}
                  {submitError && (
                    <div className="p-4 rounded-lg bg-destructive/8 border border-destructive/15">
                      <p className="text-center font-mono leading-normal tracking-wider text-sm text-primary flex items-center justify-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        {submitError}
                      </p>
                    </div>
                  )}
                </div>
              </form>
            </div>
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
