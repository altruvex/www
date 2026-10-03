"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { getCommercialCta } from "@/lib/config/commercial";
import {
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { useTranslations } from "next-intl";

/**
 * The /pricing hero. A client island only for the entrance refs; the rest of
 * the page renders on the server in page.tsx.
 */
export default function PricingHero() {
  const t = useTranslations("pricingModel.hero");
  const tCta = useTranslations("commercial.ctas");

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();
  const ctaRef = useSectionElement<HTMLDivElement>();

  return (
    <section
      aria-labelledby="pricing-heading"
      className="accent-world-blue pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleAs="h1"
          titleId="pricing-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("titleLead")}
          secondTitle={t("titleAccent")}
          description={t("lead")}
          classes={{
            titleWrapper: "space-y-6",
            title:
              "max-w-[20ch] text-[clamp(2.5rem,5.2vw,4.75rem)] font-light leading-[1.04] tracking-[-0.03em] rtl:tracking-normal",
            description:
              "max-w-[40ch] text-[clamp(1rem,1.1vw,1.125rem)] md:max-w-[40ch] lg:max-w-[22rem]",
          }}
        />
        <CtaButtonGroup
          ref={ctaRef}
          className="mt-12 md:mt-14"
          primaryVariant="accent"
          secondaryArrow
          primary={{
            href: getCommercialCta("projectRange").href,
            label: tCta("projectRange"),
          }}
          secondary={{
            href: getCommercialCta("technicalCall").href,
            label: tCta("technicalCall"),
          }}
        />
      </Container>
    </section>
  );
}
