"use client";

import { Container } from "@/components/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowLabel } from "@/components/directional-link";
import { MagneticButton } from "@/components/magnetic-button";
import { Link } from "@/i18n/navigation";
import { getCommercialCta, type CommercialCtaKey } from "@/lib/commercial";
import { accentWorldClass } from "@/lib/accent-world";
import { useSectionDescription, useSectionElement, useSectionEyebrow, useSectionTitle } from "@/lib/motion";
import { useTranslations } from "next-intl";

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
          <Eyebrow ref={eyebrowRef} tone="accent" className="mb-4">
            {t("eyebrow")}
          </Eyebrow>
          <h2 ref={titleRef} className="text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.12] font-normal text-foreground mb-4">
            {t("title")}
          </h2>
          <p ref={bodyRef} className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground mb-8 max-w-xl">
            {t("body")}
          </p>
          <div ref={ctaRef} className="flex flex-col sm:flex-row gap-3">
            <MagneticButton asChild size="lg" variant="accent" className="w-full sm:w-auto">
              <Link href={primaryCta.href} className="w-full sm:w-auto">
                <ArrowLabel>
                  {tCTAs(VARIANT_PRIMARY[variant])}
                </ArrowLabel>
              </Link>
            </MagneticButton>
            {secondaryCta && secondaryKey ? (
              <MagneticButton
                asChild
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto"
              >
                <Link href={secondaryCta.href} className="w-full sm:w-auto">
                  <ArrowLabel>{tCTAs(secondaryKey)}</ArrowLabel>
                </Link>
              </MagneticButton>
            ) : null}
          </div>
          <p className="eyebrow text-xs text-muted-foreground/60 mt-6">
            {t("footnote")}
          </p>
        </div>
      </Container>
    </section>
  );
}
