"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { Container } from "@/components/shared/container";
import { DirectionalLink } from "@/components/shared/directional-link";
import { ArrowIcon } from "@repo/ui";
import { Link } from "@/i18n/navigation";
import {
  Eyebrow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@repo/ui/www";
import { Num } from "@/components/ui/num";
import { InquiryGuide } from "./inquiry-guide";
import { QualifyStep, type BudgetChoice } from "./qualify-step";
import {
  FORM_ERROR_KEY,
  fieldErrorMessage,
  readApiResult,
} from "@/lib/api-errors";
import {
  businessZoneOffsetLabel,
  formatBusinessTime,
} from "@/lib/config/business-hours";
import { getCommercialCta } from "@/lib/config/commercial";
import {
  MOTION,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { trackEvent } from "@/lib/analytics";
import { attributionPayload } from "@/lib/attribution";
import { intentPayload } from "@/lib/intent";
import { gsap } from "@/lib/utils/gsap";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { createContactFormSchema } from "@/lib/validations/contact";
import {
  isServiceId,
  MAINTENANCE_PLAN_IDS,
  pricingCopy,
  type Locale,
} from "@repo/pricing-schema";
import {
  AlertCircle,
  CheckCircle2,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
} from "react";

const MESSAGE_MAX = 1000;

const SERVICES = [
  "interface-design",
  "development",
  "consulting",
  "maintenance",
] as const;

type Service = (typeof SERVICES)[number];

type Field = "name" | "phone" | "email" | "message";

type FieldErrors = Partial<Record<Field, string>>;

type Values = {
  name: string;
  phone: string;
  email: string;
  service: Service | "";
  message: string;
};

const EMPTY: Values = {
  name: "",
  phone: "",
  email: "",
  service: "",
  message: "",
};

const FIELDS: readonly Field[] = ["name", "phone", "email", "message"];

const SERVICE_LABEL_KEYS = {
  "interface-design": "letter.serviceWebDesign",
  development: "letter.serviceDevelopment",
  consulting: "letter.serviceConsulting",
  maintenance: "letter.serviceMaintenance",
} as const satisfies Record<Service, string>;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function isService(value: string | null): value is Service {
  return SERVICES.some((service) => service === value);
}

// Registry and case-study links name a service indirectly; the explicit
// `service` param still wins. Unknown values pre-select nothing.
function serviceFromQuery(params: { get(name: string): string | null }): Service | "" {
  const service = params.get("service");
  if (isService(service)) return service;
  if (params.get("package") === "audit") return "consulting";
  if (params.get("track") === "architecture") return "development";
  const projectType = params.get("projectType");
  if (projectType && isServiceId(projectType)) return "development";
  return "";
}

function toServiceInterest(service: Values["service"], projectType: string | null) {
  if (service === "development" && projectType === "ecommerce") return "ecommerce";
  if (service === "development") return "web-development";
  if (service === "interface-design") return "ui-ux";
  // The "consulting" option is the Technical Audit (`letter.serviceConsulting`).
  if (service === "consulting") return "technical-audit";
  if (service === "maintenance") return "maintenance";
  return undefined;
}

function isField(key: string): key is Field {
  return FIELDS.some((field) => field === key);
}

function subscribeToMinute(onChange: () => void) {
  const id = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(id);
}

function useStudioTime(): string | null {
  const locale = useLocale();

  return useSyncExternalStore(
    subscribeToMinute,
    () => formatBusinessTime(locale, new Date()),
    () => null,
  );
}

export default function ContactPage({
  budgetOptions,
}: {
  budgetOptions: readonly BudgetChoice[];
}) {
  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <ContactExperience budgetOptions={budgetOptions} />
    </div>
  );
}

function ContactExperience({
  budgetOptions,
}: {
  budgetOptions: readonly BudgetChoice[];
}) {
  const t = useTranslations("contactPage");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const contentRef = useSectionElement();

  return (
    <section
      aria-labelledby="contact-heading"
      className="relative pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div ref={contentRef}>
          <div className="max-w-6xl">
            <Eyebrow ref={eyebrowRef} className="mb-5">
              {t("eyebrow")}
            </Eyebrow>
            <h1
              ref={titleRef}
              id="contact-heading"
              className="max-w-6xl text-balance text-[clamp(2.75rem,6vw,6.25rem)] font-light leading-[0.94] tracking-[-0.055em] text-foreground rtl:leading-[1.2] rtl:tracking-normal"
            >
              {t("heroTitle")}{" "}
              <span className="text-muted-foreground">
                {t("heroTitleItalic")}
              </span>
            </h1>
            <p className="mt-8 max-w-176 text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.7] text-muted-foreground">
              {t("intro")}
            </p>
          </div>
          <InquiryGuide />
          <div className="mt-16 border-t-2 border-foreground pt-8 md:mt-24 md:pt-10">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-20 xl:gap-28">
              <div className="min-w-0">
                <ConversationForm budgetOptions={budgetOptions} />
              </div>
              <aside className="mt-16 lg:mt-0">
                <DirectChannels />
              </aside>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ConversationForm({
  budgetOptions,
}: {
  budgetOptions: readonly BudgetChoice[];
}) {
  const t = useTranslations("contactPage");
  const tValidations = useTranslations("validations");

  const locale = useLocale();
  const searchParams = useSearchParams();

  const schema = useMemo(
    () => createContactFormSchema(tValidations),
    [tValidations],
  );

  const [values, setValues] = useState<Values>(() => {
    const incoming = serviceFromQuery(searchParams);

    const plan = MAINTENANCE_PLAN_IDS.find(
      (id) => id === searchParams.get("plan"),
    );

    return {
      ...EMPTY,
      service: incoming,
      message:
        incoming === "maintenance" && plan
          ? t("letter.planMessage", {
              plan: pricingCopy(locale as Locale).maintenance[plan].name,
              billing:
                searchParams.get("billing") === "annual" ? "annual" : "monthly",
            })
          : "",
    };
  });

  const [incomingProjectType] = useState(() => searchParams.get("projectType"));
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receivedAt, setReceivedAt] = useState<Date | null>(null);
  const [stepToken, setStepToken] = useState<string | null>(null);

  const startedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-contact-part]", {
          y: 18,
          opacity: 0,
          duration: MOTION.duration.base,
          ease: MOTION.ease.strong,
          stagger: MOTION.stagger.loose,
        });
      });

      return () => mm.revert();
    }, root);

    return () => ctx.revert();
  }, []);

  const payloadOf = (next: Values) => ({
    name: next.name,
    phone: next.phone,
    email: next.email,
    message: next.message,
    serviceInterest: toServiceInterest(next.service, incomingProjectType),
    website,
  });

  const errorsOf = (next: Values): FieldErrors => {
    const result = schema.safeParse(payloadOf(next));

    if (result.success) return {};

    const found: FieldErrors = {};

    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");

      if (isField(key) && !found[key]) {
        found[key] = issue.message;
      }
    }

    return found;
  };

  // First field focus, once per visit; focus bubbles up to the form.
  const markStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent("contact_started", { locale });
  };

  const update =
    (field: keyof Values) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const next = {
        ...values,
        [field]: event.target.value,
      };

      setValues(next);
      setTouched((prev) => ({
        ...prev,
        [field as Field]: true,
      }));

      if (isField(field) && errors[field]) {
        setErrors((current) => ({
          ...current,
          [field]: errorsOf(next)[field],
        }));
      }

      if (formError) {
        setFormError(null);
      }
    };

  const validateOnBlur = (field: Field) => () => {
    if (!touched[field]) return;

    setErrors((current) => ({
      ...current,
      [field]: errorsOf(values)[field],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError(null);

    const found = errorsOf(values);
    const firstInvalid = FIELDS.find((field) => found[field]);

    if (firstInvalid) {
      setErrors(found);
      setFormError(t("letter.errorFix"));
      document.getElementById(`contact-${firstInvalid}`)?.focus();
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...schema.parse(payloadOf(values)),
          locale,
          ...attributionPayload(),
          ...intentPayload(),
        }),
      });

      const result = await readApiResult<{ stepToken?: string }>(response);

      if (result.ok) {
        setStepToken(
          typeof result.stepToken === "string" ? result.stepToken : null,
        );
        setValues(EMPTY);
        setTouched({});
        setErrors({});
        setReceivedAt(new Date());
        trackEvent("contact_submitted", { locale });
        return;
      }

      // The server sends codes, never copy: each maps to a localized line.
      if (result.code === "validation") {
        const serverErrors: FieldErrors = {};

        for (const [key, code] of Object.entries(result.fields ?? {})) {
          if (isField(key)) {
            serverErrors[key] = fieldErrorMessage(
              tValidations,
              code,
              t("letter.errorField"),
            );
          }
        }

        setErrors(serverErrors);
        setFormError(
          Object.keys(serverErrors).length > 0
            ? t("letter.errorFix")
            : tValidations(FORM_ERROR_KEY.validation),
        );
        return;
      }

      setFormError(tValidations(FORM_ERROR_KEY[result.code]));
    } catch {
      setFormError(tValidations(FORM_ERROR_KEY.network));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (receivedAt) {
    return (
      <div ref={rootRef}>
        <Receipt
          receivedAt={receivedAt}
          stepToken={stepToken}
          budgetOptions={budgetOptions}
          onWriteAnother={() => {
            setReceivedAt(null);
            setStepToken(null);
          }}
        />
      </div>
    );
  }

  const inlineField =
    "inline-block max-w-full rounded-none border-0 border-b border-foreground/35 bg-transparent px-1 py-0.5 font-light text-foreground outline-none transition-[border-color,box-shadow] duration-(--motion-hover) placeholder:text-muted-foreground/55 hover:border-foreground/70 focus:border-brand focus:shadow-[0_1px_0_hsl(var(--brand))] disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive";

  const inlineWidth = {
    name: "w-[7.5ch] sm:w-[9ch]",
    phone: "w-[14ch]",
    email: "w-[17ch] sm:w-[20ch]",
  };

  return (
    <div ref={rootRef} className="max-w-5xl">
      <div
        data-contact-part
        className="flex flex-col gap-3 border-b border-border-subtle pb-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <Eyebrow className="m-0 text-brand-text">
            {t("letter.heading")}
          </Eyebrow>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("letter.recipient")}{" "}
            <span className="text-muted-foreground/70">
              — {t("letter.recipientNote")}
            </span>
          </p>
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        onFocus={markStarted}
        noValidate
        className="relative pt-10 md:pt-14"
      >
        <div
          data-contact-part
          className="text-[clamp(1.625rem,3.6vw,3.375rem)] font-light leading-[1.5] tracking-[-0.025em] text-foreground rtl:leading-[1.8] rtl:tracking-normal"
        >
          <span className="text-muted-foreground">
            {t("letter.fromLabel")}{" "}
          </span>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={update("name")}
            onBlur={validateOnBlur("name")}
            placeholder={t("letter.namePlaceholder")}
            aria-label={t("letter.fromLabel")}
            aria-required
            aria-invalid={Boolean(errors.name)}
            disabled={isSubmitting}
            className={cn(inlineField, inlineWidth.name)}
          />
          <span className="text-muted-foreground">
            {t("letter.aboutLead")}{" "}
          </span>
          <Select
            name="service"
            value={values.service || undefined}
            onValueChange={(service) =>
              update("service")({
                target: { value: service },
              } as ChangeEvent<HTMLSelectElement>)
            }
            disabled={isSubmitting}
          >
            <SelectTrigger
              id="contact-service"
              aria-label={t("letter.aboutLabel")}
              className={cn(
                inlineField,
                "h-auto! w-auto gap-0 align-baseline text-[length:inherit]! leading-[inherit] shadow-none focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent [&_svg]:hidden data-placeholder:text-muted-foreground/70",
              )}
            >
              <SelectValue placeholder={t("letter.servicePlaceholder")} />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {SERVICES.map((service) => (
                <SelectItem key={service} value={service}>
                  {t(SERVICE_LABEL_KEYS[service])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">
            {t("letter.replyLead")}{" "}
          </span>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={update("phone")}
            onBlur={validateOnBlur("phone")}
            placeholder={t("letter.phonePlaceholder")}
            aria-label={t("letter.replyLabel")}
            aria-required
            aria-invalid={Boolean(errors.phone)}
            disabled={isSubmitting}
            className={cn(inlineField, inlineWidth.phone)}
          />
          <span className="text-muted-foreground">
            {" "}
            {t("letter.emailJoin")}{" "}
          </span>
          <input
            id="contact-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            onChange={update("email")}
            onBlur={validateOnBlur("email")}
            placeholder={t("letter.emailPlaceholder")}
            aria-label={t("letter.emailLabel")}
            aria-required
            aria-invalid={Boolean(errors.email)}
            disabled={isSubmitting}
            className={cn(inlineField, inlineWidth.email)}
          />
          <span className="text-muted-foreground">{t("letter.closing")}</span>
        </div>
        <div
          data-contact-part
          className="mt-14 border-t border-border-subtle pt-8 md:mt-20 md:pt-10"
        >
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="contact-message"
              className="text-sm font-medium text-foreground"
            >
              {t("letter.messageLabel")}
            </label>
            <span
              className={cn(
                "font-mono text-xs tabular-nums text-muted-foreground",
                values.message.length > MESSAGE_MAX && "text-destructive",
              )}
            >
              {t("letter.count", {
                count: localizeNumbers(String(values.message.length), locale),
                max: localizeNumbers(String(MESSAGE_MAX), locale),
              })}
            </span>
          </div>
          <Textarea
            id="contact-message"
            name="message"
            rows={7}
            value={values.message}
            onChange={update("message")}
            onBlur={validateOnBlur("message")}
            placeholder={t("letter.messagePlaceholder")}
            aria-label={t("letter.messageLabel")}
            aria-required
            aria-invalid={Boolean(errors.message)}
            disabled={isSubmitting}
            className="mt-4 min-h-[11rem] resize-y rounded-none border-0 border-b border-border-subtle bg-transparent px-0 py-4 text-[clamp(1.125rem,2vw,1.5rem)] leading-[1.65] text-foreground shadow-none transition-colors duration-(--motion-hover) placeholder:text-muted-foreground/50 focus-visible:border-brand focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {errors.message ? (
            <FieldError field="message" message={errors.message} />
          ) : null}
        </div>
        <div
          aria-hidden
          className="absolute inset-s-[-9999px] h-px w-px overflow-hidden"
        >
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
        <div aria-live="assertive" className="mt-5 min-h-5 empty:hidden">
          {formError ? (
            <p className="flex items-start gap-2 text-sm leading-snug text-destructive">
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {formError}
            </p>
          ) : null}
        </div>
        <div
          data-contact-part
          className="mt-8 flex flex-col gap-5 border-t border-border-subtle pt-8 sm:flex-row sm:items-center sm:justify-between md:mt-10 md:pt-10"
        >
          <div className="max-w-sm">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("letter.assurance")} {t("letter.requiredNote")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("letter.privacy")}
            </p>
            <DirectionalLink
              href="/privacy"
              className="mt-2 text-sm text-foreground underline decoration-border underline-offset-4 transition-colors duration-(--motion-hover) hover:text-brand-text hover:decoration-current"
            >
              {t("letter.privacyLink")}
            </DirectionalLink>
          </div>
          <MagneticButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? t("letter.submitting") : t("letter.submit")}
          </MagneticButton>
        </div>
      </form>
    </div>
  );
}

