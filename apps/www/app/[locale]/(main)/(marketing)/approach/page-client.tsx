"use client";

import { SectionEndCta } from "@/components/sections/section-end-cta";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks, renderBodyText } from "@/components/ui/rich-text";
import {
  MOTION,
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { cn, splitHeadline } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { DecisionOrder } from "./decision-order";

export default function ApproachPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <OpeningSection />
      <ErrorBoundary>
        <ContrastsSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <PrinciplesSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <ConstraintsSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <DirectionSection />
      </ErrorBoundary>
      <ClosingSection />
    </div>
  );
}

const BODY = "text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75]";

/**
 * The page's statement, and under it the order decisions are made in - the
 * statement drawn, so "we do not design pages first" is something a visitor
 * sees rather than takes on trust.
 */
function OpeningSection() {
  const t = useTranslations("approach.hero");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const { first, second } = splitHeadline(t("title"));

  return (
    <section
      aria-labelledby="approach-hero-heading"
      className="accent-world-blue pt-(--section-y-top) pb-(--section-y-bottom)"
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
              "max-w-[20ch] text-[clamp(2.5rem,5.2vw,4.75rem)] font-light leading-[1.04] tracking-[-0.03em]",
            description:
              "max-w-[40ch] text-[clamp(1rem,1.1vw,1.125rem)] md:max-w-[40ch] lg:max-w-[22rem]",
          }}
        />
        <DecisionOrder />
      </Container>
    </section>
  );
}

const CONTRASTS = ["1", "2", "3"] as const;

/**
 * Three sentences set as a register: what is usually said on the left, what is
 * said here on the right, read across one line. Quiet on purpose - the page's
 * two drawn moments sit above and below it.
 */
