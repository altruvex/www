import { Container } from "@/components/container";
import { MagneticButton } from "@/components/magnetic-button";
import { SectionWatermark } from "@/components/section-watermark";
import { Link } from "@/i18n/navigation";
import { getCommercialCta } from "@/lib/commercial";
import { getTranslations } from "next-intl/server";
import { ArrowIcon } from "../directional-link";
import { HeroHeadline, HeroReveal, HeroBatch } from "./hero-motion-wrappers";

export async function HeroSectionServer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const tCTAs = await getTranslations({ locale, namespace: "commercial.ctas" });

  const title1 = t("hero.title");
  const title2 = t("hero.title2");
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
      className="relative z-10 flex lg:min-h-dvh w-full flex-col justify-end overflow-hidden pt-(--section-y-top) pb-(--section-y-bottom)"
      aria-label="Hero section"
    >
      <SectionWatermark>{watermark}</SectionWatermark>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% -10%, var(--brand-soft), transparent)",
        }}
      />
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
            <span className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70">
              {t("hero.availability")}
            </span>
          </HeroReveal>
          <HeroReveal
            delay={0.1}
            className="absolute top-(--section-y-top) inset-e-8 hidden md:flex flex-col items-end rtl:items-start gap-2"
          >
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-success animate-pulse" />
              <span className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground">
                {t("hero.availability")}
              </span>
            </div>
            <span className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground/70">
              {t("hero.badge")}
            </span>
          </HeroReveal>
          <HeroHeadline className="text-[clamp(2.5rem,4.5vw,4.5rem)] leading-[1.05] lg:leading-[1.02] tracking-[-0.03em] rtl:tracking-normal mb-7 md:mb-8 font-sans font-light text-foreground select-none">
            <span className="block">{title1}</span>
            <span className="block text-foreground/45 font-serif italic font-light tracking-[-0.02em] rtl:tracking-normal rtl:font-sans rtl:not-italic rtl:font-bold">
              {title2}
            </span>
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
          <HeroReveal
            delay={0.65}
            className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center"
          >
            <MagneticButton
              size="lg"
              className="w-full sm:w-auto min-w-[180px]"
            >
              <Link
                href={primaryCta.href}
                className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full"
              >
                <span>{tCTAs("projectRange")}</span>
                <ArrowIcon />
              </Link>
            </MagneticButton>
            <MagneticButton
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto min-w-[180px]"
            >
              <Link
                href={secondaryCta.href}
                className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full"
              >
                <span>{tCTAs("realBuild")}</span>
                <ArrowIcon />
              </Link>
            </MagneticButton>
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
                <span className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal mt-2 block text-muted-foreground">
                  {s.label}
                </span>
              </div>
            ))}
          </HeroBatch>
          <HeroReveal delay={1.0}>
            <p className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal mt-6 max-w-2xl text-muted-foreground">
              {t("hero.productionCallout")}
            </p>
          </HeroReveal>
        </div>
      </Container>
      <HeroReveal
        delay={1.1}
        className="pointer-events-none absolute bottom-7 inset-s-1/2 -translate-x-1/2 rtl:translate-x-1/2 hidden md:flex flex-col items-center gap-2"
      >
        <p
          className="font-mono text-xs leading-normal tracking-[0.22em] uppercase rtl:font-sans rtl:normal-case rtl:tracking-normal text-muted-foreground"
          aria-hidden
        >
          {t("hero.scrollHint")}
        </p>
        <div
          className="relative h-10 w-px overflow-hidden bg-border"
          aria-hidden
        >
          <div className="absolute top-0 h-1/2 w-full bg-border-mid animate-slide-down" />
        </div>
      </HeroReveal>
    </section>
  );
}