function DirectChannels() {
  const t = useTranslations("contactPage");
  const tContact = useTranslations("contact");
  const tCta = useTranslations("commercial.ctas");

  const studioTime = useStudioTime();

  const email = tContact("emailValue");
  const phone = t("phoneValue");

  return (
    <div className="lg:sticky lg:top-24">
      <div className="border-t-2 border-foreground pt-6">
        <Eyebrow className="m-0">{t("lines.heading")}</Eyebrow>
        <p className="mt-3 max-w-[24ch] text-sm leading-relaxed text-muted-foreground">
          {t("lines.address2")}
        </p>
        <p className="mt-2 max-w-[24ch] text-sm leading-relaxed text-foreground">
          {t("lines.replyTime")}
        </p>
      </div>
      <div className="mt-8 divide-y divide-border-subtle border-y border-border-subtle">
        <Channel
          icon={MessageCircle}
          label={t("lines.whatsappLabel")}
          value={t("lines.whatsappValue")}
          href={`https://wa.me/${phone.replace(/\D/g, "")}`}
          external
        />
        <Channel
          icon={Mail}
          label={t("lines.emailLabel")}
          value={email}
          href={`mailto:${email}`}
        />
        <Channel
          icon={Phone}
          label={t("lines.phoneLabel")}
          value={phone}
          href={`tel:${phone.replace(/\s/g, "")}`}
        />
      </div>
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        {t("callLead")}{" "}
        <Link
          href={getCommercialCta("technicalCall").href}
          className={alternateLink}
        >
          {tCta("technicalCall")}
        </Link>
        <br />
        {t("costLead")}{" "}
        <Link
          href={getCommercialCta("projectRange").href}
          className={alternateLink}
        >
          {tCta("projectRange")}
        </Link>
      </p>
      {studioTime ? (
        <div className="mt-6 text-xs text-muted-foreground">
          <span>
            {t("lines.localTime", {
              time: studioTime,
              zone: businessZoneOffsetLabel(),
            })}
          </span>
        </div>
      ) : null}
    </div>
  );
}

