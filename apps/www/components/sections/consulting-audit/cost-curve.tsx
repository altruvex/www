"use client";

import { MOTION, whenMotionReady } from "@/lib/motion";
import { useIsomorphicLayoutEffect } from "@/lib/utils/dom-utils";
import { gsap, ScrollTrigger } from "@/lib/utils/gsap";
import type { ConsultingView } from "@repo/pricing-schema";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { AuditSection } from "./audit-section";

/**
 * "The same decision, priced four times."
 *
 * The only place on the site that owns *consequence* as a proof shape: one
 * axis is time, the effect plotted against it. A wrong architecture costs
 * almost nothing to change while it is still a sentence and almost everything
 * once it is live, so the audit is drawn as a flat line crossing that curve
 * early — and as a dashed line falling to the axis, because the fee comes off
 * the build if the client goes ahead.
 *
 * Every figure on the drawing resolves from the pricing schema. The curve
 * itself carries **no y-axis numbers**: we have not measured the visitor's
 * system, and a chart that implied otherwise would be the exact thing this
 * page argues against.
 */
export function CostCurve({
  audit,
  buildRange,
}: {
  audit: ConsultingView;
  buildRange: string;
}) {
  const t = useTranslations("serviceDetails.consulting.audit.curve");
  const stageRef = useRef<HTMLDivElement>(null);

  /* The drawing plays once, in reading order: the cost curve rises, the audit's
     flat line crosses it, then the credit falls away to the axis.
     
     The trigger is the SVG itself at `inView`, not the stage at `latest`. The
     stage is a tall panel — heading, chart, four figures, a footnote — so a
     "top 75%" start on the wrapper fires while the chart is still below the
     fold, and the whole 2.5s sequence finishes unseen. `inView` is the token
     that exists for exactly this: a one-shot demonstration the visitor is
     meant to watch happen.
     
     Reduced motion gets the finished chart — nothing is hidden up front, so
     there is nothing to wait for. */
  useIsomorphicLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let ctx: gsap.Context | null = null;

    const off = whenMotionReady(() => {
      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add("(prefers-reduced-motion: no-preference)", () => {
          const plot = stage.querySelector<SVGSVGElement>("[data-plot]");
          const curve = stage.querySelector<SVGPathElement>("[data-curve]");
          const flat = stage.querySelector<SVGLineElement>("[data-flat]");
          const credit = stage.querySelectorAll<SVGElement>("[data-credit]");
          const late = stage.querySelectorAll<SVGElement>("[data-late]");
          if (!plot || !curve || !flat) return;

          /* Dash the strokes by their REAL length, never by a normalised
             `pathLength={1}`. GSAP renders px values rounded to whole numbers,
             so a tween whose whole range is one unit can only ever write `1px`
             and `0px` — the line snaps in a single frame and reads as no
             animation at all. Measured, the curve is ~936 viewBox units, which
             is ~936 steps to draw through. Same as tech-dna-section. */
          const curveLength = curve.getTotalLength();
          const flatLength = flat.getTotalLength();
          gsap.set(curve, { strokeDasharray: curveLength, strokeDashoffset: curveLength });
          gsap.set(flat, { strokeDasharray: flatLength, strokeDashoffset: flatLength });
          gsap.set([...credit, ...late], { opacity: 0 });

          ScrollTrigger.create({
            trigger: plot,
            start: MOTION.trigger.inView,
            once: true,
            onEnter: () => {
              /* A stroke being drawn is a pen moving, so it wants a near-even
                 rate. `ease.strong` is quintic-out — ~78% of the line is on
                 screen in the first fifth of the tween — which reads as the
                 chart appearing rather than being drawn. `ease.gentle` is the
                 symmetric curve, and `duration.sweep` is the token for a
                 one-shot demonstration the visitor is meant to watch. */
              gsap
                .timeline({ defaults: { ease: MOTION.ease.gentle } })
                .to(curve, { strokeDashoffset: 0, duration: MOTION.duration.sweep })
                .to(flat, { strokeDashoffset: 0, duration: MOTION.duration.slow }, "-=0.35")
                .to(late, { opacity: 1, duration: MOTION.duration.fast }, "-=0.2")
                .to(credit, { opacity: 1, duration: MOTION.duration.base }, "-=0.1");
            },
          });
        });
      }, stage);
    });

    return () => {
      off();
      ctx?.revert();
    };
  }, []);

  return (
    <AuditSection
      id="cost-curve"
      titleId="consulting-curve-heading"
      eyebrow={t("eyebrow")}
      title={t("title")}
      titleAccent={t("titleAccent")}
      description={t("description")}
      note={t("honesty", { price: audit.priceLabel, range: buildRange })}
    >
      <p className="mb-9 max-w-[42ch] text-[clamp(1.15rem,1.8vw,1.6rem)] leading-snug font-light tracking-[-0.02em] text-foreground rtl:tracking-normal">
        {t("claim", { price: audit.priceLabel, range: buildRange })}
      </p>

        <div
          ref={stageRef}
          className="rounded-panel-md border border-border-subtle p-6 md:p-8"
        >
          <svg
            data-plot
            viewBox="0 0 1000 380"
            className="block h-auto w-full overflow-visible"
            role="img"
            aria-label={t("figureAlt")}
          >
            <line x1="70" y1="330" x2="960" y2="330" className="stroke-border-subtle" strokeWidth="1" />
            <line x1="70" y1="30" x2="70" y2="330" className="stroke-border-subtle" strokeWidth="1" />

            {/* the published build range the decision stands in front of */}
            <rect x="742" y="40" width="218" height="150" className="fill-local-accent-soft" />
            <text
              data-late
              x="960"
              y="208"
              textAnchor="end"
              className="eyebrow fill-muted-foreground max-md:hidden"
            >
              {t("bandLabel", { range: buildRange })}
            </text>

            <path
              data-curve
              d="M70 318 C 240 312, 330 296, 400 268 S 600 190, 700 112 S 840 40, 940 18"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              className="stroke-foreground"
            />

            <line
              data-flat
              x1="70"
              y1="300"
              x2="960"
              y2="300"
              strokeWidth="2"
              className="stroke-local-accent"
            />
            <text data-late x="78" y="292" className="fill-local-accent text-micro max-md:hidden">
              {t("auditLabel", { price: audit.priceLabel, duration: audit.duration })}
            </text>
            <circle data-late cx="146" cy="300" r="5" className="fill-local-accent" />

            {/* the same fee, credited back to nothing */}
            {audit.creditAmountLabel ? (
              <>
                <line
                  data-credit
                  x1="146"
                  y1="300"
                  x2="628"
                  y2="330"
                  strokeWidth="1.5"
                  strokeDasharray="4 5"
                  className="stroke-local-accent"
                />
                <text data-credit x="640" y="334" className="fill-local-accent text-micro max-md:hidden">
                  {t("creditLabel")}
                </text>
              </>
            ) : null}

            {/* the axis that belongs to time */}
            <text x="70" y="352" className="eyebrow fill-muted-foreground">{t("moments.definition")}</text>
            <text x="330" y="352" className="eyebrow fill-muted-foreground">{t("moments.architecture")}</text>
            <text x="600" y="352" className="eyebrow fill-muted-foreground">{t("moments.build")}</text>
            <text x="940" y="352" textAnchor="end" className="eyebrow fill-muted-foreground">{t("moments.live")}</text>

            <text x="70" y="20" className="fill-foreground text-[15px] font-light">{t("yLabel")}</text>
          </svg>

          {/* The engagement's figures live here, under the drawing that argues
              them — not in the hero. Each one carries the sentence that says
              what kind of claim it is. */}
          <dl className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Figure value={audit.priceLabel} note={t("figures.price")} />
            <Figure value={audit.duration} note={t("figures.duration")} />
            <Figure value={buildRange} note={t("figures.range")} />
            {audit.creditAmountLabel ? (
              <Figure value={t("figures.netValue")} note={t("figures.net")} />
            ) : null}
          </dl>
        </div>
    </AuditSection>
  );
}

/** One published figure, and the sentence that says what kind of claim it is. */
function Figure({ value, note }: { value: string; note: string }) {
  return (
    <div className="border-t border-border-subtle pt-4">
      <dt className="text-[clamp(1.6rem,2.8vw,2.4rem)] leading-tight font-light tracking-[-0.03em] text-foreground">
        {value}
      </dt>
      <dd className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{note}</dd>
    </div>
  );
}
