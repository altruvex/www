"use client";

import { monoCaps } from "@/lib/mono-caps";
import { useReveal } from "@/lib/motion";
import { cn, splitHeadline } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, memo, useEffect, useRef, useState } from "react";
import { Container } from "../container";

interface ServiceData {
  key: "service1" | "service2" | "service3" | "service4";
  index: string;
  layout: "hero" | "secondary-left" | "secondary-right" | "anchor";
}

const SERVICES: ServiceData[] = [
  { key: "service1", index: "01", layout: "hero" },
  { key: "service2", index: "02", layout: "secondary-left" },
  { key: "service3", index: "03", layout: "secondary-right" },
  { key: "service4", index: "04", layout: "anchor" },
];

const ServiceCard = memo(function ServiceCard({
  service,
  isLarge,
  revealDelay,
}: {
  service: ServiceData;
  isLarge: boolean;
  revealDelay: number;
}) {
  const t = useTranslations("services");
  const locale = useLocale();
  const cardRef = useReveal<HTMLElement>({ delay: revealDelay });

  return (
    <article
      ref={cardRef}
      data-service={service.index}
      className={cn(
        "group relative isolate cursor-pointer overflow-hidden bg-inverted-bg/80 transition-colors duration-300",
        "data-[service=01]:[--card-accent:rgba(99,102,241,0.08)]",
        "data-[service=02]:[--card-accent:rgba(20,184,166,0.08)]",
        "data-[service=03]:[--card-accent:rgba(245,158,11,0.07)]",
        "data-[service=04]:[--card-accent:rgba(16,185,129,0.07)]",
        isLarge
          ? "min-h-[clamp(240px,28vw,380px)] p-[clamp(32px,4vw,56px)]"
          : "p-[clamp(24px,3vw,36px)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px] bg-linear-to-r from-transparent via-(--card-accent) to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-(--card-accent) opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 z-10 w-[2px] origin-top scale-y-0 bg-s-mid opacity-0 transition-all duration-300 group-hover:scale-y-100 group-hover:opacity-100"
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-[0.05em] end-0 z-0 select-none pe-[clamp(12px,2vw,28px)] font-mono font-extrabold leading-[0.85] tracking-[-0.06em] text-transparent opacity-0 transition-[opacity,transform] duration-500 [-webkit-text-stroke-color:var(--s-border)] [-webkit-text-stroke-width:1px]",
          "translate-x-4 group-hover:translate-x-0 group-hover:opacity-40 rtl:-translate-x-4 rtl:group-hover:translate-x-0",
          isLarge
            ? "text-[clamp(90px,14vw,160px)]"
            : "text-[clamp(64px,10vw,110px)]",
        )}
      >
        {service.index}
      </span>
      <div
        className={cn(
          "relative z-10 mb-6 flex items-center gap-3",
          isLarge && "mb-8",
        )}
      >
        <div className="inline-flex size-[24px] items-center justify-center rounded-full border border-s-border font-mono text-[10px] tabular-nums text-s-muted transition-[border-color,color,background-color] duration-300 group-hover:border-s-mid group-hover:bg-s-border group-hover:text-s-high">
          {service.index}
        </div>
        <span
          className={cn(
            monoCaps,
            "rounded-sm border border-s-border px-2.5 py-1 text-[11px] text-s-muted transition-[color,border-color] duration-200 group-hover:border-current group-hover:text-s-mid",
          )}
        >
          {t(`${service.key}.tag`)}
        </span>
        <div className="h-px flex-1 bg-s-border opacity-40" />
        <svg
          aria-hidden
          className="translate-x-[-4px] text-s-mid opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 rtl:scale-x-[-1]"
          width="16"
          height="16"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M2 7H12M8 3L12 7L8 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div
        className={cn(
          "relative z-10",
          isLarge ? "max-w-[580px]" : "max-w-full",
        )}
      >
        <h3
          className={cn(
            "font-serif font-light italic text-s-high rtl:not-italic rtl:font-bold rtl:font-sans",
            isLarge
              ? "mb-4 text-[clamp(24px,2.8vw,36px)] leading-snug"
              : "mb-3 text-[clamp(18px,2vw,24px)] leading-snug",
          )}
        >
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-s-muted rtl:tracking-normal">
            {locale === "ar" ? "الخطوة" : "Step"} {service.index}
          </span>
          {t(`${service.key}.title`)}
        </h3>
        <p
          className={cn(
            "font-mono text-[clamp(0.875rem,0.95vw,1rem)] leading-[1.8] text-s-low transition-colors duration-200 group-hover:text-s-mid",
            isLarge ? "max-w-[460px]" : "max-w-full",
          )}
        >
          {t(`${service.key}.description`)}
        </p>
      </div>
    </article>
  );
});

