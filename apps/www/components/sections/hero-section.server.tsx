import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { Container } from "@/components/shared/container";
import { Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getCommercialCta } from "@/lib/config/commercial";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { HeroStage } from "./hero-stage";

export async function HeroSectionServer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "hero" });
  const tCTAs = await getTranslations({ locale, namespace: "commercial.ctas" });

  const primaryCta = getCommercialCta("projectRange");
  const secondaryCta = getCommercialCta("realBuild");

  return (
    <section
      id="home"
      aria-labelledby="home-heading"
      className="relative z-10"
    >
      <HeroStage className="hero-stage relative isolate flex h-[88svh] min-h-150 flex-col justify-end overflow-clip text-foreground md:h-[calc(100svh-1.5rem)] md:min-h-160">
        <div data-hero-photo aria-hidden className="hero-photo">
          <div data-hero-zoom className="absolute inset-0">
            <Image
              src="/brand/mood/navy-fabric-light.webp"
              alt=""
              width={2400}
              height={1350}
              sizes="100vw"
              quality={75}
              preload
              fetchPriority="high"
              draggable={false}
              data-arrive="media"
              className="hero-photo-img select-none"
            />
          </div>
        </div>
        <div aria-hidden className="hero-scrim" />
        <Container className="grid max-w-346 gap-5 px-4 pb-11 sm:px-6 md:gap-7 md:px-9 md:pb-[clamp(3rem,7vh,4.5rem)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-x-12 lg:px-13">
          <div className="grid gap-5 md:gap-7">
            <div data-arrive="eyebrow" className="flex items-center gap-3 text-foreground/70">
              <span aria-hidden className="block h-0.5 w-5 shrink-0 bg-current" />
              <Eyebrow className="text-[0.8125rem] text-foreground/70 ltr:max-md:text-xs ltr:max-md:tracking-[0.14em] rtl:text-[0.9375rem] rtl:font-medium">
                {t("badge")}
              </Eyebrow>
            </div>
            <h1
              id="home-heading"
              className="-mt-2 text-[clamp(2.75rem,12vw,3.5rem)] leading-[1.02] font-light tracking-(--track-120-300) text-foreground md:text-[clamp(3.25rem,7.2vw,8.5rem)] rtl:leading-(--lh-heading-ar)"
            >
              <span data-arrive="line" className="block whitespace-nowrap">
                {t("title_line1")}
              </span>{" "}
              <span data-arrive="line" className="block whitespace-nowrap [--arrive-i:1]">
                <Highlight tone="world" className="accent-iris my-[-0.12em] py-[0.12em]">
                  {t("title_line2")}
                </Highlight>
              </span>
            </h1>
          </div>
          <div className="grid justify-items-stretch gap-5 md:justify-items-start md:gap-6 lg:pb-[0.35rem]">
            <p
              data-arrive="description"
              className="max-w-[44ch] text-[1.0625rem] leading-[1.6] text-pretty text-foreground/72 lg:max-w-[36ch] rtl:max-w-[40ch] rtl:lg:max-w-[34ch] rtl:text-lg rtl:leading-[1.85]"
            >
              {t("sub")}
            </p>
            <div data-arrive="element">
              <CtaButtonGroup
                primary={{ href: primaryCta.href, label: tCTAs("projectRange") }}
                secondary={{ href: secondaryCta.href, label: tCTAs("realBuild") }}
                secondaryArrow
                secondaryClassName="hero-glass-pill"
              />
            </div>
          </div>
        </Container>
      </HeroStage>
    </section>
  );
}
