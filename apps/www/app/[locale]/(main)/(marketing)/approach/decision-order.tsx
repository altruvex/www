"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import { MOTION } from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

/** The order most builds decide things in. Ours is the same list reversed. */
const USUAL = ["page", "features", "architecture", "data"] as const;
const OURS = [...USUAL].reverse();

type Layer = (typeof USUAL)[number];

/** Horizontal centre of column `index` in a four-column row, in viewBox units. */
const columnCentre = (index: number) => ((index + 0.5) / USUAL.length) * 100;

function Row({
  order,
  position,
}: {
  order: readonly Layer[];
  position: "top" | "bottom";
}) {
  const t = useTranslations("approach.hero.order");
  const isTop = position === "top";

  return (
    <ol
      className={cn(
        "grid grid-cols-4",
        isTop ? "items-end" : "items-start",
      )}
    >
      {order.map((layer, index) => {
        const isPage = layer === "page";
        return (
          <li
            key={layer}
            data-order-cell={position}
            className={cn(
              "flex flex-col items-center gap-3 px-1 text-center",
              isTop ? "" : "flex-col-reverse",
            )}
          >
            <span className="flex flex-col items-center gap-1">
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "block text-[0.8125rem] leading-tight sm:text-base md:text-xl lg:text-2xl lg:font-light lg:tracking-[-0.015em]",
                  isTop
                    ? "text-muted-foreground"
                    : isPage
                      ? "font-medium text-local-accent-text lg:font-normal"
                      : "text-foreground",
                )}
              >
                {t(`items.${layer}`)}
              </span>
            </span>
            <span
              aria-hidden
              className={cn(
                "relative z-10 block size-[7px] rounded-full",
                isTop
                  ? "-mb-[3.5px] bg-foreground/45"
                  : isPage
                    ? "-mt-[3.5px] bg-local-accent ring-4 ring-local-accent/20"
                    : "-mt-[3.5px] bg-foreground",
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}

/**
 * CLAIM: the page is the last decision, not the first.
 * PROOF: sequence - the same four layers in two orders.
 * DEVICE: a reorder diagram. The usual order is set above, ours below, and a
 * line joins each layer to where it moved. Because ours is a full reversal,
 * every line crosses the middle, and the one that travels furthest - the page,
 * from first to last - is the accent.
 *
 * Signature: the lines descend from the usual order into ours, the page last,
 * then our order reads in. The markup is the finished diagram; reduced motion
 * renders it untouched.
 */
export function DecisionOrder() {
  const t = useTranslations("approach.hero.order");
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const lines = gsap.utils.toArray<SVGSVGElement>("[data-order-line]", frame);
        const pageLine = frame.querySelector("[data-order-line='page']");
        const others = lines.filter((line) => line !== pageLine);
        const ours = frame.querySelectorAll("[data-order-cell='bottom']");

        gsap.set(lines, { clipPath: "inset(0% 0% 100% 0%)" });
        gsap.set(ours, { opacity: 0, y: 8 });

        const timeline = gsap
          .timeline({ paused: true })
          .to(others, {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: MOTION.duration.slow,
            ease: MOTION.ease.gentle,
            stagger: MOTION.stagger.loose,
          })
          .to(
            pageLine,
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: MOTION.duration.slow * 1.4,
              ease: MOTION.ease.gentle,
            },
            "-=0.25",
          )
          .to(
            ours,
            {
              opacity: 1,
              y: 0,
              duration: MOTION.duration.fast,
              ease: MOTION.ease.strong,
              stagger: MOTION.stagger.base,
            },
            "-=0.2",
          );

        const trigger = ScrollTrigger.create({
          trigger: frame,
          start: MOTION.trigger.inView,
          once: true,
          onEnter: () => timeline.play(),
        });

        return () => {
          trigger.kill();
          timeline.kill();
        };
      });
    }, frame);

    return () => ctx.revert();
  }, []);

  return (
    <figure
      aria-labelledby="decision-order-label"
      className="mt-(--section-y-bottom) border-t border-border-subtle pt-10 lg:pt-12"
    >
      <figcaption>
        <Eyebrow id="decision-order-label" className="m-0">
          {t("label")}
        </Eyebrow>
      </figcaption>

      <div
        ref={frameRef}
        className="mt-10 grid gap-y-4 lg:mt-14 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-12 lg:gap-y-0"
      >
        <Eyebrow className="m-0 lg:self-end lg:pb-1">{t("usual")}</Eyebrow>
        <Row order={USUAL} position="top" />

        <div aria-hidden className="relative h-24 sm:h-32 lg:col-start-2 lg:h-40 rtl:-scale-x-100">
          {USUAL.map((layer, from) => {
            const to = OURS.indexOf(layer);
            const x1 = columnCentre(from);
            const x2 = columnCentre(to);
            const isPage = layer === "page";
            return (
              <svg
                key={layer}
                data-order-line={layer}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className={cn(
                  "absolute inset-0 size-full overflow-visible",
                  isPage ? "text-local-accent" : "text-foreground/35",
                )}
              >
                <path
                  d={`M ${x1} 0 C ${x1} 55, ${x2} 45, ${x2} 100`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isPage ? 2 : 1}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            );
          })}
        </div>

        <Eyebrow tone="accent" className="m-0 max-lg:order-last lg:row-start-3 lg:pt-8">
          {t("altruvex")}
        </Eyebrow>
        <Row order={OURS} position="bottom" />
      </div>

      <p className="mt-10 max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted-foreground lg:ms-[calc(13rem+3rem)] lg:mt-12">
        {t("note")}
      </p>
    </figure>
  );
}
