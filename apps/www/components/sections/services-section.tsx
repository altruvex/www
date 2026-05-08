"use client"

import { monoCaps } from "@/lib/mono-caps"
import { useReveal } from "@/lib/motion"
import { cn, splitHeadline } from "@/lib/utils"
import { useLocale, useTranslations } from "next-intl"
import { memo, useEffect, useRef, useState } from "react"
import { Container } from "../container"

interface ServiceData {
  key: "service1" | "service2" | "service3" | "service4"
  index: string
  layout: "hero" | "secondary-left" | "secondary-right" | "anchor"
}

const SERVICES: ServiceData[] = [
  { key: "service1", index: "01", layout: "hero" },
  { key: "service2", index: "02", layout: "secondary-left" },
  { key: "service3", index: "03", layout: "secondary-right" },
  { key: "service4", index: "04", layout: "anchor" },
]


const ServiceCard = memo(function ServiceCard({
  service,
  isLarge,
  revealDelay,
}: {
  service: ServiceData
  isLarge: boolean
  revealDelay: number
}) {
  const t = useTranslations("services")
  const locale = useLocale()
  const cardRef = useReveal<HTMLElement>({ delay: revealDelay })

  return (
    <article
      ref={cardRef}
      data-service={service.index}
      className={cn(
        "group relative isolate cursor-pointer overflow-hidden transition-colors duration-300",
        "data-[service=01]:[--card-accent:rgba(99,102,241,0.08)]",
        "data-[service=02]:[--card-accent:rgba(20,184,166,0.08)]",
        "data-[service=03]:[--card-accent:rgba(245,158,11,0.07)]",
        "data-[service=04]:[--card-accent:rgba(16,185,129,0.07)]",
        isLarge
          ? "min-h-[clamp(240px,28vw,380px)] p-[clamp(36px,4.5vw,60px)]"
          : "p-[clamp(24px,3vw,40px)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-2 h-0.5 bg-linear-to-r from-transparent via-(--card-accent) to-transparent opacity-0 transition-opacity duration-400 group-hover:opacity-100"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-(--card-accent) opacity-0 transition-opacity duration-400 group-hover:opacity-100"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-s-0 top-0 bottom-0 z-2 w-0.5 origin-top scale-y-0 bg-s-border opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-y-100"
      />
      <span
        className={cn(
          "pointer-events-none absolute -top-[0.05em] inset-e-0 z-0 select-none pe-[clamp(12px,2vw,28px)] font-mono font-extrabold leading-[0.85] tracking-[-0.06em] text-transparent opacity-0 transition-[opacity,transform] duration-400 translate-x-2 [-webkit-text-stroke-width:1px] [-webkit-text-stroke-color:var(--s-border)] group-hover:translate-x-0 group-hover:opacity-[0.55] rtl:-translate-x-2 rtl:group-hover:translate-x-0",
          isLarge
            ? "text-[clamp(88px,12vw,160px)]"
            : "text-[clamp(64px,8vw,100px)]",
        )}
        aria-hidden
      >
        {service.index}
      </span>
      <div
        className={cn(
          "relative z-1 mb-[clamp(20px,2.5vw,32px)] flex items-center gap-2.5",
          isLarge && "mb-[clamp(28px,3.5vw,44px)]",
        )}
      >
        <div className="inline-flex size-[22px] items-center justify-center rounded-full border border-s-border font-mono text-[9px] tabular-nums text-s-muted transition-[border-color,color,background-color] duration-300 group-hover:border-s-mid group-hover:bg-s-border group-hover:text-s-high">
          {service.index}
        </div>
        <span
          className={cn(
            monoCaps,
            "rounded-xs border border-s-border px-2.5 py-1 text-s-muted transition-[color,border-color] duration-200 group-hover:border-current group-hover:text-s-mid",
          )}
        >
          {t(`${service.key}.tag`)}
        </span>
        <div className="h-px flex-1 bg-s-border opacity-50" />
        <svg
          className="translate-y-1 text-s-mid opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 rtl:scale-x-[-1]"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden
        >
          <path
            d="M2 7H12M8 3L12 7L8 11"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className={cn("relative z-1", isLarge ? "max-w-[560px]" : "max-w-full")}>
        <h3
          className={cn(
            "font-serif text-s-high italic font-light rtl:font-sans rtl:not-italic rtl:font-bold",
            isLarge
              ? "mb-[18px] text-[clamp(24px,2.9vw,38px)]"
              : "mb-3 text-[clamp(16px,2vw,22px)]",
          )}
        >
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-s-muted rtl:tracking-normal">
            {locale === "ar" ? "الخطوة" : "Step"} {service.index}
          </span>
          {t(`${service.key}.title`)}
        </h3>
        <p
          className={cn(
            "font-mono text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.95] text-s-low transition-colors duration-200 group-hover:text-s-mid",
            isLarge ? "max-w-[400px]" : "max-w-full",
          )}
        >
          {t(`${service.key}.description`)}
        </p>
      </div>
    </article>
  )
})

const ProcessRail = memo(function ProcessRail() {
  const t = useTranslations("services")
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.1 }, 
    )

    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        "mt-[clamp(24px,3vw,40px)] border-t border-s-border pt-5",
        "flex flex-col md:flex-row md:items-center gap-6 md:gap-2"
      )}
    >
      {SERVICES.map((service, i) => (
        <div
          key={service.key}
          className={cn(
            "group/rail flex items-center",
            "flex-none md:flex-1 min-w-0"
          )}
        >
          <div className="flex shrink-0 flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 shrink-0 rounded-full bg-s-border transition-[background-color,transform] duration-300 group-hover/rail:scale-[1.4] group-hover/rail:bg-s-mid" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-s-muted">
                {service.index}
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-s-mid ps-3 whitespace-nowrap">
              {t(`${service.key}.tag`)}
            </span>
          </div>
          {i < SERVICES.length - 1 && (
            <div
              style={{ animationDelay: `${i * 0.2}s` }}
              className={cn(
                "animate-services-rail paused",
                "ms-4 h-8 w-px bg-s-border origin-top md:hidden",
                "md:mt-2 md:block md:h-px md:flex-1 md:origin-left md:bg-s-border md:mx-3 md:self-end md:rtl:origin-right",
                visible && "running",
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
})

function SectionHeader() {
  const t = useTranslations("services")
  const eyebrowRef = useReveal<HTMLParagraphElement>({ delay: 0 })
  const headRef = useReveal<HTMLHeadingElement>({ delay: 0.1 })
  const subtitleRef = useReveal<HTMLParagraphElement>({ delay: 0.2 })
  const { first, second } = splitHeadline(t("title"))

  return (
    <div className="mb-[clamp(40px,5vw,72px)] flex flex-col gap-[clamp(20px,2.5vw,32px)]">
      <div className="flex items-center justify-between gap-4">
        <p ref={eyebrowRef} className={cn(monoCaps, "m-0 text-s-muted")}>
          {t("eyebrow")}
        </p>
        <span className={cn(monoCaps, "text-s-muted/60")}>
          {SERVICES.length.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="h-px bg-s-border" />
      <div className="flex flex-wrap items-end justify-between gap-[clamp(20px,4vw,56px)]">
        <h2
          ref={headRef}
          className="m-0 min-w-[min(100%,260px)] flex-1 font-serif italic font-light rtl:font-sans rtl:not-italic rtl:font-bold text-[clamp(28px,4.5vw,60px)] leading-[1.12] tracking-[-0.035em] text-s-high"
        >
          {first}
          {second ? (
            <>
              <br />
              <span className="text-s-mid">
                {second}
              </span>
            </>
          ) : null}
        </h2>
        <p
          ref={subtitleRef}
          className="m-0 max-w-[280px] self-end font-mono text-[clamp(0.9375rem,0.98vw,1rem)] leading-[1.9] text-s-low"
        >
          {t("subtitle")}
        </p>
      </div>
    </div>
  )
}

export const ServicesSection = memo(function ServicesSection() {
  const t = useTranslations("services")

  return (
    <section
      id="services"
      className="relative py-[clamp(60px,8vw,120px)]"
    >
      <Container>
        <SectionHeader />
        <div className="grid grid-cols-1 gap-px bg-s-border ring-1 ring-s-border">
          <ServiceCard service={SERVICES[0]} isLarge revealDelay={0} />
          <div className="grid grid-cols-1 gap-px bg-s-border md:grid-cols-[2fr_3fr]">
            <ServiceCard service={SERVICES[1]} isLarge={false} revealDelay={0.1} />
            <ServiceCard service={SERVICES[2]} isLarge={false} revealDelay={0.15} />
          </div>
          <ServiceCard service={SERVICES[3]} isLarge revealDelay={0.2} />
        </div>
        <ProcessRail />
        <div className="mt-5 flex items-center gap-4">
          <div className="h-px flex-1 bg-s-border" />
          <span className={cn(monoCaps, "whitespace-nowrap text-s-muted")}>
            {t("footerText")}
          </span>
        </div>
      </Container>
    </section>
  )
})