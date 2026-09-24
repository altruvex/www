"use client";

import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { MOTION } from "@/lib/motion/tokens";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { useTranslations } from "next-intl";
import { memo, useLayoutEffect, useRef } from "react";
import { SectionHeading } from "./section-heading";

/**
 * A panel off centre stays legible while it slides: design-principles C14
 * treats anything at or below `s-low` (0.52) as a non-reading tone, and these
 * panels carry the section's headline.
 */
const RECESSED_OPACITY = 0.55;
const RECESSED_SCALE = 0.98;

/**
 * Depth, not decoration: dimming alone reads as a dimmer copy of the panel,
 * defocusing reads as one that is further away. Both values are deliberately
 * under 3px — enough to separate the planes, never enough to look broken on
 * a panel caught mid-scrub.
 */
const RECESSED_BLUR = 1;
const ENTERING_BLUR = 2.5;

interface ProblemItem {
  readonly number: string;
  readonly pitch: string;
  readonly delivery: string;
  readonly evidence: string;
}

function splitWords(text: string, kind: "pitch" | "delivery") {
  return text.split(/(\s+)/).map((part, index) => {
    if (/^\s+$/.test(part)) {
      return part;
    }

    return (
      <span
        key={`${part}-${index}`}
        data-problem-word={kind}
        className="inline-block will-change-transform"
      >
        {part}
      </span>
    );
  });
}

function ProblemPanel({
  item,
  index,
}: {
  item: ProblemItem;
  index: number;
}) {
  const t = useTranslations("problem");

  return (
    <article
      data-problem-panel
      className="
        relative
        flex
        h-[100svh]
        w-(--problem-panel-w,100vw)
        shrink-0
        items-center
        overflow-hidden
      "
    >
      <div
        aria-hidden="true"
        data-problem-ghost
        className="
          pointer-events-none
          absolute
          end-[3vw]
          top-[8vh]
          select-none
          font-mono
          text-[clamp(5rem,15vw,14rem)]
          font-medium
          leading-none
          tracking-[-0.09em]
          text-s-high-soft
          opacity-30
          md:opacity-100
        "
      >
        {item.number}
      </div>
      <Container className="relative z-10 w-full">
        <div
          className="
            mx-auto
            flex
            h-full
            max-h-[82vh]
            w-full
            max-w-296
            flex-col
            justify-center
            [--problem-offset:0px]
            md:min-h-[68svh]
            md:[--problem-offset:10%]
            lg:[--problem-offset:24%]
            xl:[--problem-offset:30%]
          "
        >
          <div data-problem-copy>
            <div
              data-problem-eyebrow
              className="mb-4 flex items-center gap-3 md:mb-6"
            >
              <span
                aria-hidden="true"
                className="h-px w-8 bg-local-accent/70 md:w-10"
              />
              <Eyebrow>{t("trackPitch")}</Eyebrow>
            </div>
            {/* النص مخفي للـ Screen Readers فقط لتجنب تقطيع الكلمات المزعج */}
            <p
              className="
                max-w-[24ch]
                text-[clamp(3rem,min(5vw,6vh),5.25rem)]
                font-medium
                leading-[1.05]
                tracking-[-0.04em]
              "
            >
              <span className="sr-only">{item.pitch}</span>
              <span aria-hidden="true">
                <Highlight>
                  {splitWords(item.pitch, "pitch")}
                </Highlight>
              </span>
            </p>
          </div>
          <div
            data-problem-response
            className="
              mt-8
              ms-(--problem-offset)
              md:mt-14
            "
          >
            <div
              data-problem-delivery-eyebrow
              className="mb-3 md:mb-5"
            >
              <Eyebrow tone="accent">
                {t("trackDelivery")}
              </Eyebrow>
            </div>
            <h3
              className="
                max-w-[15ch]
                text-[clamp(4rem,min(7vw,9.4vh),7.5rem)]
                font-medium
                leading-[0.94]
                tracking-[-0.055em]
                text-foreground
              "
            >
              <span className="sr-only">{item.delivery}</span>
              <span aria-hidden="true">
                {splitWords(item.delivery, "delivery")}
              </span>
            </h3>
            <div
              data-problem-evidence
              className="
                mt-5
                flex
                max-w-152
                items-start
                gap-3
                text-sm
                leading-[1.7]
                text-muted-foreground
                md:mt-9
                md:text-base
              "
            >
              <span
                aria-hidden="true"
                className="
                  mt-[0.65em]
                  h-1
                  w-1
                  shrink-0
                  rounded-full
                  bg-local-accent/60
                "
              />
              <p>{item.evidence}</p>
            </div>
            <div
              data-problem-number
              className="
                mt-5
                font-mono
                text-sm
                uppercase
                tracking-[0.16em]
                text-muted-foreground/45
                md:mt-7
              "
            >
              / {String(index + 1).padStart(2, "0")}
            </div>
          </div>
        </div>
      </Container>
    </article>
  );
}

