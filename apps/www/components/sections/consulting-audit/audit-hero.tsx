"use client";

import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { bodyMarks } from "@/components/ui/rich-text";
import { getCommercialCta } from "@/lib/config/commercial";
import type { ConsultingView } from "@repo/pricing-schema";
import { useTranslations } from "next-intl";
import { HeroHeadline, HeroReveal } from "../hero-motion-wrappers";
import { Tick } from "./tick";

export function AuditHero({ audit }: { audit: ConsultingView }) {
  const t = useTranslations("serviceDetails.consulting.audit.hero");
  const tCTAs = useTranslations("commercial.ctas");

  return (
    <section
      aria-labelledby="consulting-hero-heading"
      className="bg-background pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <HeroReveal delay={0.1} className="flex items-center gap-3">
          <Tick />
          <Eyebrow tone="accent">{t("eyebrow")}</Eyebrow>
        </HeroReveal>

        <HeroHeadline
          as="h1"
          id="consulting-hero-heading"
          className="mt-7 max-w-6xl text-balance text-[clamp(2.75rem,6vw,6.25rem)] leading-[0.98] font-light tracking-[-0.045em] text-foreground rtl:leading-[1.25] rtl:tracking-normal"
        >
          {t("title")} <Highlight tone="world">{t("titleAccent")}</Highlight>
        </HeroHeadline>

        <div className="mt-11 grid gap-8 lg:grid-cols-2 lg:items-end lg:gap-10">
          <HeroReveal delay={0.5}>
            <p className="max-w-[46ch] text-[clamp(1rem,1.15vw,1.125rem)] leading-relaxed text-muted-foreground">
              {t.rich("description", bodyMarks)}
            </p>
          </HeroReveal>
          <HeroReveal delay={0.62}>
            <CtaButtonGroup
              primaryVariant="accent"
              primary={{ href: "#audit-offer", label: audit.ctaLabel }}
              secondary={{
                href: getCommercialCta("technicalCall").href,
                label: tCTAs("technicalCall"),
              }}
              secondaryArrow
            />
          </HeroReveal>
        </div>
      </Container>
    </section>
  );
}
