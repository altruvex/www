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
import { splitHeadline } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { SectionHeading } from "./section-heading";

const SERVICE_KEYS = ["service1", "service2", "service3", "service4"] as const;

/**
 * What We Build — one spine, four branches.
 *
 * Claim: four disciplines, one delivery standard (the section's own headline).
 * Proof shape: anatomy of a standard — four applications of a single thing.
 * Device: a continuous spine with four branches coming off it. The structure
 * states the claim before the copy does: the spine is the standard, unbroken
 * through all four, and each discipline hangs off it rather than sitting in its
 * own box. Four equal cards said the opposite — four separate things.
 *
 * This runs inside the inverted scene (`#services-wrapper[data-scene]`), so
 * every colour is a scene token. The build this replaces injected eight
 * hardcoded values as per-card CSS variables
 * (`--card-accent: hsl(230 95% 78% / 0.1)` and friends) — raw HSL tuned by eye
 * for one scene, which is exactly what the token system exists to prevent.
 */
export const ServicesSection = memo(function ServicesSection() {
  const t = useTranslations("services");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const subtitleRef = useSectionDescription<HTMLParagraphElement>();
  const footerRef = useSectionElement();
  const spineRef = useBatch<HTMLOListElement>({
    selector: "[data-branch]",
    distance: 24,
    stagger: 0.08,
  });

  const { first, second } = splitHeadline(t("title"));

  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="services-heading"
          theme="surface"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={subtitleRef}
          eyebrow={t("eyebrow")}
          firstTitle={first}
          secondTitle={second}
          description={t("subtitle")}
          className="mb-14 lg:mb-20"
        />

        {/* The spine is the standard. It runs the full height of the list and
            never breaks; the branches are what changes. */}
        <ol
          ref={spineRef}
          className="list-none border-s border-s-border ps-6 sm:ps-10 lg:ps-14"
        >
          {SERVICE_KEYS.map((key, index) => (
            <li
              key={key}
              data-branch
              className="group relative grid gap-x-10 gap-y-4 py-9 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:py-11"
            >
              {/* Branch stub — the connector back to the spine. */}
              <span
                aria-hidden
                className="pointer-events-none absolute top-[3.25rem] h-px w-4 bg-s-border transition-[width,background-color] duration-300 ease-smooth group-hover:w-6 sm:w-7 sm:group-hover:w-10 ltr:-left-6 sm:ltr:-left-10 lg:ltr:-left-14 rtl:-right-6 sm:rtl:-right-10 lg:rtl:-right-14 motion-reduce:transition-none"
              />

              <div>
                <div className="flex items-baseline gap-4">
                  <span
                    aria-hidden
                    className="shrink-0 text-sm tabular-nums text-s-mid ltr:font-mono"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Eyebrow className="text-s-mid">{t(`${key}.tag`)}</Eyebrow>
                </div>
                <h3 className="mt-4 text-[clamp(1.375rem,2.2vw,1.875rem)] font-medium leading-[1.2] tracking-[-0.02em] text-s-high">
                  {t(`${key}.title`)}
                </h3>
              </div>

              <p className="max-w-[58ch] text-[clamp(1rem,1.05vw,1.125rem)] leading-[1.7] text-s-mid md:pt-1">
                {t.rich(`${key}.description`, bodyMarks)}
              </p>
            </li>
          ))}
        </ol>

        <div
          ref={footerRef}
          className="mt-12 flex items-center gap-4 border-t border-s-border pt-8"
        >
          <Eyebrow className="text-s-mid">{t("footerText")}</Eyebrow>
          <span aria-hidden className="hidden h-px flex-1 bg-s-border sm:block" />
        </div>
      </Container>
    </section>
  );
});
