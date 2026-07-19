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

const LAYER_INSETS: readonly string[] = [
  "lg:me-24",
  "lg:me-18",
  "lg:me-12",
  "lg:me-6",
  "lg:me-0",
];

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

  const [activeId, setActiveId] = useState<LayerId | null>(null);
  const [detailKey, setDetailKey] = useState(0);

  const select = useCallback((id: LayerId) => {
    setActiveId((prev) => {
      if (prev !== id) setDetailKey((k) => k + 1);
      return id;
    });
  }, []);

  // Tap behavior: on touch devices the active layer collapses on a second tap
  // (accordion); with a pointer, click simply pins the hovered layer.
  const toggle = useCallback((id: LayerId) => {
    const touch = window.matchMedia("(hover: none)").matches;
    setActiveId((prev) => {
      if (prev === id) return touch ? null : prev;
      setDetailKey((k) => k + 1);
      return id;
    });
  }, []);

  const clear = useCallback(() => setActiveId(null), []);

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
          className="mb-14 lg:mb-20"
        />
        <p className="mb-10 max-w-[52ch] text-base leading-relaxed text-foreground lg:hidden">
          <Dim>{t("intro.dismissed")}</Dim> {t("intro.answerLead")}{" "}
          <Strong>{t("intro.answerStrong")}</Strong>
        </p>
        <div className="grid items-stretch gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-14">
          <div
            ref={stackRef}
            className="relative"
            onMouseLeave={clear}
          >
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
            <div
              aria-hidden
              className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-primary/60"
            >
              <span>{t("axis.surface")}</span>
              <span className="h-px flex-1 mx-3 bg-foreground/8" />
              <span>{t("axis.foundation")}</span>
            </div>
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
              <ol className="flex flex-col gap-2">
                {LAYER_IDS.map((id, i) => {
                  const isActive = id === activeId;
                  const dimmed = activeId !== null && !isActive;
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
                            : "border-foreground/10 bg-card hover:border-foreground/20",
                          dimmed && "opacity-45",
                        )}
                      >
                        <button
                          type="button"
                          aria-pressed={isActive}
                          aria-expanded={isActive}
                          onMouseEnter={() => select(id)}
                          onFocus={() => select(id)}
                          onClick={() => toggle(id)}
                          className="group flex w-full items-center gap-4 rounded-lg px-4 py-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:gap-5 sm:px-5"
                        >
                          <span
                            aria-hidden
                            className="h-9 w-[3px] shrink-0 rounded-full bg-local-accent transition-opacity duration-200"
                            style={{ opacity: isActive ? 0.85 : 0 }}
                          />
                          <span
                            className={cn(
                              "w-7 shrink-0 font-mono text-sm tabular-nums transition-colors duration-200",
                              isActive ? "text-local-accent" : "text-foreground/40",
                            )}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-sans text-lg font-medium leading-tight text-foreground">
                              {t(`layers.${id}.name`)}
                            </span>
                            <span className="mt-0.5 block truncate text-sm leading-snug text-primary/55">
                              {t(`layers.${id}.spec`)}
                            </span>
                          </span>
                          <span
                            className="hidden shrink-0 rounded-md border border-foreground/10 bg-foreground/2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.13em] text-primary/60 sm:inline-block"
                          >
                            {t(`layers.${id}.tag`)}
                          </span>
                        </button>
                        <div
                          aria-hidden={!isActive}
                          className="grid transition-[grid-template-rows] duration-300 ease-smooth motion-reduce:transition-none lg:hidden"
                          style={{ gridTemplateRows: isActive ? "1fr" : "0fr" }}
                        >
                          <div className="overflow-hidden">
                            <div className="px-4 pb-4 pt-1 sm:px-5">
                              <p className="text-sm leading-relaxed text-primary/70">
                                {t(`layers.${id}.detail`)}
                              </p>
                              <p className="mt-3 text-sm leading-relaxed text-foreground">
                                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-local-accent">
                                  {t("ownershipLabel")}
                                </span>
                                <br />
                                {t(`layers.${id}.ownership`)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {i === 0 && (
                        <div
                          aria-hidden
                          data-seam
                          className="flex items-center gap-3 pt-2"
                        >
                          <span className="flex-1 border-t border-dashed border-foreground/20" />
                          <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-primary/60">
                            {t("templateStops")}
                          </span>
                          <span className="w-8 border-t border-dashed border-foreground/20" />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary/60">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full border border-foreground/25" />
                {t("legend.template")}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-local-accent" />
                {t("legend.altruvex")}
              </span>
            </div>
          </div>
          <div
            className={cn(
              "relative hidden min-h-55 rounded-2xl border bg-surface p-6 transition-colors duration-200 ease-smooth sm:p-8 lg:block",
              activeId ? "border-local-accent/25" : "border-border",
            )}
            aria-live="polite"
          >
            <div
              aria-hidden
              className="absolute inset-e-6 top-1/2 flex -translate-y-1/2 flex-col gap-1.5"
            >
              {LAYER_IDS.map((id) => (
                <span
                  key={id}
                  className={cn(
                    "h-4 w-1 rounded-full transition-colors duration-200",
                    id === activeId ? "bg-local-accent" : "bg-foreground/10",
                  )}
                />
              ))}
            </div>
            <div
              className={cn(
                "flex h-full flex-col justify-center pe-8 transition-opacity duration-200",
                activeId
                  ? "pointer-events-none absolute inset-0 p-6 opacity-0 sm:p-8"
                  : "relative opacity-100",
              )}
            >
              <Eyebrow className="mb-4">{t("intro.eyebrow")}</Eyebrow>
              <p className="text-lg leading-relaxed text-foreground">
                <Dim>{t("intro.dismissed")}</Dim> {t("intro.answerLead")}{" "}
                <Strong>{t("intro.answerStrong")}</Strong>
              </p>
              <p className="mt-6 font-mono text-xs uppercase tracking-[0.14em] text-primary/60">
                {t("intro.hint")}
              </p>
            </div>
            {activeId && (
              <div
                key={detailKey}
                className="flex h-full flex-col pe-8"
                style={{ animation: "ownDetailIn 0.24s ease forwards" }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="font-mono text-sm tabular-nums text-local-accent">
                    {String(LAYER_IDS.indexOf(activeId) + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-sans text-xl font-medium leading-tight text-foreground">
                    {t(`layers.${activeId}.name`)}
                  </h3>
                  <span className="ms-auto rounded-md border border-local-accent/25 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-local-accent">
                    {t(`layers.${activeId}.tag`)}
                  </span>
                </div>
                <p className="text-base leading-relaxed text-primary/70">
                  {t(`layers.${activeId}.detail`)}
                </p>
                <p className="mt-auto pt-6 text-sm leading-relaxed text-foreground">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-local-accent">
                    {t("ownershipLabel")}
                  </span>
                  <br />
                  {t(`layers.${activeId}.ownership`)}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-14 flex items-center gap-5 border-t border-border pt-8">
          <p className="max-w-[46ch] text-lg leading-snug text-foreground">
            <Highlight>{t("closing")}</Highlight>
          </p>
          <span aria-hidden className="hidden h-px flex-1 bg-foreground/8 sm:block" />
        </div>
      </Container>
      <style>{`
        @keyframes ownDetailIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-layer], [data-spine], [data-seam] { opacity: 1 !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
}
