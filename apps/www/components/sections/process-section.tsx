"use client";

import { useLoading } from "@/components/providers/loading-provider";
import { Num } from "@/components/ui/num";
import { Container } from "@/components/shared/container";
import { bodyMarks } from "@/components/ui/rich-text";
import { SurfaceCard } from "@repo/ui";
import {
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { getConstrainedDevice } from "@/lib/motion/config";
import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap, ScrollTrigger } from "@/lib/utils/gsap";
import { splitHeadline } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { memo, useRef } from "react";
import { SectionHeading } from "./section-heading";

const STEPS = [
  { key: "step1", pct: "8.5%" },
  { key: "step2", pct: "11.9%" },
  { key: "step3", pct: "71.1%" },
  { key: "step4", pct: "8.5%" },
] as const;

const BUILD_SEQUENCE = [
  "buildSequence.implementation",
  "buildSequence.integration",
  "buildSequence.validation",
  "buildSequence.refinement",
] as const;

// Each stuck card rests a little lower than the one before it, so a sliver of
// every prior card stays visible above the next - the "peek" that reads as a
// physical stack instead of a hard cut.
const STACK_TOP_BASE = 96;
const STACK_TOP_STEP = 24;

export const ProcessSection = memo(function ProcessSection() {
  const t = useTranslations("process");
  const { isInitialLoadComplete } = useLoading();

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const subtitleRef = useSectionDescription<HTMLParagraphElement>();
  const footerRef = useSectionElement();
  const stackRef = useRef<HTMLOListElement>(null);

  useIsomorphicLayoutEffect(() => {
    const stack = stackRef.current;
    if (!stack || !isInitialLoadComplete) return;

    const cards = Array.from(
      stack.querySelectorAll<HTMLElement>("[data-stack-card]"),
    );
    if (cards.length < 2) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 1024px)",
        () => {
          if (getConstrainedDevice()) return;

          // Depth-proportional rest scale: the card at the bottom of the stack
          // ends smallest, each one above it slightly larger. A single shared
          // scale makes four cards read as four identical shrinks rather than
          // as one deck receding.
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
              "[data-stack-surface]",
            );
            const veil = card.querySelector<HTMLElement>("[data-stack-veil]");
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
              scrub: 0.3,
              invalidateOnRefresh: true,
              animation: tl,
            });
          });
        },
      );
    }, stack);

    return () => ctx.revert();
  }, [isInitialLoadComplete]);

  return (
    <section
      id="process"
      aria-labelledby="process-heading"
      className="pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="process-heading"
          theme="surface"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={subtitleRef}
          eyebrow={t("eyebrow")}
          firstTitle={splitHeadline(t("title")).first}
          secondTitle={splitHeadline(t("title")).second}
          description={t.rich("subtitle", bodyMarks)}
          className="mb-14 lg:mb-24"
        />
        <ol ref={stackRef} className="flex list-none flex-col gap-4 lg:gap-6">
          {STEPS.map((step, index) => (
            <li
              key={step.key}
              data-stack-card
              className="group lg:sticky"
              style={{
                top: STACK_TOP_BASE + index * STACK_TOP_STEP,
                zIndex: index + 1,
              }}
            >
              <div data-stack-surface>
                <SurfaceCard className="relative overflow-hidden rounded-lg border border-s-border-hover bg-card p-0 shadow-card-lg transition-colors duration-500 hover:border-local-accent/30 lg:shadow-2xl">
                  <div
                    data-stack-veil
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-black/45 opacity-0"
                  />
                  <div className="grid min-h-112 lg:grid-cols-12">
                    <div className="relative flex flex-col justify-between gap-10 border-b border-border/70 p-7 md:p-8 lg:col-span-3 lg:border-b-0 lg:border-e lg:p-10">
                      <div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-mono text-xs font-medium tracking-wide text-local-accent-text uppercase">
                            {t(`steps.${step.key}.tag`)}
                          </span>
                          <span className="font-mono text-xs font-medium tabular-nums text-s-mid">
                            <Num value={step.pct} />
                          </span>
                        </div>
                        <div className="mt-8 flex items-end gap-2">
                          <span className="font-outfit text-6xl font-medium leading-none tracking-[-0.06em] text-s-high md:text-7xl">
                            <Num value={index + 1} pad={2} />
                          </span>
                          <span
                            aria-hidden
                            className="mb-1.5 text-sm text-s-muted/40"
                          >
                            /
                          </span>
                        </div>
                      </div>
                      <div>
                        <div
                          aria-hidden
                          className="mb-3 h-px w-10 bg-local-accent/50"
                        />
                        <span className="block font-mono text-[10px] font-medium tracking-[0.16em] text-s-mid uppercase">
                          {t("meta.timeline")}
                        </span>
                        <p className="mt-2 text-sm leading-relaxed text-s-high">
                          {t(`steps.${step.key}.timeline`)}
                        </p>
                      </div>
                    </div>
                    <div className="relative flex flex-col p-7 md:p-10 lg:col-span-9 lg:p-12 xl:p-14">
                      <div className="max-w-3xl">
                        <h3 className="max-w-[15ch] text-[clamp(2rem,3.5vw,3.5rem)] font-medium leading-[1.02] tracking-[-0.045em] text-s-high">
                          {t(`steps.${step.key}.title`)}
                        </h3>
                        <p className="mt-7 max-w-[62ch] text-[clamp(1.0625rem,1.2vw,1.1875rem)] leading-[1.75] text-s-mid">
                          {t.rich(`steps.${step.key}.description`, bodyMarks)}
                        </p>
                      </div>
                      {index === 2 ? (
                        <div className="mt-10 lg:mt-12">
                          <BuildSequence />
                        </div>
                      ) : null}
                      <div className="mt-auto pt-12">
                        <div className="flex flex-col gap-5 border-t border-border/70 pt-6 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <span className="block font-mono text-[10px] font-medium tracking-[0.16em] text-s-mid uppercase">
                              {t("meta.deliverables") || "Output"}
                            </span>
                          </div>
                          <span className="max-w-[48ch] text-sm leading-relaxed text-s-high sm:text-end">
                            {t(`steps.${step.key}.deliverables`)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </SurfaceCard>
              </div>
            </li>
          ))}
        </ol>
        <div ref={footerRef} className="mt-16 lg:mt-20">
          <p className="max-w-[52ch] text-[clamp(1.0625rem,1.5vw,1.25rem)] text-s-high">
            {t("footer")}
          </p>
        </div>
      </Container>
    </section>
  );
});

function BuildSequence() {
  const t = useTranslations("process");

  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      {BUILD_SEQUENCE.map((key, i) => (
        <div
          key={key}
          className="flex items-baseline gap-4 text-[11px] font-medium tracking-[0.12em] uppercase ltr:font-mono"
        >
          <span className="text-s-mid tabular-nums">
            <Num value={i + 1} pad={2} />
          </span>
          <span className="text-s-high/90">{t(key)}</span>
        </div>
      ))}
    </div>
  );
}
