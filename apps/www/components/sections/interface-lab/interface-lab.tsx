"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { DisplayClose } from "@/components/sections/display-close";
import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import { getCommercialCta } from "@/lib/config/commercial";
import { useMediaSettle, useSectionTitle } from "@/lib/motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { HeroHeadline, HeroReveal } from "../hero-motion-wrappers";

function Tick() {
  return <span aria-hidden className="block h-0.75 w-5 rounded-full bg-local-accent" />;
}


function LabHero() {
  const s = useTranslations("serviceDetails.webDesign.lab.hero");
  const tCTAs = useTranslations("commercial.ctas");
  const mediaRef = useMediaSettle<HTMLDivElement>({ zoom: false });

  return (
    <section aria-labelledby="ifd-hero-heading" className="bg-background pt-32 pb-(--section-y-bottom) lg:pt-40">
      <Container className="grid gap-y-8 lg:grid-cols-12 lg:items-end lg:gap-x-10">
        <div className="lg:col-span-7">
          <HeroReveal delay={0.1} className="flex items-center gap-3">
            <Tick />
            <Eyebrow tone="accent">{s("eyebrow")}</Eyebrow>
          </HeroReveal>
          <HeroHeadline
            as="h1"
            id="ifd-hero-heading"
            className="mt-6 text-[clamp(3.25rem,7.4vw,8.25rem)] leading-[0.98] font-light tracking-[-0.04em] text-foreground rtl:leading-[1.25] rtl:tracking-normal"
          >
            <span className="block">{s("title")}</span>
            <Highlight tone="world" className="block tracking-[-0.03em] rtl:tracking-normal">
              {s("titleAccent")}
            </Highlight>
          </HeroHeadline>
        </div>
        <div className="lg:col-span-5 lg:pb-4">
          <HeroReveal delay={0.45}>
            <p className="max-w-[46ch] text-[clamp(1.0625rem,1.1vw,1.1875rem)] leading-relaxed text-muted-foreground">
              {s("description")}
            </p>
          </HeroReveal>
          <HeroReveal delay={0.6} className="mt-8">
            <CtaButtonGroup
              primaryVariant="accent"
              primary={{ href: getCommercialCta("projectRange").href, label: tCTAs("projectRange") }}
              secondary={{ href: getCommercialCta("realBuild").href, label: tCTAs("realBuild") }}
              secondaryArrow
            />
          </HeroReveal>
        </div>
      </Container>
      <Container className="mt-14 lg:mt-20">
        <div ref={mediaRef} className="relative overflow-hidden rounded-panel-lg sm:aspect-video">
          <div data-settle-img className="relative aspect-video overflow-hidden rounded-panel-lg will-change-transform sm:absolute sm:inset-0 sm:aspect-auto sm:rounded-none">
            <Image
              src="/images/interface-design/brand-glass.webp"
              alt=""
              fill
              priority
              sizes="(min-width: 1408px) 1280px, 100vw"
              className="object-cover"
            />
          </div>
          <HeroReveal
            delay={0.9}
            className="liquid-glass-panel relative m-3 rounded-panel-sm p-5 sm:absolute sm:inset-s-6 sm:bottom-6 sm:m-0 sm:max-w-80"
          >
            <Tick />
            <p className="mt-3 text-sm leading-snug text-foreground">{s("card")}</p>
            <a
              href="#disciplines"
              className="mt-3 inline-flex items-center gap-1.5 rounded-ctl-sm text-sm font-medium text-local-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {s("cardLink")}
              <span aria-hidden>↓</span>
            </a>
          </HeroReveal>
        </div>
      </Container>
    </section>
  );
}
const ROW_IMAGES = [
  { src: "/images/interface-design/rows-01.webp", ratio: 1800 / 1200 },
  { src: "/images/interface-design/rows-02.webp", ratio: 1800 / 1201 },
  { src: "/images/interface-design/rows-03.webp", ratio: 1400 / 2100 },
  { src: "/images/interface-design/rows-04.webp", ratio: 1400 / 1866 },
  { src: "/images/interface-design/rows-05.webp", ratio: 1800 / 1200 },
  { src: "/images/interface-design/rows-06.webp", ratio: 1800 / 1200 },
] as const;

function RowMedia({ src, ratio }: { src: string; ratio: number }) {
  const mediaRef = useMediaSettle<HTMLDivElement>({ open: false, zoom: false });
  return (
    <div
      ref={mediaRef}
      className="relative ms-auto w-full overflow-hidden rounded-panel-sm"
      style={{ aspectRatio: ratio, maxWidth: ratio < 1 ? `calc(56vh * ${ratio})` : undefined }}
    >
      <div data-settle-img className="absolute inset-0 will-change-transform">
        <Image src={src} alt="" fill sizes="(min-width: 1024px) 44vw, 100vw" className="object-contain" />
      </div>
    </div>
  );
}

function StackedRows() {
  const s = useTranslations("serviceDetails.webDesign.lab.rows");
  const items = s.raw("items") as Array<{ title: string; body: string }>;
  const titleRef = useSectionTitle<HTMLHeadingElement>();

  return (
    <section id="disciplines" aria-labelledby="ifd-rows-heading" className="bg-background pt-(--section-y-top) pb-(--section-y-bottom)">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4 pb-12">
          <div>
            <Eyebrow>{s("eyebrow")}</Eyebrow>
            <h2
              ref={titleRef}
              id="ifd-rows-heading"
              className="mt-5 text-[clamp(2.75rem,5.4vw,5.75rem)] leading-[1.02] font-light tracking-[-0.04em] text-foreground rtl:leading-[1.3] rtl:tracking-normal"
            >
              {s("title")} <Highlight tone="world">{s("titleAccent")}</Highlight>
            </h2>
          </div>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            <Num value={items.length} pad={2} />
          </span>
        </div>
        <ol className="list-none">
          {items.map((item, i) => (
            <li
              key={item.title}
              className="border-t border-border-subtle bg-background lg:sticky lg:min-h-[78vh]"
              style={{ top: `calc(3.5rem + ${i} * 4.5rem)` }}
            >
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-4 py-4 lg:h-18 lg:grid-cols-[6rem_minmax(0,1fr)] lg:py-0">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  <Num value={i + 1} pad={2} />
                </span>
                <h3 className="text-[clamp(1.625rem,3vw,2.75rem)] leading-tight font-light tracking-[-0.03em] text-foreground rtl:tracking-normal">
                  {item.title}
                </h3>
              </div>
              <div className="grid gap-6 pt-2 pb-12 lg:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-8 lg:pt-6">
                <p className="max-w-[40ch] leading-relaxed text-muted-foreground lg:col-start-2 lg:self-end">{item.body}</p>
                <div className="lg:col-start-3">
                  <RowMedia {...ROW_IMAGES[i % ROW_IMAGES.length]!} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

function LabClose() {
  const s = useTranslations("serviceDetails.webDesign.lab.close");
  return (
    <DisplayClose
      id="ifd-close-heading"
      eyebrow={s("eyebrow")}
      title={s("title")}
      titleAccent={s("titleAccent")}
      description={s("description")}
      primary="technicalCall"
      secondary="projectRange"
    />
  );
}

export { LabClose, LabHero, StackedRows };