const ProcessRail = memo(function ProcessRail() {
  const t = useTranslations("services");
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="mt-[clamp(32px,4vw,56px)] border-t border-s-border pt-6"
    >
      <div className="flex flex-col md:flex-row md:items-center">
        {SERVICES.map((service, i) => (
          <Fragment key={service.key}>
            <div
              className={cn(
                "group/rail flex shrink-0 items-center gap-3",
                "md:flex-col md:items-start md:gap-1.5",
              )}
            >
              <div className="flex items-center gap-1.5">
                <div className="size-1.5 shrink-0 rounded-full bg-s-border transition-[background-color,transform] duration-300 group-hover/rail:scale-[1.4] group-hover/rail:bg-s-mid" />
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-s-muted">
                  {service.index}
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-s-mid md:ps-3 whitespace-nowrap">
                {t(`${service.key}.tag`)}
              </span>
            </div>
            {i < SERVICES.length - 1 && (
              <div
                style={{ animationDelay: `${i * 0.2}s` }}
                className={cn(
                  "animate-services-rail paused shrink-0 bg-s-border",
                  "ms-[2.5px] my-2 h-5 w-px origin-top",
                  "md:ms-0 md:my-0 md:mx-3 md:h-px md:w-auto md:flex-1 md:origin-left md:self-center rtl:md:origin-right",
                  visible && "running",
                )}
              />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
});

function SectionHeader() {
  const t = useTranslations("services");
  const eyebrowRef = useReveal<HTMLParagraphElement>({ delay: 0 });
  const headRef = useReveal<HTMLHeadingElement>({ delay: 0.1 });
  const subtitleRef = useReveal<HTMLParagraphElement>({ delay: 0.2 });
  const { first, second } = splitHeadline(t("title"));

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
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end md:gap-[clamp(20px,4vw,56px)]">
        <h2
          ref={headRef}
          className="m-0 min-w-[min(100%,260px)] flex-1 font-serif font-light italic tracking-[-0.035em] text-s-high rtl:not-italic rtl:font-bold rtl:font-sans text-[clamp(28px,4.5vw,60px)] leading-[1.12]"
        >
          {first}
          {second ? (
            <>
              <br />
              <span className="text-s-mid">{second}</span>
            </>
          ) : null}
        </h2>
        <p
          ref={subtitleRef}
          className="m-0 max-w-[340px] shrink-0 font-mono text-[clamp(0.875rem,0.92vw,0.95rem)] leading-[1.8] text-s-low"
        >
          {t("subtitle")}
        </p>
      </div>
    </div>
  );
}

export const ServicesSection = memo(function ServicesSection() {
  return (
    <section id="services" className="relative py-[clamp(60px,8vw,120px)]">
      <Container>
        <SectionHeader />
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-s-border ring-1 ring-s-border">
          <ServiceCard service={SERVICES[0]} isLarge revealDelay={0} />
          <div className="grid grid-cols-1 gap-px bg-s-border md:grid-cols-2">
            <ServiceCard
              service={SERVICES[1]}
              isLarge={false}
              revealDelay={0.1}
            />
            <ServiceCard
              service={SERVICES[2]}
              isLarge={false}
              revealDelay={0.15}
            />
          </div>
          <ServiceCard service={SERVICES[3]} isLarge revealDelay={0.2} />
        </div>
        <ProcessRail />
        <div className="mt-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-s-border opacity-60" />
          <span
            className={cn(
              monoCaps,
              "whitespace-nowrap text-[11px] text-s-muted",
            )}
          >
            {useTranslations("services")("footerText")}
          </span>
        </div>
      </Container>
    </section>
  );
});
