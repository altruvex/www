"use client";

import { Container } from "@/components/shared/container";
import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { Eyebrow } from "@/components/ui/eyebrow";
import { accentWorldClass } from "@/lib/config/accent-world";
import { getCommercialCta, type CommercialCtaKey } from "@/lib/config/commercial";
import { useSectionDescription, useSectionElement, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { useTranslations } from "next-intl";
import { SectionHeading } from "./section-heading";

type SectionEndCtaVariant = "contact" | "transparency" | "work";

const VARIANT_PRIMARY: Record<SectionEndCtaVariant, CommercialCtaKey> = {
  contact: "technicalCall",
  transparency: "projectRange",
  work: "projectRange",
};

const VARIANT_SECONDARY: Record<
  SectionEndCtaVariant,
  CommercialCtaKey | null
> = {
  contact: "projectRange",
  transparency: "technicalCall",
  work: "realBuild",
};

type SectionEndCtaProps = {
  variant?: SectionEndCtaVariant;
};

export function SectionEndCta({ variant = "contact" }: SectionEndCtaProps) {
  const t = useTranslations("common.endCta");
  const tCTAs = useTranslations("commercial.ctas");
  const primaryCta = getCommercialCta(VARIANT_PRIMARY[variant]);
  const secondaryKey = VARIANT_SECONDARY[variant];
  const secondaryCta = secondaryKey ? getCommercialCta(secondaryKey) : null;

  const eyebrowRef = useSectionEyebrow();
  const titleRef = useSectionTitle();
  const bodyRef = useSectionDescription();
  const ctaRef = useSectionElement();

  return (
    <section
      className={`border-t border-border pt-(--section-y-top) pb-(--section-y-bottom) ${accentWorldClass("orange")}`}
    >
      <Container>
        <div className="max-w-3xl">
          <SectionHeading
            eyebrowRef={eyebrowRef}
            titleRef={titleRef}
            descriptionRef={bodyRef}
            eyebrow={t("eyebrow")}
            firstTitle={t("title")}
            secondTitle={t("titleAccent")}
            accent="ember"
            secondTitleBreak={false}
            description={t("body")}
            className="block"
            classes={{
              titleWrapper: "space-y-0",
              eyebrow: "text-local-accent mb-4",
              title: "text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.12] font-normal text-foreground mb-4",
              description: "max-w-xl mb-8 text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-relaxed text-muted-foreground",
            }}
          />
          <CtaButtonGroup
            ref={ctaRef}
            primaryVariant="accent"
            primary={{ href: primaryCta.href, label: tCTAs(VARIANT_PRIMARY[variant]) }}
            secondary={
              secondaryCta && secondaryKey
                ? { href: secondaryCta.href, label: tCTAs(secondaryKey) }
                : undefined
            }
            secondaryArrow
            className="gap-3"
          />
          <Eyebrow className="text-xs mt-6">{t("footnote")}</Eyebrow>
        </div>
      </Container>
    </section>
  );
}
