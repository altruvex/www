"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@repo/ui";
import { Eyebrow, Highlight } from "@repo/ui/www";
import { markAsConverted, useExitIntent } from "@/hooks/use-exit-intent";
import { usePathname } from "@/i18n/navigation";
import { trackEvent } from "@/lib/analytics";
import { FORM_ERROR_KEY, readApiResult } from "@/lib/api-errors";
import { cn } from "@/lib/utils/utils";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

// Visitors on these routes are already converting; a modal there only interrupts.
const SUPPRESSED_ROUTES = ["/contact", "/schedule"];

export const ExitIntentModal = () => {
  const t = useTranslations("exitIntent");
  const tValidations = useTranslations("validations");
  const pathname = usePathname();
  const suppressed = SUPPRESSED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const [isVisible, setIsVisible] = useState(false);
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const handleExit = () => {
    if (suppressed) return;
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

      const result = await readApiResult(response);
      if (result.ok) {
        setIsSuccess(true);
        markAsConverted();
        trackEvent("exit_intent_captured");
        setTimeout(() => setIsVisible(false), 3000);
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

  const handleClose = useCallback(() => {
    setIsVisible(false);
    trackEvent("exit_intent_dismissed");
  }, []);

  const panelRef = useRef<HTMLDivElement>(null);

  const terms = [
    { value: t("stats.noPitchValue"), label: t("stats.noPitch") },
    { value: t("stats.noCommitmentValue"), label: t("stats.noCommitment") },
    { value: t("stats.confirmValue"), label: t("stats.confirm") },
  ];

  return (
    <Dialog
      open={isVisible && !suppressed}
      onOpenChange={(next) => !next && handleClose()}
    >
      <DialogContent
        ref={panelRef}
        surface="glass"
        placement="sheet"
        aria-describedby={undefined}
        // Focus the card itself, as before, not its first control (the close button).
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          panelRef.current?.focus();
        }}
        data-lenis-prevent
        className={cn(
          "accent-world-orange grid max-w-[30rem] grid-rows-[88px_1fr] outline-none",
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
            <DialogClose
              className="-me-2 grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label={t("closeLabel")}
            >
              <X className="size-4" />
            </DialogClose>
          </div>

          {isSuccess ? (
            <div className="px-6 pb-8 pt-6 sm:px-8">
              <DialogTitle className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-foreground">
                {t("successTitle")}
              </DialogTitle>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
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
              <DialogTitle className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-4xl">
                {t.rich("title", { h: (chunks) => <Highlight className="whitespace-nowrap">{chunks}</Highlight> })}
              </DialogTitle>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                {t("description")}
              </p>

              <dl className="mt-7 border-b border-border-subtle">
                {terms.map(({ value, label }, i) => (
                  <div
                    key={label}
                    style={{ animationDelay: `${120 + i * 70}ms` }}
                    className="grid grid-cols-[1fr_auto] items-baseline gap-x-2 border-t border-border-subtle py-3 animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-(--motion-fast) ease-strong motion-reduce:animate-none"
                  >
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
                <DialogClose className="mx-auto mt-2 flex h-10 items-center px-3 text-xs text-muted-foreground transition-colors hover:text-foreground">
                  {t("secondaryButtonText")}
                </DialogClose>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
