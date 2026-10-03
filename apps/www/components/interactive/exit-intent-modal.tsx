"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import { Highlight } from "@/components/ui/emphasis";
import { markAsConverted, useExitIntent } from "@/hooks/use-exit-intent";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils/utils";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export const ExitIntentModal = () => {
  const t = useTranslations("exitIntent");
  const [isVisible, setIsVisible] = useState(false);
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const handleExit = () => {
    setIsVisible(true);
    trackEvent("exit_intent_shown");
  };

  useExitIntent(handleExit, {
    threshold: 10,
    cooldown: 24 * 60 * 60 * 1000,
    maxDisplays: 3,
  });

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
        body: JSON.stringify({ phone, source: "exit_intent_modal" }),
      });

      if (response.ok) {
        setIsSuccess(true);
        markAsConverted();
        // No phone number in an analytics payload. Nothing consumes these
        // events today, and the day a provider script is added is the day this
        // would start shipping a lead's number to it.
        trackEvent("exit_intent_captured");
        setTimeout(() => setIsVisible(false), 3000);
      } else {
        setError(t("phoneError"));
      }
    } catch {
      setError(t("phoneError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = useCallback(() => {
    setIsVisible(false);
    trackEvent("exit_intent_dismissed");
  }, []);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [isVisible, handleClose]);

  if (!isVisible) return null;

  const terms = [
    { value: t("stats.noPitchValue"), label: t("stats.noPitch") },
    { value: t("stats.noCommitmentValue"), label: t("stats.noCommitment") },
    { value: t("stats.founderAccessValue"), label: t("stats.founderAccess") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-in fade-in duration-(--motion-drawer)"
        onClick={handleClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          isSuccess ? "exit-intent-success-title" : "exit-intent-heading"
        }
        data-lenis-prevent
        className={cn(
          "accent-world-orange relative grid w-full max-w-[30rem] grid-rows-[88px_1fr] overflow-hidden rounded-panel-md liquid-glass shadow-2xl shadow-foreground/10 outline-none",
          "max-h-[88vh] overflow-y-auto lg:max-h-none lg:max-w-[44rem] lg:grid-cols-[38%_1fr] lg:grid-rows-none lg:overflow-visible",
          "animate-in fade-in slide-in-from-bottom-3 zoom-in-98 duration-(--motion-fast) ease-strong motion-reduce:animate-none",
        )}
      >
        <div
          aria-hidden
          className="relative overflow-hidden lg:rounded-s-[inherit]"
        >
          <Image
            src="/brand/mood/navy-fabric-light.webp"
            alt=""
            fill
            sizes="(min-width: 1024px) 38vw, 100vw"
            quality={75}
            draggable={false}
            className="select-none object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-background/15" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-4 px-6 pt-5 sm:px-8 sm:pt-6">
            <Eyebrow className="flex items-center gap-2.5 text-muted-foreground">
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-local-accent"
              />
              {isSuccess ? t("successTitle") : t("subtitle")}
            </Eyebrow>
            <button
              type="button"
              onClick={handleClose}
              className="-me-2 grid size-10 place-items-center rounded-ctl-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label={t("closeLabel")}
            >
              <X className="size-4" />
            </button>
          </div>

          {isSuccess ? (
            <div className="px-6 pb-8 pt-6 sm:px-8">
              <h2
                id="exit-intent-success-title"
                className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.02em] text-foreground"
              >
                {t("successTitle")}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                {t("successDescription")}
              </p>
              <div className="mt-8 flex items-baseline justify-between gap-4 border-y border-border-subtle py-4">
                <Eyebrow>{t("phoneLabel")}</Eyebrow>
                <span dir="ltr" className="font-mono text-sm text-foreground">
                  {phone}
                </span>
              </div>
            </div>
          ) : (
            <div className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
              <h2
                id="exit-intent-heading"
                className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-[2.25rem]"
              >
                {t.rich("title", { h: (chunks) => <Highlight className="whitespace-nowrap">{chunks}</Highlight> })}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                {t("description")}
              </p>

              <dl className="mt-7 border-b border-border-subtle">
                {terms.map(({ value, label }, i) => (
                  <div
                    key={label}
                    style={{ animationDelay: `${120 + i * 70}ms` }}
                    className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-x-2 border-t border-border-subtle py-3 animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-(--motion-fast) ease-strong motion-reduce:animate-none"
                  >
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      <Num value={i + 1} pad={2} />
                    </span>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>

              <form onSubmit={handleSubmit} className="mt-7">
                <label htmlFor="exit-intent-phone">
                  <Eyebrow>{t("phoneLabel")}</Eyebrow>
                </label>
                <div
                  className={cn(
                    "mt-1 border-b border-foreground/45 transition-colors focus-within:border-local-accent",
                    error && "border-destructive focus-within:border-destructive",
                  )}
                >
                  <input
                    type="tel"
                    id="exit-intent-phone"
                    dir="ltr"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={t("phonePlaceholder")}
                    aria-describedby="exit-intent-phone-hint"
                    aria-invalid={error ? true : undefined}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError("");
                    }}
                    disabled={isSubmitting}
                    className="h-12 w-full bg-transparent text-lg text-foreground outline-none placeholder:text-foreground/40 rtl:text-right"
                  />
                </div>
                <p
                  id="exit-intent-phone-hint"
                  role={error ? "alert" : undefined}
                  className={cn(
                    "mt-2 text-xs",
                    error ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {error || t("phoneHint")}
                </p>
                <MagneticButton
                  type="submit"
                  variant="primary"
                  className="mt-5 w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t("submitting") : t("buttonText")}
                </MagneticButton>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mx-auto mt-2 flex h-10 items-center px-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("secondaryButtonText")}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
