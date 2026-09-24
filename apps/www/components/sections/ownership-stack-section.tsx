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

const separation = () =>
  gsap.utils.clamp(12, 26, Math.round(window.innerHeight * 0.022));

const lateralStep = (lateral: boolean) =>
  lateral ? gsap.utils.clamp(7, 14, Math.round(window.innerWidth * 0.009)) : 0;

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
    if (!root || !section) return;

    const strata = gsap.utils.toArray<HTMLElement>(
      root.querySelectorAll("[data-stratum]"),
    );
    const base = root.querySelector<HTMLElement>("[data-specimen-base]");

    const rtl = document.documentElement.dir === "rtl";
    const dir = rtl ? -1 : 1;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!animated.current) {
          gsap.set(strata, { opacity: 0, yPercent: 1.6 });

          ScrollTrigger.create({
            trigger: section,
            start: MOTION.trigger.latest,
            once: true,
            onEnter: () => {
              animated.current = true;
              gsap.to(strata, {
                opacity: 1,
                yPercent: 0,
                duration: MOTION.duration.base,
                ease: MOTION.ease.smooth,
                stagger: { each: MOTION.stagger.loose, from: "end" },
              });
            },
          });
        }
      });

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
          lateral: "(min-width: 1024px)",
        },
        (context) => {
          const { lateral, reduced } = context.conditions as {
            lateral: boolean;
            reduced: boolean;
          };

          if (reduced) {
            gsap.set(strata, { opacity: 1, yPercent: 0, x: 0, y: 0, scale: 1 });
            gsap.set(root.querySelectorAll("[data-seam]"), {
              scaleX: 1,
              opacity: 1,
            });
            strata.forEach((slab) => {
              slab.dataset.resolved = "true";
            });
            return;
          }

          const originX = rtl ? "right center" : "left center";

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root,
              start: MOTION.trigger.late,
              end: "bottom 30%",
              scrub: MOTION.scroll.scrub.stage,
              invalidateOnRefresh: true,
            },
          });

          strata.forEach((slab, index) => {
            timeline.to(
              slab,
              {
                y: () => (index - 2) * separation(),
                x: () => dir * (index - 2) * lateralStep(lateral),
                duration: 0.4,
              },
              0,
            );

            timeline.to(
              slab,
              {
                y: 0,
                x: 0,
                duration: 0.22,
                ease: MOTION.ease.gentle,
              },
              0.78,
            );

            const seam = slab.querySelector<HTMLElement>("[data-seam]");
            if (!seam) return;

            const at = 0.06 * index;

            gsap.set(seam, { transformOrigin: originX, scaleX: 0 });

            timeline
              .to(seam, { scaleX: 1, duration: 0.2 }, at)
              .to(seam, { scaleX: 0, duration: 0.14 }, 0.84);
          });

          if (base) {
            timeline
              .to(
                base,
                { y: () => 2 * separation(), duration: 0.4 },
                0,
              )
              .to(
                base,
                { y: 0, duration: 0.22, ease: MOTION.ease.gentle },
                0.78,
              );
          }

          strata.forEach((slab) => {
            slab.dataset.resolved = "false";
          });

          const heads = strata.map((slab) =>
            ScrollTrigger.create({
              trigger: slab,
              start: MOTION.trigger.inView,
              end: "bottom 42%",
              onToggle: (self) => {
                slab.dataset.resolved = String(self.isActive);
                gsap.to(slab, {
                  scale: self.isActive ? 1.006 : 1,
                  duration: 0.35,
                  ease: MOTION.ease.ui,
                });
              },
            }),
          );

          return () => {
            heads.forEach((head) => head.kill());
            strata.forEach((slab) => {
              slab.dataset.resolved = "true";
            });
          };
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
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
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
          accent="world"
          description={t("subtitle")}
          className="mb-12 lg:mb-16"
        />
        <div className="mb-12 max-w-[62ch] lg:mb-14">
          <Eyebrow className="mb-3">{t("intro.eyebrow")}</Eyebrow>
          <p className="text-[clamp(1.125rem,1.5vw,1.375rem)] leading-normal text-foreground">
            <Dim>{t("intro.dismissed")}</Dim> {t("intro.answerLead")}{" "}
            <Strong>{t("intro.answerStrong")}</Strong>
          </p>
        </div>
        <div ref={specimenRef} data-specimen className="pb-14">
          <div className="mb-14 flex items-center gap-3">
            <Eyebrow className="text-micro">{t("axis.surface")}</Eyebrow>
            <span aria-hidden className="h-px flex-1 bg-border-subtle" />
            <Eyebrow className="text-micro">{t("legend.template")}</Eyebrow>
          </div>
          <ol className="list-none">
            {LAYER_IDS.map((id, i) => (
              <li
                key={id}
                data-stratum
                data-resolved="true"
                className={cn(
                  "group/slab relative border border-border-subtle px-6 py-6 sm:px-7 sm:py-7",
                  i > 0 && "-mt-px",
                  i === 0 && "rounded-t-panel-sm",
                  i === LAYER_IDS.length - 1 && "rounded-b-panel-sm",
                  "transition-colors duration-(--motion-drawer) ease-smooth",
                  "data-[resolved=true]:z-10 data-[resolved=true]:border-local-accent/35",
                  LAYER_TINTS[i],
                )}
              >
                <span
                  data-seam
                  aria-hidden
                  className="
                    pointer-events-none absolute inset-x-0 -top-px origin-[left_center] rtl:origin-[right_center]"
                />
                <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span
                        aria-hidden
                        className="shrink-0 text-sm tabular-nums text-muted-foreground transition-colors duration-(--motion-drawer) ease-smooth group-data-[resolved=true]/slab:text-local-accent-text ltr:font-mono"
                      >
                        <Num value={i + 1} pad={2} />
                      </span>
                      <h3 className="font-sans text-[clamp(1.125rem,1.6vw,1.375rem)] font-medium leading-tight text-foreground">
                        {t(`layers.${id}.name`)}
                      </h3>
                      <span
                        dir="auto"
                        className="ms-auto shrink-0 rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-micro leading-normal tracking-[0.06em] text-muted-foreground ltr:font-mono"
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
                    <p className="mt-4 border-t border-local-accent/30 pt-3 text-sm leading-relaxed text-foreground transition-colors duration-(--motion-drawer) ease-smooth group-data-[resolved=true]/slab:border-local-accent/70">
                      <span className="eyebrow mb-1 block text-micro text-local-accent-text">
                        {t("ownershipLabel")}
                      </span>
                      {t(`layers.${id}.ownership`)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div
            data-specimen-base
            className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2"
          >
            <Eyebrow className="text-micro">{t("axis.foundation")}</Eyebrow>
            <span aria-hidden className="h-px min-w-8 flex-1 bg-border-subtle" />
            <span
              aria-hidden
              className="h-0 w-8 shrink-0 border-t-2 border-dashed border-local-accent/45"
            />
            <p className="text-sm leading-snug text-muted-foreground">
              {t("templateStops")} — <Strong>{t("legend.altruvex")}</Strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 border-t border-border-subtle pt-8">
          <p className="max-w-[46ch] text-[clamp(1.25rem,1.9vw,1.5rem)] leading-snug text-foreground">
            <Highlight>{t("closing")}</Highlight>
          </p>
          <span aria-hidden className="hidden h-px flex-1 bg-border-subtle sm:block" />
        </div>
      </Container>
    </section>
  );
}
