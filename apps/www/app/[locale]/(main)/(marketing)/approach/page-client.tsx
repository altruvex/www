"use client";

import { SectionEndCta } from "@/components/sections/section-end-cta";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { jumpToSection } from "@/components/shared/contents-rail";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import { bodyMarks, renderBodyText } from "@/components/ui/rich-text";
import { STRIKE_LINE } from "@/components/ui/strike";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { ScrollTrigger } from "@/lib/utils/gsap";
import { cn, splitHeadline } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";

export default function ApproachPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <OpeningSection />
      <ErrorBoundary>
        <OrderSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <RefusalsSection />
      </ErrorBoundary>
      <ClosingSection />
    </div>
  );
}

const BODY = "text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75]";

const LAYERS = ["data", "architecture", "features", "page"] as const;
type Layer = (typeof LAYERS)[number];

const chapterId = (layer: Layer) => `ch-${layer}`;

function OpeningSection() {
  const t = useTranslations("approach.hero");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const orderRef = useSectionElement<HTMLDivElement>();
  const { first, second } = splitHeadline(t("title"));

  return (
    <section
      aria-labelledby="approach-hero-heading"
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleAs="h1"
          titleId="approach-hero-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={first}
          secondTitle={second}
          description={t("description")}
          classes={{
            titleWrapper: "space-y-6",
            title:
              "max-w-6xl text-balance text-[clamp(2.5rem,5.2vw,4.75rem)] font-light leading-[1.04] tracking-[-0.03em]",
            description:
              "max-w-[40ch] text-[clamp(1rem,1.1vw,1.125rem)] md:max-w-[40ch] lg:max-w-[22rem]",
          }}
        />

        <div
          ref={orderRef}
          className="mt-14 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-t border-border-subtle pt-5 text-[clamp(1.125rem,1.8vw,1.5rem)] text-muted-foreground"
        >
          <Eyebrow className="m-0 basis-full">{t("order.usual")}</Eyebrow>
          {[...LAYERS].reverse().map((layer, index) => (
            <span
              key={layer}
              className="inline-flex items-baseline gap-x-4 whitespace-nowrap"
            >
              {index > 0 && (
                <span aria-hidden className="inline-block rtl:-scale-x-100">
                  →
                </span>
              )}
              <span>{t(`order.items.${layer}`)}</span>
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}

function OrderSection() {
  const t = useTranslations("approach");
  const bodyRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    const rail = railRef.current;
    if (!body || !rail) return;

    const chapters = LAYERS.map((layer) =>
      document.getElementById(chapterId(layer)),
    );
    const rows = LAYERS.map((layer) =>
      rail.querySelector<HTMLElement>(`[data-layer="${layer}"]`),
    );

    const update = () => {
      const middle = window.innerHeight / 2;
      let current = -1;
      const progress = chapters.map((chapter, index) => {
        if (!chapter) return 0;
        const rect = chapter.getBoundingClientRect();
        if (rect.top < middle) current = index;
        return Math.min(1, Math.max(0, (middle - rect.top) / rect.height));
      });
      rows.forEach((row, index) => {
        if (!row) return;
        row.style.setProperty("--p", String(progress[index]));
        row.toggleAttribute("data-laid", progress[index] > 0);
        if (index === current) row.setAttribute("aria-current", "step");
        else row.removeAttribute("aria-current");
      });
    };

    const trigger = ScrollTrigger.create({
      trigger: body,
      start: "top bottom",
      end: "bottom top",
      onUpdate: update,
      onRefresh: update,
    });
    update();

    return () => trigger.kill();
  }, []);

  return (
    <section
      aria-label={t("hero.order.label")}
      className="accent-world-blue border-t border-border-subtle pb-(--section-y-bottom)"
    >
      <Container>
        <div
          ref={bodyRef}
          className="grid lg:grid-cols-[13.75rem_minmax(0,1fr)] lg:gap-x-[clamp(2rem,6vw,6rem)]"
        >
          <nav
            ref={railRef}
            aria-label={t("hero.order.label")}
            className="sticky top-14 z-10 -mx-6 bg-background px-6 sm:-mx-8 sm:px-8 md:-mx-12 md:px-12 py-2.5 lg:top-28 lg:mx-0 lg:self-start lg:bg-transparent lg:px-0 lg:pt-(--section-y-top) lg:pb-0"
          >
            <Eyebrow className="m-0 mb-3 hidden lg:block">{t("rail.label")}</Eyebrow>
            <ol className="flex gap-1.5 lg:flex-col-reverse lg:gap-0">
              {LAYERS.map((layer, index) => (
                <li key={layer} className="min-w-0 flex-1">
                  <a
                    href={`#${chapterId(layer)}`}
                    data-layer={layer}
                    onClick={(event) => jumpToSection(event, chapterId(layer))}
                    className="group relative flex items-baseline gap-3.5 border-b border-border-subtle py-2 text-xs text-muted-foreground transition-colors duration-(--motion-base) ease-smooth outline-none focus-visible:text-foreground focus-visible:underline data-laid:text-foreground lg:pt-4 lg:pb-3 lg:text-lg lg:tracking-[-0.01em]"
                  >
                    <span className="hidden min-w-[2ch] text-xs tabular-nums lg:inline">
                      <Num value={index + 1} pad={2} />
                    </span>
                    <span className="truncate group-aria-[current=step]:text-local-accent-text">
                      {t(`hero.order.items.${layer}`)}
                    </span>
                    <span
                      aria-hidden
                      className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-foreground [transform:scaleX(var(--p,0))] rtl:origin-right"
                    />
                  </a>
                </li>
              ))}
            </ol>
            <p className="mt-5 hidden max-w-[24ch] text-[0.8125rem] leading-relaxed text-muted-foreground lg:block">
              {t("rail.note")}
            </p>
          </nav>

          <div>
            <Chapter layer="data" index={0}>
              <Lead>{t("decisions.data.description")}</Lead>
              <Contrast contrast="1" />
            </Chapter>

            <Chapter layer="architecture" index={1}>
              <Lead>{t("constraints.title")}</Lead>
              <Prose paragraphs={t.raw("constraints.paragraphs")} />
              <Principles keys={["scale"]} />
              <Contrast contrast="2" />
            </Chapter>

            <Chapter layer="features" index={2}>
              <Lead>{t("decisions.title")}</Lead>
              <Principles keys={["handoff", "maintenance"]} />
              <Contrast contrast="3" />
            </Chapter>

            <Chapter layer="page" index={3}>
              <Lead>{t("hero.order.note")}</Lead>
              <Prose paragraphs={t.raw("multilingual.paragraphs")} />
              <Specimen />
            </Chapter>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Chapter({
  layer,
  index,
  children,
}: {
  layer: Layer;
  index: number;
  children: ReactNode;
}) {
  const t = useTranslations("approach.hero.order.items");
  const titleRef = useSectionElement<HTMLHeadingElement>();

  return (
    <article
      id={chapterId(layer)}
      tabIndex={-1}
      aria-labelledby={`${chapterId(layer)}-title`}
      className="border-t border-border-subtle py-[clamp(3.5rem,9vh,6.25rem)] outline-none first:border-t-0 lg:first:pt-(--section-y-top)"
    >
      <p className="text-[0.8125rem] text-local-accent-text tabular-nums">
        <Num value={index + 1} pad={2} /> / <Num value={LAYERS.length} pad={2} />
      </p>
      <h2
        ref={titleRef}
        id={`${chapterId(layer)}-title`}
        className="mt-2.5 text-[clamp(2.5rem,5.4vw,5.25rem)] leading-[1.02] font-light tracking-[-0.03em] text-foreground"
      >
        {t(layer)}
      </h2>
      {children}
    </article>
  );
}

function Lead({ children }: { children: ReactNode }) {
  const ref = useSectionElement<HTMLParagraphElement>();
  return (
    <p
      ref={ref}
      className="mt-5 max-w-[30ch] text-[clamp(1.25rem,2vw,1.75rem)] leading-[1.3] tracking-[-0.015em] text-foreground"
    >
      {children}
    </p>
  );
}

function Prose({ paragraphs }: { paragraphs: string }) {
  const ref = useSectionElement<HTMLDivElement>();
  return (
    <div ref={ref} className="mt-8 max-w-[60ch] space-y-4">
      {paragraphs.split("\n\n").map((paragraph, i) => (
        <p key={i} className={cn(BODY, "text-muted-foreground")}>
          {renderBodyText(paragraph)}
        </p>
      ))}
    </div>
  );
}

type Principle = "scale" | "handoff" | "maintenance";

function Principles({ keys }: { keys: Principle[] }) {
  const t = useTranslations("approach.decisions");
  const gridRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-principle]",
  });

  return (
    <div ref={gridRef} className="mt-12 grid gap-x-12 gap-y-8 md:grid-cols-2">
      {keys.map((key) => (
        <div key={key} data-principle>
          <h3 className="text-[1.375rem] leading-tight font-medium tracking-[-0.02em] text-foreground">
            {t(`${key}.title`)}
          </h3>
          <p className={cn(BODY, "mt-2 max-w-[42ch] text-muted-foreground")}>
            {t(`${key}.description`)}
          </p>
        </div>
      ))}
    </div>
  );
}

function Contrast({ contrast }: { contrast: "1" | "2" | "3" }) {
  const t = useTranslations("approach.contrasts");
  const ref = useSectionElement<HTMLDListElement>();

  return (
    <dl
      ref={ref}
      className="mt-12 grid max-w-180 grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2.5 border-t-2 border-foreground pt-5 text-lg"
    >
      <dt className="pt-1 text-[0.8125rem] text-muted-foreground">
        {t("label.common")}
      </dt>
      <dd className="text-muted-foreground">
        <span className={STRIKE_LINE}>{t(`${contrast}.common`)}</span>
      </dd>
      <dt className="pt-1 text-[0.8125rem] text-local-accent-text">
        {t("label.altruvex")}
      </dt>
      <dd className="text-foreground">{t(`${contrast}.altruvex`)}</dd>
    </dl>
  );
}

const TYPE_NOTES = ["face", "leading", "tracking", "direction"] as const;

function Specimen() {
  const t = useTranslations("approach.multilingual.specimen");
  const ref = useSectionElement<HTMLElement>();

  return (
    <figure
      ref={ref}
      aria-labelledby="approach-specimen-label"
      className="mt-12 border-t border-border-subtle pt-7"
    >
      <figcaption>
        <Eyebrow id="approach-specimen-label" className="m-0">
          {t("label")}
        </Eyebrow>
      </figcaption>

      <div className="mt-5 grid gap-8 md:grid-cols-2">
        <div>
          <p className="text-[0.8125rem] text-muted-foreground">{t("en.label")}</p>
          <p
            lang="en"
            dir="ltr"
            className="mt-2 text-start font-sans text-[clamp(1.625rem,3vw,2.625rem)] leading-[1.15] font-light tracking-[-0.03em] text-foreground"
          >
            {t("en.text")}
          </p>
        </div>
        <div>
          <p className="text-[0.8125rem] text-local-accent-text">{t("ar.label")}</p>
          <p
            lang="ar"
            dir="rtl"
            className="mt-2 text-start font-sans text-[clamp(1.625rem,3vw,2.625rem)] leading-(--lh-heading-ar) font-(--weight-ar-display-light) tracking-normal text-foreground"
          >
            {t("ar.text")}
          </p>
        </div>
      </div>

      <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {TYPE_NOTES.map((key) => (
          <div key={key}>
            <dt className="eyebrow text-muted-foreground">
              {t(`notes.${key}.term`)}
            </dt>
            <dd className="mt-2 max-w-[36ch] text-[0.9375rem] leading-relaxed text-foreground">
              {t(`notes.${key}.value`)}
            </dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

const REFUSALS = ["1", "2", "3", "4", "5"] as const;

function RefusalsSection() {
  const t = useTranslations("approach.boundaries");
  const titleRef = useSectionTitle();
  const introRef = useSectionDescription();
  const listRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-refusal]",
  });

  return (
    <section
      aria-labelledby="approach-refusals-heading"
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <h2
          ref={titleRef}
          id="approach-refusals-heading"
          className="text-[clamp(2.5rem,5.4vw,5.25rem)] leading-[1.02] font-light tracking-[-0.03em] text-foreground"
        >
          {t("title")}
        </h2>
        <p
          ref={introRef}
          className="mt-4 text-[clamp(1.0625rem,1.05vw,1.125rem)] text-muted-foreground"
        >
          {t("intro")}
        </p>

        <ol ref={listRef} className="mt-10">
          {REFUSALS.map((key, index) => (
            <li
              key={key}
              data-refusal
              className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-t border-border-subtle py-5 md:grid-cols-[4rem_minmax(0,1fr)]"
            >
              <span className="pt-2 text-[0.8125rem] text-muted-foreground tabular-nums">
                <Num value={index + 1} pad={2} />
              </span>
              <p className="max-w-[48ch] text-[clamp(1.1875rem,1.8vw,1.625rem)] leading-snug tracking-[-0.015em] text-foreground">
                {t(`items.${key}`)}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

function ClosingSection() {
  const t = useTranslations("approach.closing");

  return (
    <SectionEndCta
      title={t("title")}
      titleAccent={t("titleItalic")}
      body={t.rich("description", bodyMarks)}
      primary="technicalCall"
      secondary="projectRange"
    />
  );
}
