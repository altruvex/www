import { Container } from "@/components/shared/container";
import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { SectionWatermark } from "@/components/section-watermark";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Accent, Highlight } from "@/components/ui/emphasis";
import { getCommercialCta } from "@/lib/config/commercial";
import { getTranslations } from "next-intl/server";
import { HeroBatch, HeroHeadline, HeroReveal } from "./hero-motion-wrappers";
import { HeroScrollHint } from "./hero-scroll-hint";

export async function HeroSectionServer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const tCTAs = await getTranslations({ locale, namespace: "commercial.ctas" });

  const title1 = t("hero.title");
  const title2 = t("hero.title2");
  const titlePre = t("hero.title_pre");
  const titleAccent = t("hero.title_accent");
  const titlePost = t("hero.title_post");
  const titlePostNode = /^[.،!?]/.test(titlePost) ? titlePost : ` ${titlePost}`;
  const watermark = t("hero.watermark");
  const metrics = t.raw("hero.metrics") as Array<{
    value: string;
    label: string;
  }>;

  const primaryCta = getCommercialCta("projectRange");
  const secondaryCta = getCommercialCta("realBuild");

  return (
    <section
      id="home"
      className="accent-world-blue relative z-10 flex lg:min-h-dvh w-full flex-col justify-end overflow-hidden pt-(--section-y-top) pb-(--section-y-bottom)"
      aria-label="Hero section"
    >
      <SectionWatermark>{watermark}</SectionWatermark>
      <div className="grain-overlay" aria-hidden="true" />
      <h1 className="sr-only">
        {title1} {title2}
      </h1>
      <Container>
        <div className="max-w-full sm:max-w-5xl lg:py-0 py-12">
          <HeroReveal
            delay={0.1}
            className="mb-6 flex items-center gap-2 md:hidden"
          >
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-success animate-pulse" />
            <Eyebrow className="text-xs">{t("hero.availability")}</Eyebrow>
          </HeroReveal>
          <HeroReveal
            delay={0.1}
            className="absolute top-(--section-y-top) inset-e-8 hidden md:flex flex-col items-end rtl:items-start gap-2"
          >
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-success animate-pulse" />
              <Eyebrow className="text-xs">{t("hero.availability")}</Eyebrow>
            </div>
            <Eyebrow className="text-xs">{t("hero.badge")}</Eyebrow>
          </HeroReveal>
          <HeroHeadline className="text-[clamp(2.5rem,4.5vw,4.5rem)] leading-[1.05] lg:leading-[1.02] tracking-[-0.03em] rtl:tracking-normal mb-7 md:mb-8 font-sans font-light text-foreground select-none">
            <span className="block">
              {titlePre} <Accent gradient="iris">{titleAccent}</Accent>
              {titlePostNode}
            </span>
            <Highlight className="block tracking-[-0.02em] rtl:tracking-normal">
              {title2}
            </Highlight>
          </HeroHeadline>
          <HeroReveal
            delay={0.5}
            className="mb-8 md:mb-12 grid gap-6 md:grid-cols-[96px_1fr] md:gap-8 items-start"
          >
            <div
              className="h-px w-full bg-border mt-3 hidden md:block"
              aria-hidden
            />
            <div className="space-y-3 max-w-xl">
              <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
                {t("hero.problem")}
              </p>
            </div>
          </HeroReveal>
          <HeroReveal delay={0.65}>
            <CtaButtonGroup
              primary={{ href: primaryCta.href, label: tCTAs("projectRange") }}
              secondary={{ href: secondaryCta.href, label: tCTAs("realBuild") }}
              secondaryArrow
            />
          </HeroReveal>
          <HeroBatch
            delay={0.8}
            className="mt-10 sm:mt-16 grid gap-0 border-t border-border pt-8 sm:pt-10 sm:grid-cols-3"
          >
            {metrics.map((s, i, arr) => (
              <div
                key={s.value}
                className={[
                  "sm:border-e sm:border-border sm:last:border-e-0",
                  "max-sm:border-b max-sm:border-border max-sm:last:border-b-0",
                  "max-sm:py-6 max-sm:first:pt-0 max-sm:last:pb-0",
                ].join(" ")}
                style={{
                  paddingInlineStart:
                    i > 0 ? "clamp(16px, 3vw, 36px)" : undefined,
                  paddingInlineEnd:
                    i < arr.length - 1 ? "clamp(16px, 3vw, 36px)" : undefined,
                }}
              >
                <span className="text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-light tabular-nums text-foreground block">
                  {s.value}
                </span>
                <Eyebrow className="text-xs mt-2 block">{s.label}</Eyebrow>
              </div>
            ))}
          </HeroBatch>
          <HeroReveal delay={1.0}>
            <Eyebrow className="text-xs mt-6 max-w-2xl">{t("hero.productionCallout")}</Eyebrow>
          </HeroReveal>
        </div>
      </Container>
      <HeroScrollHint />
    </section>
  );
}