"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import { bodyMarks } from "@/components/ui/rich-text";
import {
  MOTION,
  useSectionCardGrid,
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { ScrollTrigger, gsap } from "@/lib/utils/gsap";
import { cn } from "@/lib/utils/utils";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

const PRINCIPLE_ITEMS = ["scope", "ownership", "handover", "pricing"] as const;

const LEDGER_COLUMNS =
  "lg:grid-cols-[3rem_minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-x-12";

/**
 * CLAIM: the first four letters of the name are a rule, and the rule has a
 * price. PROOF: anatomy - the name itself, drawn once, with the part that
 * carries the rule marked in place - followed by the ledger of what that rule
 * costs, commitment against cost, line by line.
 *
 * The wordmark is always set left-to-right in Outfit, in both locales: it is
 * the name as written, not a translated heading. It is `aria-hidden`; the
 * label under the bracket is the readable version of what it shows.
 *
 * Signature: the bracket under "Altr" draws once when the specimen is well in
 * view, then the label settles. With reduced motion the bracket is simply
 * there - the colour of the four letters already makes the point.
 */
export function NamePrincipleSection() {
  const t = useTranslations("about.principle");
  const labelDir = useLocale() === "ar" ? "rtl" : "ltr";
  const specimenRef = useRef<HTMLDivElement>(null);

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const leadRef = useSectionDescription();
  const ledgerRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-ledger-row]",
  });

  useEffect(() => {
    const specimen = specimenRef.current;
    if (!specimen) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const bracket = specimen.querySelector("[data-specimen-bracket]");
        const label = specimen.querySelector("[data-specimen-label]");

        gsap.set(bracket, { transformOrigin: "left center", scaleX: 0 });
        gsap.set(label, { opacity: 0, y: MOTION.distance.xs });

        const timeline = gsap
          .timeline({ paused: true })
          .to(bracket, {
            scaleX: 1,
            duration: MOTION.duration.base,
            ease: MOTION.ease.strong,
          })
          .to(
            label,
            {
              opacity: 1,
              y: 0,
              duration: MOTION.duration.fast,
              ease: MOTION.ease.text,
            },
            "-=0.3",
          );

        const trigger = ScrollTrigger.create({
          trigger: specimen,
          start: MOTION.trigger.inView,
          once: true,
          onEnter: () => timeline.play(),
        });

        return () => {
          trigger.kill();
          timeline.kill();
        };
      });
    }, specimen);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="operating-principle"
      aria-labelledby="operating-principle-heading"
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="operating-principle-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          classes={{ title: "max-w-[20ch]" }}
        />

        <div ref={specimenRef} dir="ltr" className="mt-14 lg:mt-20">
          <p
            aria-hidden
            className="select-none font-[family-name:var(--font-outfit)] text-[clamp(4.5rem,18vw,15rem)] font-semibold leading-[0.9] tracking-[-0.05em] text-foreground"
          >
            <span className="relative inline-block text-local-accent-text">
              Altr
              <span
                data-specimen-bracket
                className="absolute inset-x-[0.04em] top-full mt-2 block h-3 border-x-2 border-b-2 border-local-accent lg:mt-4 lg:h-4"
              />
            </span>
            uvex
          </p>
          <p
            data-specimen-label
            dir={labelDir}
            className="mt-8 max-w-[36ch] text-start text-[clamp(1rem,1.3vw,1.1875rem)] leading-snug text-foreground lg:mt-10"
          >
            {t("specimenLabel")}
          </p>
        </div>

        <div
          ref={leadRef}
          className="mt-16 grid gap-6 border-t border-border-subtle pt-10 md:grid-cols-2 md:gap-12 lg:mt-20"
        >
          <p className="max-w-[56ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
            {t.rich("lead1", bodyMarks)}
          </p>
          <p className="max-w-[56ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
            {t.rich("lead2", bodyMarks)}
          </p>
        </div>

        <div className="mt-16 lg:mt-20">
          <div
            aria-hidden
            className={cn("hidden border-b border-border-subtle pb-4 lg:grid", LEDGER_COLUMNS)}
          >
            <span />
            <Eyebrow className="m-0">{t("commitmentLabel")}</Eyebrow>
            <Eyebrow tone="accent" className="m-0">
              {t("costLabel")}
            </Eyebrow>
          </div>
          <ol ref={ledgerRef} className="flex flex-col">
            {PRINCIPLE_ITEMS.map((key, index) => (
              <li
                key={key}
                data-ledger-row
                className={cn(
                  "grid gap-6 border-b border-border-subtle py-10 lg:gap-y-0 lg:py-12",
                  LEDGER_COLUMNS,
                )}
              >
                <Eyebrow className="m-0 lg:pt-2">
                  <Num value={index + 1} pad={2} />
                </Eyebrow>
                <div>
                  <h3 className="text-[clamp(1.25rem,1.8vw,1.5rem)] font-medium leading-[1.25] tracking-[-0.015em] text-foreground">
                    {t(`items.${key}.label`)}
                  </h3>
                  <p className="mt-4 max-w-[62ch] text-[1.0625rem] leading-[1.8] text-muted-foreground">
                    {t(`items.${key}.body`)}
                  </p>
                </div>
                <div className="border-s-2 border-local-accent/50 ps-5">
                  <Eyebrow tone="accent" className="m-0 mb-2 lg:hidden">
                    {t("costLabel")}
                  </Eyebrow>
                  <p className="max-w-[46ch] text-[0.9375rem] leading-[1.8] text-foreground">
                    {t(`items.${key}.cost`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-12 max-w-[48ch] text-[clamp(1.125rem,1.6vw,1.375rem)] leading-snug">
            <Highlight tone="contrast">{t("closing")}</Highlight>
          </p>
        </div>
      </Container>
    </section>
  );
}
