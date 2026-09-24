import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { SectionWatermark } from "@/components/section-watermark";
import { Container } from "@/components/shared/container";
import { Accent, Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getCommercialCta } from "@/lib/config/commercial";
import { getTranslations } from "next-intl/server";
import { HeroHeadline, HeroReveal } from "./hero-motion-wrappers";
import { HeroReadout } from "./hero-readout";

export async function HeroSectionServer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const tCTAs = await getTranslations({ locale, namespace: "commercial.ctas" });

  const titlePre = t("hero.title_pre");
  const titleAccent = t("hero.title_accent");
  const titlePost = t("hero.title_post");
  const title2 = t("hero.title2");
  const titlePostNode = /^[.،!?]/.test(titlePost) ? titlePost : ` ${titlePost}`;

  const primaryCta = getCommercialCta("projectRange");
  const secondaryCta = getCommercialCta("realBuild");

  return (
    <section
      id="home"
      className="accent-world-blue relative z-10 flex w-full flex-col justify-end overflow-hidden pt-(--section-y-top) pb-(--section-y-bottom) lg:min-h-dvh"
      aria-labelledby="home-heading"
    >
      <SectionWatermark>{t("hero.watermark")}</SectionWatermark>

      <Container className="flex w-full flex-col justify-end py-12 lg:py-0">
        <HeroReveal delay={0.2} className="mb-6">
          <Eyebrow>{t("hero.badge")}</Eyebrow>
        </HeroReveal>

        <HeroHeadline
          as="h1"
          id="home-heading"
          className="mb-7 max-w-176 font-sans text-[clamp(3rem,4.5vw,4.5rem)] leading-[1.05] font-light tracking-[-0.03em] text-foreground select-none md:mb-8 lg:leading-[1.02] rtl:tracking-normal"
        >
          <span className="block">
            {titlePre} <Accent gradient="iris">{titleAccent}</Accent>
            {titlePostNode}
          </span>
          <Highlight className="block tracking-[-0.02em] rtl:tracking-normal">
            {title2}
          </Highlight>
        </HeroHeadline>

        <HeroReveal delay={0.5} className="mb-8 max-w-2xl md:mb-10">
          <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
            {t("hero.problem")}
          </p>
        </HeroReveal>

        <HeroReveal delay={0.65}>
          <CtaButtonGroup
            primary={{ href: primaryCta.href, label: tCTAs("projectRange") }}
            secondary={{ href: secondaryCta.href, label: tCTAs("realBuild") }}
            secondaryArrow
          />
        </HeroReveal>

        <HeroReveal delay={0.8} className="mt-14 md:mt-20">
          <HeroReadout />
        </HeroReveal>
      </Container>
    </section>
  );
}
