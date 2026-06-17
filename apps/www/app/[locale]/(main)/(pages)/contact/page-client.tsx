"use client";

import { PageHero } from "@/components/sections/page-hero";
import { Container } from "@/components/container";
import { MagneticButton } from "@/components/magnetic-button";
import { Input, SelectField, Textarea } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { SITE_CONFIG } from "@/lib/metadata";
import { useSectionDescription, useSectionElement, useSectionTitle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { createContactFormSchema } from "@/lib/validations/contact";
import { AlertCircle, CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type FormErrors = Record<string, string>;

export default function ContactPage() {
  const t = useTranslations("contactPage");
  const tContact = useTranslations("contact");
  const tValidations = useTranslations("validations");
  const contactFormSchema = useMemo(
    () => createContactFormSchema(tValidations),
    [tValidations],
  );
  const searchParams = useSearchParams();

  const infoTitleRef = useSectionTitle<HTMLHeadingElement>();
  const leftRef = useSectionDescription();
  const rightRef = useSectionElement();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    const incomingService = searchParams.get("service");
    if (!incomingService || service) return;

    if (
      incomingService === "development" ||
      incomingService === "interface-design" ||
      incomingService === "consulting" ||
      incomingService === "maintenance"
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setService(incomingService);
    }
  }, [searchParams, service]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitSuccess(false);
    setSubmitError(null);
    setFormErrors({});

    try {
      const payload = {
        name,
        phone,
        message,
        serviceInterest:
          service === "development"
            ? "web-development"
            : service === "interface-design"
              ? "ui-ux"
              : service
                ? "other"
                : undefined,
        website: "",
      };

      const validatedData = contactFormSchema.parse(payload);

      const locale =
        typeof window !== "undefined"
          ? window.location.pathname.split("/")[1] ||
            document.documentElement.lang ||
            "en"
          : "en";

      const response = await fetch(`/${locale}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validatedData, locale }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitSuccess(true);
        setName("");
        setPhone("");
        setService("");
        setMessage("");
        setTimeout(() => setSubmitSuccess(false), 7000);
      } else {
        if (result.errors && typeof result.errors === "object") {
          setFormErrors(result.errors as FormErrors);
          const firstError = Object.values(result.errors as FormErrors)[0];
          setSubmitError(
            firstError || result.message || t("form.errorGeneric"),
          );
        } else {
          setSubmitError(result.message || t("form.errorGeneric"));
        }
      }
    } catch (error: unknown) {
      console.error("Contact form submission error:", error);
      setSubmitError(t("form.errorNetwork"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <PageHero
        eyebrow={t("badge")}
        title={t("heroTitle")}
        description={t("heroDescription")}
        minHeightClass="min-h-[70vh]"
        showStatusIndicator={true}
      />
      <section className="accent-world-orange flex w-full items-center py-24 md:py-32">
        <Container>
          <div className="grid gap-12 md:grid-cols-2 md:gap-20 lg:gap-28">
            <div className="flex flex-col justify-center">
              <div className="mb-12 sm:mb-14 md:mb-16">
                <h2
                  ref={infoTitleRef}
                  className="mb-3 font-sans font-normal leading-[1.05] tracking-tight text-primary"
                  style={{
                    fontSize: "clamp(28px, 4.5vw, 56px)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {t("infoTitle")}
                  <br />
                  <span className="text-primary/75">
                    {t("infoTitleHighlight")}
                  </span>
                </h2>
                <p className="font-mono leading-normal tracking-wider text-sm text-primary/60 sm:text-base">
                  {t("infoSubtitle")}
                </p>
              </div>
              <div ref={leftRef} className="space-y-8 sm:space-y-9">
                <a
                  href={`mailto:${tContact("emailValue")}`}
                  className="group block"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary/60" />
                    <span className="font-mono text-sm leading-normal tracking-wider text-primary/60">
                      {t("emailLabel")}
                    </span>
                  </div>
                  <p className="text-lg text-primary transition-colors group-hover:text-primary/75 md:text-xl lg:text-2xl">
                    {tContact("emailValue")}
                  </p>
                </a>
                <a
                  href={`tel:${t("phoneValue").replace(/\s/g, "")}`}
                  className="group block"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-primary/60" />
                    <span className="font-mono text-sm leading-normal tracking-wider text-primary/60">
                      {t("phoneLabel")}
                    </span>
                  </div>
                  <p className="text-lg text-primary transition-colors group-hover:text-primary/75 md:text-xl lg:text-2xl">
                    {t("phoneValue")}
                  </p>
                </a>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary/60" />
                    <span className="font-mono text-sm leading-normal tracking-wider text-primary/60">
                      {t("locationLabel")}
                    </span>
                  </div>
                  <p className="text-lg text-primary md:text-xl lg:text-2xl">
                    {t("address1")}
                    <br />
                    {t("address2")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2 sm:gap-4">
                  {Object.keys(SITE_CONFIG.social).map((social) => (
                    <a
                      key={social}
                      href={
                        SITE_CONFIG.social[
                          social as keyof typeof SITE_CONFIG.social
                        ]
                      }
                      className="uppercase border-b border-transparent font-mono text-sm leading-normal tracking-wider text-primary/60 transition-all hover:border-foreground/60 hover:text-primary/85 sm:text-sm"
                    >
                      {social}
                    </a>
                  ))}
                </div>
                <div className="pt-6 sm:pt-8">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/schedule" className="flex-1 sm:flex-none">
                      <MagneticButton
                        size="lg"
                        className="w-full group relative"
                      >
                        <span className="flex items-center gap-2">
                          {t("scheduleCall")}
                          <svg
                            className="w-4 h-4 transition-transform ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:-rotate-180"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                          </svg>
                        </span>
                      </MagneticButton>
                    </Link>
                    <a
                      href={`https://wa.me/${t("phoneValue").replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none"
                    >
                      <MagneticButton
                        size="lg"
                        className="w-full group relative bg-messaging-whatsapp text-white hover:bg-messaging-whatsapp/90 border-transparent"
                      >
                        <span className="flex items-center gap-2">
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                          </svg>
                          24/7 WhatsApp
                        </span>
                      </MagneticButton>
                    </a>
                  </div>
                  <p className="mt-4 text-primary/60 font-mono text-sm leading-normal tracking-wider">
                    {t("responseTime")}
                  </p>
                </div>
              </div>
            </div>
            <div ref={rightRef} className="flex flex-col justify-center">
              <div className="p-8 rounded-section liquid-glass">
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  <div>
                    <label htmlFor="contact-name" className="mb-2 block font-mono text-sm leading-normal tracking-wider text-muted-foreground sm:text-sm">
                      {t("form.nameLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("form.namePlaceholder")}
                      className={cn(
                        formErrors.name && "border-destructive",
                      )}
                      aria-invalid={!!formErrors.name}
                      aria-describedby={
                        formErrors.name ? "contact-name-error" : undefined
                      }
                      disabled={isSubmitting}
                    />
                    {formErrors.name && (
                      <p
                        id="contact-name-error"
                        className="mt-1.5 flex items-center gap-1 font-mono text-sm leading-normal tracking-wider text-destructive"
                      >
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {formErrors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="mb-2 block font-mono text-sm leading-normal tracking-wider text-muted-foreground sm:text-sm">
                      {t("form.phoneLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="contact-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("form.phonePlaceholder")}
                      className={cn(
                        formErrors.phone && "border-destructive",
                      )}
                      aria-invalid={!!formErrors.phone}
                      aria-describedby={
                        formErrors.phone ? "contact-phone-error" : undefined
                      }
                      autoComplete="tel"
                      disabled={isSubmitting}
                    />
                    {formErrors.phone && (
                      <p
                        id="contact-phone-error"
                        className="mt-1.5 flex items-center gap-1 font-mono text-sm leading-normal tracking-wider text-destructive"
                      >
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {formErrors.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="contact-service" className="mb-2 block font-mono text-sm leading-normal tracking-wider text-muted-foreground sm:text-sm">
                      {t("form.serviceLabel")}
                    </label>
                    <SelectField
                      id="contact-service"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option value="">{t("form.servicePlaceholder")}</option>
                      <option value="interface-design">
                        {t("form.serviceWebDesign")}
                      </option>
                      <option value="development">
                        {t("form.serviceDevelopment")}
                      </option>
                      <option value="consulting">
                        {t("form.serviceConsulting")}
                      </option>
                      <option value="maintenance">
                        {t("form.serviceMaintenance")}
                      </option>
                    </SelectField>
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="mb-2 block font-mono text-sm leading-normal tracking-wider text-muted-foreground sm:text-sm">
                      {t("form.messageLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <Textarea
                      id="contact-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t("form.messagePlaceholder")}
                      rows={4}
                      className={cn(
                        formErrors.message && "border-destructive",
                      )}
                      aria-invalid={!!formErrors.message}
                      aria-describedby={
                        formErrors.message ? "contact-message-error" : undefined
                      }
                      disabled={isSubmitting}
                    />
                    {formErrors.message && (
                      <p
                        id="contact-message-error"
                        className="mt-1.5 flex items-center gap-1 font-mono text-sm leading-normal tracking-wider text-destructive"
                      >
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {formErrors.message}
                      </p>
                    )}
                  </div>
                  <input
                    type="text"
                    name="website"
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    defaultValue=""
                  />
                  <div className="pt-3 space-y-3">
                    <MagneticButton
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full text-base"
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? t("form.submitting") : t("form.submit")}
                    </MagneticButton>
                    <p className="text-center font-mono text-sm leading-normal tracking-wider text-primary/60">
                      {t("form.riskReversal")}
                    </p>
                    {submitSuccess && (
                      <div className="mt-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-center">
                        <p className="flex items-center justify-center gap-2 font-mono text-sm leading-normal tracking-wider text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          {t("form.success")}
                        </p>
                      </div>
                    )}
                    {submitError && (
                      <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-center">
                        <p className="flex items-center justify-center gap-2 font-mono text-sm leading-normal tracking-wider text-primary">
                          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                          {submitError}
                        </p>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}