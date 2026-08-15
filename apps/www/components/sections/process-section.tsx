"use client";

import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import {
  useBatch,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { cn, splitHeadline } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { SectionHeading } from "./section-heading";

/**
 * `share` is each phase's slice of the calendar, taken from the upper bound of
 * the timeline strings in `process.steps.*.timeline`
 * (5d · 7d · 42d · 5d = 59 days). The strings stay the display value — they are
 * localized prose ("2 – 6 weeks" / "٢ – ٦ أسابيع") and parsing them at runtime
 * would break the moment a translation phrases a range differently.
 *
 * Keep the two in sync: if a timeline string changes, change the share here.
 */
const STEPS = [
  { key: "step1", share: "w-[8.5%]" },
  { key: "step2", share: "w-[11.9%]" },
  { key: "step3", share: "w-[71.1%]" },
  { key: "step4", share: "w-[8.5%]" },
] as const;

/**
 * Delivery Model — the calendar, to scale.
 *
 * Claim: clear phases, no vague middle.
 * Proof shape: consequence over time — the argument is *how long each phase
 * actually takes*, so time owns an axis.
 * Device: a horizontal time axis whose segments are sized to their real
 * durations. It makes one thing undeniable at a glance: the build is roughly
 * seven tenths of the calendar and the client-facing phases are days, not
 * weeks. Four equal cards flattened that into "four steps of equal weight",
 * which is the opposite of what the timelines say.
 *
 * The proportions are CSS widths, so the claim survives with motion disabled.
 * Runs inside the inverted scene — every colour is a scene token.
 */
export const ProcessSection = memo(function ProcessSection() {
  const t = useTranslations("process");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const subtitleRef = useSectionDescription<HTMLParagraphElement>();
  const axisRef = useSectionElement();
  const footerRef = useSectionElement();
  const listRef = useBatch<HTMLOListElement>({
    selector: "[data-phase]",
    distance: 24,
    stagger: 0.08,
  });

  const { first, second } = splitHeadline(t("title"));

  return (
    <section
      id="process"
      aria-labelledby="process-heading"
      className="pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="process-heading"
          theme="surface"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={subtitleRef}
          eyebrow={t("eyebrow")}
          firstTitle={first}
          secondTitle={second}
          description={t.rich("subtitle", bodyMarks)}
          className="mb-14 lg:mb-18"
        />

        {/* The axis. Segment widths are the durations — this is the section's
            one signature moment, and it is structural, not animated. */}
        <div ref={axisRef}>
          <div aria-hidden className="flex h-2 w-full gap-1">
            {STEPS.map((step, index) => (
              <span
                key={step.key}
                className={cn(
                  "shrink-0 rounded-[2px]",
                  step.share,
                  index === 2 ? "bg-local-accent" : "bg-local-accent/35",
                )}
              />
            ))}
          </div>
          <div className="mt-3 flex w-full gap-1">
            {STEPS.map((step) => (
              <span
                key={step.key}
                className={cn(
                  "shrink-0 truncate text-[11px] leading-normal text-s-mid ltr:font-mono",
                  step.share,
                )}
              >
                {t(`steps.${step.key}.timeline`)}
              </span>
            ))}
          </div>
        </div>

        <ol ref={listRef} className="mt-12 list-none border-b border-s-border">
          {STEPS.map((step, index) => (
            <li
              key={step.key}
              data-phase
              className="grid gap-x-10 gap-y-4 border-t border-s-border py-8 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] md:py-10"
            >
              <div>
                <div className="flex items-baseline gap-4">
                  <span
                    aria-hidden
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      index === 2 ? "bg-local-accent" : "bg-local-accent/35",
                    )}
                  />
                  <Eyebrow className="text-s-mid">
                    {t(`steps.${step.key}.tag`)}
                  </Eyebrow>
                </div>
                <h3 className="mt-3 text-[clamp(1.25rem,2vw,1.625rem)] font-medium leading-[1.2] tracking-[-0.02em] text-s-high">
                  {t(`steps.${step.key}.title`)}
                </h3>
                <p className="mt-2 text-sm text-s-mid ltr:font-mono">
                  <span className="sr-only">{t("meta.timeline")}: </span>
                  {t(`steps.${step.key}.timeline`)}
                </p>
              </div>

              <div>
                <p className="max-w-[58ch] text-[clamp(1rem,1.02vw,1.0625rem)] leading-[1.7] text-s-mid">
                  {t.rich(`steps.${step.key}.description`, bodyMarks)}
                </p>
                <p className="mt-4 border-s border-s-border ps-4 text-sm leading-relaxed text-s-mid">
                  <span className="eyebrow block text-[11px] text-s-mid">
                    {t("meta.deliverables")}
                  </span>
                  {t(`steps.${step.key}.deliverables`)}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div ref={footerRef} className="mt-12 flex items-center gap-4">
          <Eyebrow className="text-s-mid">{t("footer")}</Eyebrow>
          <span aria-hidden className="hidden h-px flex-1 bg-s-border sm:block" />
        </div>
      </Container>
    </section>
  );
});
