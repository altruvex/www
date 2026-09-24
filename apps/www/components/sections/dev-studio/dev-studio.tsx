"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { DisplayClose } from "@/components/sections/display-close";
import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import { getCommercialCta } from "@/lib/config/commercial";
import { getCaseStudyBySlug } from "@/lib/data/case-studies";
import {
  splitWords,
  useKineticTrack,
  useMediaSettle,
  useSectionCardGrid,
  useSectionTitle,
  useTileAssemble,
  useWordRead,
} from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import Image, { getImageProps } from "next/image";
import { HeroHeadline, HeroReveal } from "../hero-motion-wrappers";

/*
 * /services/development as a dark studio — chosen by Ali 2026-09-19 from three
 * working prototypes (docs/prototypes/2026-09-services-development/c.html),
 * after Trionn and Produx (Awwwards SOTD) — then repainted the same day in the
 * house identity at Ali's request: the page follows the theme (no forced dark
 * scene), grounds alternate background / surface bands, containers use the
 * edge system (border-subtle + panel radii), cards carry the world tick, the
 * numerals are mono, liquid glass sits over imagery where it can read, and the
 * close is the shared SectionEndCta. The one colour moment is the word track's
 * wipe into the page's world (local-accent), which follows the theme too.
 */

const DEV_CASE = "altruvex-site";

/* ── Hero ─────────────────────────────────────────────────────────────── */

function StudioHero() {
  const t = useTranslations("serviceDetails.development");
  const s = useTranslations("serviceDetails.development.studio");
  const tCTAs = useTranslations("commercial.ctas");
  const primary = getCommercialCta("projectRange");
  const secondary = getCommercialCta("architecture");
  /* The picture settles: opens from an inset, then eases out of its zoom. */
  const mediaRef = useMediaSettle<HTMLDivElement>();

  return (
    <section aria-labelledby="dev-hero-heading" className="bg-background pt-28 pb-(--section-y-bottom) lg:pt-32">
      <Container>
        {/* Type first, at the scale the word track and the facts use later. */}
        <div className="grid gap-y-8 lg:grid-cols-12 lg:items-end lg:gap-x-10">
          <div className="lg:col-span-7">
            <HeroReveal delay={0.1} className="mb-6">
              <Eyebrow tone="accent">{s("hero.cardLabel")}</Eyebrow>
            </HeroReveal>
            <HeroHeadline
              as="h1"
              id="dev-hero-heading"
              className="text-[clamp(3rem,6.4vw,6.75rem)] leading-[1] font-light tracking-[-0.035em] text-foreground rtl:leading-[1.25] rtl:tracking-normal"
            >
              <span className="block">{s("title")}</span>
              <Highlight tone="world" className="block tracking-[-0.025em] rtl:tracking-normal">
                {s("titleAccent")}
              </Highlight>
            </HeroHeadline>
          </div>
          <div className="lg:col-span-5 lg:pb-3">
            <HeroReveal delay={0.45}>
              <p className="max-w-[46ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
                {t.rich("description", bodyMarks)}
              </p>
            </HeroReveal>
            <HeroReveal delay={0.6} className="mt-8">
              <CtaButtonGroup
                primaryVariant="accent"
                primary={{ href: primary.href, label: tCTAs("projectRange") }}
                secondary={{ href: secondary.href, label: tCTAs("architecture") }}
                secondaryArrow
              />
            </HeroReveal>
          </div>
        </div>

        {/* The picture as one large container (panel-lg), glass card on it —
            the same pairing the ownership card uses further down. */}
        <div
          ref={mediaRef}
          className="relative mt-14 aspect-[4/5] overflow-hidden rounded-panel-lg sm:aspect-[16/10] lg:mt-20 lg:aspect-[21/9]"
        >
          <div data-settle-img className="absolute inset-0 will-change-transform">
            <Image
              src="/images/services/image-5.png"
              alt=""
              fill
              priority
              sizes="(min-width: 1408px) 1280px, 100vw"
              className="object-cover"
            />
          </div>
          <HeroReveal
            delay={0.9}
            className="liquid-glass-panel absolute start-4 bottom-4 max-w-80 rounded-panel-sm p-5 sm:start-6 sm:bottom-6"
          >
            <span aria-hidden className="mb-3 block h-[3px] w-5 rounded-full bg-local-accent" />
            <p className="text-sm leading-snug text-foreground">{s("hero.cardText")}</p>
          </HeroReveal>
        </div>
      </Container>
    </section>
  );
}

