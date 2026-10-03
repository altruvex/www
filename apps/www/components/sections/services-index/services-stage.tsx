"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { usePricingTokens } from "@/components/providers/pricing-tokens-provider";
import { Container } from "@/components/shared/container";
import { ArrowLabel } from "@/components/shared/directional-link";
import { Num } from "@/components/ui/num";
import { Link } from "@/i18n/navigation";
import { accentWorldClass } from "@/lib/config/accent-world";
import { MOTION, useBatch } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { gsap } from "@/lib/utils/gsap";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { LIFE_MOMENTS, serviceById, type ServiceEntry } from "./data";

const LINK_CLASS =
  "group inline-flex min-h-6 items-center font-medium text-foreground underline decoration-foreground/45 underline-offset-4 transition-colors duration-(--motion-hover) hover:text-local-accent-text hover:decoration-current pointer-coarse:min-h-11";

/* One discipline inside the field of the moment it belongs to: its name in
   its world colour, what a client leaves with, the terms, and the door. */
function Discipline({ service }: { service: ServiceEntry }) {
  const t = useTranslations("servicesPage");
  const pricingTokens = usePricingTokens();
  const name = t(`capabilities.${service.name}`);

  return (
    <div className={accentWorldClass(service.world)}>
      <h4 className="m-0 flex items-center gap-2 text-sm font-medium text-local-accent-text">
        <span aria-hidden className="size-1.75 shrink-0 rounded-full bg-local-accent" />
        {name}
      </h4>
      <p className="mt-3 mb-4.5 text-balance text-[clamp(1.3125rem,1.75vw,1.6875rem)] leading-[1.2] tracking-[-0.02em] text-foreground rtl:leading-normal rtl:tracking-normal">
        {t(`services.${service.id}.leaves`)}
      </p>
      <p className="mb-3.5 text-[0.8125rem] leading-normal text-muted-foreground">
        {t(`services.${service.id}.engagement`, pricingTokens)}
      </p>
      <p className="text-[0.9375rem]">
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

/* Scroll the photograph takes to open from its inset card to the full viewport, in viewports. */
const PHOTO_OPEN = 1.5;

/* The stair photograph and the four constants that hold across every discipline. */
function PhotoLayer() {
  const t = useTranslations("servicesPage");
  const plateItems = t.raw("chapters.plate.items") as string[];
  const trackRef = useRef<HTMLDivElement>(null);
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
    <div
      ref={trackRef}
      className="relative"
      style={{ height: `${PHOTO_OPEN * 100 + 100}svh` }}
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div ref={frameRef} className="absolute inset-0 bg-black">
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
                <p data-plate-eyebrow className="eyebrow text-xs text-white/70">
                  {t("chapters.plate.eyebrow")}
                </p>
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
    </div>
  );
}

/* Field widths on desktop: the build holds two disciplines, so it is widest;
   the live field runs past the container to the viewport edge — it does not
   end. */
const FIELD_CLASS = {
  before: "",
  build: "",
  live: "lg:rounded-e-none lg:-me-[max(4rem,calc((100vw-88rem)/2+4rem))]",
} as const;

/**
 * Where each discipline sits. A system has three moments — before it is
 * built, the build, once it is live — and each is a tinted field holding the
 * disciplines that work in it, all readable at once. Fields separate by tint
 * and gap, never by vertical rules. How a build runs phase by phase is
 * /process's subject (lib/process-phases.ts), so this section links there
 * instead of carrying a second process model.
 */
export function ServicesStage() {
  const t = useTranslations("servicesPage.stage");
  const fieldsRef = useBatch<HTMLDivElement>({
    selector: "[data-field]",
    trigger: MOTION.trigger.late,
  });

  return (
    <>
      <PhotoLayer />
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
            description={t("hint")}
            className="mb-[clamp(3rem,8vh,5.5rem)]"
            classes={{
              title:
                "max-w-[18ch] text-[clamp(2.125rem,4.4vw,4.25rem)] font-light leading-[1.04] tracking-[-0.035em] rtl:leading-[1.35] rtl:tracking-normal",
              description: "text-[0.8125rem] text-muted-foreground lg:max-w-[22rem]",
            }}
          />

          <div
            ref={fieldsRef}
            className="grid gap-2.5 lg:grid-cols-[1fr_2fr_1.35fr]"
          >
            {LIFE_MOMENTS.map((moment, m) => {
              const services = moment.services.map((id) => serviceById(id));
              const single = services.length === 1 ? services[0] : null;
              return (
                <article
                  key={moment.id}
                  data-field
                  aria-labelledby={`services-stage-${moment.id}`}
                  className={cn(
                    "relative flex flex-col justify-between gap-12 overflow-hidden rounded-panel-lg bg-local-accent-soft p-[clamp(1.5rem,2.6vw,2.5rem)] lg:min-h-[clamp(30rem,64vh,38.75rem)]",
                    accentWorldClass(services[0].world),
                    FIELD_CLASS[moment.id],
                  )}
                >
                  {single ? null : (
                    /* The build wears both its worlds: the first discipline's tint
                       underneath, the second's fading in toward its own side. */
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute inset-0 bg-local-accent-soft mask-[linear-gradient(to_right,transparent,black)] rtl:mask-[linear-gradient(to_left,transparent,black)]",
                        accentWorldClass(services[1].world),
                      )}
                    />
                  )}
                  <div className="relative">
                    <span className="block text-[0.8125rem] tabular-nums text-muted-foreground ltr:font-mono">
                      <Num value={m + 1} pad={2} /> / <Num value={LIFE_MOMENTS.length} pad={2} />
                    </span>
                    <h3
                      id={`services-stage-${moment.id}`}
                      className="m-0 mt-3.5 text-[clamp(2rem,3.5vw,3.5rem)] font-light leading-[1.02] tracking-[-0.035em] text-foreground rtl:leading-[1.3] rtl:tracking-normal"
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
                      !single && "xl:grid-cols-2 xl:gap-[clamp(1.25rem,2.4vw,2.5rem)]",
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

          <p className="mt-5 flex items-center gap-4 text-[0.9375rem] text-muted-foreground">
            <svg
              aria-hidden
              viewBox="0 0 400 34"
              preserveAspectRatio="none"
              className="hidden h-8.5 w-[clamp(7.5rem,40%,32.5rem)] shrink-0 overflow-visible text-foreground/45 lg:block rtl:-scale-x-100"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.25}
            >
              <path
                d="M400 2 C 400 30, 380 32, 340 32 L 8 32 L 2 26"
                strokeDasharray="4 5"
                vectorEffect="non-scaling-stroke"
              />
              <path d="M2 26 L 10 24 M2 26 L 5 18" vectorEffect="non-scaling-stroke" />
            </svg>
            <span>{t("return")}</span>
          </p>

          <div className="mt-[clamp(3.5rem,8vh,5.5rem)] flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-border-subtle pt-5 text-[0.9375rem] text-muted-foreground">
            <span>{t("processLead")}</span>
            <Link href="/process" className={LINK_CLASS}>
              <ArrowLabel>{t("processLink")}</ArrowLabel>
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
