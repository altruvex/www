"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import {
  DirectionalLink,
  ExternalDirectionalLink,
} from "@/components/shared/directional-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import {
  MOTION,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { gsap } from "@/lib/utils/gsap";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import { createContactFormSchema } from "@/lib/validations/contact";
import {
  MAINTENANCE_PLAN_IDS,
  pricingCopy,
  type Locale,
} from "@repo/pricing-schema";
import { Input, SelectField, Textarea } from "@repo/ui/www";
import { AlertCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

/** Mirrors the schema's `message.max` — the counter shows the real limit. */
const MESSAGE_MAX = 1000;
const CAIRO = "Africa/Cairo";

const SERVICES = [
  "interface-design",
  "development",
  "consulting",
  "maintenance",
] as const;

type Service = (typeof SERVICES)[number];
type Field = "name" | "phone" | "message";
type FieldErrors = Partial<Record<Field, string>>;
type Values = { name: string; phone: string; service: Service | ""; message: string };

const FIELDS: readonly Field[] = ["name", "phone", "message"];
const EMPTY: Values = { name: "", phone: "", service: "", message: "" };

const SERVICE_LABEL_KEYS = {
  "interface-design": "serviceWebDesign",
  development: "serviceDevelopment",
  consulting: "serviceConsulting",
  maintenance: "serviceMaintenance",
} as const satisfies Record<Service, string>;

function isService(value: string | null): value is Service {
  return SERVICES.some((service) => service === value);
}

/** The database knows fewer services than the page offers; the rest are OTHER. */
function toServiceInterest(service: Values["service"]) {
  if (service === "development") return "web-development";
  if (service === "interface-design") return "ui-ux";
  return service ? "other" : undefined;
}

function isField(key: string): key is Field {
  return FIELDS.some((field) => field === key);
}

function formatCairoTime(locale: string, date: Date): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: CAIRO,
  }).format(date);
}

function subscribeToMinute(onChange: () => void) {
  const id = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(id);
}

/**
 * The time in Cairo, read from the visitor's clock. It renders nothing on the
 * server — a server-rendered minute would be stale by the time it is read and
 * would mismatch on hydration.
 */
function useCairoTime(): string | null {
  const locale = useLocale();
  return useSyncExternalStore(
    subscribeToMinute,
    () => formatCairoTime(locale, new Date()),
    () => null,
  );
}

export default function ContactPage() {
  return (
    <main className="relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <ContactSection />
    </main>
  );
}

/**
 * CLAIM: you write to the person who builds it, and you know what happens to
 * the message before you send it.
 * PROOF: artifact — the form is set as the letter it actually is, addressed to
 * a named founder rather than to a sales inbox: To / From / Reply to / About,
 * then the body.
 *
 * Signature: sending turns the letter into its receipt — the time it was
 * received in Cairo and the three things that happen next. The receipt is the
 * finished markup; reduced motion swaps it in without the entrance.
 *
 * Layout: the letter is the page — one column, nothing beside it. The direct
 * lines are a single row beneath it, for the visitor who would rather not write.
 */
function ContactSection() {
  const t = useTranslations("contactPage");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const letterRef = useSectionElement();
  const linesRef = useSectionElement();

  return (
    <section
      aria-labelledby="contact-heading"
      className="accent-world-blue pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleAs="h1"
          titleId="contact-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("heroTitle")}
          secondTitle={t("heroTitleItalic")}
          classes={{
            container: "lg:flex-col lg:items-start",
            titleWrapper: "space-y-6",
            title:
              "max-w-[16ch] text-[clamp(2.5rem,4.6vw,4.25rem)] font-light leading-[1.04] tracking-[-0.03em]",
          }}
        />

        <div ref={letterRef} className="mt-14 max-w-205 lg:mt-20">
          <Letter />
        </div>

        <div ref={linesRef} className="mt-20 lg:mt-28">
          <DirectLines />
        </div>
      </Container>
    </section>
  );
}