/* ── Statement: read word by word as it scrolls ───────────────────────── */

function StudioStatement() {
  const s = useTranslations("serviceDetails.development.studio.statement");
  const textRef = useWordRead<HTMLParagraphElement>();

  return (
    <section className="bg-surface pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container className="grid gap-6 lg:grid-cols-12">
        <Eyebrow className="lg:col-span-3">{s("eyebrow")}</Eyebrow>
        <p
          ref={textRef}
          className="max-w-[22ch] text-[clamp(2rem,4.4vw,4.5rem)] leading-[1.06] font-light tracking-[-0.03em] text-foreground lg:col-span-9 rtl:leading-[1.4] rtl:tracking-normal"
        >
          {splitWords(s("text")).map(({ key, word }) => (
            <span key={key} data-word>
              {word}
            </span>
          ))}
        </p>
      </Container>
    </section>
  );
}

/* ── Word track: the method, crossing the screen ──────────────────────── */

function StudioWords() {
  const s = useTranslations("serviceDetails.development.studio.words");
  const items = s.raw("items") as string[];
  /* The track crosses the screen; the world layer rises through it. */
  const rootRef = useKineticTrack<HTMLElement>();

  const track = (
    <div className="flex items-center gap-[0.3em] text-[clamp(4.5rem,14vw,15rem)] leading-none font-light tracking-[-0.045em] whitespace-nowrap rtl:tracking-normal">
      {items.map((item, i) => (
        <span key={item} className="flex items-center gap-[0.3em]">
          {i > 0 ? <span className="text-[0.4em] font-light opacity-60">+</span> : null}
          <span>{item}</span>
        </span>
      ))}
    </div>
  );

  return (
    <section ref={rootRef} aria-label={items.join(", ")} className="relative h-[240svh] bg-background motion-reduce:h-auto">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden motion-reduce:relative motion-reduce:h-auto motion-reduce:py-(--section-y-top)">
        <Eyebrow className="absolute top-[14vh] start-6 motion-reduce:hidden sm:start-8 md:start-12 lg:start-16">
          {s("caption")}
        </Eyebrow>
        <div aria-hidden data-track className="text-foreground motion-reduce:hidden">
          {track}
        </div>
        {/* The page's world rising through the same words: a second copy on
            local-accent, revealed from below as the track crosses. */}
        <div
          aria-hidden
          data-wipe
          className="absolute inset-0 flex items-center bg-local-accent text-local-accent-fg [clip-path:inset(100%_0_0_0)] motion-reduce:hidden"
        >
          <div data-track>{track}</div>
        </div>
        {/* Reduced motion: the method as one still line, wrapped. */}
        <Container className="hidden motion-reduce:block">
          <Eyebrow>{s("caption")}</Eyebrow>
          <p className="mt-6 text-[clamp(2.5rem,7vw,6rem)] leading-[1.05] font-light tracking-[-0.04em] text-foreground rtl:tracking-normal">
            {items.join(" + ")}
          </p>
        </Container>
      </div>
    </section>
  );
}

/* ── Tiles: the picture assembles from its pieces ─────────────────────── */

const COLS = 6;
const ROWS = 4;

