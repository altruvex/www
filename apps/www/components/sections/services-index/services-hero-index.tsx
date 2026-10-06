"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { HeroReveal } from "@/components/sections/hero-motion-wrappers";
import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import { getCommercialCta } from "@/lib/config/commercial";
import {
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { useTranslations } from "next-intl";

export function ServicesHeroIndex() {
  const t = useTranslations("servicesPage");
  const tCTAs = useTranslations("commercial.ctas");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();

  return (
    <section
      aria-labelledby="services-hero-heading"
      className="accent-world-orange relative pt-(--section-y-top)"
    >
      <Container>
        <SectionHeading
          titleAs="h1"
          titleId="services-hero-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          classes={{
            container: "lg:flex-col lg:items-start",
            titleWrapper: "space-y-6",
            title:
              "max-w-6xl text-balance text-[clamp(2.75rem,6vw,6.25rem)] font-light leading-[1.02] tracking-[-0.035em] rtl:tracking-normal",
          }}
        />
        <div className="mt-11 grid gap-8 lg:grid-cols-2 lg:items-end lg:gap-10">
          <p
            ref={descRef}
            className="max-w-[46ch] text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-relaxed text-muted-foreground"
          >
            {t.rich("description", {
              strong: (chunks) => (
                <strong className="font-medium text-foreground">
                  {chunks}
                </strong>
              ),
            })}
          </p>
          <HeroReveal delay={0.5} className="lg:justify-self-end">
            <CtaButtonGroup
              primary={{
                href: getCommercialCta("describeTheBuild").href,
                label: tCTAs("describeTheBuild"),
              }}
              secondary={{
                href: getCommercialCta("projectRange").href,
                label: tCTAs("projectRange"),
              }}
              secondaryArrow
            />
          </HeroReveal>
        </div>
      </Container>
    </section>
  );
}
