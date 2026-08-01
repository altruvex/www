"use client";
import { monoCaps } from "@/lib/utils/mono-caps";
import { useSectionDescription, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { cn, splitHeadline } from "@/lib/utils/utils";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { bodyMarks } from "@/components/ui/rich-text";
import { memo, useCallback, useState } from "react";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "./section-heading";

interface ProcessStep {
  index: string;
  key: string;
}

const steps: ProcessStep[] = [
  { index: "01", key: "step1" },
  { index: "02", key: "step2" },
  { index: "03", key: "step3" },
  { index: "04", key: "step4" },
];

interface StepItemProps {
  i: number;
  active: number;
  step: ProcessStep;
  t: ReturnType<typeof useTranslations<"process">>;
  onToggle: (i: number) => void;
}

const ProcessStepItem = memo(function ProcessStepItem({
  i,
  active,
  step,
  t,
  onToggle,
}: StepItemProps) {
  const isOpen = active === i;

  return (
    <div
      data-open={isOpen}
      className="group border-b border-s-border transition-colors duration-300 last:border-b-0 data-[open=true]:bg-s-surface"
    >
      {/* A 72px-tall clickable row with no hover state at all read as inert —
          `group` only carried data-[open] variants before. */}
      <button
        type="button"
        id={`step-trigger-${i}`}
        onClick={() => onToggle(i)}
        className="grid w-full cursor-pointer grid-cols-[40px_1fr_auto] items-center gap-3 border-0 bg-transparent p-4 text-start transition-colors duration-260 ease-(--ease-strong) hover:bg-s-high-soft sm:grid-cols-[48px_1fr_auto] sm:gap-3.5 sm:p-5 lg:grid-cols-[72px_1fr_auto] lg:gap-6 lg:px-8 lg:py-6"
        aria-expanded={isOpen}
        aria-controls={`step-panel-${i}`}
      >
        <span
          className={cn(
            monoCaps,
            "shrink-0 tabular-nums text-s-mid transition-colors duration-260 ease-(--ease-strong) group-hover:text-s-high group-data-[open=true]:text-s-high rtl:text-center rtl:[direction:ltr] rtl:[unicode-bidi:embed]",
          )}
        >
          {step.index}
        </span>

        <span className="flex-1 text-start font-serif text-[clamp(22px,2.6vw,28px)] font-light italic leading-none tracking-[-0.02em] text-s-mid transition-colors duration-260 ease-(--ease-strong) group-hover:text-s-high group-data-[open=true]:text-s-high rtl:font-sans rtl:not-italic rtl:font-bold">
          {t(`steps.${step.key}.title`)}
        </span>

        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-s-border text-s-mid transition-colors duration-260 ease-(--ease-strong) group-hover:border-s-border-hover group-hover:text-s-high group-data-[open=true]:border-s-border-hover group-data-[open=true]:text-s-high">
          {/* The wrapper rotates; the icon had its own competing 200ms
              transition-transform that animated nothing. */}
          <Plus className="pointer-events-none size-4 shrink-0 transition-transform duration-260 ease-(--ease-strong) group-data-[open=true]:rotate-45 rtl:group-data-[open=true]:-rotate-45 motion-reduce:transition-none" />
        </span>
      </button>

      <div
        id={`step-panel-${i}`}
        role="region"
        aria-labelledby={`step-trigger-${i}`}
        // Collapsed panels stayed in the a11y tree and in tab order — the rows
        // are clipped by overflow, not hidden.
        inert={!isOpen}
        data-open={isOpen}
        className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-320 ease-(--ease-strong) data-[open=true]:grid-rows-[1fr] motion-reduce:transition-none"
      >
        <div className="overflow-hidden">
          {/* Padding now matches the trigger's, and the content indents to the
              trigger's title column. Previously the description sat at 24px and
              the meta cards at 96px while the title was at 128px — three edges. */}
          <div className="px-4 pb-5 sm:px-5 sm:pb-6 lg:px-8 lg:pb-7">
            <div className="ps-0 sm:ps-[62px] lg:ps-[96px]">
              <p className="font-mono text-sm leading-relaxed text-s-mid">
                {t.rich(`steps.${step.key}.description`, bodyMarks)}
              </p>
              <div className="mt-5 grid max-w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-[620px]">
                {[
                  {
                    label: t("meta.deliverables"),
                    value: t(`steps.${step.key}.deliverables`),
                    large: false,
                  },
                  {
                    label: t("meta.timeline"),
                    value: t(`steps.${step.key}.timeline`),
                    large: true,
                  },
                ].map(({ label, value, large }) => (
                  <div
                    key={label}
                    className="rounded-lg border border-s-border bg-s-surface p-5"
                  >
                    <p className={cn(monoCaps, "mb-2.5 text-s-mid")}>{label}</p>
                    <p
                      className={
                        large
                          ? "text-[clamp(1.35rem,2.4vw,1.85rem)] leading-[1.15] tracking-[-0.018em] font-medium text-s-high"
                          : "text-[clamp(0.9375rem,0.98vw,1rem)] leading-relaxed text-s-mid"
                      }
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const ProcessSection = memo(function ProcessSection() {
  const t = useTranslations("process");
  const [active, setActive] = useState(0);

  const { first: firstTitle, second: secondTitle } = splitHeadline(t("title"));

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription();

  const handleToggle = useCallback((index: number) => setActive(index), []);

  return (
    <div
      id="process"
      className="relative pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container className="relative">
        <SectionHeading
          theme="surface"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={firstTitle}
          secondTitle={secondTitle}
          description={t.rich("subtitle", bodyMarks)}
          className="mb-14"
          classes={{
            eyebrow: monoCaps,
            container: "gap-8 md:gap-12",
          }}
        />
        <div className="mb-1 h-px bg-s-border" />
        <div className="mb-1 grid grid-cols-2 lg:grid-cols-4 gap-0">
          {steps.map((step, i) => (
            // State was painted with inline `style`, which outranks every class —
            // so these tabs could never have a hover or focus state. Moved onto
            // data-attributes so the variants below actually apply.
            <button
              key={i}
              type="button"
              onClick={() => handleToggle(i)}
              aria-pressed={i === active}
              data-active={i === active}
              data-reached={i <= active}
              className="group/tab cursor-pointer border-none bg-transparent px-1 py-2.5 text-center"
            >
              <div className="mb-2.5 h-0.5 rounded-sm bg-s-border transition-colors duration-260 ease-(--ease-strong) group-hover/tab:bg-s-border-hover group-data-[reached=true]/tab:bg-local-accent" />
              <span
                className={cn(
                  monoCaps,
                  // s-mid keeps inactive tabs AA-readable (s-low measured
                  // 3.2:1); active/inactive rank carries via s-high + the bar.
                  "block text-s-mid transition-colors duration-260 ease-(--ease-strong)",
                  "group-hover/tab:text-s-high group-data-[active=true]/tab:text-s-high",
                )}
              >
                {step.index} · {t(`steps.${step.key}.tag`)}
              </span>
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-lg border border-s-border">
          {steps.map((step, i) => (
            <ProcessStepItem
              key={i}
              i={i}
              active={active}
              step={step}
              t={t}
              onToggle={handleToggle}
            />
          ))}
        </div>
        <div className="mt-6 flex items-center gap-4">
          <span className={cn(monoCaps, "text-s-mid")}>{t("footer")}</span>
          <div className="flex-1 h-px bg-s-border" />
        </div>
      </Container>
    </div>
  );
});