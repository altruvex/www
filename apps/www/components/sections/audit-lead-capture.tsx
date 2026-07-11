"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface AuditLeadCaptureProps {
  source?: string;
  className?: string;
}

export function AuditLeadCapture({
  source = "article_audit_cta",
  className,
}: AuditLeadCaptureProps) {
  const t = useTranslations("auditLead");
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
        body: JSON.stringify({ phone, source }),
      });

      if (response.ok) {
        setIsSuccess(true);
        trackEvent("audit_lead_captured", { source });
      } else {
        setError(t("phoneError"));
      }
    } catch {
      setError(t("phoneError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className={cn(
        "rounded-xl border border-foreground/8 bg-foreground/2 p-8",
        className,
      )}
    >
      {isSuccess ? (
        <div className="text-center">
          <Eyebrow className="text-foreground/40 mb-3">
            {t("successTitle")}
          </Eyebrow>
          <p className="text-sm text-foreground/60 leading-relaxed">
            {t("successDescription")}
          </p>
        </div>
      ) : (
        <>
          <Eyebrow className="text-foreground/40 mb-3">
            {t("eyebrow")}
          </Eyebrow>
          <h3 className="text-xl md:text-2xl font-medium text-foreground tracking-tight mb-3">
            {t("title")}
          </h3>
          <p className="text-sm text-foreground/60 leading-relaxed mb-6 max-w-xl">
            {t("description")}
          </p>
          <div className="mb-6 grid grid-cols-3 gap-3 max-w-md">
            {[
              { key: "noPitch" },
              { key: "noCommitment" },
              { key: "founderAccess" },
            ].map(({ key }) => (
              <div
                key={key}
                className="rounded-lg border border-foreground/8 bg-background/40 px-3 py-2.5 text-center"
              >
                <p className="text-xs font-medium text-foreground/70">
                  {t(`stats.${key}`)}
                </p>
              </div>
            ))}
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-4 sm:items-end max-w-xl"
          >
            <div className="flex-1">
              <div
                className={cn(
                  "flex items-center border-b border-border pb-2 gap-2",
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
                    "placeholder:text-foreground/30 outline-none",
                  )}
                />
              </div>
              {error && (
                <p className="text-xs text-destructive mt-1.5">{error}</p>
              )}
              <p
                id="audit-lead-phone-hint"
                className="text-xs text-foreground/30 mt-1.5"
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
