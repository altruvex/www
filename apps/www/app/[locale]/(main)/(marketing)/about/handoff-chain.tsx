"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { ExternalDirectionalLink } from "@/components/shared/directional-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import { bodyMarks } from "@/components/ui/rich-text";
import { FOUNDER_LINK } from "@/lib/config/commercial";
import {
  MOTION,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

const ROUTES = {
  usual: ["decision", "sales", "account", "pm", "sub", "code"],
  altruvex: ["decision", "founder", "code"],
} as const;

type RouteId = keyof typeof ROUTES;

/** Seconds the line takes to cross the whole route. Both routes share it, so
    the only difference the animation can show is the stops. */
const CROSSING = 1.2;
/** How long the usual route waits at each intermediate stop. */
const HOLD = 0.32;

/*
 * Node labels sit under their dot on `lg` and beside it below that. On `lg`
 * each node is a zero-width flex item, so `justify-between` lands the dots at
 * exact fractions of the line - which is what lets the line's scale stop on a
 * dot. The label hangs off that point: centred for the middle stops, flush to
 * the edge for the two ends.
 */
const LABEL_ALIGN = {
  first: "lg:-ms-[6px] lg:text-start",
  middle: "lg:-ms-14 lg:text-center xl:-ms-18",
  last: "lg:-ms-[calc(7rem-6px)] lg:text-end xl:-ms-[calc(9rem-6px)]",
} as const;

function Route({ id }: { id: RouteId }) {
  const t = useTranslations(`about.chain.${id}`);
  const tFounder = useTranslations("about.founder");
  const nodes = ROUTES[id];
  const isAltruvex = id === "altruvex";
  // Everyone on the route except your decision, the person who builds it and
  // the code itself.
  const between = nodes.length - 3;

  return (
    <div
      data-route={id}
      className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-12"
    >
      <div className="mb-8 lg:mb-0">
        <Eyebrow tone={isAltruvex ? "accent" : "muted"} className="m-0">
          {t("label")}
        </Eyebrow>
        <p className="mt-3 text-[clamp(2.5rem,5vw,3.5rem)] font-light leading-none tracking-[-0.03em] text-foreground">
          <Num value={between} />
        </p>
        <p className="mt-2 max-w-[18ch] text-sm leading-snug text-muted-foreground">
          {t("countLabel")}
        </p>
      </div>

      <ol
        aria-label={t("label")}
        className="relative flex h-[24rem] flex-col justify-between py-2 lg:h-auto lg:flex-row lg:px-[6px] lg:py-0"
      >
        <span
          aria-hidden
          data-route-line
          className={cn(
            "absolute start-[5px] top-2 bottom-2 w-px lg:start-[6px] lg:end-[6px] lg:top-[5px] lg:bottom-auto lg:h-px lg:w-auto",
            isAltruvex ? "bg-local-accent" : "bg-foreground/30",
          )}
        />
        {nodes.map((node, index) => {
          const isEnd = index === 0 || index === nodes.length - 1;
          const isFounder = node === "founder";
          const isBuilder = node === "sub";
          const position =
            index === 0 ? "first" : index === nodes.length - 1 ? "last" : "middle";

          return (
            <li
              key={node}
              data-route-node
              className="relative h-0 lg:h-auto lg:w-0"
            >
              <span
                aria-hidden
                className="-mt-[5.5px] block size-[11px] lg:mt-0 lg:-ms-[5.5px]"
              >
                <span
                  data-route-dot
                  className={cn(
                    "block size-full rounded-full",
                    isEnd && "bg-foreground",
                    isFounder && "bg-local-accent ring-4 ring-local-accent/20",
                    isBuilder && "border border-foreground bg-background",
                    !isEnd && !isFounder && !isBuilder && "border border-foreground/50 bg-background",
                  )}
                />
              </span>
              <span
                data-route-label
                className={cn(
                  "absolute start-6 end-0 top-0 block -translate-y-1/2 lg:static lg:mt-5 lg:w-28 lg:translate-y-0 xl:w-36",
                  LABEL_ALIGN[position],
                )}
              >
                <span
                  className={cn(
                    "block text-[0.9375rem] leading-snug",
                    isEnd || isFounder || isBuilder
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {t(`nodes.${node}`)}
                </span>
                {isFounder ? (
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                    {tFounder("role")}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * CLAIM: your decision reaches the engineer without passing through anyone.
 * PROOF: comparison - the same route drawn twice, once with the stops a
 * requirement usually passes through and once without them.
 *
 * Signature: both lines cross at the same speed. The usual route waits at each
 * stop, so the Altruvex line arrives first - the claim as a race the visitor
 * watches rather than a sentence. The markup is the finished state; reduced
 * motion renders it untouched and the counts carry the argument alone.
 */
export function HandoffChainSection() {
  const t = useTranslations("about.chain");
  const tFounder = useTranslations("about.founder");
  const frameRef = useRef<HTMLDivElement>(null);

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const founderRef = useSectionElement();

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          wide: "(min-width: 1024px)",
        },
        (context) => {
          const { motion, wide } = context.conditions as {
            motion: boolean;
            wide: boolean;
          };
          if (!motion) return;

          const rtl = document.documentElement.dir === "rtl";
          const axis = wide ? "scaleX" : "scaleY";
          const origin = wide
            ? rtl
              ? "right center"
              : "left center"
            : "center top";

          const timeline = gsap.timeline({
            paused: true,
            defaults: { ease: "none" },
          });

          (Object.keys(ROUTES) as RouteId[]).forEach((id) => {
            const route = frame.querySelector(`[data-route="${id}"]`);
            if (!route) return;

            const line = route.querySelector("[data-route-line]");
            const dots = route.querySelectorAll("[data-route-dot]");
            const labels = route.querySelectorAll("[data-route-label]");
            const segments = dots.length - 1;

            gsap.set(line, { transformOrigin: origin, [axis]: 0 });
            gsap.set(dots, { scale: 0.3, opacity: 0 });
            gsap.set(labels, { opacity: 0 });

            const reveal = (index: number, at: number) => {
              timeline
                .to(
                  dots[index],
                  {
                    scale: 1,
                    opacity: 1,
                    duration: MOTION.duration.fast,
                    ease: MOTION.ease.strong,
                  },
                  at,
                )
                .to(
                  labels[index],
                  {
                    opacity: 1,
                    duration: MOTION.duration.fast,
                    ease: MOTION.ease.smooth,
                  },
                  at + 0.05,
                );
            };

            reveal(0, 0);
            const step = CROSSING / segments;
            const waits = id === "usual" ? HOLD : 0;

            for (let index = 1; index <= segments; index += 1) {
              const start = step * (index - 1) + waits * (index - 1);
              timeline.to(
                line,
                { [axis]: index / segments, duration: step },
                start + 0.1,
              );
              reveal(index, start + 0.1 + step);
            }
          });

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
        },
      );
    }, frame);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="handoff-chain"
      aria-labelledby="handoff-chain-heading"
      className="accent-world-green border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="handoff-chain-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          description={t("description")}
          classes={{
            title: "max-w-[20ch]",
            description: "lg:max-w-[24rem]",
          }}
        />

        <div
          ref={frameRef}
          className="mt-16 grid grid-cols-2 gap-x-6 lg:mt-24 lg:grid-cols-1 lg:gap-y-20"
        >
          <Route id="usual" />
          <Route id="altruvex" />
        </div>

        <p className="mt-14 max-w-[60ch] text-[0.9375rem] leading-relaxed text-muted-foreground lg:ms-[calc(13rem+3rem)] lg:mt-16">
          {t("note")}
        </p>

        <div
          ref={founderRef}
          className="mt-20 grid gap-8 border-t border-border-subtle pt-12 lg:mt-24 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12"
        >
          <div>
            <h3 className="text-xl font-medium leading-tight tracking-[-0.015em] text-foreground">
              {tFounder("name")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{tFounder("role")}</p>
            <ExternalDirectionalLink
              href={FOUNDER_LINK}
              className="mt-5 text-sm text-foreground underline-offset-4 hover:underline"
            >
              {tFounder("linkedInLabel")}
            </ExternalDirectionalLink>
          </div>
          <div className="grid gap-6 md:grid-cols-2 md:gap-10">
            <p className="max-w-[52ch] text-base leading-[1.75] text-muted-foreground">
              {tFounder.rich("philosophy1", bodyMarks)}
            </p>
            <p className="max-w-[52ch] text-base leading-[1.75] text-muted-foreground">
              {tFounder.rich("philosophy2", bodyMarks)}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
