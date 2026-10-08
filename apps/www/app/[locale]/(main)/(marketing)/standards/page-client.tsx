"use client";

import { SectionEndCta } from "@/components/sections/section-end-cta";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Eyebrow } from "@repo/ui/www";
import { Num } from "@/components/ui/num";
import { bodyMarks } from "@/components/ui/rich-text";
import {
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import {
  CHECK_COUNT,
  STANDARDS,
  useCheckText,
  useThresholdText,
  type Check,
} from "./pass-line";

export default function StandardsPage() {
  return (
    <div className="accent-world-green relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <OpeningSection />
      <ErrorBoundary>
        {STANDARDS.map((standard, index) => (
          <Chapter key={standard.id} standard={standard} index={index} />
        ))}
      </ErrorBoundary>
      <ErrorBoundary>
        <GateSection />
      </ErrorBoundary>
      <StandardsEndCta />
    </div>
  );
}

const BODY = "text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75]";

function OpeningSection() {
  const t = useTranslations("standards.hero");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();

  return (
    <section
      aria-labelledby="standards-hero-heading"
      className="pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleAs="h1"
          titleId="standards-hero-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          description={t("description")}
          classes={{
            container: "lg:flex-col lg:items-start lg:gap-8",
            titleWrapper: "space-y-6",
            title:
              "max-w-6xl text-balance text-[clamp(2.75rem,6vw,6.25rem)] font-light leading-[1.04] tracking-[-0.03em]",
            description:
              "max-w-[46ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] lg:max-w-[46ch]",
          }}
        />
      </Container>
    </section>
  );
}

function useNumeralReveal() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const chapter = ref.current;
    if (!chapter || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let first = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (first) {
          first = false;
          if (entry.isIntersecting) {
            observer.disconnect();
            return;
          }
          chapter.dataset.reveal = "armed";
          return;
        }
        if (entry.isIntersecting) {
          chapter.dataset.reveal = "in";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(chapter);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function Chapter({
  standard,
  index,
}: {
  standard: (typeof STANDARDS)[number];
  index: number;
}) {
  const t = useTranslations(`standards.categories.${standard.id}`);
  const chapterRef = useNumeralReveal();
  const registerRef = useSectionCardGrid<HTMLDivElement>({ selector: "[data-register-text]" });
  const lead = standard.checks.find((check) => check.id === standard.lead) ?? standard.checks[0];
  const rest = standard.checks.filter((check) => check !== lead);
  const headingId = `standard-${standard.id}-title`;

  return (
    <section
      ref={chapterRef}
      id={`standard-${standard.id}`}
      aria-labelledby={headingId}
      className="group/chapter relative min-h-svh"
    >
      <div className="sticky top-14 z-2 border-t border-border-subtle bg-background pt-5 pb-[clamp(1rem,2.4vw,1.75rem)] lg:top-15">
        <Container>
          <p className="text-sm text-muted-foreground tabular-nums">
            <Num value={index + 1} pad={2} /> / <Num value={STANDARDS.length} pad={2} />
          </p>
          <LeadNumeral standard={standard.id} check={lead} />
        </Container>
      </div>

      <Container>
        <div
          ref={registerRef}
          className="relative z-1 grid gap-y-7 pt-14 pb-24 sm:pt-[clamp(4.5rem,18vh,12.5rem)] sm:pb-[clamp(6rem,26vh,17.5rem)] min-[900px]:grid-cols-12 min-[900px]:gap-x-[clamp(1rem,2vw,2rem)]"
        >
          <h2
            id={headingId}
            data-register-text
            className="max-w-[14ch] text-[clamp(2rem,3.4vw,3rem)] leading-[1.08] font-light tracking-[-0.03em] text-foreground min-[900px]:col-span-5"
          >
            {t("title")}
          </h2>
          <div className="min-[900px]:col-span-6 min-[900px]:col-start-7">
            <p data-register-text className={cn(BODY, "text-foreground")}>
              {t.rich("description", bodyMarks)}
            </p>
            <p
              data-register-text
              className="mt-6 text-sm leading-[1.7] text-muted-foreground"
            >
              {t("requirements")
                .split(" | ")
                .map((item, i) => (
                  <span key={item}>
                    {i > 0 && (
                      <span aria-hidden className="text-foreground/45">
                        {" · "}
                      </span>
                    )}
                    {item}
                  </span>
                ))}
            </p>
            <ul data-register-text className="mt-12 border-t-2 border-foreground">
              {rest.map((check) => (
                <CheckRow key={check.id} standard={standard.id} check={check} />
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}

function LeadNumeral({ standard, check }: { standard: string; check: Check }) {
  const numeral = useThresholdText(check);
  const { label, passText } = useCheckText(standard, check);

  return (
    <>
      <span aria-hidden className="mt-[clamp(0.5rem,1.4vw,1.25rem)] block overflow-x-clip">
        <span
          className={cn(
            "block text-[24vw] leading-[0.82] font-extralight tracking-[-0.055em] whitespace-nowrap tabular-nums [clip-path:inset(-0.2em_0_-0.1em_0)] sm:text-[clamp(3rem,20vw,22rem)] rtl:tracking-[-0.02em]",
            "group-data-[reveal=armed]/chapter:translate-y-[102%] group-data-[reveal=armed]/chapter:[clip-path:inset(0_0_100%_0)]",
            "group-data-[reveal=in]/chapter:transition-[translate,clip-path] group-data-[reveal=in]/chapter:duration-(--motion-text) group-data-[reveal=in]/chapter:ease-strong",
          )}
        >
          {numeral}
        </span>
      </span>
      <p className="mt-[clamp(0.75rem,1.6vw,1.25rem)] flex flex-col gap-x-4 gap-y-1 border-t border-border-subtle pt-3 text-sm leading-normal sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-medium text-local-accent-text tabular-nums">{passText}</span>
      </p>
    </>
  );
}

function CheckRow({ standard, check }: { standard: string; check: Check }) {
  const { label, passText } = useCheckText(standard, check);

  return (
    <li className="grid grid-cols-1 items-baseline gap-1 border-b border-border-subtle py-4.5 sm:grid-cols-[1fr_auto] sm:gap-4">
      <span className="text-foreground">{label}</span>
      <span className="font-medium text-local-accent-text tabular-nums sm:text-end">
        {passText}
      </span>
    </li>
  );
}

function GateSection() {
  const t = useTranslations("standards.enforcement");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();

  return (
    <section
      data-scene="inverted"
      aria-labelledby="standards-gate-heading"
      className="py-[clamp(7rem,16vh,11.5rem)] text-foreground"
    >
      <Container>
        <Eyebrow ref={eyebrowRef} className="m-0">
          {t("eyebrow")}
        </Eyebrow>
        <h2
          id="standards-gate-heading"
          className="mt-8 text-[clamp(2.5rem,9.6vw,10rem)] leading-[0.95] font-extralight tracking-[-0.045em] tabular-nums rtl:leading-[1.15] rtl:tracking-[-0.01em]"
        >
          <span className="block text-balance">
            {t("count", { n: String(CHECK_COUNT), count: CHECK_COUNT })}
          </span>
        </h2>

        <div className="mt-[clamp(3.5rem,9vh,7rem)] grid gap-y-7 border-t border-border-subtle pt-6 min-[900px]:grid-cols-12 min-[900px]:gap-x-[clamp(1rem,2vw,2rem)]">
          <SectionHeading
            titleAs="h3"
            titleRef={titleRef}
            firstTitle={t("title")}
            secondTitle={t("titleItalic")}
            secondTitleBreak={false}
            italicWorld
            className="min-[900px]:col-span-5"
            classes={{
              title:
                "text-[clamp(1.375rem,1.9vw,1.75rem)] leading-[1.2] font-light tracking-[-0.02em]",
            }}
          />
          <p
            ref={descRef}
            className={cn(BODY, "text-muted-foreground min-[900px]:col-span-6 min-[900px]:col-start-7")}
          >
            {t.rich("description", bodyMarks)}
          </p>
        </div>
      </Container>
    </section>
  );
}

function StandardsEndCta() {
  const t = useTranslations("common.endCta.pages.standards");

  return (
    <SectionEndCta
      title={t("title")}
      titleAccent={t("titleAccent")}
      body={t("body")}
      primary="technicalAudit"
      secondary="describeTheBuild"
    />
  );
}