function StudioTiles() {
  const s = useTranslations("serviceDetails.development.studio.tiles");
  /* The picture assembles from its pieces as the runway scrolls. */
  const rootRef = useTileAssemble<HTMLElement>();
  const {
    props: { src },
  } = getImageProps({ src: "/images/services/image-6.png", alt: "", width: 1600, height: 900, quality: 80 });

  return (
    <section ref={rootRef} aria-labelledby="dev-tiles-heading" className="relative h-[240svh] bg-surface motion-reduce:h-auto">
      <div className="sticky top-0 grid h-svh place-items-center overflow-hidden motion-reduce:relative motion-reduce:py-(--section-y-top)">
        <Eyebrow className="absolute top-[12vh] start-6 sm:start-8 md:start-12 lg:start-16">{s("eyebrow")}</Eyebrow>
        <div data-tile-frame className="relative aspect-video w-[min(84vw,1100px)]">
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const c = i % COLS;
            const r = Math.floor(i / COLS);
            return (
              <span
                key={i}
                data-tile
                aria-hidden
                /* The four corner pieces carry the block's corner, so the
                   assembled picture lands as one large container (panel-lg). */
                className={cn(
                  "absolute bg-cover will-change-transform",
                  r === 0 && c === 0 && "rounded-ss-panel-lg",
                  r === 0 && c === COLS - 1 && "rounded-se-panel-lg",
                  r === ROWS - 1 && c === 0 && "rounded-es-panel-lg",
                  r === ROWS - 1 && c === COLS - 1 && "rounded-ee-panel-lg",
                )}
                style={{
                  left: `${(c / COLS) * 100}%`,
                  top: `${(r / ROWS) * 100}%`,
                  width: `calc(${100 / COLS}% + 1px)`,
                  height: `calc(${100 / ROWS}% + 1px)`,
                  backgroundImage: `url(${src})`,
                  backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
                  backgroundPosition: `${(c / (COLS - 1)) * 100}% ${(r / (ROWS - 1)) * 100}%`,
                }}
              />
            );
          })}
        </div>
        {/* White on the photograph in both themes: the image is dark by construction. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="overflow-hidden px-4 pb-[0.12em]">
            <h2
              id="dev-tiles-heading"
              data-tile-title
              className="text-center text-[clamp(2.75rem,7vw,7.5rem)] leading-none font-normal tracking-[-0.04em] text-white [text-shadow:0_10px_40px_rgb(0_0_0/0.45)] rtl:leading-[1.3] rtl:tracking-normal"
            >
              {s("title")}
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Facts ────────────────────────────────────────────────────────────── */

function Tick() {
  return <span aria-hidden className="block h-[3px] w-5 rounded-full bg-local-accent" />;
}

function StudioFacts() {
  const s = useTranslations("serviceDetails.development.studio.facts");
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const gridRef = useSectionCardGrid<HTMLDivElement>();
  /* The speed figure is the flagship case study's own metric, not a literal. */
  const speed = getCaseStudyBySlug(DEV_CASE)?.metrics[0]?.value ?? "";

  const card = "flex flex-col overflow-hidden rounded-panel-sm border border-border-subtle bg-card";
  const figure = "text-6xl leading-none font-light tracking-[-0.04em] text-foreground ltr:font-mono ltr:tracking-[-0.06em] tabular-nums";

  return (
    <section aria-labelledby="dev-facts-heading" className="bg-background pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="text-center">
          <h2
            ref={titleRef}
            id="dev-facts-heading"
            className="text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.05] font-light tracking-[-0.03em] text-foreground rtl:tracking-normal"
          >
            {s("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{s("description")}</p>
        </div>

        <div ref={gridRef} className="mx-auto mt-14 grid max-w-6xl gap-4 md:grid-cols-3">
          <article className={card}>
            <div className="relative aspect-[4/3]">
              <Image src="/images/services/image-3.png" alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col gap-4 p-6">
              <Tick />
              <p className="text-xs font-medium text-muted-foreground">{s("speed.label")}</p>
              <p dir="ltr" className={cn(figure, "rtl:text-end")}>{speed}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{s("speed.text")}</p>
            </div>
          </article>

          {/* Ownership: the figure on liquid glass, over the brand image it frosts. */}
          <article className={cn(card, "relative min-h-96 justify-end p-4")}>
            <Image src="/brand/branding/image5.png" alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
            <div className="liquid-glass-panel relative flex flex-col gap-4 rounded-panel-inset p-5">
              <Tick />
              <p className="text-xs font-medium text-muted-foreground">{s("ownership.label")}</p>
              <p dir="ltr" className={cn(figure, "rtl:text-end")}>{s("ownership.value")}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{s("ownership.text")}</p>
            </div>
          </article>

          <article className={card}>
            <div className="relative aspect-[4/3]">
              <Image src="/brand/branding/image2.png" alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col gap-4 p-6">
              <Tick />
              <p className="text-xs font-medium text-muted-foreground">{s("languages.label")}</p>
              <p dir="ltr" className={cn(figure, "rtl:text-end")}>{s("languages.value")}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{s("languages.text")}</p>
            </div>
          </article>
        </div>
      </Container>
    </section>
  );
}

/* ── Close: the shared display close ─────────────────────────────────── */

function StudioCta() {
  const s = useTranslations("serviceDetails.development.studio.cta");
  return (
    <DisplayClose
      id="dev-cta-heading"
      eyebrow={s("eyebrow")}
      title={s("title")}
      titleAccent={s("titleAccent")}
      description={s("description")}
      primary="projectRange"
      secondary="architecture"
    />
  );
}

export function DevStudio() {
  return (
    <>
      <StudioHero />
      <StudioStatement />
      <StudioWords />
      <StudioTiles />
      <StudioFacts />
      <StudioCta />
    </>
  );
}
