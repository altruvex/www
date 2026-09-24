"use client";

import { usePricingTokens } from "@/components/providers/pricing-tokens-provider";
import { SectionEndCta } from "@/components/sections/section-end-cta";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { ArrowIcon } from "@/components/shared/directional-link";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Link } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/config/commercial";
import {
  MOTION,
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { useProcessPhases } from "@/lib/use-process-phases";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { localizeNumbers, normalizeNumeralsToEnglish } from "@/lib/utils/number";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { CHECK_COUNT } from "../standards/pass-line";

export default function HowWeWorkPage() {
  return (
    <div className="accent-world-green relative min-h-screen w-full overflow-x-clip bg-background text-foreground">
      <OpeningSection />
      <ErrorBoundary>
        <AgreementSection />
      </ErrorBoundary>
      <ErrorBoundary>
        <MapSection />
      </ErrorBoundary>
      <ClosingSection />
    </div>
  );
}

function OpeningSection() {
  const t = useTranslations("how-we-work.hero");
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();

  return (
    <section
      aria-labelledby="how-we-work-heading"
      className="pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleAs="h1"
          titleId="how-we-work-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          description={t("description")}
          classes={{
            titleWrapper: "space-y-6",
            title:
              "max-w-[20ch] text-[clamp(2.5rem,5.2vw,4.75rem)] font-light leading-[1.04] tracking-[-0.03em]",
            description:
              "max-w-[40ch] text-[clamp(1rem,1.1vw,1.125rem)] md:max-w-[40ch] lg:max-w-[22rem]",
          }}
        />
      </Container>
    </section>
  );
}

const CLAUSES = ["who", "updates", "progress", "changes", "warranty", "ownership"] as const;
type Clause = (typeof CLAUSES)[number];

/**
 * CLAIM: everything that recurs during a project is settled before it starts.
 * PROOF: artifact - the working agreement itself, six clauses whose answers
 * are written into the blanks. Every answer is read from a source that
 * already binds the studio: the founder record, the published revision rate
 * and warranty (pricing tokens, so an admin edit reaches this page), and the
 * deliverables /process already promises.
 * DEVICE: a form filled in - each answer sits on its own blank line in the
 * margin column, the question and its terms beside it.
 *
 * Signature: when the agreement reaches the reading line, the answers are
 * written into their blanks in reading order. The markup is the filled form;
 * reduced motion renders it untouched.
 */
function AgreementSection() {
  const t = useTranslations("how-we-work.agreement");
  const locale = useLocale();
  const tFounder = useTranslations("about.founder");
  const tokens = usePricingTokens();
  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const descRef = useSectionDescription();
  const listRef = useRef<HTMLOListElement>(null);

  const warrantyDays = Number(normalizeNumeralsToEnglish(tokens.warrantyDays ?? ""));

  const value = (clause: Clause): string => {
    switch (clause) {
      case "who":
        return tFounder("name");
      case "warranty":
        return t("clauses.warranty.value", {
          n: tokens.warrantyDays ?? "",
          count: Number.isFinite(warrantyDays) ? warrantyDays : 0,
        });
      default:
        return t(`clauses.${clause}.value`);
    }
  };

  const note = (clause: Clause): string => {
    switch (clause) {
      case "who":
        return t("clauses.who.note", { role: tFounder("role") });
      case "changes":
        return t("clauses.changes.note", { revisionRate: tokens.revisionRate ?? "" });
      default:
        return t(`clauses.${clause}.note`);
    }
  };

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const rtl = document.documentElement.dir === "rtl";
        const hidden = rtl ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";
        const answers = list.querySelectorAll("[data-answer]");

        gsap.set(answers, { clipPath: hidden });
        const tween = gsap.to(answers, {
          clipPath: "inset(0 0% 0 0%)",
          duration: MOTION.duration.base,
          ease: MOTION.ease.smooth,
          stagger: MOTION.stagger.loose,
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
      aria-labelledby="agreement-heading"
      className="border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="agreement-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          description={t("description")}
          classes={{ title: "max-w-[22ch]", description: "lg:max-w-[26rem]" }}
        />

        <figure
          aria-labelledby="agreement-label"
          className="mt-14 border-t-2 border-foreground lg:mt-20"
        >
          <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pt-4 pb-2">
            <Eyebrow id="agreement-label" className="m-0" tone="foreground">
              {t("label", {
                n: localizeNumbers(String(CLAUSES.length), locale),
                count: CLAUSES.length,
              })}
            </Eyebrow>
            <span className="text-sm text-muted-foreground">{t("caption")}</span>
          </figcaption>

          <ol ref={listRef}>
            {CLAUSES.map((clause, index) => (
              <Row
                key={clause}
                index={index}
                question={t(`clauses.${clause}.question`)}
                answer={value(clause)}
                note={note(clause)}
              />
            ))}
          </ol>
        </figure>
      </Container>
    </section>
  );
}

function Row({
  index,
  question,
  answer,
  note,
}: {
  index: number;
  question: string;
  answer: string;
  note: string;
}) {
  const locale = useLocale();

  return (
    <li className="grid gap-x-10 gap-y-3 border-b border-border-subtle py-7 md:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.15fr)] md:py-9">
      <span className="font-mono text-xs text-local-accent-text tabular-nums md:pt-1.5">
        {localizeNumbers(String(index + 1).padStart(2, "0"), locale)}
      </span>
      <div>
        <h3 className="text-lg leading-snug text-foreground md:text-xl">{question}</h3>
        <p className="mt-2 max-w-[48ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
          {note}
        </p>
      </div>
      {/* The blank the answer is written into. */}
      <p className="self-start border-b border-foreground/45 pb-2">
        <span
          data-answer
          className="block text-[clamp(1.375rem,2.2vw,1.875rem)] leading-tight font-light tracking-[-0.015em] text-foreground rtl:tracking-normal"
        >
          {answer}
        </span>
      </p>
    </li>
  );
}

const ROUTES = [
  { key: "approach", href: "/approach" },
  { key: "process", href: "/process" },
  { key: "standards", href: "/standards" },
] as const;

/**
 * The page's three children, each with the one figure it is built around,
 * read from the same data the child renders - so the hub cannot quote a
 * number its own page has since changed.
 */
function MapSection() {
  const t = useTranslations("how-we-work.map");
  const tApproach = useTranslations("approach.hero.order");
  const locale = useLocale();
  const phases = useProcessPhases();
  const listRef = useSectionCardGrid<HTMLUListElement>({ selector: "[data-route]" });
  const num = (n: number) => localizeNumbers(String(n), locale);

  const layers = Object.keys(tApproach.raw("items") as Record<string, string>).length;
  const minDays = phases.reduce((sum, phase) => sum + phase.min, 0);
  const maxDays = phases.reduce((sum, phase) => sum + phase.max, 0);

  const figure = {
    approach: t("approach.figure", { n: num(layers), count: layers }),
    process: t("process.figure", {
      phases: num(phases.length),
      phasesCount: phases.length,
      min: num(minDays),
      max: num(maxDays),
    }),
    standards: t("standards.figure", {
      checks: num(CHECK_COUNT),
      checksCount: CHECK_COUNT,
    }),
  };

  return (
    <section
      aria-labelledby="map-heading"
      className="border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <h2 id="map-heading" className="eyebrow text-muted-foreground">
          {t("eyebrow")}
        </h2>
        <ul ref={listRef} className="mt-6 border-t border-border-subtle">
          {ROUTES.map(({ key, href }) => (
            <li key={key} data-route className="border-b border-border-subtle">
              <Link
                href={href}
                className="group grid items-baseline gap-x-8 gap-y-1.5 py-7 focus-visible:rounded-ctl-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1.2fr)_auto]"
              >
                <span className="text-xl font-medium leading-tight tracking-[-0.015em] text-foreground rtl:tracking-normal">
                  {t(`${key}.label`)}
                </span>
                <span className="text-[0.9375rem] font-medium text-local-accent-text tabular-nums">
                  {figure[key]}
                </span>
                <span className="text-[0.9375rem] leading-snug text-muted-foreground transition-colors duration-(--motion-instant) group-hover:text-foreground">
                  {t(`${key}.line`)}
                </span>
                <ArrowIcon className="hidden h-4 w-4 text-foreground transition-transform duration-(--motion-instant) group-hover:translate-x-1 rtl:group-hover:-translate-x-1 md:block" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function ClosingSection() {
  const t = useTranslations("how-we-work.cta");

  return (
    <SectionEndCta
      eyebrow={t("eyebrow")}
      title={t("title")}
      titleAccent={t("titleAccent")}
      body={t("description")}
      primary={{ href: getCommercialCta("technicalCall").href, label: t("schedule") }}
      secondary={{ href: getCommercialCta("realBuild").href, label: t("work") }}
    />
  );
}
