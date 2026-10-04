import { Container } from "@/components/shared/container";
import { DirectionalLink } from "@/components/shared/directional-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getCommercialCta } from "@/lib/config/commercial";
import { getPublicPricing } from "@/lib/server/pricing";
import { cn } from "@/lib/utils/utils";
import { serviceInvestmentViews, type Locale } from "@repo/pricing-schema";
import { getTranslations } from "next-intl/server";

type LineServiceId = "design" | "development";

const ESTIMATOR_QUERY: Record<LineServiceId, string> = {
  design: "",
  development: "?projectType=webapp",
};

export async function ServiceInvestmentLine({
  serviceId,
  locale,
}: {
  serviceId: LineServiceId;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "pricingModel" });
  const tCTAs = await getTranslations({ locale, namespace: "commercial.ctas" });
  const row = serviceInvestmentViews(
    locale as Locale,
    await getPublicPricing(),
  ).find((candidate) => candidate.id === serviceId);
  if (!row) return null;

  const headingId = `service-investment-${serviceId}`;

  return (
    <section
      aria-labelledby={headingId}
      className="bg-background pb-(--section-y-bottom)"
    >
      <Container>
        <div className="grid gap-x-10 gap-y-3 border-y border-border-subtle py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-baseline lg:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto_auto]">
          <Eyebrow id={headingId} className="m-0">
            {t("sections.invest.title")}
          </Eyebrow>
          <p className="text-[0.9375rem] leading-relaxed text-muted-foreground md:col-start-1 lg:col-start-2">
            <span className="font-medium text-foreground">{row.name}</span>
            {" · "}
            {row.how}
          </p>
          <p
            className={cn(
              "md:row-span-2 md:row-start-1 md:col-start-2 md:justify-self-end lg:row-span-1 lg:col-start-3",
              row.isScopedPerProject
                ? "text-[0.9375rem] text-foreground"
                : "text-[clamp(1.125rem,1.4vw,1.375rem)] font-light tabular-nums tracking-[-0.02em] text-brand-text rtl:tracking-normal",
            )}
          >
            {row.figureLabel}
          </p>
          <DirectionalLink
            href={`${getCommercialCta("projectRange").href}${ESTIMATOR_QUERY[serviceId]}`}
            className="min-h-6 text-[0.9375rem] font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand-text hover:decoration-brand-text pointer-coarse:min-h-11 md:col-start-1 lg:col-start-4"
          >
            {tCTAs("projectRange")}
          </DirectionalLink>
        </div>
      </Container>
    </section>
  );
}
