"use client";

import { TransparencyChapter } from "@/components/sections/transparency-chapter";
import { Container } from "@/components/shared/container";
import { MOTION, useSectionCardGrid } from "@/lib/motion";
import { getConstrainedDevice } from "@/lib/motion/config";
import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap, ScrollTrigger } from "@/lib/utils/gsap";
import { localizeNumbers } from "@/lib/utils/number";
import { useLocale, useTranslations } from "next-intl";
import { useRef } from "react";

type MeasureSection = {
  body: string;
  points: string[];
  title: string;
};

const STACK_TOP_BASE = 96;
const STACK_TOP_STEP = 24;

export function TransparencyMeasuresDetailsSection() {
  const t = useTranslations("transparency.seo");
  const locale = useLocale();
  const sections = t.raw("sections") as MeasureSection[];

  const isAr = locale.startsWith("ar");

  const gridRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-measure]",
  });
  const stackRef = useRef<HTMLOListElement>(null);

  useIsomorphicLayoutEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;

    const cards = Array.from(
      stack.querySelectorAll<HTMLElement>("[data-measure]"),
    );
    if (cards.length < 2) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 1024px)",
        () => {
          if (getConstrainedDevice()) return;

          const scaleFor = gsap.utils.mapRange(
            0,
            Math.max(cards.length - 2, 1),
            0.94,
            0.985,
          );

          cards.forEach((card, index) => {
            if (index === cards.length - 1) return;
            const nextCard = cards[index + 1];
            const surface = card.querySelector<HTMLElement>(
              "[data-measure-surface]",
            );
            const veil = card.querySelector<HTMLElement>(
              "[data-measure-veil]",
            );
            if (!surface) return;
            gsap.set(surface, {
              transformOrigin: "center top",
              transformPerspective: 1200,
              willChange: "transform",
            });

            const line = `top top+=${STACK_TOP_BASE + index * STACK_TOP_STEP}`;
            const tl = gsap.timeline({ paused: true });
            tl.to(
              surface,
              { scale: scaleFor(index), rotationX: -4, ease: "none" },
              0,
            );
            if (veil) tl.to(veil, { opacity: 1, ease: "none" }, 0);

            ScrollTrigger.create({
              trigger: card,
              start: line,
              endTrigger: nextCard,
              end: line,
              scrub: MOTION.scroll.scrub.tight,
              invalidateOnRefresh: true,
              animation: tl,
            });
          });
        },
      );
    }, stack);

    return () => ctx.revert();
  }, []);

  return (
    <section
      aria-labelledby="transparency-measures-heading"
      className="accent-world-blue border-t border-border-subtle bg-surface/50 pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <TransparencyChapter
          index={3}
          titleId="transparency-measures-heading"
          eyebrow={t("eyebrow")}
          title={t("title")}
          lede={t("body")}
        />
        <ol
          ref={(node) => {
            gridRef.current = node;
            stackRef.current = node;
          }}
          className="mt-14 flex list-none flex-col gap-5 lg:mt-20 lg:gap-6"
        >
          {sections.map((section, index) => (
            <li
              key={section.title}
              data-measure
              className="group lg:sticky"
              style={{
                top: STACK_TOP_BASE + index * STACK_TOP_STEP,
                zIndex: index + 1,
              }}
            >
              <div
                data-measure-surface
                className="liquid-glass-panel glass-highlight relative overflow-hidden rounded-panel-sm p-7 sm:p-9 md:p-11 lg:p-14 xl:p-16"
              >
                <div
                  data-measure-veil
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-10 rounded-panel-sm bg-black/45 opacity-0"
                />
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 lg:gap-x-8">
                  <span
                    aria-hidden
                    className="font-sans text-[clamp(2.75rem,5.5vw,5rem)] font-medium leading-none tracking-[-0.06em] tabular-nums text-foreground/15 select-none"
                  >
                    {localizeNumbers(
                      isAr
                        ? String(index + 1)
                        : String(index + 1).padStart(2, "0"),
                      locale,
                    )}
                  </span>
                  <h3 className="max-w-[22ch] text-[clamp(1.5rem,2.6vw,2.25rem)] font-medium leading-[1.1] tracking-[-0.025em] text-balance text-foreground">
                    {section.title}
                  </h3>
                </div>
                <hr className="mt-8 border-0 border-t border-border-subtle lg:mt-10" />
                <p className="mt-8 max-w-[66ch] text-[clamp(1.0625rem,1.2vw,1.1875rem)] leading-[1.7] text-muted-foreground lg:mt-10">
                  {section.body}
                </p>
                <ul className="mt-9 grid list-none gap-px overflow-hidden rounded-panel-sm border border-glass-border bg-glass-border sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
                  {section.points.map((point, pointIndex) => (
                    <li
                      key={point}
                      className="bg-glass px-5 py-5 lg:px-6 lg:py-7"
                    >
                      <span
                        aria-hidden
                        className="eyebrow block text-[10px] leading-none tabular-nums text-local-accent-text ltr:font-mono"
                      >
                        {localizeNumbers(
                          String(pointIndex + 1).padStart(2, "0"),
                          locale,
                        )}
                      </span>
                      <span className="mt-3.5 block text-[0.9375rem] leading-snug text-foreground">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
