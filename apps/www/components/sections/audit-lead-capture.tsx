"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { useFillPricingTokens } from "@/components/providers/pricing-tokens-provider";
import { Eyebrow } from "@repo/ui/www";
import { trackEvent } from "@/lib/analytics";
import { attributionPayload } from "@/lib/attribution";
import { FORM_ERROR_KEY, readApiResult } from "@/lib/api-errors";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

interface AuditLeadCaptureProps {
  source?: string;
  className?: string;
}

export function AuditLeadCapture({
  source = "article_audit_cta",
  className,
}: AuditLeadCaptureProps) {
  const locale = useLocale();
  const t = useTranslations("auditLead");
  const tValidations = useTranslations("validations");
  const fillTokens = useFillPricingTokens();
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const validatePhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.length >= 8 && cleaned.length <= 15;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhone(phone)) {
      setError(t("phoneError"));
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/exit-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          source,
          locale,
          ...attributionPayload(),
        }),
      });

      const result = await readApiResult(response);
      if (result.ok) {
        setIsSuccess(true);
        trackEvent("audit_lead_submitted", { locale, source });
      } else if (result.code === "validation") {
        setError(t("phoneError"));
      } else {
        // Codes, never server copy: the line is in the visitor's locale.
        setError(tValidations(FORM_ERROR_KEY[result.code]));
      }
    } catch {
      setError(tValidations(FORM_ERROR_KEY.network));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className={cn(
        "border-t border-border-subtle pt-8",
        className,
      )}
    >
      {isSuccess ? (
        <div>
          <Eyebrow className="text-muted-foreground mb-3">
            {t("successTitle")}
          </Eyebrow>
          <p className="text-sm text-foreground/60 leading-relaxed">
            {t("successDescription")}
          </p>
        </div>
      ) : (
        <>
          <Eyebrow className="text-muted-foreground mb-3">
            {t("eyebrow")}
          </Eyebrow>
          <h3 className="text-xl md:text-2xl font-medium text-foreground tracking-tight mb-3">
            {t("title")}
          </h3>
          <p className="text-sm text-foreground/60 leading-relaxed mb-6 max-w-xl">
            {fillTokens(t.raw("description"))}
          </p>
          <p className="mb-6 text-xs font-medium text-foreground/70">
            {["noPitch", "noCommitment", "founderAccess"]
              .map((key) => t(`stats.${key}`))
              .join(" · ")}
          </p>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-4 sm:items-end max-w-xl"
          >
            <div className="flex-1">
              <div
                className={cn(
                  "flex items-center border-b border-foreground/45 pb-2 gap-2 focus-within:border-foreground",
                  error && "border-destructive",
                )}
              >
                <input
                  type="tel"
                  id="audit-lead-phone"
                  placeholder={t("phonePlaceholder")}
                  aria-label={t("phoneLabel")}
                  aria-describedby="audit-lead-phone-hint"
                  aria-invalid={error ? true : undefined}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError("");
                  }}
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 bg-transparent text-sm text-foreground w-full",
                    "placeholder:text-muted-foreground outline-none",
                  )}
                />
              </div>
              {error && (
                <p className="text-xs text-destructive mt-1.5">{error}</p>
              )}
              <p
                id="audit-lead-phone-hint"
                className="text-xs text-muted-foreground mt-1.5"
              >
                {t("phoneHint")}
              </p>
            </div>
            <MagneticButton
              type="submit"
              variant="primary"
              className="sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("submitting") : t("buttonText")}
            </MagneticButton>
          </form>
        </>
      )}
    </section>
  );
}