function Letter() {
  const t = useTranslations("contactPage.letter");
  const tValidations = useTranslations("validations");
  const tFounder = useTranslations("about.founder");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const schema = useMemo(
    () => createContactFormSchema(tValidations),
    [tValidations],
  );

  // A service arriving in the URL (`/contact?service=maintenance`) prefills the
  // About line; read once, as the initial value, so it never overwrites a choice.
  // A maintenance plan arriving with it (`&plan=professional&billing=annual`)
  // opens the message with that choice as a sentence: the lead stores no plan
  // field, so the message is the one place it is both seen and sent.
  const [values, setValues] = useState<Values>(() => {
    const incoming = searchParams.get("service");
    const plan = MAINTENANCE_PLAN_IDS.find(
      (id) => id === searchParams.get("plan"),
    );
    return {
      ...EMPTY,
      service: isService(incoming) ? incoming : "",
      message:
        incoming === "maintenance" && plan
          ? t("planMessage", {
              plan: pricingCopy(locale as Locale).maintenance[plan].name,
              billing:
                searchParams.get("billing") === "annual" ? "annual" : "monthly",
            })
          : "",
    };
  });
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receivedAt, setReceivedAt] = useState<Date | null>(null);

  const payloadOf = (next: Values) => ({
    name: next.name,
    phone: next.phone,
    message: next.message,
    serviceInterest: toServiceInterest(next.service),
    website,
  });

  const errorsOf = (next: Values): FieldErrors => {
    const result = schema.safeParse(payloadOf(next));
    if (result.success) return {};
    const found: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (isField(key) && !found[key]) found[key] = issue.message;
    }
    return found;
  };

  const update = (field: keyof Values) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const next = { ...values, [field]: event.target.value };
      setValues(next);
      // Once a line has been marked, it clears the moment it becomes valid —
      // it does not wait for the next blur to stop accusing the visitor.
      if (isField(field) && errors[field]) {
        setErrors((current) => ({ ...current, [field]: errorsOf(next)[field] }));
      }
    };

  // Validated on blur, and only once something has been typed: tabbing through
  // an empty letter should not paint it red.
  const validateOnBlur = (field: Field) => () => {
    if (!values[field]) return;
    setErrors((current) => ({ ...current, [field]: errorsOf(values)[field] }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const found = errorsOf(values);
    const firstInvalid = FIELDS.find((field) => found[field]);
    if (firstInvalid) {
      setErrors(found);
      setFormError(t("errorFix"));
      document.getElementById(`contact-${firstInvalid}`)?.focus();
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...schema.parse(payloadOf(values)), locale }),
      });
      const result: unknown = await response.json();
      const body =
        result && typeof result === "object"
          ? (result as { success?: boolean; message?: string; errors?: Record<string, string> })
          : {};

      if (response.ok && body.success) {
        setValues(EMPTY);
        setReceivedAt(new Date());
        return;
      }

      if (body.errors && typeof body.errors === "object") {
        const serverErrors: FieldErrors = {};
        for (const [key, message] of Object.entries(body.errors)) {
          if (isField(key)) serverErrors[key] = message;
        }
        setErrors(serverErrors);
        setFormError(t("errorFix"));
        return;
      }

      setFormError(body.message || t("errorGeneric"));
    } catch {
      setFormError(t("errorNetwork"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (receivedAt) {
    return (
      <Receipt
        receivedAt={receivedAt}
        onWriteAnother={() => setReceivedAt(null)}
      />
    );
  }

  const describedBy = (field: Field, extra?: string) =>
    [extra, errors[field] ? `contact-${field}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <form
      aria-labelledby="contact-letter-heading"
      onSubmit={handleSubmit}
      noValidate
      className="relative border-t-2 border-foreground pt-6"
    >
      <h2
        id="contact-letter-heading"
        className="text-xl font-medium leading-tight tracking-[-0.015em] text-foreground"
      >
        {t("heading")}
      </h2>

      <div className="mt-8 space-y-7">
        <LetterLine label={t("toLabel")}>
          <p className="py-2.5 text-lg leading-snug text-foreground">
            {tFounder("name")}
            <span className="text-muted-foreground"> — {tFounder("role")}</span>
          </p>
        </LetterLine>

        <LetterLine label={t("fromLabel")} htmlFor="contact-name" error={errors.name} field="name">
          <Input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={update("name")}
            onBlur={validateOnBlur("name")}
            placeholder={t("namePlaceholder")}
            aria-required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy("name")}
            disabled={isSubmitting}
            className="text-lg"
          />
        </LetterLine>

        <LetterLine
          label={t("replyLabel")}
          htmlFor="contact-phone"
          error={errors.phone}
          field="phone"
          hint={<span id="contact-phone-hint">{t("replyHint")}</span>}
        >
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            normalize
            value={values.phone}
            onChange={update("phone")}
            onBlur={validateOnBlur("phone")}
            placeholder={t("phonePlaceholder")}
            aria-required
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describedBy("phone", "contact-phone-hint")}
            disabled={isSubmitting}
            className="text-lg"
          />
        </LetterLine>

        <LetterLine
          label={
            <>
              {t("aboutLabel")}
              <span className="block text-xs text-muted-foreground">
                {t("optional")}
              </span>
            </>
          }
          htmlFor="contact-service"
        >
          <SelectField
            id="contact-service"
            name="service"
            value={values.service}
            onChange={update("service")}
            disabled={isSubmitting}
            className={cn(
              "text-lg",
              !values.service && "text-muted-foreground",
            )}
          >
            <option value="">{t("servicePlaceholder")}</option>
            {SERVICES.map((service) => (
              <option key={service} value={service} className="text-foreground">
                {t(SERVICE_LABEL_KEYS[service])}
              </option>
            ))}
          </SelectField>
        </LetterLine>
      </div>

      <div className="mt-12">
        <div className="flex items-baseline justify-between gap-4">
          <label
            htmlFor="contact-message"
            className="text-sm font-medium text-foreground"
          >
            {t("messageLabel")}
          </label>
          <span
            id="contact-message-count"
            className={cn(
              "text-xs tabular-nums",
              values.message.length > MESSAGE_MAX
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {t("count", {
              count: localizeNumbers(String(values.message.length), locale),
              max: localizeNumbers(String(MESSAGE_MAX), locale),
            })}
          </span>
        </div>
        <Textarea
          id="contact-message"
          name="message"
          rows={8}
          value={values.message}
          onChange={update("message")}
          onBlur={validateOnBlur("message")}
          placeholder={t("messagePlaceholder")}
          aria-required
          aria-invalid={Boolean(errors.message)}
          aria-describedby={describedBy("message", "contact-message-count")}
          disabled={isSubmitting}
          className="mt-3 text-lg"
        />
        <FieldError field="message" message={errors.message} />
      </div>

      {/* Honeypot: invisible to people and to assistive technology. */}
      <div aria-hidden className="absolute -start-[9999px] h-px w-px overflow-hidden">
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

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <MagneticButton
          type="submit"
          variant="primary"
          size="lg"
          className="w-full sm:w-auto"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </MagneticButton>
        <p className="text-sm leading-snug text-muted-foreground">
          {t("assurance")}
        </p>
      </div>

      <div aria-live="assertive" className="mt-5 empty:hidden">
        {formError ? (
          <p className="flex items-start gap-2 text-sm leading-snug text-destructive">
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {formError}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function LetterLine({
  label,
  htmlFor,
  field,
  error,
  hint,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  field?: Field;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  const labelClass =
    "text-sm font-medium leading-snug text-muted-foreground sm:pt-3.5";

  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-6">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      <div className="min-w-0">
        {children}
        {hint ? (
          <p className="mt-2 text-xs leading-snug text-muted-foreground">{hint}</p>
        ) : null}
        {field ? <FieldError field={field} message={error} /> : null}
      </div>
    </div>
  );
}

function FieldError({ field, message }: { field: Field; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={`contact-${field}-error`}
      className="mt-2 flex items-start gap-1.5 text-sm leading-snug text-destructive"
    >
      <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}

const RECEIPT_STEPS = ["read", "reply", "call"] as const;

function Receipt({
  receivedAt,
  onWriteAnother,
}: {
  receivedAt: Date;
  onWriteAnother: () => void;
}) {
  const t = useTranslations("contactPage.receipt");
  const tFounder = useTranslations("about.founder");
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Focus follows the letter into its receipt, so a keyboard or screen
    // reader user lands on the confirmation instead of on a removed button.
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
          transformOrigin: document.documentElement.dir === "rtl" ? "right center" : "left center",
          duration: MOTION.duration.base,
          ease: MOTION.ease.strong,
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} role="status" className="relative pt-6">
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
        className="mt-4 max-w-[22ch] text-[clamp(1.75rem,3vw,2.5rem)] font-light leading-[1.1] tracking-[-0.02em] text-foreground outline-none"
      >
        {t("title", { founder: tFounder("name") })}
      </h2>
      <p data-receipt-part className="mt-3 text-base text-muted-foreground">
        {t("sentAt", { time: formatCairoTime(locale, receivedAt) })}
      </p>

      <div data-receipt-part className="mt-12">
        <h3 className="text-sm font-medium text-foreground">{t("nextLabel")}</h3>
        <ol className="mt-5 space-y-6">
          {RECEIPT_STEPS.map((step, index) => (
            <li
              key={step}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline"
            >
              <span className="text-sm tabular-nums text-local-accent-text">
                <Num value={index + 1} pad={2} />
              </span>
              <span className="max-w-[52ch] text-base leading-relaxed text-foreground">
                {t(`steps.${step}`)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <button
        type="button"
        data-receipt-part
        onClick={onWriteAnother}
        className="mt-12 text-sm text-foreground underline underline-offset-4 decoration-foreground/40 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        {t("another")}
      </button>
    </div>
  );
}

function DirectLines() {
  const t = useTranslations("contactPage");
  const tContact = useTranslations("contact");
  const cairoTime = useCairoTime();

  const email = tContact("emailValue");
  const phone = t("phoneValue");

  const valueClass =
    "mt-2 block text-lg leading-snug text-foreground wrap-anywhere transition-colors duration-(--motion-drawer) hover:text-brand-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

  return (
    <section aria-labelledby="contact-lines-heading">
      <h2 id="contact-lines-heading" className="sr-only">
        {t("lines.heading")}
      </h2>

      <ul className="grid gap-y-8 border-t border-border-subtle pt-6 sm:grid-cols-2 lg:grid-cols-4">
        <Line label={t("lines.whatsappLabel")} note={t("lines.whatsappNote")}>
          <ExternalDirectionalLink
            href={`https://wa.me/${phone.replace(/\D/g, "")}`}
            className={valueClass}
          >
            {t("lines.whatsappValue")}
          </ExternalDirectionalLink>
        </Line>
        <Line label={t("lines.emailLabel")}>
          <a href={`mailto:${email}`} dir="ltr" className={cn(valueClass, "rtl:text-end")}>
            {email}
          </a>
        </Line>
        <Line label={t("lines.phoneLabel")}>
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            dir="ltr"
            className={cn(valueClass, "rtl:text-end")}
          >
            {phone}
          </a>
        </Line>
        <Line label={t("callLead")}>
          <DirectionalLink href="/schedule" className={valueClass}>
            {t("scheduleCall")}
          </DirectionalLink>
        </Line>
      </ul>

      <p className="mt-10 text-sm leading-relaxed text-muted-foreground">
        {t("lines.address1")} · {t("lines.address2")}
        {cairoTime ? <> · {t("lines.localTime", { time: cairoTime })}</> : null}
      </p>
    </section>
  );
}

function Line({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <li className="min-w-0 sm:pe-6 lg:border-s lg:border-border-subtle lg:ps-6 lg:first:border-s-0 lg:first:ps-0">
      <Eyebrow className="m-0">{label}</Eyebrow>
      {children}
      {note ? (
        <span className="mt-1.5 block text-sm text-muted-foreground">{note}</span>
      ) : null}
    </li>
  );
}
