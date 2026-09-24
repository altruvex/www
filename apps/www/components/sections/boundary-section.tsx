"use client";

import { Container } from "@/components/shared/container";
import { Dim } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { MOTION } from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useRef } from "react";

const CONTROL_IDS = ["schema", "checkout", "host", "export"] as const;

/**
 * One line of type, split into words. `mask` wraps each word in its own
 * clipping box so the word can be translated up from behind the boundary rule
 * — per word rather than per line, because a line-level mask would clip both
 * halves of a sentence that wrapped.
 *
 * The space between words is a real text node, not a margin: a screen reader
 * reading a row of margin-separated inline-blocks runs the words together.
 */
function Words({
  text,
  marker,
  mask = false,
  className,
}: {
  text: string;
  marker: string;
  mask?: boolean;
  className?: string;
}) {
  const words = text.split(" ").filter(Boolean);

  return (
    <>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          {mask ? (
            <span className="inline-block overflow-hidden pb-[0.14em] align-bottom">
              <span
                {...{ [marker]: "" }}
                className={cn("inline-block", className)}
              >
                {word}
              </span>
            </span>
          ) : (
            <span
              {...{ [marker]: "" }}
              className={cn("inline-block", className)}
            >
              {word}
            </span>
          )}
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

export function BoundarySection() {
  const t = useTranslations("boundary");
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { reduced } = context.conditions as { reduced: boolean };

          /*
           * The markup renders the finished state, so reduced motion — and any
           * client that never runs this — gets both statements, the rule
           * between them, and the evidence, with nothing to animate.
           */
          if (reduced) return;

          const rule = section.querySelector("[data-rule]");
          const above = section.querySelectorAll("[data-word-above]");
          const below = section.querySelectorAll("[data-word-below]");
          const tail = section.querySelectorAll("[data-tail]");

          const rtl = document.documentElement.dir === "rtl";
          const originX = rtl ? "right center" : "left center";

          gsap.set(rule, { transformOrigin: originX, scaleX: 0 });
          gsap.set(above, { y: 0 });
          gsap.set(below, { yPercent: 115, opacity: 0 });
          gsap.set(tail, { y: MOTION.distance.xs, opacity: 0 });

          const timeline = gsap.timeline({
            defaults: { ease: MOTION.ease.text },
            scrollTrigger: {
              trigger: section,
              start: MOTION.trigger.latest,
              end: "bottom 62%",
              scrub: MOTION.scroll.scrub.stage,
              invalidateOnRefresh: true,
            },
          });

          /* The floor is drawn first: the statement above it is only spent
             once there is a line for it to stop at. */
          timeline
            .to(rule, { scaleX: 1, duration: 0.26, ease: "none" }, 0)
            /*
             * The template's line only lifts — its opacity is never touched.
             * `text-foreground/55` is already the site's register for a
             * position being answered; multiplying that by a tween's opacity
             * put display type at roughly 1.5:1 against the page, which is the
             * `--border-mid` mistake made with words.
             */
            .to(
              above,
              {
                y: -MOTION.distance.xs,
                duration: 0.3,
                stagger: MOTION.stagger.tight,
              },
              0.04,
            )
            /* Every word of the answer rises from behind the line. */
            .to(
              below,
              {
                yPercent: 0,
                opacity: 1,
                duration: 0.34,
                stagger: MOTION.stagger.base,
              },
              0.24,
            )
            .to(tail, { y: 0, opacity: 1, duration: 0.3, stagger: MOTION.stagger.loose }, 0.62);

          return () => {
            ScrollTrigger.refresh();
          };
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="boundary"
      aria-labelledby="boundary-heading"
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <Eyebrow className="mb-8 lg:mb-10">{t("eyebrow")}</Eyebrow>

        {/* The template's claim, in the register the site gives every position
            it is about to answer: present, readable, subordinate. */}
        <p className="max-w-[24ch] text-[clamp(1.75rem,5vw,3.75rem)] font-medium leading-[1.05] tracking-[-0.02em] text-foreground/55">
          <Words text={t("above")} marker="data-word-above" />
        </p>

        {/* The boundary itself — the same dashed cut line the ownership stack
            marks on the specimen, at page scale. It is drawn once and never
            moves; the type is what crosses it. */}
        <div className="my-7 flex items-center gap-4 lg:my-9">
          <span
            data-rule
            aria-hidden
            className="h-0 flex-1 border-t-2 border-dashed border-local-accent/45"
          />
          <span
            dir="auto"
            className="eyebrow shrink-0 text-micro text-muted-foreground"
          >
            {t("floor")}
          </span>
        </div>

        <h2
          id="boundary-heading"
          className="max-w-[28ch] text-[clamp(2rem,6vw,4.5rem)] font-semibold leading-[1] tracking-[-0.03em] text-foreground"
        >
          <Words text={t("below")} marker="data-word-below" mask />{" "}
          <Words
            text={t("belowAccent")}
            marker="data-word-below"
            mask
            className="text-local-accent-text"
          />
        </h2>

        {/* What "underneath" actually means: four changes, named as work, not
            as benefits. One line — not four cards. */}
        <p
          data-tail
          className="mt-10 flex flex-wrap items-baseline gap-x-3 gap-y-2 text-[0.9375rem] leading-snug text-foreground lg:mt-12"
        >
          {CONTROL_IDS.map((id, i) => (
            <Fragment key={id}>
              {i > 0 ? (
                <span aria-hidden className="text-local-accent/60">
                  ·
                </span>
              ) : null}
              <span>{t(`controls.${id}`)}</span>
            </Fragment>
          ))}
        </p>

        <p
          data-tail
          className="mt-4 max-w-[64ch] text-sm leading-relaxed text-muted-foreground"
        >
          {t("verdictLead")} — <Dim>{t("verdictContrast")}</Dim>
        </p>
      </Container>
    </section>
  );
}