function ContrastsSection() {
  const t = useTranslations("approach.contrasts");
  const sectionRef = useSectionCardGrid<HTMLElement>({
    selector: "[data-contrast-row]",
  });
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();

  return (
    <section
      ref={sectionRef}
      aria-labelledby="approach-contrasts-heading"
      className="accent-world-green border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="approach-contrasts-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          classes={{ title: "max-w-[22ch]" }}
        />

        <div className="mt-14 lg:mt-20">
          <div
            aria-hidden
            className="hidden border-t-2 border-foreground pt-4 pb-6 md:grid md:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] md:gap-x-10"
          >
            <span />
            <Eyebrow className="m-0">{t("label.common")}</Eyebrow>
            <Eyebrow tone="accent" className="m-0">
              {t("label.altruvex")}
            </Eyebrow>
          </div>

          <ol className="border-t-2 border-foreground md:border-t-0">
            {CONTRASTS.map((key, index) => (
              <li
                key={key}
                data-contrast-row
                className="grid gap-y-5 border-b border-border-subtle py-8 md:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] md:gap-x-10 md:py-10 md:first:border-t"
              >
                <span className="font-mono text-xs text-muted-foreground tabular-nums md:pt-2">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <Eyebrow className="m-0 mb-2 md:hidden">{t("label.common")}</Eyebrow>
                  <p className="max-w-[30ch] text-xl leading-snug font-light text-muted-foreground md:text-2xl">
                    {t(`${key}.common`)}
                  </p>
                </div>
                <div>
                  <Eyebrow tone="accent" className="m-0 mb-2 md:hidden">
                    {t("label.altruvex")}
                  </Eyebrow>
                  <p className="max-w-[30ch] text-xl leading-snug text-foreground md:text-2xl">
                    {t(`${key}.altruvex`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

const PRINCIPLES = ["data", "scale", "maintenance", "handoff"] as const;

/**
 * Four decisions fixed before implementation, set in the quarters of one
 * drafting cross rather than as four cards. The cross is the only line in the
 * section; below `md` it becomes the rules between the stacked principles.
 */
function PrinciplesSection() {
  const t = useTranslations("approach.decisions");
  const gridRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-principle]",
  });
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const { first, second } = splitHeadline(t("title"));

  return (
    <section
      aria-labelledby="approach-principles-heading"
      className="accent-world-green border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="approach-principles-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          eyebrow={t("eyebrow")}
          firstTitle={first}
          secondTitle={second}
          classes={{ title: "max-w-[22ch]" }}
        />

        <div
          ref={gridRef}
          className="relative mt-14 grid md:auto-rows-fr md:grid-cols-2 lg:mt-20"
        >
          <span
            aria-hidden
            className="absolute inset-y-0 start-1/2 hidden w-px bg-border-subtle md:block"
          />
          <span
            aria-hidden
            className="absolute inset-x-0 top-1/2 hidden h-px bg-border-subtle md:block"
          />
          {PRINCIPLES.map((key, index) => (
            <article
              key={key}
              data-principle
              className={cn(
                "border-t border-border-subtle py-10 md:border-t-0 md:py-12",
                index % 2 === 0 ? "md:pe-12" : "md:ps-12",
                index < 2 ? "md:pt-0" : "md:pb-0",
              )}
            >
              <span className="eyebrow text-local-accent-text tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-2xl leading-tight font-medium tracking-[-0.015em] text-foreground md:text-[1.75rem]">
                {t(`${key}.title`)}
              </h3>
              <p className={cn(BODY, "mt-4 max-w-[44ch] text-muted-foreground")}>
                {t(`${key}.description`)}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

const REFUSALS = ["1", "2", "3", "4", "5"] as const;

/**
 * CLAIM: constraints are a design tool, and we apply them to ourselves first.
 * Constraints and "what we will not do" used to be two sections arguing the
 * same thing; the refusals are now the proof set beside the argument.
 *
 * Signature: the refusals are a list crossed off - each strike draws across
 * its line in reading order. The strike is a background on the inline text,
 * so it follows the words across wrapped lines and mirrors in RTL. Reduced
 * motion renders the list already crossed off.
 */
function ConstraintsSection() {
  const t = useTranslations("approach.constraints");
  const tBounds = useTranslations("approach.boundaries");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const listHeadRef = useSectionElement();
  const listRef = useRef<HTMLOListElement>(null);
  const { first, second } = splitHeadline(t("title"));

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const strikes = list.querySelectorAll("[data-strike]");
        gsap.set(strikes, { backgroundSize: "0% 2px" });

        const tween = gsap.to(strikes, {
          backgroundSize: "100% 2px",
          duration: MOTION.duration.base,
          ease: MOTION.ease.gentle,
          stagger: MOTION.stagger.sequence,
          paused: true,
        });

        const trigger = ScrollTrigger.create({
          trigger: list,
          start: MOTION.trigger.inView,
          once: true,
          onEnter: () => tween.play(),
        });

        return () => {
          trigger.kill();
          tween.kill();
        };
      });
    }, list);

    return () => ctx.revert();
  }, []);

  return (
    <section
      aria-labelledby="approach-constraints-heading"
      className="accent-world-orange border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container className="grid gap-16 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6">
          <SectionHeading
            titleId="approach-constraints-heading"
            eyebrowRef={eyebrowRef}
            titleRef={titleRef}
            eyebrow={t("eyebrow")}
            firstTitle={first}
            secondTitle={second}
            classes={{ title: "max-w-[18ch]" }}
          />
          <div ref={descRef} className="mt-10 max-w-[56ch] space-y-6">
            {t
              .raw("paragraphs")
              .split("\n\n")
              .map((paragraph: string, i: number) => (
                <p key={i} className={cn(BODY, "text-muted-foreground")}>
                  {renderBodyText(paragraph)}
                </p>
              ))}
          </div>
        </div>

        <div className="lg:col-span-5 lg:col-start-8 lg:pt-2">
          <div ref={listHeadRef}>
            <h3 className="text-2xl leading-tight font-medium tracking-[-0.015em] text-foreground">
              {tBounds("title")}
            </h3>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
              {tBounds("intro")}
            </p>
          </div>

          <ol
            ref={listRef}
            className="mt-8 border-t-2 border-foreground"
          >
            {REFUSALS.map((key, index) => (
              <li
                key={key}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)] border-b border-border-subtle py-5"
              >
                <span className="pt-1 font-mono text-xs text-muted-foreground tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-lg leading-[1.6] text-foreground md:text-xl">
                  <span
                    data-strike
                    className="bg-[linear-gradient(var(--local-accent),var(--local-accent))] bg-size-[100%_2px] bg-position-[0_58%] bg-no-repeat box-decoration-slice rtl:bg-position-[100%_50%]"
                  >
                    {tBounds(`items.${key}`)}
                  </span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

const TYPE_NOTES = ["face", "leading", "tracking", "direction"] as const;

/**
 * The old version proved bilingual design with a toggle over "Example
 * Heading" - English placeholder copy inside the Arabic page. This sets the
 * section's own heading in both scripts, each in its own direction and face,
 * and names what changes between them.
 */
function DirectionSection() {
  const t = useTranslations("approach.multilingual");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const specimenRef = useSectionElement<HTMLElement>();
  const { first, second } = splitHeadline(t("title"));

  return (
    <section
      aria-labelledby="approach-direction-heading"
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <SectionHeading
            titleId="approach-direction-heading"
            eyebrowRef={eyebrowRef}
            titleRef={titleRef}
            eyebrow={t("eyebrow")}
            firstTitle={first}
            secondTitle={second}
            className="lg:col-span-5"
            classes={{ title: "max-w-[18ch]" }}
          />
          <div ref={descRef} className="max-w-[56ch] space-y-6 lg:col-span-6 lg:col-start-7 lg:pt-10">
            {t
              .raw("paragraphs")
              .split("\n\n")
              .map((paragraph: string, i: number) => (
                <p key={i} className={cn(BODY, "text-muted-foreground")}>
                  {renderBodyText(paragraph)}
                </p>
              ))}
          </div>
        </div>

        <figure
          ref={specimenRef}
          aria-labelledby="approach-specimen-label"
          className="mt-16 border-t-2 border-foreground lg:mt-24"
        >
          <figcaption className="pt-4">
            <Eyebrow id="approach-specimen-label" className="m-0">
              {t("specimen.label")}
            </Eyebrow>
          </figcaption>

          <div className="grid md:grid-cols-2">
            <div className="border-b border-border-subtle py-10 md:border-e md:border-b-0 md:py-14 md:pe-10">
              <Eyebrow className="m-0">{t("specimen.en.label")}</Eyebrow>
              <p
                lang="en"
                dir="ltr"
                className="mt-6 text-start font-sans text-[clamp(2rem,4vw,3.5rem)] leading-[1.08] font-light tracking-[-0.02em] text-foreground"
              >
                {t("specimen.en.text")}
              </p>
            </div>
            <div className="py-10 md:py-14 md:ps-10">
              <Eyebrow tone="accent" className="m-0">
                {t("specimen.ar.label")}
              </Eyebrow>
              <p
                lang="ar"
                dir="rtl"
                className="mt-6 text-start font-[family-name:var(--font-vazirmatn)] text-[clamp(2rem,4vw,3.5rem)] leading-[1.28] font-light tracking-normal text-foreground"
              >
                {t("specimen.ar.text")}
              </p>
            </div>
          </div>

          <dl className="grid gap-x-10 gap-y-8 border-t border-border-subtle pt-10 sm:grid-cols-2 lg:grid-cols-4">
            {TYPE_NOTES.map((key) => (
              <div key={key}>
                <dt className="eyebrow text-muted-foreground">
                  {t(`specimen.notes.${key}.term`)}
                </dt>
                <dd className="mt-2 max-w-[32ch] text-[0.9375rem] leading-relaxed text-foreground">
                  {t(`specimen.notes.${key}.value`)}
                </dd>
              </div>
            ))}
          </dl>
        </figure>
      </Container>
    </section>
  );
}

function ClosingSection() {
  const t = useTranslations("approach.closing");
  const tContact = useTranslations("contact");
  const email = tContact("emailValue");

  return (
    <SectionEndCta
      title={t("title")}
      titleAccent={t("titleItalic")}
      body={t.rich("description", bodyMarks)}
      footnote={null}
      primary="technicalCall"
      secondary="projectRange"
      aside={
        // The page is read by people who would rather write than book, so the
        // address is a first-class way in beside the buttons, not small print.
        <a
          href={`mailto:${email}`}
          className="group inline-flex min-h-6 items-center gap-3 rounded-ctl-sm text-base text-muted-foreground transition-colors duration-(--motion-drawer) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
        >
          <span aria-hidden className="h-px w-8 bg-local-accent" />
          {t("cta")}
        </a>
      }
    />
  );
}
