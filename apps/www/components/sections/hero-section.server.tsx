import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { SectionWatermark } from "@/components/section-watermark";
import { Container } from "@/components/shared/container";
import { Accent, Highlight } from "@/components/ui/emphasis";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getCommercialCta } from "@/lib/config/commercial";
import { cn } from "@/lib/utils/utils";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { HeroBatch, HeroHeadline, HeroReveal } from "./hero-motion-wrappers";
import { HeroScrollHint } from "./hero-scroll-hint";

const HERO_TRIANGLE = {
  desktopLight: {
    src: "/brand/hero-triangle-desktop-light.png",
    width: 1536,
    height: 1024,
  },
  desktopDark: {
    src: "/brand/hero-triangle-desktop-dark.png",
    width: 1536,
    height: 1024,
  },
  mobileLight: {
    src: "/brand/hero-triangle-mobile-light.png",
    width: 853,
    height: 1844,
  },
  mobileDark: {
    src: "/brand/hero-triangle-mobile-dark.png",
    width: 864,
    height: 1821,
  },
} as const;

const HERO_IMAGE_CLASS =
  "select-none object-cover motion-safe:animate-brand-kenburns rtl:-scale-x-100";

export async function HeroSectionServer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const tCTAs = await getTranslations({ locale, namespace: "commercial.ctas" });

  const titlePre = t("hero.title_pre");
  const titleAccent = t("hero.title_accent");
  const titlePost = t("hero.title_post");
  const title2 = t("hero.title2");
  const titlePostNode = /^[.،!?]/.test(titlePost) ? titlePost : ` ${titlePost}`;
  const watermark = t("hero.watermark");
  const metrics = t.raw("hero.metrics") as Array<{
    value: string;
    label: string;
  }>;

  const primaryCta = getCommercialCta("projectRange");
  const secondaryCta = getCommercialCta("realBuild");

  const isRtl = locale === "ar";
  const heroMaskImage = `radial-gradient(120% 120% at ${isRtl ? 15 : 85}% 15%, black 0%, transparent 65%)`;

  return (
    <section
      id="home"
      className="accent-world-blue relative z-10 flex lg:min-h-dvh w-full flex-col justify-end overflow-hidden pt-(--section-y-top) pb-(--section-y-bottom)"
      aria-labelledby="home-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        style={{
          maskImage: heroMaskImage,
          WebkitMaskImage: heroMaskImage,
        }}
      >
        <div className="absolute inset-0 hidden md:block">
          <Image
            src={HERO_TRIANGLE.desktopLight.src}
            alt=""
            aria-hidden
            draggable={false}
            priority
            fill
            sizes="100vw"
            className={cn(HERO_IMAGE_CLASS, "opacity-40 dark:hidden")}
          />
          <Image
            src={HERO_TRIANGLE.desktopDark.src}
            alt=""
            aria-hidden
            draggable={false}
            fill
            sizes="100vw"
            className={cn(HERO_IMAGE_CLASS, "hidden opacity-50 dark:block")}
          />
        </div>
        <div className="absolute inset-0 md:hidden">
          <Image
            src={HERO_TRIANGLE.mobileLight.src}
            alt=""
            aria-hidden
            draggable={false}
            priority
            fill
            sizes="100vw"
            className={cn(HERO_IMAGE_CLASS, "opacity-40 dark:hidden")}
          />
          <Image
            src={HERO_TRIANGLE.mobileDark.src}
            alt=""
            aria-hidden
            draggable={false}
            fill
            sizes="100vw"
            className={cn(HERO_IMAGE_CLASS, "hidden opacity-50 dark:block")}
          />
        </div>
      </div>

      <SectionWatermark>{watermark}</SectionWatermark>

      <Container className="flex w-full flex-col justify-end lg:py-0 py-12">
        <div className="w-full max-w-full">

          <HeroReveal delay={0.1} className="mb-4 flex items-center gap-2">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-success animate-pulse" />
            <Eyebrow className="text-xs">{t("hero.availability")}</Eyebrow>
          </HeroReveal>

          <HeroReveal delay={0.2} className="mb-6">
            <Eyebrow>{t("hero.badge")}</Eyebrow>
          </HeroReveal>

          <HeroHeadline
            as="h1"
            id="home-heading"
            className="mb-7 md:mb-8 max-w-176 text-[clamp(3rem,4.5vw,4.5rem)] leading-[1.05] lg:leading-[1.02] tracking-[-0.03em] rtl:tracking-normal font-sans font-light text-foreground select-none"
          >
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
            className="mb-7 md:mb-8 grid w-full gap-6 md:grid-cols-[96px_1fr] md:gap-8 items-start"
          >
            <div
              className="mt-3 hidden h-px w-full bg-border md:block"
              aria-hidden
            />
            <div className="max-w-2xl space-y-3">
              <p className="text-[clamp(1.0625rem,1.05vw,1.125rem)] leading-[1.75] text-muted-foreground">
                {t("hero.problem")}
              </p>
            </div>
          </HeroReveal>

          <HeroReveal delay={0.65} className="flex flex-col items-start gap-4">
            <CtaButtonGroup
              primary={{ href: primaryCta.href, label: tCTAs("projectRange") }}
              secondary={{ href: secondaryCta.href, label: tCTAs("realBuild") }}
              secondaryArrow
            />
            <Eyebrow className="text-xs text-muted-foreground/70 max-w-2xl">
              {t("hero.productionCallout")}
            </Eyebrow>
          </HeroReveal>

          <HeroBatch
            delay={0.8}
            className="mt-10 grid w-full gap-0 border-t border-border sm:grid-cols-3"
          >
            {metrics.map((s, i, arr) => (
              <div
                key={s.value}
                className={cn(
                  "flex flex-col justify-center",
                  "border-b border-border sm:border-b-0",
                  "sm:border-e sm:border-border",
                  "last:border-b-0 sm:last:border-e-0",
                  "py-6 sm:py-8"
                )}
                style={{
                  paddingInlineStart: i > 0 ? "clamp(16px, 3vw, 36px)" : undefined,
                  paddingInlineEnd: i < arr.length - 1 ? "clamp(16px, 3vw, 36px)" : undefined,
                }}
              >
                <span className="block text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] tracking-[-0.018em] font-light tabular-nums text-foreground">
                  {s.value}
                </span>
                <Eyebrow className="mt-2 block text-xs">{s.label}</Eyebrow>
              </div>
            ))}
          </HeroBatch>
        </div>
      <HeroScrollHint />
      </Container>
    </section>
  );
}