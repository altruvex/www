"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { usePricingTokens } from "@/components/providers/pricing-tokens-provider";
import { Container } from "@/components/shared/container";
import { ArrowIcon, ArrowLabel } from "@/components/shared/directional-link";
import { Num } from "@/components/ui/num";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Link } from "@/i18n/navigation";
import { accentWorldClass, type AccentPalette } from "@/lib/config/accent-world";
import {
  MOTION,
  playSectionHeading,
  progressIn,
  resolveTrigger,
  riseHoldLeave,
  scrollToY,
  smoothstep,
  whenMotionReady,
} from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { createRef, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { LOOP_STAGES, SERVICE_ORDER, serviceById } from "./data";

type Group = "services" | "run";

interface StageItem {
  key: string;
  group: Group;
  world: AccentPalette;
  index: number;
  total: number;
  label: string;
  chip: string;
  sentence: string;
  line: string;
  foot: string;
  links: ReadonlyArray<{ href: string; label: string }>;
  note?: string;
}

interface PanelRefs {
  chip: RefObject<HTMLParagraphElement | null>;
  sentence: RefObject<HTMLParagraphElement | null>;
  line: RefObject<HTMLParagraphElement | null>;
  after: RefObject<HTMLDivElement | null>;
}

const createPanelRefs = (): PanelRefs => ({
  chip: createRef<HTMLParagraphElement>(),
  sentence: createRef<HTMLParagraphElement>(),
  line: createRef<HTMLParagraphElement>(),
  after: createRef<HTMLDivElement>(),
});

function parts(refs: PanelRefs): HTMLElement[] {
  const after = refs.after.current;
  return [
    refs.chip.current,
    refs.sentence.current,
    refs.line.current,
    ...(after ? Array.from(after.children as HTMLCollectionOf<HTMLElement>) : []),
  ].filter((el): el is HTMLElement => el !== null);
}

function enterPanel(refs: PanelRefs) {
  gsap.set(parts(refs), { opacity: 1, y: 0 });
  const after = refs.after.current;
  playSectionHeading({
    eyebrow: refs.chip.current,
    title: refs.sentence.current,
    description: refs.line.current,
    elements: after ? Array.from(after.children as HTMLCollectionOf<HTMLElement>) : [],
  });
}

function exitPanel(refs: PanelRefs) {
  gsap.to(parts(refs), {
    opacity: 0,
    y: -MOTION.distance.xs,
    duration: MOTION.duration.instant,
    ease: MOTION.ease.exit,
    overwrite: "auto",
  });
}

function useStageItems(): StageItem[] {
  const t = useTranslations("servicesPage");
  const pricingTokens = usePricingTokens();

  const services: StageItem[] = SERVICE_ORDER.map((service, index) => {
    const name = t(`capabilities.${service.name}`);
    return {
      key: service.id,
      group: "services",
      world: service.world,
      index,
      total: SERVICE_ORDER.length,
      label: name,
      chip: name,
      sentence: t(`services.${service.id}.leaves`),
      line: t(`services.${service.id}.outcome`),
      foot: t(`services.${service.id}.engagement`, pricingTokens),
      links: [{ href: service.href, label: t("chapters.explore", { name }) }],
    };
  });

  const run: StageItem[] = LOOP_STAGES.map((stage, index) => {
    const next = LOOP_STAGES[(index + 1) % LOOP_STAGES.length]!;
    const ids: ReadonlyArray<(typeof SERVICE_ORDER)[number]["id"]> = stage.services;
    return {
      key: stage.id,
      group: "run",
      world: "blue",
      index,
      total: LOOP_STAGES.length,
      label: t(`loop.stages.${stage.id}.title`),
      chip: t(`loop.stages.${stage.id}.title`),
      sentence: t(`loop.stages.${stage.id}.statement`),
      line: t(`loop.stages.${stage.id}.body`),
      foot: `${t("stage.handsTo", { stage: t(`loop.stages.${next.id}.title`) })}: ${t(`loop.stages.${stage.id}.hands`)}`,
      links: ids.map((id) => {
        const service = serviceById(id);
        return { href: service.href, label: t(`capabilities.${service.name}`) };
      }),
      note: ids.length === 0 ? t("loop.insideBuild") : undefined,
    };
  });

  return [...services, ...run];
}

const PHOTO_OPEN = 1.5;
const PHOTO_OVERLAP = 1;
const PHOTO_PINNED = PHOTO_OPEN + PHOTO_OVERLAP;

/* Extra scroll between the two groups, in item slots, for the chapter curtain. */
const HANDOFF = 1;

function PhotoLayer() {
  const t = useTranslations("servicesPage");
  const plateItems = t.raw("chapters.plate.items") as string[];
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const frame = frameRef.current;
    const image = imageRef.current;
    const plate = plateRef.current;
    const shade = shadeRef.current;
    if (!track || !frame || !image || !plate || !shade) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const eyebrow = plate.querySelector<HTMLElement>("[data-plate-eyebrow]");
        const rows = gsap.utils.toArray<HTMLElement>("[data-plate-item]", plate);
        const open = PHOTO_OPEN / PHOTO_PINNED;
        const tl = gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: track,
              start: "top top",
              end: `+=${PHOTO_PINNED * 100}%`,
              scrub: MOTION.scroll.scrub.pin,
              invalidateOnRefresh: true,
            },
          })
          .fromTo(
            frame,
            { clipPath: "inset(24% 30% 24% 30% round 12px)" },
            { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: open * 0.5, ease: MOTION.ease.gentle },
            0,
          )
          .fromTo(image, { scale: 1.3 }, { scale: 1.04, duration: open * 0.5, ease: MOTION.ease.gentle }, 0)
          .fromTo(eyebrow, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: open * 0.1 }, open * 0.42);
        rows.forEach((row, i) => {
          tl.fromTo(
            row,
            { opacity: 0, y: 32 },
            { opacity: 1, y: 0, duration: open * 0.14, ease: MOTION.ease.gentle, immediateRender: true },
            open * (0.48 + i * 0.1),
          );
        });
        tl.to(image, { scale: 1, duration: 1 - open }, open).fromTo(
          shade,
          { opacity: 0 },
          { opacity: 0.55, duration: 1 - open },
          open,
        );
      });
    }, track);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={trackRef} className="relative" style={{ height: `${PHOTO_PINNED * 100 + 100}svh` }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <div ref={frameRef} className="absolute inset-0 bg-black">
          <div className="absolute inset-0 rtl:-scale-x-100">
            <div ref={imageRef} className="absolute inset-0">
              <Image
                src="/images/services/image-2.png"
                alt=""
                aria-hidden
                fill
                draggable={false}
                sizes="100vw"
                className="object-cover portrait:hidden"
              />
              <Image
                src="/images/services/image-2(mobile).png"
                alt=""
                aria-hidden
                fill
                draggable={false}
                sizes="100vw"
                className="object-cover landscape:hidden"
              />
            </div>
          </div>
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-r from-black/80 via-black/45 to-black/10 rtl:bg-linear-to-l max-lg:bg-none max-lg:bg-black/50"
          />
          <div ref={plateRef} className="absolute inset-0 flex items-center">
            <Container>
              <div className="lg:ms-[12%]">
                <p data-plate-eyebrow className="eyebrow text-xs text-white/70">
                  {t("chapters.plate.eyebrow")}
                </p>
                <ul className="mt-8 grid list-none gap-y-[clamp(1.75rem,5.5vh,3.5rem)] lg:mt-12">
                  {plateItems.map((item) => (
                    <li
                      key={item}
                      data-plate-item
                      className="flex max-w-[22ch] gap-[0.55em] text-[clamp(1.3125rem,2.4vw,2.125rem)] font-medium leading-[1.15] tracking-[-0.02em] text-balance text-white rtl:leading-[1.4] rtl:tracking-normal"
                    >
                      <span aria-hidden className="mt-[0.2em] h-[0.78em] w-[0.16em] shrink-0 bg-white rtl:mt-[0.35em]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Container>
          </div>
          <div ref={shadeRef} aria-hidden className="pointer-events-none absolute inset-0 bg-black opacity-0" />
        </div>
      </div>
    </div>
  );
}

export function ServicesStage() {
  const t = useTranslations("servicesPage");
  const items = useStageItems();
  const COUNT = items.length;

  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [panelRefs] = useState<PanelRefs[]>(() => Array.from({ length: COUNT }, createPanelRefs));

  const activeRef = useRef(0);
  const shownRef = useRef(0);
  const armedRef = useRef(false);
  const [active, setActive] = useState(0);
  const [within, setWithin] = useState(0);
  const [position, setPosition] = useState(0);
  const boundary = items.findIndex((item) => item.group === "run");

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: track,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const v = self.progress * (COUNT + HANDOFF);
          /* The handoff slot holds the index still: the last discipline for its
             first half, the first stage for its second, swapped under the curtain. */
          const span =
            v < boundary ? v : v < boundary + HANDOFF ? (v < boundary + HANDOFF / 2 ? boundary - 1e-6 : boundary) : v - HANDOFF;
          const next = Math.min(COUNT - 1, Math.floor(span));
          if (next !== activeRef.current) {
            activeRef.current = next;
            setActive(next);
          }
          setWithin(gsap.utils.clamp(0, 1, span - next));
          setPosition(v);
        },
      });
    }, track);
    return () => ctx.revert();
  }, [COUNT, boundary]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let ctx: gsap.Context | null = null;
    const off = whenMotionReady(() => {
      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();
        mm.add(
          {
            motion: "(prefers-reduced-motion: no-preference)",
            reduced: "(prefers-reduced-motion: reduce)",
          },
          (context) => {
            const { reduced } = context.conditions as { reduced: boolean };
            if (reduced) {
              armedRef.current = true;
              return;
            }
            const first = panelRefs[activeRef.current];
            if (first) gsap.set(parts(first), { opacity: 0 });
            ScrollTrigger.create({
              trigger: stage,
              start: resolveTrigger("late"),
              once: true,
              onEnter: () => {
                armedRef.current = true;
                shownRef.current = activeRef.current;
                const current = panelRefs[activeRef.current];
                if (current) enterPanel(current);
              },
            });
            return () => {
              armedRef.current = false;
            };
          },
        );
      }, stage);
    });
    return () => {
      off();
      ctx?.revert();
    };
  }, [panelRefs]);

  useEffect(() => {
    const previous = shownRef.current;
    if (!armedRef.current || previous === active) return;
    shownRef.current = active;
    const incoming = panelRefs[active];
    const outgoing = panelRefs[previous];
    if (!incoming) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(parts(incoming), { opacity: 1, y: 0 });
      return;
    }
    if (outgoing) exitPanel(outgoing);
    enterPanel(incoming);
  }, [active, panelRefs]);

  /* The handoff between the two groups, driven by the raw scroll position.
     It owns a slot of its own (HANDOFF), so the curtain can hold without
     eating into the reading time of the items on either side of it. */
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  /* Fold: the first group closes to one line as the second opens. */
  const fold = reduced
    ? active >= boundary
      ? 1
      : 0
    : smoothstep(progressIn(position, boundary - 0.2, HANDOFF + 0.4));
  /* Curtain: rises over the content, holds across the swap, leaves upward. */
  const curtain = reduced ? null : riseHoldLeave(progressIn(position, boundary - 0.3, HANDOFF + 0.6));

  const listRefs = useRef<(HTMLOListElement | null)[]>([]);
  const [listHeights, setListHeights] = useState<number[]>([]);
  useLayoutEffect(() => {
    const lists = listRefs.current.filter((el): el is HTMLOListElement => el !== null);
    if (lists.length === 0) return;
    const measure = () => setListHeights(listRefs.current.map((el) => el?.scrollHeight ?? 0));
    measure();
    const observer = new ResizeObserver(measure);
    lists.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* The index is a way to move, not just a readout: a row scrolls the stage to
     its item — past the curtain's slot when it lies in the second group —
     through the shared scrollToY (Lenis-aware, reduced motion jumps). */
  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const v = (i < boundary ? i : i + HANDOFF) + 0.35;
    const scrollable = track.offsetHeight - window.innerHeight;
    scrollToY(track.getBoundingClientRect().top + window.scrollY + (v / (COUNT + HANDOFF)) * scrollable);
  };

  const current = items[active]!;
  const groups: ReadonlyArray<{ id: Group; label: string }> = [
    { id: "services", label: t("stage.services") },
    { id: "run", label: t("stage.run") },
  ];
  const groupProgress = (current.index + within) / current.total;

  return (
    <section aria-labelledby="services-stage-heading" className="relative">
      <h2 id="services-stage-heading" className="sr-only">
        {t("stage.label")}
      </h2>
      <div className="sr-only">
        {groups.map((group) => (
          <div key={group.id}>
            <h3>{group.label}</h3>
            <ol>
              {items
                .filter((item) => item.group === group.id)
                .map((item) => (
                  <li key={item.key}>
                    <h4>{item.label}</h4>
                    <p>{item.sentence}</p>
                    <p>{item.line}</p>
                    <p>{item.foot}</p>
                    {item.note ? <p>{item.note}</p> : null}
                  </li>
                ))}
            </ol>
          </div>
        ))}
      </div>
      <PhotoLayer />
      <div
        ref={trackRef}
        className="relative z-10"
        style={{ height: `${(COUNT + HANDOFF) * 80 + 40}svh`, marginTop: `-${PHOTO_OVERLAP * 100}svh` }}
      >
        <div
          ref={stageRef}
          className={cn("sticky top-0 h-svh overflow-hidden bg-background", accentWorldClass(current.world))}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-local-accent/14 transition-colors duration-(--motion-base) ease-smooth mask-[linear-gradient(to_bottom,black,transparent_85%)]"
          />
          <Container className="relative grid h-full grid-rows-[auto_minmax(0,1fr)_auto] pt-24 pb-8 sm:pt-28 sm:pb-10 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-x-16 lg:pt-32 lg:pb-12">
            <nav aria-label={t("stage.label")} className="lg:row-span-2 lg:self-center">
              <p aria-hidden className="flex items-baseline gap-2 text-sm lg:hidden">
                <span className="font-medium text-foreground">
                  {groups.find((g) => g.id === current.group)!.label}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{current.label}</span>
              </p>
              <div className="hidden lg:grid">
                {groups.map((group, g) => {
                  const inGroup = group.id === current.group;
                  /* The first group is open until the fold, the second after it. */
                  const open = g === 0 ? 1 - fold : fold;
                  const done = g === 0 ? fold : 0;
                  const count = items.filter((item) => item.group === group.id).length;
                  const first = items.findIndex((item) => item.group === group.id);
                  return (
                    <div key={group.id} className={cn(g > 0 && "mt-5")}>
                      <button
                        type="button"
                        onClick={() => goTo(first)}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-ctl-sm text-sm font-medium transition-colors duration-(--motion-fast) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          inGroup ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        <span className="ltr:font-mono text-xs text-muted-foreground">
                          <Num value={g + 1} pad={2} />
                        </span>
                        {group.label}
                        <span
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                          style={{ opacity: done }}
                        >
                          <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 8.5 6.5 12 13 4.5" />
                          </svg>
                          <Num value={count} />
                        </span>
                      </button>
                      <div
                        inert={open < 0.5}
                        className="overflow-hidden"
                        style={{ height: listHeights[g] !== undefined ? listHeights[g]! * open : undefined, opacity: open }}
                      >
                        <ol
                          ref={(el) => {
                            listRefs.current[g] = el;
                          }}
                          className="grid list-none gap-1.5 border-s border-border ps-4 pt-3"
                        >
                          {items.map((item, i) =>
                            item.group === group.id ? (
                              <li
                                key={item.key}
                                className={cn(
                                  "relative text-[0.9375rem] leading-snug transition-colors duration-(--motion-fast)",
                                  i === active ? "text-foreground" : "text-muted-foreground/70",
                                )}
                              >
                                <span
                                  className={cn(
                                    "absolute -inset-s-4.25 top-0 h-full w-px bg-foreground transition-opacity duration-(--motion-fast)",
                                    i === active ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <button
                                  type="button"
                                  onClick={() => goTo(i)}
                                  aria-current={i === active ? "step" : undefined}
                                  className="cursor-pointer rounded-ctl-sm text-start transition-colors duration-(--motion-instant) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  {item.label}
                                </button>
                              </li>
                            ) : null,
                          )}
                        </ol>
                      </div>
                    </div>
                  );
                })}
              </div>
            </nav>
            <div className="grid items-center">
              {items.map((item, i) => {
                const isActive = i === active;
                const refs = panelRefs[i]!;
                return (
                  <div
                    key={`${item.group}-${item.key}`}
                    inert={!isActive}
                    className={cn(
                      "[grid-area:1/1] transition-[visibility] duration-(--motion-drawer) motion-reduce:transition-none",
                      accentWorldClass(item.world),
                      isActive ? "visible" : "invisible",
                    )}
                  >
                    <p ref={refs.chip} aria-hidden>
                      <span className="inline-block rounded-full bg-local-accent px-2.5 py-1 text-xs font-medium text-local-accent-fg">
                        {item.chip}
                      </span>
                    </p>
                    <p
                      ref={refs.sentence}
                      aria-hidden
                      className="mt-6 max-w-[20ch] text-[clamp(2rem,4.4vw,4.25rem)] font-normal leading-[1.06] tracking-[-0.03em] text-balance text-foreground rtl:leading-[1.3] rtl:tracking-normal"
                    >
                      {item.sentence}
                    </p>
                    <p
                      ref={refs.line}
                      aria-hidden
                      className="mt-6 max-w-[52ch] text-[clamp(1rem,1.1vw,1.125rem)] leading-relaxed text-muted-foreground max-sm:line-clamp-3"
                    >
                      {item.line}
                    </p>
                    <div ref={refs.after}>
                      {item.links.length > 0 ? (
                        <ul className="mt-8 flex list-none flex-wrap gap-3">
                          {item.links.map((link) => (
                            <li key={link.href}>
                              {/* One way in takes the item's world; several are
                                  peers, so none of them is dressed as the lead. */}
                              <MagneticButton
                                asChild
                                variant={item.links.length === 1 ? "accent" : "secondary"}
                                className="group"
                              >
                                <Link href={link.href}>
                                  <ArrowLabel iconClassName="size-4 shrink-0 transition-transform duration-(--motion-instant) ease-default group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 motion-reduce:transition-none">
                                    {link.label}
                                  </ArrowLabel>
                                </Link>
                              </MagneticButton>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p aria-hidden className="mt-6 text-sm text-muted-foreground">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              aria-hidden
              className="flex items-end justify-between gap-6 border-t border-border pt-5 lg:col-start-2"
            >
              <div className="flex shrink-0 items-center gap-2.5 text-sm tabular-nums text-muted-foreground">
                <svg viewBox="0 0 20 20" className="size-4 -rotate-90">
                  <circle cx="10" cy="10" r="8" fill="none" className="stroke-border" strokeWidth="2" />
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    pathLength={1}
                    strokeDasharray="1 1"
                    strokeDashoffset={1 - groupProgress}
                    className="stroke-foreground"
                    strokeWidth="2"
                  />
                </svg>
                <span className="ltr:font-mono">
                  <Num value={current.index + 1} /> – <Num value={current.total} />
                </span>
              </div>
              <p className="max-w-[46ch] text-end text-sm leading-snug text-muted-foreground">
                <span className="inline-block text-foreground rtl:-scale-x-100">↳</span>{" "}
                {current.foot}
              </p>
            </div>

            {/* The chapter curtain: a card that rises over the content at the
                handoff, holds while the panel swaps beneath it, and leaves
                upward. Scrubbed by scroll, so it plays back in reverse too. */}
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 z-10 col-span-1 col-start-1 row-start-2 row-span-2 overflow-hidden rounded-panel-md lg:col-start-2 lg:row-start-1",
                curtain === null && "invisible",
              )}
            >
              <div
                className="flex h-full flex-col justify-center gap-6 bg-brand px-8 text-brand-foreground sm:px-12 lg:px-16"
                style={{ transform: `translateY(${curtain ?? 100}%)` }}
              >
                <p className="flex items-center gap-3 text-sm text-brand-foreground">
                  <span className="ltr:font-mono">
                    <Num value={1} pad={2} />
                  </span>
                  {groups[0]!.label}
                  <ArrowIcon direction="forward" className="size-4" />
                </p>
                <p className="flex items-baseline gap-5 text-[clamp(2.5rem,6vw,5.5rem)] font-normal leading-none tracking-[-0.03em] rtl:tracking-normal">
                  <span className="ltr:font-mono text-[0.4em] text-brand-foreground/75">
                    <Num value={2} pad={2} />
                  </span>
                  {groups[1]!.label}
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>
    </section>
  );
}