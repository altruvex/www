import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { Container } from "@/components/shared/container";
import { Highlight } from "@repo/ui/www/emphasis";
import { IntentLinks } from "@/components/interactive/intent-links";
import { Eyebrow } from "@repo/ui/www/eyebrow";
import { TrackedCtaLink } from "@/components/interactive/tracked-cta-link";
import { CAPACITY } from "@/lib/config/capacity";
import { getCommercialCta } from "@/lib/config/commercial";
import { getPublicPricing } from "@/lib/server/pricing";
import { consultingView, type Locale } from "@repo/pricing-schema";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { HeroStage } from "./hero-stage";

export async function HeroSectionServer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "hero" });
  const tCTAs = await getTranslations({ locale, namespace: "commercial.ctas" });

  const pricing = await getPublicPricing();
  const auditFee = consultingView("technical-audit", locale as Locale, pricing).creditAmountLabel;
  const auditCta = getCommercialCta("technicalAudit");
  const capacity = CAPACITY.projects !== null && CAPACITY.projects > 0 ? CAPACITY.projects : null;

  const primaryCta = getCommercialCta("describeTheBuild");
  const secondaryCta = getCommercialCta("projectRange");

  return (
    <section
      id="home"
      aria-labelledby="home-heading"
      className="relative z-10"
    >
      {/* Below md the stage grows with its content (min-h, not h): the stacked
          phone hero is taller than 88svh, and a fixed height pushed the eyebrow
          and title up under the header. pt-24 keeps them clear of the 56px bar. */}
      <HeroStage className="hero-stage relative isolate flex min-h-[max(88svh,37.5rem)] flex-col justify-end overflow-clip pt-24 text-foreground md:h-[calc(100svh-1.5rem)] md:min-h-160 md:pt-0">
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
        {/* Below md the two title lines may wrap: at phone widths a nowrap line
            is wider than the column and pushes the whole hero past its gutter. */}
        {/* The sub sits beside the title only from xl: between lg and xl the
            descriptive title lines ("and digital products.") are wider than the
            title column and would run into the sub. */}
        <Container className="grid max-w-346 gap-5 px-4 pb-11 sm:px-6 md:gap-7 md:px-9 md:pb-[clamp(3rem,7vh,4.5rem)] lg:px-13 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end xl:gap-x-12">
          <div className="grid gap-5 md:gap-7">
            <div data-arrive="eyebrow" className="flex items-center gap-3 text-foreground/70">
              <span aria-hidden className="block h-0.5 w-5 shrink-0 bg-current" />
              <Eyebrow className="text-md text-foreground/70 ltr:max-md:text-xs ltr:max-md:tracking-[0.14em] rtl:text-base rtl:font-medium">
                {t("badge")}
              </Eyebrow>
            </div>
            <h1
              id="home-heading"
              className="-mt-2 text-[clamp(2.75rem,12vw,3.5rem)] leading-[1.02] font-light tracking-(--track-120-300) text-foreground md:text-[clamp(3.25rem,7.2vw,6.25rem)] xl:text-[clamp(3.25rem,6.25vw,5.5rem)] rtl:leading-(--lh-heading-ar)"
            >
              <span data-arrive="line" className="block text-balance md:whitespace-nowrap">
                {t("title_line1")}
              </span>{" "}
              <span data-arrive="line" className="block text-balance md:whitespace-nowrap [--arrive-i:1]">
                <Highlight tone="iris" className="my-[-0.12em] py-[0.12em]">
                  {t("title_line2")}
                </Highlight>
              </span>
            </h1>
          </div>
          <div className="grid justify-items-stretch gap-5 md:justify-items-start md:gap-6 xl:pb-[0.35rem]">
            <p
              data-arrive="description"
              className="max-w-[44ch] text-body leading-[1.6] text-pretty text-foreground/72 xl:max-w-[36ch] rtl:max-w-[40ch] rtl:xl:max-w-[34ch] rtl:text-lg rtl:leading-[1.85]"
            >
              {t("sub")}
            </p>
            <div
              data-arrive="element"
              className="flex flex-col items-start gap-x-8 gap-y-4 sm:flex-row sm:items-center"
            >
              <CtaButtonGroup
                primary={{ href: primaryCta.href, label: tCTAs("describeTheBuild") }}
                secondary={{ href: secondaryCta.href, label: tCTAs("projectRange") }}
                secondaryArrow
              />
            </div>
            <p data-arrive="element" className="max-w-[44ch] text-sm text-pretty text-foreground/72 xl:max-w-[36ch] rtl:max-w-[40ch] rtl:xl:max-w-[34ch]">
              {t("note")}
            </p>
            {capacity !== null && (
              <p data-arrive="element" className="max-w-[44ch] text-sm text-pretty text-foreground/72 xl:max-w-[36ch] rtl:max-w-[40ch] rtl:xl:max-w-[34ch]">
                {t("capacity", { count: capacity })}
              </p>
            )}
          </div>
          <div data-arrive="element" className="xl:col-span-2">
            <IntentLinks
              source="home-hero"
              question={t("intent.question")}
              labels={{
                "new-build": t("intent.new-build"),
                "replace-existing": t("intent.replace-existing"),
                "improve-existing": t("intent.improve-existing"),
              }}
              className="hidden text-sm leading-[1.9] text-pretty text-foreground/72 md:block"
            />
            {auditFee !== null && (
              <p className="text-sm leading-[1.9] md:mt-1 text-pretty text-foreground/72">
                {t.rich("intent.auditStart", {
                  fee: auditFee,
                  link: (chunks) => (
                    <TrackedCtaLink
                      href={auditCta.href}
                      ctaKey="technicalAudit"
                      ctaContext="source=home-hero-audit"
                      className="min-h-6 rounded-ctl-sm text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors duration-(--motion-drawer) ease-smooth outline-none hover:decoration-current focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background pointer-coarse:min-h-11"
                    >
                      {chunks}
                    </TrackedCtaLink>
                  ),
                })}
              </p>
            )}
          </div>
        </Container>
      </HeroStage>
    </section>
  );
}
