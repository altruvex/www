"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { usePricingTokens } from "@/components/providers/pricing-tokens-provider";
import { Container } from "@/components/shared/container";
import { ArrowLabel } from "@/components/shared/directional-link";
import { ArrowIcon } from "@repo/ui";
import { Link } from "@/i18n/navigation";
import { accentWorldClass } from "@/lib/config/accent-world";
import { getCommercialCta } from "@/lib/config/commercial";
import { MOTION, useBatch } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { gsap } from "@/lib/utils/gsap";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { LIFE_MOMENTS, serviceById, type ServiceEntry } from "./data";

const LINK_CLASS =
  "group inline-flex min-h-6 items-center font-medium text-foreground underline decoration-foreground/45 underline-offset-4 transition-colors duration-(--motion-hover) hover:text-local-accent-text hover:decoration-current pointer-coarse:min-h-11";

function Discipline({ service }: { service: ServiceEntry }) {
  const t = useTranslations("servicesPage");
  const pricingTokens = usePricingTokens();
  const name = t(`capabilities.${service.name}`);

  return (
    <div className={accentWorldClass(service.world)}>
      <h4 className="m-0 flex items-center gap-2 text-sm font-medium text-local-accent-text">
        <span
          aria-hidden
          className="size-1.75 shrink-0 rounded-full bg-local-accent"
        />
        {name}
      </h4>
      <p className="mt-3 mb-4.5 text-balance text-[clamp(1.3125rem,1.75vw,1.6875rem)] leading-[1.2] tracking-[-0.02em] text-foreground rtl:leading-normal rtl:tracking-normal">
        {t(`services.${service.id}.leaves`)}
      </p>
      <p className="mb-3.5 text-base leading-normal text-muted-foreground">
        {t(`services.${service.id}.outcome`)}
      </p>
      <p className="mb-3.5 text-md leading-normal text-muted-foreground">
        {service.id === "maintenance" && !pricingTokens.maintenanceEssential
          ? t("services.maintenance.engagementQuoted")
          : t(`services.${service.id}.engagement`, pricingTokens)}
      </p>
      <p className="text-base">
        <Link
          href={service.href}
          aria-label={t("chapters.explore", { name })}
          className={LINK_CLASS}
        >
          <ArrowLabel>{t("stage.open")}</ArrowLabel>
        </Link>
      </p>
    </div>
  );
}

const PHOTO_OPEN = 1.5;

