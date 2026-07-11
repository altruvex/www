"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { Container } from "@/components/shared/container";
import { Accent, Highlight, type AccentGradient } from "@/components/ui/emphasis";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/ui/surface-card";
import { TiltCard } from "@/components/ui/tilt-card";
import {
  MOTION,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { gsap } from "@/lib/utils/gsap";
import { monoCaps } from "@/lib/utils/mono-caps";
import { cn } from "@/lib/utils/utils";
import { Check, Copy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const TABS = ["button", "card", "field", "accent"] as const;
type Tab = (typeof TABS)[number];

type ButtonVariant = "primary" | "secondary" | "filled" | "accent";
type ButtonSize = "default" | "lg";
type FieldState = "default" | "error" | "disabled";

const PLAYGROUND_GRADIENTS: AccentGradient[] = [
  "brand",
  "iris",
  "ember",
  "mint",
  "sunset",
  "aurora",
];

function ControlGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className={cn(monoCaps, "text-[11px] text-muted-foreground")}>{label}</p>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  const groupRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = options.findIndex((o) => o.value === value);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % options.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (idx - 1 + options.length) % options.length;
    if (next >= 0) {
      e.preventDefault();
      onChange(options[next].value);
      const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>("button");
      buttons?.[next]?.focus();
    }
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface/60 p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-8 flex-1 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-[background-color,color,box-shadow] duration-200 ease-smooth focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "bg-foreground text-background shadow-sm"
                : "transition-all text-muted-foreground hover:bg-foreground/6 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-start transition-all duration-200 hover:border-border-mid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-smooth",
          checked ? "bg-brand" : "bg-foreground/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-[inset-inline-start] duration-200 ease-strong",
            checked ? "inset-s-[18px]" : "inset-s-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function UIPlaygroundSection() {
  const t = useTranslations("playground");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const panelRef = useSectionElement<HTMLDivElement>();
  const [tab, setTab] = useState<Tab>("button");
  const [variant, setVariant] = useState<ButtonVariant>("primary");
  const [size, setSize] = useState<ButtonSize>("lg");
  const [loading, setLoading] = useState(false);
  const [lift, setLift] = useState(true);
  const [glass, setGlass] = useState(false);
  const [tilt, setTilt] = useState(true);

  const [fieldState, setFieldState] = useState<FieldState>("default");
  const [gradient, setGradient] = useState<AccentGradient>("iris");
  const [shimmer, setShimmer] = useState(false);

  const [copied, setCopied] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: MOTION.distance.xs },
        { autoAlpha: 1, y: 0, duration: 0.35, ease: MOTION.ease.strong, clearProps: "all" },
      );
    }, el);
    return () => ctx.revert();
  }, [tab]);

  const spec = (() => {
    switch (tab) {
      case "button":
        return `<MagneticButton variant="${variant}" size="${size}"${loading ? " isLoading" : ""} />`;
      case "card": {
        const inner = `<SurfaceCard${lift ? " interactive" : ""}${glass ? " glass" : ""} />`;
        return tilt ? `<TiltCard subtle>${inner}</TiltCard>` : inner;
      }
      case "field":
        return `<Input${fieldState === "error" ? ' aria-invalid="true"' : ""}${fieldState === "disabled" ? " disabled" : ""} />`;
      case "accent":
        return `<Accent gradient="${gradient}"${shimmer ? ' animate="shimmer"' : ""} />`;
    }
  })();

  const copySpec = useCallback(() => {
    navigator.clipboard?.writeText(spec).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    });
  }, [spec]);

  const stage: ReactNode = (() => {
    switch (tab) {
      case "button":
        return (
          <MagneticButton variant={variant} size={size} isLoading={loading}>
            {t("demo.buttonLabel")}
          </MagneticButton>
        );
      case "card": {
        const card = (
          <SurfaceCard
            interactive={lift}
            glass={glass}
            className="w-64 max-w-full p-6"
          >
            <p className={cn(monoCaps, "mb-4 text-[10px] text-muted-foreground")}>
              {t("demo.cardEyebrow")}
            </p>
            <p className="mb-1 font-sans text-3xl font-light tracking-tight text-foreground">
              99.9%
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("demo.cardBody")}
            </p>
          </SurfaceCard>
        );
        return tilt ? <TiltCard subtle>{card}</TiltCard> : card;
      }
      case "field":
        return (
          <div className="w-72 max-w-full">
            <label
              htmlFor="playground-field"
              className={cn(monoCaps, "mb-2 block text-[11px] text-muted-foreground")}
            >
              {t("demo.fieldLabel")}
            </label>
            <Input
              id="playground-field"
              placeholder={t("demo.fieldPlaceholder")}
              aria-invalid={fieldState === "error" ? true : undefined}
              aria-describedby={fieldState === "error" ? "playground-field-error" : undefined}
              disabled={fieldState === "disabled"}
            />
            <p
              id="playground-field-error"
              role={fieldState === "error" ? "alert" : undefined}
              className={cn(
                "mt-2 text-xs text-destructive transition-opacity duration-200",
                fieldState === "error" ? "opacity-100" : "opacity-0",
              )}
            >
              {t("demo.fieldError")}
            </p>
          </div>
        );
      case "accent":
        return (
          <p className="max-w-md text-center font-sans text-[clamp(24px,3vw,36px)] font-normal leading-[1.15] tracking-tight text-foreground">
            {t("demo.accentPre")}{" "}
            <Accent gradient={gradient} animate={shimmer ? "shimmer" : false}>
              {t("demo.accentPhrase")}
            </Accent>
          </p>
        );
    }
  })();

  const controls: ReactNode = (() => {
    switch (tab) {
      case "button":
        return (
          <>
            <ControlGroup label={t("controls.variant")}>
              <Segmented<ButtonVariant>
                label={t("controls.variant")}
                value={variant}
                onChange={setVariant}
                options={[
                  { value: "primary", label: "primary" },
                  { value: "secondary", label: "secondary" },
                  { value: "filled", label: "filled" },
                  { value: "accent", label: "accent" },
                ]}
              />
            </ControlGroup>
            <ControlGroup label={t("controls.size")}>
              <Segmented<ButtonSize>
                label={t("controls.size")}
                value={size}
                onChange={setSize}
                options={[
                  { value: "default", label: "default" },
                  { value: "lg", label: "lg" },
                ]}
              />
            </ControlGroup>
            <Toggle label={t("controls.loading")} checked={loading} onChange={setLoading} />
          </>
        );
      case "card":
        return (
          <>
            <Toggle label={t("controls.lift")} checked={lift} onChange={setLift} />
            <Toggle label={t("controls.glass")} checked={glass} onChange={setGlass} />
            <Toggle label={t("controls.tilt")} checked={tilt} onChange={setTilt} />
            <p className="text-xs leading-relaxed text-muted-foreground/80">
              {t("controls.tiltNote")}
            </p>
          </>
        );
      case "field":
        return (
          <ControlGroup label={t("controls.state")}>
            <Segmented<FieldState>
              label={t("controls.state")}
              value={fieldState}
              onChange={setFieldState}
              options={[
                { value: "default", label: t("controls.stateDefault") },
                { value: "error", label: t("controls.stateError") },
                { value: "disabled", label: t("controls.stateDisabled") },
              ]}
            />
          </ControlGroup>
        );
      case "accent":
        return (
          <>
            <ControlGroup label={t("controls.gradient")}>
              <div
                role="radiogroup"
                aria-label={t("controls.gradient")}
                className="grid grid-cols-3 gap-1.5"
              >
                {PLAYGROUND_GRADIENTS.map((g) => {
                  const active = g === gradient;
                  return (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setGradient(g)}
                      className={cn(
                        "flex min-h-9 items-center justify-center rounded-md border px-2 text-[10px] transition-[border-color,background-color,color] duration-200",
                        active
                          ? "border-foreground/40 bg-foreground/6 text-foreground"
                          : "transition-all border-border text-muted-foreground hover:border-border-mid hover:text-foreground",
                      )}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </ControlGroup>
            <Toggle label={t("controls.shimmer")} checked={shimmer} onChange={setShimmer} />
          </>
        );
    }
  })();

  return (
    <section className="accent-world-orange border-t border-foreground/8 pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="mb-14 max-w-2xl">
          <p ref={eyebrowRef} className={cn(monoCaps, "mb-4 block text-muted-foreground")}>
            {t("eyebrow")}
          </p>
          <h2
            ref={titleRef}
            className="mb-4 font-sans font-normal leading-[1.05] text-primary"
            style={{ fontSize: "clamp(28px, 4.5vw, 52px)", letterSpacing: "-0.02em" }}
          >
            {t("title")} <Highlight>{t("titleItalic")}</Highlight>
          </h2>
          <p ref={descRef} className="max-w-[52ch] text-base leading-relaxed text-primary/60">
            {t("description")}
          </p>
        </div>
        <div
          ref={panelRef}
          className="overflow-hidden rounded-section border border-border bg-card shadow-sm"
        >
          <div
            role="tablist"
            aria-label={t("title")}
            className="flex flex-wrap gap-1 border-b border-border bg-surface/60 p-2"
          >
            {TABS.map((key) => {
              const active = key === tab;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`playground-tab-${key}`}
                  aria-selected={active}
                  aria-controls="playground-panel"
                  tabIndex={active ? 0 : -1}
                  onClick={() => setTab(key)}
                  onKeyDown={(e) => {
                    const idx = TABS.indexOf(tab);
                    const dirNext = isRTL ? "ArrowLeft" : "ArrowRight";
                    const dirPrev = isRTL ? "ArrowRight" : "ArrowLeft";
                    let next = -1;
                    if (e.key === dirNext) next = (idx + 1) % TABS.length;
                    if (e.key === dirPrev) next = (idx - 1 + TABS.length) % TABS.length;
                    if (next >= 0) {
                      e.preventDefault();
                      setTab(TABS[next]);
                      document.getElementById(`playground-tab-${TABS[next]}`)?.focus();
                    }
                  }}
                  className={cn(
                    monoCaps,
                    "min-h-10 rounded-lg px-4 text-[11px] transition-[background-color,color,box-shadow] duration-200 ease-smooth focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "transition-all text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                  )}
                >
                  {t(`tabs.${key}`)}
                </button>
              );
            })}
          </div>
          <div
            id="playground-panel"
            role="tabpanel"
            aria-labelledby={`playground-tab-${tab}`}
            className="grid lg:grid-cols-[280px_minmax(0,1fr)]"
          >
            <div className="order-2 flex flex-col gap-5 border-t border-border p-6 lg:order-1 lg:border-t-0 lg:border-e">
              <p className={cn(monoCaps, "text-[10px] text-foreground/40")}>
                {t("controlsLabel")}
              </p>
              {controls}
            </div>
            <div className="order-1 lg:order-2">
              <div
                className="relative flex min-h-[320px] items-center justify-center p-10 md:min-h-[380px]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, hsl(var(--foreground) / 0.07) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              >
                <div ref={stageRef} className="flex items-center justify-center">
                  {stage}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border bg-surface/50 px-5 py-3">
                <code
                  dir="ltr"
                  className="min-w-0 flex-1 truncate text-start text-xs text-muted-foreground"
                >
                  {spec}
                </code>
                <button
                  type="button"
                  onClick={copySpec}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[10px] text-muted-foreground transition-all duration-200 hover:border-border-mid hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  aria-live="polite"
                >
                  {copied ? (
                    <Check className="h-3 w-3" aria-hidden />
                  ) : (
                    <Copy className="h-3 w-3" aria-hidden />
                  )}
                  {copied ? t("copied") : t("copy")}
                </button>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground/80 max-w-[60ch]">
          {t("footnote")}
        </p>
      </Container>
    </section>
  );
}
