"use client";

import { Num } from "@/components/ui/num";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn, splitHeadline } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { Fragment, memo, useEffect, useRef, useState } from "react";
import { SectionHeading } from "./section-heading";

interface ServiceData {
  key: "service1" | "service2" | "service3" | "service4";
  index: string;
}

const SERVICES: ServiceData[] = [
  { key: "service1", index: "01" },
  { key: "service2", index: "02" },
  { key: "service3", index: "03" },
  { key: "service4", index: "04" },
];

const ServiceCard = memo(function ServiceCard({
  service,
  variant,
}: {
  service: ServiceData;
  variant: "primary" | "supporting" | "anchor";
}) {
  const t = useTranslations("services");
  const isPrimary = variant === "primary";
  const isAnchor = variant === "anchor";

  return (
    <article
      data-card
      className={cn(
        "group relative isolate flex flex-col justify-between overflow-hidden bg-muted/10 transition-colors duration-500 hover:bg-local-accent/2",
        isPrimary && "min-h-[clamp(280px,30vw,400px)] p-[clamp(32px,4vw,56px)]",
        isAnchor && "min-h-[clamp(220px,24vw,300px)] p-[clamp(28px,4vw,48px)]",
        variant === "supporting" && "min-h-[clamp(200px,20vw,280px)] p-[clamp(24px,3vw,40px)]"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-4 inset-e-0 z-0 select-none pe-[clamp(16px,2vw,32px)] font-mono leading-none font-bold tracking-[-0.04em] transition-all duration-500",
          "text-s-muted/3 group-hover:-translate-x-2 group-hover:translate-y-2 group-hover:text-local-accent/6 rtl:group-hover:translate-x-2",
          isPrimary ? "text-[clamp(120px,16vw,220px)]" : "text-[clamp(80px,12vw,140px)]"
        )}
      >
        <Num value={service.index} />
      </span>
      <div className="relative z-10 mb-10 flex items-baseline gap-3">
        <span className="text-[11px] font-mono font-medium tracking-widest text-s-high/80 transition-colors duration-300 group-hover:text-local-accent">
          <Num value={service.index} />
        </span>
        <span aria-hidden className="text-xs font-mono text-s-muted/40">/</span>
        <span className="text-xs font-medium uppercase tracking-[0.15em] text-s-mid transition-colors duration-300 group-hover:text-s-high">
          {t(`${service.key}.tag`)}
        </span>
      </div>
      <div className={cn("relative z-10", isPrimary ? "max-w-[46ch]" : "max-w-[38ch]")}>
        <h3
          className={cn(
            "font-medium tracking-[-0.02em] text-s-high transition-colors duration-300 group-hover:text-local-accent-text",
            isPrimary
              ? "mb-4 text-[clamp(1.5rem,2.5vw,2.25rem)] leading-[1.1]"
              : isAnchor
                ? "mb-4 text-[clamp(1.25rem,2vw,1.75rem)] leading-[1.15]"
                : "mb-3 text-[clamp(1.15rem,1.5vw,1.35rem)] leading-[1.2]"
          )}
        >
          {t(`${service.key}.title`)}
        </h3>
        <p
          className={cn(
            "text-s-mid leading-[1.65]",
            isPrimary ? "text-[clamp(0.9375rem,1.1vw,1.0625rem)]" : "text-[0.9375rem]"
          )}
        >
          {t.rich(`${service.key}.description`, bodyMarks)}
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
    <div ref={ref} className="mt-[clamp(56px,8vw,96px)] w-full">
      <div className="flex flex-col md:flex-row md:items-start">
        {SERVICES.map((service, i) => (
          <Fragment key={service.key}>
            <div className="group/rail flex shrink-0 flex-row items-center gap-4 md:flex-col md:items-start md:gap-3">
              <span className="text-[11px] font-mono tracking-[0.2em] text-s-high/80 transition-colors duration-300 group-hover/rail:text-local-accent">
                <Num value={service.index} />
              </span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-s-mid md:mt-0">
                {t(`${service.key}.tag`)}
              </span>
            </div>
            {i < SERVICES.length - 1 ? (
              <div
                style={{ animationDelay: `${i * 0.2}s` }}
                className={cn(
                  "paused my-3 ms-1.5 h-6 w-px origin-top bg-s-border/50 motion-reduce:animate-none!",
                  "md:mx-6 md:mt-1.75 md:h-px md:flex-1 md:origin-left md:self-start rtl:md:origin-right",
                  visible && "running animate-services-rail",
                )}
              />
            ) : null}
          </Fragment>
        ))}
      </div>
    </div>
  );
});

export const ServicesSection = memo(function ServicesSection() {
  const t = useTranslations("services");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const subtitleRef = useSectionDescription<HTMLParagraphElement>();
  const gridRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-card]" });

  const { first, second } = splitHeadline(t("title"));

  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="services-heading"
          theme="surface"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={subtitleRef}
          eyebrow={t("eyebrow")}
          firstTitle={first}
          secondTitle={second}
          description={t("subtitle")}
          className="mb-14 lg:mb-20"
        />
        <div
          ref={gridRef}
          className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-s-border/60"
        >
          <ServiceCard service={SERVICES[0]} variant="primary" />
          <div className="grid grid-cols-1 gap-px bg-s-border/60 md:grid-cols-2">
            <ServiceCard service={SERVICES[1]} variant="supporting" />
            <ServiceCard service={SERVICES[2]} variant="supporting" />
          </div>
          <ServiceCard service={SERVICES[3]} variant="anchor" />
        </div>
        <ProcessRail />
        <div className="mt-[clamp(32px,5vw,56px)]">
          <Eyebrow className="text-s-muted">{t("footerText")}</Eyebrow>
        </div>
      </Container>
    </section>
  );
});