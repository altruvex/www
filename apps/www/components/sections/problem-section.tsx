"use client";

import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Num } from "@/components/ui/num";
import {
  MOTION,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { ProblemDrawing } from "./problem-drawings";
import { SectionHeading } from "./section-heading";

interface Problem {
  readonly number: string;
  readonly title: string;
  readonly description: string;
}

/**
 * CLAIM: what an agency hands over once the site is yours.
 *
 * Five hairline rows, each a framed line drawing of that one problem, its
 * title and a one-line cost. Signature: as a row enters, its drawing draws
 * itself stroke by stroke, the accent stroke last. The markup at rest is
 * fully drawn, which is also what reduced motion and no-JS render.
 */
export function ProblemSection() {
  const t = useTranslations("problem");

  const listRef = useRef<HTMLOListElement>(null);

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const bodyRef = useSectionDescription();

  const items = t.raw("items") as Problem[];

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const rows = gsap.utils.toArray<HTMLElement>(
          list.querySelectorAll("[data-problem-row]"),
        );

        rows.forEach((row) => {
          const strokes = gsap.utils.toArray<SVGPathElement>(
            row.querySelectorAll("[data-stroke]"),
          );
          if (!strokes.length) return;

          // Undrawn: dash fully offset, and hidden until its own start so a
          // round cap never shows as a dot before the stroke draws.
          gsap.set(strokes, {
            strokeDasharray: "1 1",
            strokeDashoffset: 1,
            opacity: 0,
          });

          const timeline = gsap.timeline({ paused: true });
          strokes.forEach((stroke, i) => {
            const at =
              i * MOTION.stagger.base +
              (stroke.hasAttribute("data-accent") ? MOTION.stagger.loose : 0);
            timeline
              .set(stroke, { opacity: 1 }, at)
              .to(
                stroke,
                {
                  strokeDashoffset: 0,
                  duration: MOTION.duration.base,
                  ease: MOTION.ease.strong,
                },
                at,
              );
          });

          ScrollTrigger.create({
            trigger: row,
            start: MOTION.trigger.inView,
            once: true,
            onEnter: () => timeline.play(),
          });
        });
      });
    }, list);

    return () => ctx.revert();
  }, []);

  return (
    <section
      aria-labelledby="problem-section-heading"
      className="accent-world-orange border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="problem-section-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={bodyRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          description={t("subtitle")}
          className="mb-14 md:mb-20"
        />

        <ol ref={listRef} className="list-none border-t-2 border-foreground">
          {items.map((item, index) => (
            <li
              key={item.number}
              data-problem-row
              className="group grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-5 border-b border-border-subtle py-8 sm:gap-x-7 sm:py-10 lg:grid-cols-[8rem_minmax(1rem,1fr)_minmax(13rem,18rem)_minmax(0,30rem)] lg:items-start lg:gap-x-10 lg:py-14 xl:py-16"
            >
              <ProblemDrawing index={index} className="col-start-1 row-start-1" />

              <div className="col-start-2 row-start-1 min-w-0 lg:col-start-3 lg:text-end">
                <span
                  aria-hidden
                  className="mb-1.5 block text-xs tabular-nums tracking-[0.08em] text-muted-foreground ltr:font-mono rtl:text-sm"
                >
                  <Num value={index + 1} pad={2} />
                </span>
                <h3 className="text-[clamp(1.5rem,2vw,2rem)] font-normal leading-[1.2] tracking-[-0.01em] text-foreground rtl:font-medium rtl:leading-[1.45]">
                  {item.title}
                </h3>
              </div>

              <p className="col-span-2 row-start-2 max-w-[44ch] text-[1.0625rem] leading-relaxed text-pretty text-muted-foreground md:text-lg lg:col-span-1 lg:col-start-4 lg:row-start-1 lg:pt-7 rtl:leading-[1.8]">
                {item.description}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex items-center gap-5 lg:mt-14">
          <p className="max-w-[46ch] text-[clamp(1.25rem,1.9vw,1.5rem)] leading-snug text-foreground">
            {t("closingPre")} <Highlight>{t("closingHighlight")}</Highlight>
          </p>
          <span aria-hidden className="hidden h-px flex-1 bg-border-subtle sm:block" />
        </div>
      </Container>
    </section>
  );
}
