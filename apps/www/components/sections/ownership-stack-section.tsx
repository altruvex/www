"use client";

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
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { SectionHeading } from "./section-heading";

const LAYER_IDS = [
  "interface",
  "components",
  "application",
  "data",
  "infrastructure",
] as const;

type LayerId = (typeof LAYER_IDS)[number];

/**
 * The stack stands on its base: the surface layer is the narrowest slab, each
 * layer beneath it wider, infrastructure full-width. End-margins, so the
 * staircase mirrors in RTL on its own.
 */
const LAYER_INSETS: readonly string[] = [
  "lg:me-24",
  "lg:me-18",
  "lg:me-12",
  "lg:me-6",
  "lg:me-0",
];

/** One detail region, driven by five buttons (aria-controls / aria-expanded). */
const PANEL_ID = "ownership-layer-detail";
const PANEL_HEADING_ID = "ownership-layer-detail-name";

export function OwnershipStackSection() {
  const t = useTranslations("ownershipStack");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const sectionRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription();

  // A layer is always selected: the panel is the single source of layer detail
  // at every breakpoint (beside the stack on lg, beneath it below that), so
  // there is no idle empty state and no second copy of the text in the DOM.
  const [activeId, setActiveId] = useState<LayerId>(LAYER_IDS[0]);
  const [detailKey, setDetailKey] = useState(0);

  const select = useCallback((id: LayerId) => {
    setActiveId((prev) => {
      if (prev !== id) setDetailKey((k) => k + 1);
      return id;
    });
  }, []);

  const activeIndex = LAYER_IDS.indexOf(activeId);

  useEffect(() => {
    const root = stackRef.current;
    const section = sectionRef.current;
    if (!root || !section || animated.current) return;

    const rows = root.querySelectorAll<HTMLElement>("[data-layer]");
    const spine = root.querySelector<HTMLElement>("[data-spine]");
    const seam = root.querySelector<HTMLElement>("[data-seam]");

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
            gsap.set([...rows, spine, seam].filter(Boolean), { opacity: 1 });
            return;
          }

          gsap.set(rows, { opacity: 0, y: 14 });
          if (spine) gsap.set(spine, { scaleY: 0, transformOrigin: "top center", opacity: 1 });
          if (seam) gsap.set(seam, { opacity: 0 });

          ScrollTrigger.create({
            trigger: section,
            start: "top 72%",
            once: true,
            onEnter: () => {
              animated.current = true;
              const tl = gsap.timeline({
                defaults: { ease: MOTION.ease.smooth },
              });
              // Bottom-up: the foundation lands first, the surface last.
              tl.to(rows, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                stagger: { each: 0.09, from: "end" },
              });
              if (spine) {
                tl.to(
                  spine,
                  { scaleY: 1, duration: 0.7, ease: MOTION.ease.strong },
                  0.1,
                );
              }
              if (seam) {
                tl.to(seam, { opacity: 1, duration: 0.4 }, "-=0.2");
              }
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

        {/* The argument, once - it used to be duplicated between a mobile
            paragraph and the desktop panel's idle state. */}
        <div className="mb-12 max-w-[62ch] lg:mb-16">
          <Eyebrow className="mb-3">{t("intro.eyebrow")}</Eyebrow>
          <p className="text-[clamp(1.125rem,1.5vw,1.375rem)] leading-[1.5] text-foreground">
            <Dim>{t("intro.dismissed")}</Dim> {t("intro.answerLead")}{" "}
            <Strong>{t("intro.answerStrong")}</Strong>
          </p>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-14">
          <div ref={stackRef} className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-4 rounded-2xl"
              style={{
                backgroundImage:
                  "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
                backgroundSize: "26px 26px",
                opacity: 0.04,
              }}
            />
            {/* Depth axis runs with the stack, not across it: surface on top,
                foundation at the bottom, the spine connecting them. */}
            <p className="eyebrow mb-3 text-[11px] text-muted-foreground">
              {t("axis.surface")}
            </p>
            <div className="relative">
              <div
                aria-hidden
                data-spine
                className="pointer-events-none absolute inset-y-0 w-px bg-local-accent/45"
                style={isRtl ? { right: "-14px" } : { left: "-14px" }}
              >
                <span className="absolute -top-1 inset-s-[-3px] h-[7px] w-[7px] rounded-full bg-local-accent" />
                <span className="absolute -bottom-1 inset-s-[-3px] h-[7px] w-[7px] rounded-full bg-local-accent" />
              </div>
              <ol className="flex list-none flex-col gap-2">
                {LAYER_IDS.map((id, i) => {
                  const isActive = id === activeId;
                  return (
                    <li key={id} data-layer className={cn("relative", LAYER_INSETS[i])}>
                      <span
                        aria-hidden
                        className="pointer-events-none absolute top-7 inset-s-[-14px] hidden h-px w-[14px] bg-local-accent transition-opacity duration-200 ease-smooth lg:block"
                        style={{ opacity: isActive ? 1 : 0 }}
                      />
                      <div
                        className={cn(
                          "rounded-lg border transition-[border-color,background-color,opacity] duration-200 ease-smooth",
                          isActive
                            ? "border-local-accent bg-local-accent-soft"
                            : "border-border bg-card hover:border-border-mid",
                        )}
                      >
                        <button
                          type="button"
                          aria-expanded={isActive}
                          aria-controls={PANEL_ID}
                          onMouseEnter={() => select(id)}
                          onFocus={() => select(id)}
                          onClick={() => select(id)}
                          className="group flex w-full items-center gap-4 rounded-lg px-4 py-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:gap-5 sm:px-5"
                        >
                          <span
                            aria-hidden
                            className="h-9 w-[3px] shrink-0 rounded-full bg-local-accent transition-opacity duration-200"
                            style={{ opacity: isActive ? 0.85 : 0 }}
                          />
                          <span
                            aria-hidden
                            className={cn(
                              "w-7 shrink-0 text-sm tabular-nums transition-colors duration-200 ltr:font-mono",
                              isActive ? "text-local-accent-text" : "text-muted-foreground",
                            )}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-sans text-lg font-medium leading-tight text-foreground">
                              {t(`layers.${id}.name`)}
                            </span>
                            <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                              {t(`layers.${id}.spec`)}
                            </span>
                          </span>
                          {/* Spec values, not labels: mono for the engineering
                              signal, but never case-transformed - "≤1s LCP" is
                              a unit, and caps would rewrite it. */}
                          <span
                            dir="auto"
                            className="hidden shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] leading-normal tracking-[0.06em] text-muted-foreground ltr:font-mono sm:inline-block"
                          >
                            {t(`layers.${id}.tag`)}
                          </span>
                        </button>
                      </div>
                      {i === 0 && (
                        <div
                          data-seam
                          className="flex items-center gap-3 pt-3 pb-1"
                        >
                          <span
                            aria-hidden
                            className="h-0 flex-1 border-t border-dashed border-border-mid"
                          />
                          {/* The section's argument, so it carries weight:
                              accent chip, not a 10px grey caption. */}
                          <span className="eyebrow shrink-0 rounded-full border border-local-accent/30 bg-local-accent-soft px-3 py-1 text-[11px] text-local-accent-text">
                            {t("templateStops")}
                          </span>
                          <span
                            aria-hidden
                            className="hidden h-0 w-8 border-t border-dashed border-border-mid sm:block"
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
            <p className="eyebrow mt-3 text-[11px] text-muted-foreground">
              {t("axis.foundation")}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
              <span className="eyebrow flex items-center gap-2 text-[11px]">
                <span aria-hidden className="h-2 w-2 rounded-full border border-border-mid" />
                {t("legend.template")}
              </span>
              <span className="eyebrow flex items-center gap-2 text-[11px]">
                <span aria-hidden className="h-2 w-2 rounded-full bg-local-accent" />
                {t("legend.altruvex")}
              </span>
            </div>
          </div>

          <div
            id={PANEL_ID}
            role="region"
            aria-labelledby={PANEL_HEADING_ID}
            className="relative min-h-64 rounded-2xl border border-local-accent/25 bg-surface p-6 sm:p-8 lg:sticky lg:top-28"
          >
            {/* Depth pips: which layer the panel is showing, without color as
                the only cue - the pip's position is the signal. */}
            <div
              aria-hidden
              className="absolute inset-e-6 top-1/2 hidden -translate-y-1/2 flex-col gap-1.5 sm:flex"
            >
              {LAYER_IDS.map((id) => (
                <span
                  key={id}
                  className={cn(
                    "h-4 w-1 rounded-full transition-colors duration-200",
                    id === activeId ? "bg-local-accent" : "bg-border-mid",
                  )}
                />
              ))}
            </div>
            <div key={detailKey} className="flex h-full flex-col sm:pe-8">
              <div className="mb-4 flex items-center gap-3">
                <span aria-hidden className="text-sm tabular-nums text-local-accent-text ltr:font-mono">
                  {String(activeIndex + 1).padStart(2, "0")}
                </span>
                <h3
                  id={PANEL_HEADING_ID}
                  className="font-sans text-xl font-medium leading-tight text-foreground"
                >
                  {t(`layers.${activeId}.name`)}
                </h3>
                {/* dir="auto": a spec value like "≤1s LCP" is Latin even in an
                    Arabic page - without it the bidi algorithm moves the ≤. */}
                <span
                  dir="auto"
                  className="ms-auto shrink-0 rounded-full border border-local-accent/25 px-2.5 py-1 text-[11px] leading-normal tracking-[0.06em] text-local-accent-text ltr:font-mono"
                >
                  {t(`layers.${activeId}.tag`)}
                </span>
              </div>
              <p
                data-detail-body
                className="text-base leading-relaxed text-muted-foreground"
              >
                {t(`layers.${activeId}.detail`)}
              </p>
              <p
                data-detail-body
                className="mt-auto pt-6 text-sm leading-relaxed text-foreground"
              >
                <span className="eyebrow text-[11px] text-local-accent-text">
                  {t("ownershipLabel")}
                </span>
                <br />
                {t(`layers.${activeId}.ownership`)}
              </p>
            </div>
            <p className="eyebrow mt-6 text-[11px] text-muted-foreground pointer-coarse:hidden">
              {t("intro.hint")}
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
      <style>{`
        [data-detail-body] {
          animation: ownDetailIn 0.24s cubic-bezier(0.2, 0, 0, 1) both;
        }
        [data-detail-body]:last-of-type {
          animation-delay: 0.04s;
        }
        @keyframes ownDetailIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          #ownership-stack [data-layer],
          #ownership-stack [data-spine],
          #ownership-stack [data-seam],
          #ownership-stack [data-detail-body] {
            opacity: 1 !important;
            transform: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