export const ProblemSection = memo(function ProblemSection() {
  const t = useTranslations("problem");

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const bodyRef = useSectionDescription();
  const closingRef = useSectionElement();

  const items = t.raw("items") as ProblemItem[];

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const track = trackRef.current;

    if (!section || !stage || !track || items.length <= 1) {
      return;
    }

    const syncPanelWidth = () => {
      section.style.setProperty(
        "--problem-panel-w",
        `${stage.clientWidth}px`,
      );
    };

    syncPanelWidth();
    ScrollTrigger.addEventListener("refreshInit", syncPanelWidth);

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>(
        "[data-problem-panel]",
      );

      const direction =
        document.documentElement.dir === "rtl" ? 1 : -1;

      const total = panels.length - 1;
      const travel = (100 * total) / panels.length;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduced) {
        gsap.set(panels, {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
        });
        return;
      }

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: () =>
            `+=${Math.max(
              window.innerHeight * 1.15 * panels.length,
              window.innerWidth * 0.85 * panels.length,
            )}`,
          pin: true,
          scrub: MOTION.scroll.scrub.pin,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      timeline.fromTo(
        track,
        {
          xPercent: 0,
        },
        {
          xPercent: direction * travel,
          duration: total,
          ease: "none",
        },
        0,
      );
      const progress = section.querySelector<HTMLElement>(
        "[data-problem-progress]",
      );

      const progressNode = section.querySelector<HTMLElement>(
        "[data-problem-progress-node]",
      );

      const counter = section.querySelector<HTMLElement>(
        "[data-problem-counter]",
      );

      if (progress) {
        timeline.fromTo(
          progress,
          {
            scaleX: 0,
            transformOrigin:
              direction === 1 ? "right center" : "left center",
          },
          {
            scaleX: 1,
            duration: total,
            ease: "none",
          },
          0,
        );
      }

      if (progressNode) {
        timeline.fromTo(
          progressNode,
          { xPercent: 0 },
          {
            xPercent: -direction * 100,
            duration: total,
            ease: "none",
          },
          0,
        );
      }

      if (counter) {
        const cursor = { value: 0 };

        timeline.to(
          cursor,
          {
            value: total,
            duration: total,
            ease: "none",
            onUpdate: () => {
              const label = String(
                Math.min(
                  panels.length,
                  Math.round(cursor.value) + 1,
                ),
              ).padStart(2, "0");

              if (counter.textContent !== label) {
                counter.textContent = label;
              }
            },
          },
          0,
        );
      }

      panels.forEach((panel, index) => {
        const pitchWords = panel.querySelectorAll<HTMLElement>(
          '[data-problem-word="pitch"]',
        );

        const deliveryWords =
          panel.querySelectorAll<HTMLElement>(
            '[data-problem-word="delivery"]',
          );

        const ghost = panel.querySelector<HTMLElement>(
          "[data-problem-ghost]",
        );

        const pitchEyebrow = panel.querySelector<HTMLElement>(
          "[data-problem-eyebrow]",
        );

        const deliveryEyebrow =
          panel.querySelector<HTMLElement>(
            "[data-problem-delivery-eyebrow]",
          );

        const evidence = panel.querySelector<HTMLElement>(
          "[data-problem-evidence]",
        );

        const number = panel.querySelector<HTMLElement>(
          "[data-problem-number]",
        );
        if (index < total) {
          timeline.to(
            panel,
            {
              opacity: RECESSED_OPACITY,
              scale: RECESSED_SCALE,
              filter: `blur(${RECESSED_BLUR}px)`,
              duration: 0.35,
              ease: MOTION.ease.ui,
            },
            index + 0.34,
          );
        }
        if (index === 0) {
          gsap.set(panel, {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            transformOrigin: "center center",
          });

          gsap.set([pitchWords, deliveryWords], {
            yPercent: 0,
            x: 0,
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
          });

          gsap.set(
            [
              ghost,
              pitchEyebrow,
              deliveryEyebrow,
              evidence,
              number,
            ],
            { y: 0, opacity: 1 },
          );

          return;
        }
        gsap.set(panel, {
          opacity: RECESSED_OPACITY,
          scale: RECESSED_SCALE,
          filter: `blur(${ENTERING_BLUR}px)`,
          transformOrigin: "center center",
        });
        gsap.set(pitchWords, {
          yPercent: 110,
          opacity: 0,
          filter: "blur(8px)",
        });
        gsap.set(deliveryWords, {
          x: -direction * MOTION.distance.body,
          y: MOTION.distance.sm,
          opacity: 0,
          filter: "blur(10px)",
        });

        gsap.set(ghost, { y: MOTION.distance.md, opacity: 0 });
        gsap.set(pitchEyebrow, { y: MOTION.distance.body, opacity: 0 });
        gsap.set(deliveryEyebrow, { y: MOTION.distance.body, opacity: 0 });
        gsap.set(evidence, { y: MOTION.distance.md, opacity: 0 });
        gsap.set(number, { y: MOTION.distance.sm, opacity: 0 });
        const enter = index - 0.8;
        timeline
          .to(
            panel,
            {
              opacity: 1,
              scale: 1,
              filter: "blur(0px)",
              duration: 0.34,
              ease: MOTION.ease.strong,
            },
            enter,
          )
          .to(
            ghost,
            {
              y: 0,
              opacity: 1,
              duration: 0.3,
              ease: MOTION.ease.smooth,
            },
            enter + 0.02,
          )
          /* 1 — the claim */
          .to(
            pitchEyebrow,
            {
              y: 0,
              opacity: 1,
              duration: 0.28,
              ease: MOTION.ease.strong,
            },
            enter + 0.03,
          )
          .to(
            pitchWords,
            {
              yPercent: 0,
              opacity: 1,
              filter: "blur(0px)",
              duration: 0.38,
              ease: MOTION.ease.text,
              stagger: { amount: 0.16, from: "start" },
            },
            enter + 0.06,
          )
          /* 2 — what you actually own */
          .to(
            deliveryEyebrow,
            {
              y: 0,
              opacity: 1,
              duration: 0.22,
              ease: MOTION.ease.strong,
            },
            enter + 0.34,
          )
          .to(
            deliveryWords,
            {
              x: 0,
              y: 0,
              opacity: 1,
              filter: "blur(0px)",
              duration: 0.44,
              ease: MOTION.ease.text,
              stagger: { amount: 0.18, from: "start" },
            },
            enter + 0.38,
          )
          /* 3 — the receipt */
          /* 5 — the receipt */
          .to(
            evidence,
            {
              y: 0,
              opacity: 1,
              duration: 0.22,
              ease: MOTION.ease.smooth,
            },
            enter + 0.66,
          )
          .to(
            number,
            {
              y: 0,
              opacity: 1,
              duration: 0.18,
              ease: MOTION.ease.smooth,
            },
            enter + 0.74,
          );
      });
    }, section);

    return () => {
      ScrollTrigger.removeEventListener("refreshInit", syncPanelWidth);
      ctx.revert();
    };
  }, [items.length]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;

    if (!section || !stage) return;

    const ctx = gsap.context(() => {
      const revealElements = gsap.utils.toArray<HTMLElement>(
        "[data-problem-stage-reveal]",
      );

      gsap.fromTo(
        revealElements,
        {
          y: MOTION.distance.md,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: MOTION.duration.base,
          stagger: MOTION.stagger.loose,
          ease: MOTION.ease.strong,
          scrollTrigger: {
            trigger: stage,
            start: MOTION.trigger.late,
            once: true,
          },
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="problem-section-heading"
      className="
        accent-world-orange
        border-t
        border-border-subtle
        overflow-clip
        pb-(--section-y-bottom)
        pt-(--section-y-top)
      "
    >
      <Container>
        <div data-problem-stage-reveal>
          <SectionHeading
            titleId="problem-section-heading"
            eyebrowRef={eyebrowRef}
            titleRef={titleRef}
            descriptionRef={bodyRef}
            eyebrow={t("eyebrow")}
            firstTitle={t("title")}
            secondTitle={t("titleItalic")}
            description={t("subtitle")}
            className="mb-12 md:mb-20"
          />
        </div>
      </Container>
      <div
        ref={stageRef}
        className="
          relative
          h-[100svh]
          w-full
          overflow-hidden
        "
      >
        <div
          aria-hidden="true"
          data-problem-stage-reveal
          className="
            pointer-events-none
            absolute
            bottom-6
            start-6
            end-6
            z-30
            md:bottom-8
            md:start-10
            md:end-10
            lg:start-14
            lg:end-14
          "
        >
          <div
            className="
              mb-3
              flex
              items-baseline
              justify-between
              font-mono
              text-[0.65rem]
              uppercase
              tracking-[0.18em]
              text-muted-foreground/50
            "
          >
            <span>
              <span
                data-problem-counter
                className="text-local-accent-text"
              >
                01
              </span>{" "}
              / {String(items.length).padStart(2, "0")}
            </span>
            <span>{t("eyebrow")}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              data-problem-progress
              className="
                h-full
                w-full
                origin-left
                bg-local-accent
              "
            />
          </div>
          <div
            data-problem-progress-node
            className="
              absolute
              inset-x-0
              bottom-0.5
              h-0
              will-change-transform
            "
          >
            <span
              className="
                absolute
                start-0
                bottom-0
                block
                size-3
                ring-4
                ring-background
                -translate-x-1/2
                translate-y-1/2
                rounded-full
                bg-local-accent
                rtl:translate-x-1/2
              "
            />
          </div>
        </div>
        <div
          ref={trackRef}
          className="
            flex
            h-full
            w-max
            will-change-transform
          "
        >
          {items.map((item, index) => (
            <ProblemPanel
              key={item.number}
              item={item}
              index={index}
            />
          ))}
        </div>
      </div>
      <Container>
        <div
          ref={closingRef}
          className="
            mt-0
            border-t
            border-border-subtle
            pt-10
            md:pt-16
          "
        >
          <div className="grid grid-cols-1 md:grid-cols-[7rem_minmax(0,1fr)] md:gap-x-14">
            <div
              aria-hidden="true"
              className="hidden pt-4 md:block"
            >
              <div className="h-px w-10 bg-local-accent" />
            </div>
            <p
              className="
                max-w-[28ch]
                text-[clamp(1.75rem,4vw,3.5rem)]
                leading-[1.05]
                tracking-[-0.045em]
                text-foreground
              "
            >
              {t("closingPre")}{" "}
              <Highlight>
                {t("closingHighlight")}
              </Highlight>
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
});