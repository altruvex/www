"use client";

import { Num } from "@/components/ui/num";
import { Container } from "@/components/shared/container";
import { Dim, Highlight, Strong } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  MOTION,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { SectionHeading } from "./section-heading";

const LAYER_IDS = [
  "interface",
  "components",
  "application",
  "data",
  "infrastructure",
] as const;

const LAYER_TINTS: readonly string[] = [
  "bg-local-accent/[0.015]",
  "bg-local-accent/[0.03]",
  "bg-local-accent/[0.045]",
  "bg-local-accent/[0.06]",
  "bg-local-accent/[0.07]",
];

const LAYER_EDGES: readonly string[] = [
  "bg-local-accent/25",
  "bg-local-accent/40",
  "bg-local-accent/55",
  "bg-local-accent/70",
  "bg-local-accent/90",
];

export function OwnershipStackSection() {
  const t = useTranslations("ownershipStack");

  const sectionRef = useRef<HTMLElement>(null);
  const specimenRef = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription();

  useEffect(() => {
    const root = specimenRef.current;
    const section = sectionRef.current;
    if (!root || !section || animated.current) return;

    const strata = root.querySelectorAll<HTMLElement>("[data-stratum]");

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { reduced } = context.conditions as { reduced: boolean };

          if (reduced) {
            gsap.set(strata, { opacity: 1, y: 0 });
            return;
          }

          gsap.set(strata, { opacity: 0, y: 14 });

          ScrollTrigger.create({
            trigger: section,
            start: "top 72%",
            once: true,
            onEnter: () => {
              animated.current = true;
              const tl = gsap.timeline({
                defaults: { ease: MOTION.ease.smooth },
              });
              tl.to(strata, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                stagger: { each: 0.09, from: "end" },
              });
            },
          });
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="ownership-stack"
      aria-labelledby="ownership-stack-heading"
      className="accent-world-blue border-t border-border pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="ownership-stack-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleAccent")}
          accent="iris"
          description={t("subtitle")}
          className="mb-12 lg:mb-16"
        />

        {/* The argument, stated once. */}
        <div className="mb-12 max-w-[62ch] lg:mb-14">
          <Eyebrow className="mb-3">{t("intro.eyebrow")}</Eyebrow>
          <p className="text-[clamp(1.125rem,1.5vw,1.375rem)] leading-[1.5] text-foreground">
            <Dim>{t("intro.dismissed")}</Dim> {t("intro.answerLead")}{" "}
            <Strong>{t("intro.answerStrong")}</Strong>
          </p>
        </div>

        <div ref={specimenRef}>
          {/* Axis top — surface. The ruler it labels is the strata's leading
              edge, so the two can never fall out of alignment. */}
          <div className="mb-2 flex items-center gap-3">
            <Eyebrow className="text-[11px]">{t("axis.surface")}</Eyebrow>
            <span aria-hidden className="h-px flex-1 bg-border" />
            <Eyebrow className="text-[11px]">{t("legend.template")}</Eyebrow>
          </div>

          <ol className="list-none overflow-hidden rounded-lg border border-border">
            {LAYER_IDS.map((id, i) => (
              <li
                key={id}
                data-stratum
                className={cn(
                  "relative border-b border-border ps-8 pe-5 py-6 last:border-b-0 sm:pe-7 sm:py-7",
                  LAYER_TINTS[i],
                )}
              >
                {/* Ruler segment: this stratum's leading edge. Together the
                      five segments are the depth scale, densest at the base. */}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-y-0 inset-s-0 w-[3px]",
                    LAYER_EDGES[i],
                  )}
                />

                {/* The cut line: a mark on the object, not a second layout.
                      Everything below it is what a template never delivers. */}
                {i === 1 ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 border-t-2 border-dashed border-local-accent/45"
                  />
                ) : null}

                <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span
                        aria-hidden
                        className="shrink-0 text-sm tabular-nums text-local-accent-text ltr:font-mono"
                      >
                        <Num value={i + 1} pad={2} />
                      </span>
                      <h3 className="font-sans text-[clamp(1.125rem,1.6vw,1.375rem)] font-medium leading-tight text-foreground">
                        {t(`layers.${id}.name`)}
                      </h3>
                      {/* dir="auto": a spec value like "≤1s LCP" is Latin even
                            on an Arabic page - without it the bidi algorithm
                            moves the ≤. */}
                      <span
                        dir="auto"
                        className="ms-auto shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] leading-normal tracking-[0.06em] text-muted-foreground ltr:font-mono"
                      >
                        {t(`layers.${id}.tag`)}
                      </span>
                    </div>
                    <p className="mt-2 ps-8 text-sm leading-snug text-muted-foreground">
                      {t(`layers.${id}.spec`)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
                      {t(`layers.${id}.detail`)}
                    </p>
                    <p className="mt-4 border-s-2 border-local-accent/40 ps-4 text-sm leading-relaxed text-foreground">
                      <span className="eyebrow block text-[11px] text-local-accent-text">
                        {t("ownershipLabel")}
                      </span>
                      {t(`layers.${id}.ownership`)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Eyebrow className="text-[11px]">{t("axis.foundation")}</Eyebrow>
            <span aria-hidden className="h-px min-w-8 flex-1 bg-border" />
            <span
              aria-hidden
              className="h-0 w-8 shrink-0 border-t-2 border-dashed border-local-accent/45"
            />
            <p className="text-sm leading-snug text-muted-foreground">
              {t("templateStops")} — <Strong>{t("legend.altruvex")}</Strong>
            </p>
          </div>
        </div>

        <div className="mt-14 flex items-center gap-5 border-t border-border pt-8">
          <p className="max-w-[46ch] text-[clamp(1.25rem,1.9vw,1.5rem)] leading-snug text-foreground">
            <Highlight>{t("closing")}</Highlight>
          </p>
          <span aria-hidden className="hidden h-px flex-1 bg-border sm:block" />
        </div>
      </Container>
    </section>
  );
}
