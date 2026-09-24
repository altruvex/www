"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { Num } from "@/components/ui/num";
import { bodyMarks } from "@/components/ui/rich-text";
import { getCommercialCta } from "@/lib/config/commercial";
import {
  MOTION,
  resolveTrigger,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
  whenMotionReady,
} from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import type { MaintenanceView } from "@repo/pricing-schema";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";


const DAYS = 30;
const WEEK = 7;
const DAY_LIST = Array.from({ length: DAYS }, (_, index) => index + 1);
const AXIS_DAYS = [1, 8, 15, 22, 30] as const;
const CADENCE_PLAN = "professional";

const isWeekly = (day: number) => (day - 1) % WEEK === 0;
function requestDays(count: number): Set<number> {
  const days = new Set<number>();
  for (let index = 0; index < count; index += 1) {
    days.add(Math.round(((index + 0.5) * DAYS) / count));
  }
  return days;
}

type LaneId = "daily" | "weekly" | "monthly" | "requests";

function Mark({ lane }: { lane: LaneId }) {
  switch (lane) {
    case "daily":
      return <span className="block size-1.5 rounded-full bg-current" />;
    case "weekly":
      return <span className="block h-5 w-1.5 rounded-full bg-current" />;
    case "monthly":
      return (
        <span className="block h-7 w-2.5 rounded-full bg-current" />
      );
    case "requests":
      return (
        <span className="block size-3 rounded-full border-[1.5px] border-current" />
      );
  }
}

