"use client"

import { monoCaps } from "@/lib/mono-caps"
import { DEFAULTS, MOTION, useReveal, useText } from "@/lib/motion"
import { cn, splitHeadline } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { memo, useCallback, useState } from "react"
import { Container } from "../container"

interface ProcessStep { index: string; key: string }

const steps: ProcessStep[] = [
  { index: "01", key: "step1" },
  { index: "02", key: "step2" },
  { index: "03", key: "step3" },
  { index: "04", key: "step4" },
]

interface StepItemProps {
  i: number
  active: number
  step: ProcessStep
  t: (key: string) => string
  onToggle: (i: number) => void
}

const ProcessStepItem = memo(function ProcessStepItem({
  i, active, step, t, onToggle,
}: StepItemProps) {
  const isOpen = active === i

  return (
    <div
      data-open={isOpen}
      className="group border-b border-s-border transition-colors duration-300 last:border-b-0 data-[open=true]:bg-s-surface"
    >
      <button
        type="button"
        onClick={() => onToggle(i)}
        className="grid w-full cursor-pointer grid-cols-[40px_1fr_auto] items-center gap-3 border-0 bg-transparent p-4 text-start sm:grid-cols-[48px_1fr_auto] sm:gap-3.5 sm:p-5 lg:grid-cols-[72px_1fr_auto] lg:gap-6 lg:px-8 lg:py-6"
        aria-expanded={isOpen}
        aria-controls={`step-panel-${i}`}
      >
        <span
          className={cn(
            monoCaps,
            "shrink-0 tabular-nums text-s-low transition-colors duration-200 group-data-[open=true]:text-s-high rtl:text-center rtl:[direction:ltr] rtl:[unicode-bidi:embed]",
          )}
        >
          {step.index}
        </span>

        <span
          className="flex-1 text-start font-serif text-[clamp(16px,2.5vw,22px)] font-light italic leading-none tracking-[-0.02em] text-s-mid transition-colors duration-200 group-data-[open=true]:text-s-high rtl:font-sans rtl:not-italic rtl:font-bold"
        >
          {t(`steps.${step.key}.title`)}
        </span>

        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full border border-s-border transition-colors duration-200 group-data-[open=true]:border-s-border-hover"
        >
          <span
            className="block font-mono text-sm leading-none text-s-low transition-transform duration-300 group-data-[open=true]:rotate-45 group-data-[open=true]:text-s-high rtl:group-data-[open=true]:-rotate-45"
          >
            +
          </span>
        </span>
      </button>

      <div
        id={`step-panel-${i}`}
        role="region"
        data-open={isOpen}
        className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-320 ease-in-out data-[open=true]:grid-rows-[1fr]"
      >
        <div className="overflow-hidden">
          <div className="p-6">
            <p className="font-mono text-sm leading-relaxed text-s-low">
              {t(`steps.${step.key}.description`)}
            </p>
            <div className="mt-5 grid max-w-full grid-cols-1 gap-3 ps-0 sm:grid-cols-2 md:ps-[62px] lg:max-w-[620px] lg:ps-[72px]">
              {[
                { label: t("meta.deliverables"), value: t(`steps.${step.key}.deliverables`), large: false },
                { label: t("meta.timeline"), value: t(`steps.${step.key}.timeline`), large: true },
              ].map(({ label, value, large }) => (
                <div
                  key={label}
                  className="rounded-sm border border-s-border bg-s-surface p-5"
                >
                  <p className={cn(monoCaps, "mb-2.5 text-s-muted")}>
                    {label}
                  </p>
                  <p
                    className={
                      large
                        ? "text-[clamp(1.35rem,2.4vw,1.85rem)] leading-[1.15] tracking-[-0.018em] font-medium text-s-high"
                        : "text-[clamp(0.9375rem,0.98vw,1rem)] leading-relaxed text-s-low"
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
  )
})

export const ProcessSection = memo(function ProcessSection() {
  const t = useTranslations("process")
  const [active, setActive] = useState(0)

  const { first: firstTitle, second: secondTitle } = splitHeadline(t("title"))

  const eyebrowRef = useReveal({ ...DEFAULTS.body, delay: 0 })
  const titleRef = useText<HTMLHeadingElement>({ ...DEFAULTS.heading, ease: MOTION.ease.text })
  const descRef = useReveal({ ...DEFAULTS.body, delay: 0.15 })

  const handleToggle = useCallback((index: number) => setActive(index), [])

  return (
    <div
      id="process"
      className="relative pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container className="relative">
        <div className="mb-14">
          <p
            ref={eyebrowRef}
            className={cn(monoCaps, "mb-4 text-s-low")}
          >
            {t("eyebrow")}
          </p>
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            <h2
              ref={titleRef}
              className="text-[clamp(2.125rem,4vw,3.25rem)] leading-[1.08] tracking-[-0.02em] m-0 font-normal text-s-high"
            >
              {firstTitle}
              {secondTitle ? (
                <>
                  <br />
                  <span className="font-serif italic font-light text-s-mid rtl:font-sans rtl:not-italic rtl:font-bold">
                    {secondTitle}
                  </span>
                </>
              ) : null}
            </h2>
            <p
              ref={descRef}
              className="m-0 max-w-sm text-[clamp(0.9375rem,0.98vw,1rem)] leading-relaxed text-s-low"
            >
              {t("subtitle")}
            </p>
          </div>
        </div>

        <div className="mb-1 h-px bg-s-border" />

        <div className="mb-1 grid grid-cols-2 lg:grid-cols-4 gap-0">
          {steps.map((step, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleToggle(i)}
              className="cursor-pointer p-0 bg-transparent border-none text-center py-2.5"
            >
              <div
                className="mb-2.5 h-0.5 rounded-xs transition-colors duration-300"
                style={{ background: i <= active ? "hsl(var(--brand))" : "var(--s-border)" }}
              />
              <span
                className={cn(monoCaps, "block transition-colors duration-200")}
                style={{ color: i === active ? "var(--s-high)" : "var(--s-low)" }}
              >
                {step.index} · {t(`steps.${step.key}.tag`)}
              </span>
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-sm border border-s-border">
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
          <span className={cn(monoCaps, "text-s-low")}>
            {t("footer")}
          </span>
          <div className="flex-1 h-px bg-s-border" />
        </div>
      </Container>
    </div>
  )
})