const alternateLink =
  "text-foreground underline decoration-border underline-offset-4 transition-colors duration-(--motion-hover) hover:text-brand-text hover:decoration-current";

function Channel({
  icon: Icon,
  label,
  value,
  href,
  external = false,
}: {
  icon: typeof MessageCircle;
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  const classes =
    "group block py-5 transition-colors duration-(--motion-hover) hover:text-brand-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

  const content = (
    <div className="flex min-w-0 items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors duration-(--motion-hover) group-hover:text-brand" />
      <div className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="mt-1 block wrap-break-word text-sm leading-snug text-foreground">
          {value}
        </span>
      </div>
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {content}
      </a>
    );
  }

  return (
    <a href={href} className={cn(classes, "dir-ltr rtl:text-end")}>
      {content}
    </a>
  );
}

const RECEIPT_STEPS = ["read", "reply", "call", "after"] as const;

function Receipt({
  receivedAt,
  stepToken,
  budgetOptions,
  onWriteAnother,
}: {
  receivedAt: Date;
  stepToken: string | null;
  budgetOptions: readonly BudgetChoice[];
  onWriteAnother: () => void;
}) {
  const t = useTranslations("contactPage.receipt");
  const tCta = useTranslations("commercial.ctas");
  const locale = useLocale();

  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useIsomorphicLayoutEffect(() => {
    headingRef.current?.focus();

    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-receipt-part]", {
          y: 14,
          opacity: 0,
          duration: MOTION.duration.fast,
          ease: MOTION.ease.strong,
          stagger: MOTION.stagger.loose,
        });

        gsap.from("[data-receipt-rule]", {
          scaleX: 0,
          transformOrigin:
            document.documentElement.dir === "rtl"
              ? "right center"
              : "left center",
          duration: MOTION.duration.base,
          ease: MOTION.ease.strong,
        });
      });

      return () => mm.revert();
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="max-w-4xl pt-6">
      {/* The live region is the receipt itself; the optional step below has its own. */}
      <div role="status">
        <span
          aria-hidden
          data-receipt-rule
          className="absolute inset-x-0 top-0 h-0.5 bg-local-accent"
        />

        <Eyebrow tone="accent" data-receipt-part className="m-0">
          {t("eyebrow")}
        </Eyebrow>

        <h2
          ref={headingRef}
          tabIndex={-1}
          data-receipt-part
          className="mt-5 max-w-[18ch] text-[clamp(2.5rem,5vw,5rem)] font-light leading-[0.98] tracking-[-0.04em] text-foreground outline-none rtl:leading-[1.15] rtl:tracking-normal"
        >
          {t("title")}
        </h2>

        <p data-receipt-part className="mt-5 text-sm text-muted-foreground">
          {t("sentAt", {
            time: formatBusinessTime(locale, receivedAt),
          })}
        </p>

        <div
          data-receipt-part
          className="mt-16 border-t border-border-subtle pt-6"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-4 text-brand" />

            <h3 className="text-sm font-medium text-foreground">
              {t("nextLabel")}
            </h3>
          </div>

          <ol className="mt-7 space-y-7">
            {RECEIPT_STEPS.map((step, index) => (
              <li
                key={step}
                className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-3 border-b border-border-subtle pb-7 last:border-b-0"
              >
                <span className="font-mono text-xs tabular-nums text-local-accent-text">
                  <Num value={index + 1} pad={2} />
                </span>

                <span className="max-w-[52ch] text-base leading-relaxed text-foreground">
                  {t(`steps.${step}`)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p
        data-receipt-part
        className="mt-10 text-sm leading-relaxed text-muted-foreground"
      >
        {t("scheduleLead")}{" "}
        <DirectionalLink
          href={getCommercialCta("technicalCall").href}
          className={alternateLink}
        >
          {tCta("technicalCall")}
        </DirectionalLink>
      </p>

      {stepToken ? (
        <QualifyStep token={stepToken} budgetOptions={budgetOptions} />
      ) : null}

      <button
        type="button"
        data-receipt-part
        onClick={onWriteAnother}
        className="mt-10 inline-flex items-center gap-2 text-sm text-foreground underline underline-offset-4 decoration-foreground/35 transition-colors duration-(--motion-hover) hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        {t("another")}
        <ArrowIcon direction="forward" className="size-3.5" />
      </button>
    </div>
  );
}

function FieldError({ field, message }: { field: Field; message?: string }) {
  if (!message) return null;

  return (
    <p
      id={`contact-${field}-error`}
      className="mt-3 flex items-start gap-1.5 text-sm leading-snug text-destructive"
    >
      <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}