function PhotoLayer() {
  const t = useTranslations("servicesPage");
  const plateItems = t.raw("chapters.plate.items") as string[];
  const trackRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const frame = frameRef.current;
    const image = imageRef.current;
    const plate = plateRef.current;
    if (!track || !frame || !image || !plate) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const eyebrow = plate.querySelector<HTMLElement>(
          "[data-plate-eyebrow]",
        );
        const rows = gsap.utils.toArray<HTMLElement>(
          "[data-plate-item]",
          plate,
        );
        const open = 1;
        const tl = gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: track,
              start: "top top",
              end: `+=${PHOTO_OPEN * 100}%`,
              scrub: MOTION.scroll.scrub.pin,
              invalidateOnRefresh: true,
            },
          })
          .fromTo(
            frame,
            { clipPath: "inset(24% 30% 24% 30% round 12px)" },
            {
              clipPath: "inset(0% 0% 0% 0% round 0px)",
              duration: open * 0.5,
              ease: MOTION.ease.gentle,
            },
            0,
          )
          .fromTo(
            image,
            { scale: 1.3 },
            { scale: 1.04, duration: open * 0.5, ease: MOTION.ease.gentle },
            0,
          )
          .fromTo(
            eyebrow,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: open * 0.1 },
            open * 0.42,
          );
        rows.forEach((row, i) => {
          tl.fromTo(
            row,
            { opacity: 0, y: 32 },
            {
              opacity: 1,
              y: 0,
              duration: open * 0.14,
              ease: MOTION.ease.gentle,
              immediateRender: true,
            },
            open * (0.48 + i * 0.1),
          );
        });
      });
    }, track);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={trackRef}
      aria-labelledby="services-plate-heading"
      className="relative"
      style={{ height: `${PHOTO_OPEN * 100 + 100}svh` }}
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div
          ref={frameRef}
          data-scene="inverted"
          data-scene-lock="dark"
          className="absolute inset-0 bg-inverted-bg!"
        >
          <div className="absolute inset-0 rtl:-scale-x-100">
            <div ref={imageRef} className="absolute inset-0">
              <Image
                src="/images/services/image-7.png"
                alt=""
                aria-hidden
                fill
                draggable={false}
                sizes="100vw"
                className="object-cover portrait:hidden"
              />
              <Image
                src="/images/services/image-7(mobile).png"
                alt=""
                aria-hidden
                fill
                draggable={false}
                sizes="100vw"
                className="object-cover landscape:hidden"
              />
            </div>
          </div>
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-r from-black/80 via-black/45 to-black/10 rtl:bg-linear-to-l max-lg:bg-none max-lg:bg-black/50"
          />
          <div ref={plateRef} className="absolute inset-0 flex items-center">
            <Container>
              <div className="lg:ms-[12%]">
                <div data-plate-eyebrow>
                  <p className="eyebrow text-xs text-white/70">
                    {t("chapters.plate.eyebrow")}
                  </p>
                  <h2
                    id="services-plate-heading"
                    className="m-0 mt-4 max-w-[24ch] text-balance text-[clamp(1.0625rem,1.4vw,1.375rem)] font-normal leading-[1.3] text-white/85 rtl:leading-normal"
                  >
                    {t("chapters.plate.title")}
                  </h2>
                </div>
                <ul className="mt-8 grid list-none gap-y-[clamp(1.75rem,5.5vh,3.5rem)] lg:mt-12">
                  {plateItems.map((item) => (
                    <li
                      key={item}
                      data-plate-item
                      className="flex max-w-[22ch] gap-[0.55em] text-[clamp(1.3125rem,2.4vw,2.125rem)] font-medium leading-[1.15] tracking-[-0.02em] text-balance text-white rtl:leading-[1.4] rtl:tracking-normal"
                    >
                      <span
                        aria-hidden
                        className="mt-[0.2em] h-[0.78em] w-[0.16em] shrink-0 bg-white rtl:mt-[0.35em]"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Container>
          </div>
        </div>
      </div>
    </section>
  );
}

const FIELD_CLASS = {
  before: "w-[min(26rem,86vw)]",
  build: "w-[min(54rem,90vw)]",
  live: "w-[min(30rem,86vw)]",
} as const;

const TRACK_INSET =
  "[--gutter:1.5rem] sm:[--gutter:2rem] md:[--gutter:3rem] lg:[--gutter:4rem] ps-[max(var(--gutter),calc((100%-88rem)/2+var(--gutter)))] pe-[max(var(--gutter),calc((100%-88rem)/2+var(--gutter)))] scroll-ps-[max(var(--gutter),calc((100%-88rem)/2+var(--gutter)))] scroll-pe-[max(var(--gutter),calc((100%-88rem)/2+var(--gutter)))]";

const STEP_CLASS =
  "inline-flex size-11 items-center justify-center rounded-full border border-foreground/45 text-foreground transition-colors duration-(--motion-hover) hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-35";

export function ServicesStage() {
  const t = useTranslations("servicesPage.stage");
  const tCTAs = useTranslations("commercial.ctas");
  const fieldsRef = useBatch<HTMLDivElement>({
    selector: "[data-field]",
    trigger: MOTION.trigger.late,
  });
  const trackRef = useRef<HTMLDivElement>(null);
  const stepTween = useRef<gsap.core.Tween | null>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const offset = Math.abs(track.scrollLeft);
    const start = offset < 2;
    const end = offset + track.clientWidth >= track.scrollWidth - 2;
    setEdge((prev) =>
      prev.start === start && prev.end === end ? prev : { start, end },
    );
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  const step = (forward: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    const style = getComputedStyle(track);
    const rtl = style.direction === "rtl";
    const pad = parseFloat(style.paddingInlineStart) || 0;
    const bounds = track.getBoundingClientRect();
    const offsets = Array.from(
      track.querySelectorAll<HTMLElement>("[data-field]"),
      (card) => {
        const r = card.getBoundingClientRect();
        return (rtl ? bounds.right - r.right : r.left - bounds.left) - pad;
      },
    );
    const delta = forward
      ? offsets.find((o) => o > 4)
      : offsets.findLast((o) => o < -4);
    if (delta === undefined) return;
    const from = track.scrollLeft;
    const to = Math.max(
      -(track.scrollWidth - track.clientWidth),
      Math.min(
        track.scrollWidth - track.clientWidth,
        from + (rtl ? -delta : delta),
      ),
    );
    stepTween.current?.kill();
    track.style.scrollSnapType = "none";
    const pos = { x: from };
    stepTween.current = gsap.to(pos, {
      x: to,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 0.7,
      ease: MOTION.ease.gentle,
      onUpdate: () => {
        track.scrollLeft = pos.x;
      },
      onComplete: () => {
        track.style.scrollSnapType = "";
      },
    });
  };

  return (
    <>
      <section
        aria-labelledby="services-stage-heading"
        className="overflow-x-clip pt-(--section-y-top) pb-(--section-y-bottom)"
      >
        <Container>
          <SectionHeading
            titleId="services-stage-heading"
            eyebrow={t("label")}
            firstTitle={t("title")}
            secondTitle={t("titleItalic")}
            description={
              <>
                <span className="block">{t("hint")}</span>
                <span className="mt-5 flex gap-2 lg:justify-end">
                  <button
                    type="button"
                    aria-label={t("prev")}
                    disabled={edge.start}
                    onClick={() => step(false)}
                    className={STEP_CLASS}
                  >
                    <ArrowIcon direction="back" motion="none" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("next")}
                    disabled={edge.end}
                    onClick={() => step(true)}
                    className={STEP_CLASS}
                  >
                    <ArrowIcon direction="forward" motion="none" />
                  </button>
                </span>
              </>
            }
            className="mb-(--heading-gap)"
            classes={{
              title:
                "max-w-[18ch] text-[clamp(2.125rem,4.4vw,4.25rem)] font-light leading-[1.04] tracking-[-0.035em] rtl:leading-[1.35] rtl:tracking-normal",
              description:
                "text-md text-muted-foreground lg:w-[22rem] lg:max-w-[22rem]",
            }}
          />
        </Container>

        <div ref={fieldsRef}>
          <div
            ref={trackRef}
            onScroll={measure}
            data-lenis-prevent-horizontal
            className={cn(
              "flex snap-x snap-mandatory items-stretch gap-2.5 overflow-x-auto overscroll-x-contain scrollbar-none [&::-webkit-scrollbar]:hidden",
              TRACK_INSET,
            )}
          >
            {LIFE_MOMENTS.map((moment) => {
              const services = moment.services.map((id) => serviceById(id));
              const single = services.length === 1 ? services[0] : null;
              return (
                <article
                  key={moment.id}
                  data-field
                  aria-labelledby={`services-stage-${moment.id}`}
                  className={cn(
                    "@container relative flex shrink-0 snap-start last:snap-end flex-col justify-between gap-12 overflow-hidden rounded-panel-lg bg-local-accent-soft p-[clamp(1.5rem,2.6vw,2.5rem)] lg:min-h-[clamp(30rem,64vh,38.75rem)]",
                    accentWorldClass(services[0].world),
                    FIELD_CLASS[moment.id],
                  )}
                >
                  {single ? null : (
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute inset-0 bg-local-accent-soft mask-[linear-gradient(to_right,transparent,black)] rtl:mask-[linear-gradient(to_left,transparent,black)]",
                        accentWorldClass(services[1].world),
                      )}
                    />
                  )}
                  <div className="relative">
                    <h3
                      id={`services-stage-${moment.id}`}
                      className="m-0 text-[clamp(2rem,3.5vw,3.5rem)] font-light leading-[1.02] tracking-[-0.035em] text-foreground rtl:leading-[1.3] rtl:tracking-normal"
                    >
                      {t(`moments.${moment.id}.title`)}
                    </h3>
                    <p className="mt-2.5 text-sm text-muted-foreground">
                      {t(`moments.${moment.id}.note`)}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "relative grid gap-10",
                      !single &&
                        "@xl:grid-cols-2 @xl:gap-[clamp(1.25rem,2.4vw,2.5rem)]",
                    )}
                  >
                    {services.map((service) => (
                      <Discipline key={service.id} service={service} />
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <Container>
          <div className="mt-(--section-block) flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-border-subtle pt-5 text-base text-muted-foreground">
            <span>{t("processLead")}</span>
            <Link href="/process" className={LINK_CLASS}>
              <ArrowLabel>{t("processLink")}</ArrowLabel>
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-border-subtle pt-5 text-base text-muted-foreground">
            <span>{t("costLead")}</span>
            <Link
              href={getCommercialCta("scopeProjects").href}
              className={LINK_CLASS}
            >
              <ArrowLabel>{tCTAs("scopeProjects")}</ArrowLabel>
            </Link>
          </div>
        </Container>
      </section>
      <PhotoLayer />
    </>
  );
}
