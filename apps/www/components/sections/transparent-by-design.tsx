import { Container } from "@/components/shared/container";
import { DirectionalLink } from "@/components/shared/directional-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
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
  const example = workedExampleView(locale as Locale, await getPublicPricing());

  const values: Record<(typeof FACT_IDS)[number], string> = {
    start: example.floorLabel,
    estimate: t("home.facts.estimate.value"),
    pay: t("home.facts.pay.value"),
  };

  const scopeCta = getCommercialCta("scopeProjects");

  return (
    <section
      id="transparent-by-design"
      aria-labelledby="transparent-by-design-heading"
      className="accent-world-blue border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <Container>
        <SectionHeading
          titleId="transparent-by-design-heading"
          eyebrow={t("home.eyebrow")}
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
          <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-muted-foreground md:text-[1.0625rem]">
            {t("home.figureNote")}
          </p>
        </div>

        <TransparentByDesignRow className="mt-(--section-block) grid list-none grid-cols-1 border-t border-border-subtle md:grid-cols-3">
          {FACT_IDS.map((id, index) => (
            <li
              key={id}
              data-stage-figure
              className="min-w-0 border-b border-border-subtle py-5 md:border-b-0 md:pe-7 md:pt-6 md:pb-0"
            >
              <div className="flex items-baseline gap-2.5 text-sm text-muted-foreground">
                <span aria-hidden className="tabular-nums ltr:font-mono">
                  <Num value={index + 1} pad={2} />
                </span>
                <span>{t(`home.facts.${id}.label`)}</span>
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

        <DirectionalLink
          href={scopeCta.href}
          className="mt-(--section-block) min-h-6 rounded-ctl-sm text-base text-foreground transition-colors duration-(--motion-drawer) ease-smooth outline-none hover:text-local-accent-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background pointer-coarse:min-h-11"
        >
          {tCTAs("scopeProjects")}
        </DirectionalLink>
      </Container>
    </section>
  );
}
