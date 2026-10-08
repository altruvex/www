import { CtaButtonGroup } from "@/components/interactive/cta-button-group";
import { Container } from "@/components/shared/container";
import { DirectionalLink } from "@/components/shared/directional-link";
import { Eyebrow } from "@repo/ui/www/eyebrow";
import { getCommercialCta } from "@/lib/config/commercial";
import { getPublicPricing } from "@/lib/server/pricing";
import { workedExampleView, type Locale } from "@repo/pricing-schema";
import { getTranslations } from "next-intl/server";
import { SectionHeading } from "./section-heading";
import { TransparentByDesignRow } from "./transparent-by-design-row";

const FACT_IDS = ["start", "estimate", "pay"] as const;

export async function TransparentByDesign({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "pricingModel" });
  const tCTAs = await getTranslations({ locale, namespace: "commercial.ctas" });
  const tLabel = await getTranslations({ locale, namespace: "commercial.transparency" });
  const example = workedExampleView(locale as Locale, await getPublicPricing());

  const values: Record<(typeof FACT_IDS)[number], string> = {
    start: example.floorLabel,
    estimate: t("home.facts.estimate.value"),
    pay: t("home.facts.pay.value"),
  };

  const estimateCta = getCommercialCta("projectRange", {}, "transparency-estimator");
  const transparencyCta = getCommercialCta("viewTransparency");
  const linkClass =
    "min-h-6 rounded-ctl-sm text-base text-foreground transition-colors duration-(--motion-drawer) ease-smooth outline-none hover:text-local-accent-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background pointer-coarse:min-h-11";

  return (
    <section
      id="transparent-by-design"
      aria-labelledby="transparent-by-design-heading"
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="transparent-by-design-heading"
          eyebrow={tLabel("eyebrow")}
          firstTitle={t("home.title")}
          description={t("home.lead")}
          className="mb-(--heading-gap)"
        />

        <div className="border-t-2 border-foreground pt-7">
          <Eyebrow>
            {t("home.exampleEyebrow", { service: example.serviceLabel })}
          </Eyebrow>
          <p className="mt-5 text-[clamp(1.875rem,6.6vw,7rem)] font-light leading-[1.05] tabular-nums tracking-[-0.035em] text-brand-text rtl:leading-[1.3] rtl:tracking-normal">
            {example.estimateLabel}
          </p>
          <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-muted-foreground md:text-body">
            {t("home.figureNote")}
          </p>
        </div>

        <TransparentByDesignRow className="mt-(--section-block) grid list-none grid-cols-1 border-t border-border-subtle md:grid-cols-3">
          {FACT_IDS.map((id) => (
            <li
              key={id}
              data-stage-figure
              className="min-w-0 border-b border-border-subtle py-5 md:border-b-0 md:pe-7 md:pt-6 md:pb-0"
            >
              <div className="text-sm text-muted-foreground">
                {t(`home.facts.${id}.label`)}
              </div>
              <p className="mt-2 text-[clamp(1.125rem,1.6vw,1.375rem)] leading-snug tabular-nums text-foreground">
                {values[id]}
              </p>
              <p className="mt-1.5 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">
                {t(`home.facts.${id}.note`)}
              </p>
            </li>
          ))}
        </TransparentByDesignRow>

        <div className="mt-(--section-block) flex flex-col items-start gap-x-8 gap-y-4 sm:flex-row sm:items-center">
          <CtaButtonGroup
            primary={{
              href: estimateCta.href,
              label: tCTAs("projectRange"),
              cta: "projectRange",
            }}
          />
          <DirectionalLink href={transparencyCta.href} className={linkClass}>
            {tCTAs("viewTransparency")}
          </DirectionalLink>
        </div>
      </Container>
    </section>
  );
}