export function MaintenanceHero({
  plans,
}: {
  plans: readonly MaintenanceView[];
}) {
  const t = useTranslations("serviceDetails.maintenance");
  const tCTAs = useTranslations("commercial.ctas");
  const locale = useLocale();
  const projectRangeCta = getCommercialCta("projectRange");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();
  const ctaRef = useSectionElement<HTMLDivElement>();
  const scoreTitleRef = useSectionTitle<HTMLHeadingElement>({
    delay: MOTION.section.description,
  });
  const scoreLabelRef = useSectionDescription<HTMLParagraphElement>({
    delay: MOTION.section.description + MOTION.stagger.loose,
  });
  const lanesRef = useSectionElement<HTMLDivElement>({
    delay: MOTION.section.element,
  });

  const scoreRef = useRef<HTMLDivElement>(null);

  const plan = plans.find((candidate) => candidate.id === CADENCE_PLAN);
  const requests = plan?.requestsPerCycle ?? null;
  const slots = requests === null ? new Set<number>() : requestDays(requests);

  const lanes: ReadonlyArray<{ id: LaneId; has: (day: number) => boolean }> = [
    { id: "daily", has: () => true },
    { id: "weekly", has: isWeekly },
    { id: "monthly", has: (day) => day === DAYS },
    ...(requests === null
      ? []
      : [{ id: "requests" as const, has: (day: number) => slots.has(day) }]),
  ];
  const laneCount = (lane: (typeof lanes)[number]): number =>
    DAY_LIST.filter(lane.has).length;

  const dayLabel = useRef<(day: number) => string>(() => "");
  useEffect(() => {
    dayLabel.current = (day: number) =>
      t("hero.dayN", { n: localizeNumbers(String(day), locale) });
  }, [t, locale]);
  useEffect(() => {
    const score = scoreRef.current;
    if (!score) return;

    const marks = Array.from(
      score.querySelectorAll<HTMLElement>("[data-mark-day]"),
    );
    const playhead = score.querySelector<HTMLElement>("[data-playhead]");
    const dayTag = score.querySelector<HTMLElement>("[data-day-tag]");

    const lightUpTo = (day: number) => {
      marks.forEach((mark) => {
        mark.dataset.lit = String(Number(mark.dataset.markDay) <= day);
      });
    };

    let ctx: gsap.Context | null = null;
    const off = whenMotionReady(() => {
      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add(
          {
            motion: "(prefers-reduced-motion: no-preference)",
            reduced: "(prefers-reduced-motion: reduce)",
          },
          (context) => {
            const { reduced } = context.conditions as { reduced: boolean };

            if (reduced) {
              lightUpTo(DAYS);
              return;
            }

            lightUpTo(0);
            const clock = { day: 0 };
            let shown = 0;

            const place = () => {
              if (playhead) {
                playhead.style.insetInlineStart = `${(clock.day / DAYS) * 100}%`;
              }
              const whole = Math.floor(clock.day);
              if (whole !== shown) {
                shown = whole;
                lightUpTo(whole);
                if (dayTag) {
                  dayTag.textContent = dayLabel.current(Math.max(1, whole));
                }
              }
            };
            ScrollTrigger.create({
              trigger: score,
              start: resolveTrigger("inView"),
              once: true,
              onEnter: () => {
                gsap
                  .timeline()
                  .set(playhead, { opacity: 1 })
                  .to(clock, {
                    day: DAYS,
                    duration: MOTION.duration.sweep,
                    ease: MOTION.ease.gentle,
                    onUpdate: place,
                  })
                  .to(playhead, {
                    opacity: 0,
                    duration: MOTION.duration.fast,
                    ease: MOTION.ease.smooth,
                  });
              },
            });
            return () => {
              lightUpTo(DAYS);
            };
          },
        );
      }, score);
    });
    return () => {
      off();
      ctx?.revert();
    };
  }, []);

  return (
    <section
      aria-labelledby="maintenance-hero-heading"
      className="accent-world-green relative pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-end lg:gap-16">
          <SectionHeading
            titleAs="h1"
            titleId="maintenance-hero-heading"
            eyebrowRef={eyebrowRef}
            titleRef={titleRef}
            eyebrow={t("hero.eyebrow")}
            firstTitle={t("title")}
            secondTitle={t("titleItalic")}
            italicWorld
            classes={{
              container: "lg:flex-col lg:items-start",
              titleWrapper: "space-y-6",
              title:
                "text-[clamp(2.75rem,6vw,5.75rem)] font-light leading-[1.02] tracking-[-0.035em] rtl:tracking-normal",
            }}
          />
          <div>
            <p
              ref={descRef}
              className="text-[clamp(1rem,1.1vw,1.125rem)] leading-relaxed text-muted-foreground"
            >
              {t.rich("description", bodyMarks)}
            </p>
            <div ref={ctaRef} className="mt-8">
              <CtaButtonGroup
                primaryVariant="accent"
                primary={{
                  href: projectRangeCta.href,
                  label: tCTAs("projectRange"),
                }}
                secondary={{
                  href: "#pricing",
                  label: tCTAs("maintenancePlans"),
                }}
                secondaryArrow
                className="sm:flex-wrap"
              />
            </div>
          </div>
        </div>
        {plan ? (
          <figure
            aria-labelledby="maintenance-score-title"
            className="mt-20 border-t border-border-subtle pt-10 md:mt-24 md:pt-12"
          >
            <div className="max-w-3xl">
              <h2
                ref={scoreTitleRef}
                id="maintenance-score-title"
                className="text-[clamp(1.5rem,2.4vw,2.25rem)] font-normal leading-tight tracking-[-0.02em] text-foreground rtl:tracking-normal"
              >
                {t("hero.calendarTitle")}
              </h2>
              <p
                ref={scoreLabelRef}
                className="mt-3 text-[clamp(1rem,1.1vw,1.125rem)] leading-relaxed text-muted-foreground"
              >
                {t("hero.calendarLabel", { plan: plan.name })}
              </p>
            </div>
            <div ref={lanesRef} className="mt-12 md:mt-14">
              <div ref={scoreRef} className="relative">
                <div className="grid gap-2 border-b border-border-subtle pb-3 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-end lg:gap-8">
                  <span className="text-xs text-muted-foreground">
                    {t("hero.countHeader")}
                  </span>
                  <div
                    aria-hidden
                    className="grid grid-cols-30 text-micro tabular-nums text-muted-foreground"
                  >
                    {DAY_LIST.map((day) => (
                      <span key={day} className="whitespace-nowrap text-center">
                        {(AXIS_DAYS as readonly number[]).includes(day) ? (
                          <>
                            <span className="max-lg:hidden">
                              {t("hero.day")}{" "}
                            </span>
                            <Num value={day} />
                          </>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
                <ul className="mt-6 list-none space-y-6 md:space-y-7">
                  {lanes.map((lane) => (
                    <li
                      key={lane.id}
                      className="grid gap-3 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-center lg:gap-8"
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-14 shrink-0 translate-y-0.5 text-[clamp(1.75rem,2.4vw,2.25rem)] font-light leading-none tabular-nums text-local-accent-text">
                          <Num value={laneCount(lane)} />
                        </span>
                        <p className="min-w-0 text-[0.9375rem] leading-snug text-balance text-foreground">
                          {t(`hero.legend.${lane.id}.what`)}
                          <span className="block text-sm text-muted-foreground">
                            {t(`hero.legend.${lane.id}.when`, {
                              n: localizeNumbers(
                                String(laneCount(lane)),
                                locale,
                              ),
                            })}
                          </span>
                        </p>
                      </div>
                      <div
                        aria-hidden
                        className="grid h-9 grid-cols-30 items-center"
                      >
                        {DAY_LIST.map((day) =>
                          lane.has(day) ? (
                            <span
                              key={day}
                              data-mark-day={day}
                              data-lit="true"
                              className={cn(
                                "flex justify-center transition-colors duration-(--motion-drawer) ease-smooth motion-reduce:transition-none",
                                "text-foreground/15 data-[lit=true]:text-local-accent",
                              )}
                            >
                              <Mark lane={lane.id} />
                            </span>
                          ) : (
                            <span key={day} />
                          ),
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 hidden lg:inset-s-96 lg:inset-e-0 lg:block"
                >
                  <span
                    data-playhead
                    className="absolute inset-y-0 w-0 opacity-0"
                    style={{ insetInlineStart: "0%" }}
                  >
                    <span className="absolute inset-s-0 top-9 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-local-accent rtl:translate-x-1/2" />
                    <span className="absolute inset-s-0 bottom-0 size-2 -translate-x-1/2 rounded-full bg-local-accent rtl:translate-x-1/2" />
                    <span
                      data-day-tag
                      className="absolute inset-s-0 top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-local-accent px-2 py-0.5 text-micro leading-4 text-local-accent-fg rtl:translate-x-1/2"
                    />
                  </span>
                </div>
              </div>
            </div>
            <figcaption className="mt-8 text-xs leading-relaxed text-muted-foreground">
              {t("hero.calendarNote")}
            </figcaption>
          </figure>
        ) : null}
      </Container>
    </section>
  );
}
