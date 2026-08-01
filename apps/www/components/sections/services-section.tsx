"use client";
import { monoCaps } from "@/lib/utils/mono-caps";
import { useSectionCardGrid, useSectionDescription, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { cn, splitHeadline } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { Fragment, memo, useEffect, useRef, useState } from "react";
import { Container } from "@/components/shared/container";
import { bodyMarks } from "@/components/ui/rich-text";
import { SectionHeading } from "./section-heading";

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
}: {
  service: ServiceData;
  isLarge: boolean;
}) {
  const t = useTranslations("services");
  const tCommon = useTranslations("common");

  return (
    <article
      data-service={service.index}
      className={cn(
        // One hover beat for the whole card: every layer below runs
        // `duration-260 ease-(--ease-strong)`. The old card mixed 200/300/500ms,
        // so a single pointer-enter resolved in three visible stages.
        "group relative isolate overflow-hidden bg-inverted-bg/80",
        // Fill and hairline need very different alphas — sharing one 0.08 token
        // made the 2px top line invisible. Hues are tuned for the deep-blue
        // scene rather than reusing the page tech tokens (--warning is a dark
        // amber that reads as mud on this field).
        "data-[service=01]:[--card-accent:hsl(230_95%_78%/0.1)] data-[service=01]:[--card-accent-line:hsl(230_95%_78%/0.85)]",
        "data-[service=02]:[--card-accent:hsl(187_90%_65%/0.1)] data-[service=02]:[--card-accent-line:hsl(187_90%_65%/0.85)]",
        "data-[service=03]:[--card-accent:hsl(38_95%_65%/0.1)] data-[service=03]:[--card-accent-line:hsl(38_95%_65%/0.85)]",
        "data-[service=04]:[--card-accent:hsl(142_70%_65%/0.1)] data-[service=04]:[--card-accent-line:hsl(142_70%_65%/0.85)]",
        isLarge
          ? "min-h-[clamp(240px,28vw,380px)] p-[clamp(32px,4vw,56px)]"
          : "p-[clamp(24px,3vw,36px)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px] bg-linear-to-r from-transparent via-(--card-accent-line) to-transparent opacity-0 transition-opacity duration-260 ease-(--ease-strong) group-hover:opacity-100"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-(--card-accent) opacity-0 transition-opacity duration-260 ease-(--ease-strong) group-hover:opacity-100"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 inset-s-0 z-10 w-[2px] origin-top scale-y-0 bg-(--card-accent-line) transition-transform duration-260 ease-(--ease-strong) group-hover:scale-y-100 motion-reduce:transition-none"
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-e-8 top-1/2 -translate-y-1/2 z-0 select-none",
          "font-sans font-black leading-none text-transparent",
          isLarge
            ? "text-[clamp(120px,18vw,220px)]"
            : "text-[clamp(80px,12vw,140px)]",
          // Stroke colour is fixed and only opacity moves. `-webkit-text-stroke-color`
          // does not interpolate, so the old colour transition snapped mid-hover —
          // that hard jump was the most visible part of the "not smooth" feel.
          "opacity-18 [-webkit-text-stroke-width:1px] [-webkit-text-stroke-color:var(--s-mid)]",
          // Scaling a 220px stroked glyph re-rasterises the whole card every
          // frame. A GPU-promoted translate gives the same parallax read for free.
          // v4 emits translate/scale as standalone properties, so the list must
          // name `translate` — `transform` alone would never fire.
          "transform-gpu will-change-transform transition-[opacity,translate] duration-260 ease-(--ease-strong)",
          "group-hover:opacity-34 group-hover:-translate-x-2 rtl:group-hover:translate-x-2",
          "motion-reduce:transition-none motion-reduce:group-hover:translate-x-0",
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
        <div className="inline-flex size-[24px] items-center justify-center rounded-full border border-s-border font-mono text-[13px] tabular-nums text-s-mid transition-colors duration-260 ease-(--ease-strong) group-hover:border-s-border-hover group-hover:bg-s-border group-hover:text-s-high">
          {service.index}
        </div>
        <span
          className={cn(
            monoCaps,
            // `border-current` resolved to the text colour *while that colour was
            // itself transitioning*, so the border chased the text a frame behind.
            "rounded-sm border border-s-border px-2.5 py-1 text-sm text-s-mid transition-colors duration-260 ease-(--ease-strong) group-hover:border-s-border-hover group-hover:text-s-high",
          )}
        >
          {t(`${service.key}.tag`)}
        </span>
        <div className="h-px flex-1 bg-s-border opacity-40" />
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
          <span className="mb-1.5 block font-mono text-[13px] uppercase tracking-[0.18em] text-s-mid rtl:tracking-normal">
            {tCommon("step")} {service.index}
          </span>
          {t(`${service.key}.title`)}
        </h3>
        <p
          className={cn(
            "font-mono text-[clamp(0.875rem,0.95vw,1rem)] leading-[1.8] text-s-mid transition-colors duration-260 ease-(--ease-strong) group-hover:text-s-high",
            isLarge ? "max-w-[460px]" : "max-w-full",
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
                <div className="size-1.5 shrink-0 rounded-full bg-s-border transition-[scale,background-color] duration-260 ease-(--ease-strong) group-hover/rail:scale-[1.4] group-hover/rail:bg-local-accent motion-reduce:transition-none" />
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-s-mid transition-colors duration-260 ease-(--ease-strong) group-hover/rail:text-s-high">
                  {service.index}
                </span>
              </div>
              {/* The dot alone moved on hover, so the label it belongs to read as
                  unrelated — the pair now lifts together. */}
              <span className="font-mono text-[13px] uppercase tracking-[0.14em] text-s-mid md:ps-3 whitespace-nowrap transition-colors duration-260 ease-(--ease-strong) group-hover/rail:text-s-high">
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
  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const headRef = useSectionTitle<HTMLHeadingElement>();
  const subtitleRef = useSectionDescription<HTMLParagraphElement>();
  const { first, second } = splitHeadline(t("title"));

  return (
    <SectionHeading
      titleId="services-heading"
      theme="surface"
      eyebrowRef={eyebrowRef}
      titleRef={headRef}
      descriptionRef={subtitleRef}
      eyebrow={t("eyebrow")}
      firstTitle={first}
      secondTitle={second}
      description={t("subtitle")}
      className="mb-[clamp(40px,5vw,72px)]"
      classes={{ eyebrow: monoCaps, container: "md:gap-[clamp(20px,4vw,56px)]" }}
    />
  );
}

export const ServicesSection = memo(function ServicesSection() {
  const t = useTranslations("services");
  const cardsRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-service]",
  });

  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="accent-world-orange relative pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeader />
        <div
          ref={cardsRef}
          className="grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-s-border ring-1 ring-s-border"
        >
          <ServiceCard service={SERVICES[0]} isLarge />
          <div className="grid grid-cols-1 gap-px bg-s-border md:grid-cols-2">
            <ServiceCard service={SERVICES[1]} isLarge={false} />
            <ServiceCard service={SERVICES[2]} isLarge={false} />
          </div>
          <ServiceCard service={SERVICES[3]} isLarge />
        </div>
        <ProcessRail />
        <div className="mt-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-s-border opacity-60" />
          <span
            className={cn(
              monoCaps,
              "whitespace-nowrap text-sm text-s-mid",
            )}
          >
            {t("footerText")}
          </span>
        </div>
      </Container>
    </section>
  );
});
