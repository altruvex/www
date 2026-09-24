"use client";

import { SectionHeading } from "@/components/sections/section-heading";
import { Container } from "@/components/shared/container";
import {
  useSectionDescription,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { useTranslations } from "next-intl";

export function ServicesHeroIndex() {
  const t = useTranslations("servicesPage");

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();

  return (
    <section
      aria-labelledby="services-hero-heading"
      className="accent-world-orange relative pt-(--section-y-top) pb-16 md:pb-24"
    >
      <Container>
        <SectionHeading
          titleAs="h1"
          titleId="services-hero-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("eyebrow")}
          firstTitle={t("title")}
          secondTitle={t("titleItalic")}
          description={t.rich("description", {
            strong: (chunks) => (
              <strong className="font-medium text-foreground">{chunks}</strong>
            ),
          })}
          classes={{
            titleWrapper: "space-y-6",
            title:
              "max-w-[16ch] text-[clamp(2.75rem,6vw,5.75rem)] font-light leading-[1.02] tracking-[-0.035em] rtl:tracking-normal",
            description:
              "max-w-[40ch] text-[clamp(1rem,1.1vw,1.125rem)] md:max-w-[40ch] lg:max-w-[22rem]",
          }}
        />
      </Container>
    </section>
  );
}
