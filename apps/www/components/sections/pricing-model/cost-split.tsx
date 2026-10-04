import { ArrowIcon } from "@/components/shared/directional-link";
import { cn } from "@/lib/utils/utils";
import type {
  MaintenanceView,
  PricingDriverView,
} from "@repo/pricing-schema";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { BODY, FIGURE_INLINE, LABEL, MINOR, SUBHEAD } from "./type";

type Effect = PricingDriverView["effect"];

const sentences = (text: string) =>
  text
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

export type CostSplitData = {
  drivers: readonly PricingDriverView[];
  openingRange: string;
  floorLabel: string;
  serviceRanges: readonly { serviceId: string; name: string; range: string }[];
  exampleService: {
    name: string;
    cells: readonly { band: string; price: string }[];
  };
  plans: readonly MaintenanceView[];
};

function Figures({ rows }: { rows: readonly { label: string; value: string }[] }) {
  return (
    <dl className="mt-4 space-y-1.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4">
          <dt className={cn(LABEL, "min-w-0")}>{row.label}</dt>
          <dd className={cn(LABEL, "shrink-0 text-end tabular-nums text-foreground")}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const ROW = "border-t border-border-subtle py-[clamp(3rem,7vh,5rem)]";

const LINK =
  "group inline-flex min-h-6 items-center gap-2 text-brand-text underline underline-offset-4 transition-colors duration-(--motion-hover) hover:decoration-foreground pointer-coarse:min-h-11";

export async function CostSplit({
  locale,
  data,
}: {
  locale: string;
  data: CostSplitData;
}) {
  const t = await getTranslations({ locale, namespace: "pricingModel" });

  const effectFigure = (driver: PricingDriverView): string | null =>
    driver.id === "scope" ? data.floorLabel : driver.spanLabel;

  const effectDetail = (driver: PricingDriverView): ReactNode => {
    switch (driver.id) {
      case "scope":
        return (
          <>
            <p className={cn(LABEL, "mt-1")}>{t("columns.moves.floorNote")}</p>
            <Figures
              rows={data.serviceRanges.map((row) => ({ label: row.name, value: row.range }))}
            />
          </>
        );
      case "complexity":
        return (
          <>
            <p className={LABEL}>
              {t("columns.moves.byBand", { name: data.exampleService.name })}
            </p>
            <Figures
              rows={data.exampleService.cells.map((cell) => ({
                label: cell.band,
                value: cell.price,
              }))}
            />
          </>
        );
      case "content":
      case "timeline":
        return (
          <Figures
            rows={driver.groups.map((group) => ({
              label: group.label,
              value: group.spanLabel,
            }))}
          />
        );
      default:
        return null;
    }
  };

  const afterDetail = (driver: PricingDriverView): ReactNode => {
    if (driver.id === "integrations" || driver.id === "performance") {
      return (
        <ul className={cn(BODY, "mt-3 list-disc space-y-1 ps-5")}>
          {sentences(t(`drivers.${driver.id}.checked`)).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }
    if (driver.id === "operation") {
      return (
        <ul className="mt-4 space-y-1.5">
          {data.plans.map((plan) => (
            <li key={plan.id} className="flex items-baseline justify-between gap-4">
              <span className={cn(LABEL, "min-w-0")}>{plan.name}</span>
              <span className={cn(LABEL, "whitespace-nowrap text-end tabular-nums text-foreground")}>
                {plan.priceLabel}
                {plan.cycleLabel ? (
                  <span className="text-muted-foreground"> {plan.cycleLabel}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      );
    }
    return null;
  };

  const driversFor = (effect: Effect) =>
    data.drivers.filter((driver) => driver.effect === effect);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3 pb-[clamp(3rem,7vh,5rem)]">
        <h3 className={SUBHEAD}>{t("columns.moves.title")}</h3>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={LABEL}>{t("columns.moves.opening")}</span>
          <span className={cn(FIGURE_INLINE, "md:whitespace-nowrap")}>{data.openingRange}</span>
        </p>
      </div>

      <ul className="list-none border-b border-border-subtle">
        {driversFor("moves").map((driver) => {
          const figure = effectFigure(driver);
          return (
            <li
              key={driver.id}
              className={cn(
                ROW,
                "grid gap-x-16 gap-y-4 min-[900px]:grid-cols-2 min-[900px]:grid-rows-[auto_1fr] min-[900px]:items-baseline min-[1200px]:grid-cols-[minmax(0,3fr)_minmax(0,5fr)_minmax(0,4fr)] min-[1200px]:grid-rows-none",
              )}
            >
              <h3 className={SUBHEAD}>{t(`drivers.${driver.id}.name`)}</h3>
              <p className={cn(BODY, "max-w-[40ch] min-[1200px]:col-start-2 min-[1200px]:row-start-1")}>
                {t(`drivers.${driver.id}.line`)}
              </p>
              <div className="min-w-0 min-[900px]:col-start-2 min-[900px]:row-span-2 min-[900px]:row-start-1 min-[900px]:text-end min-[1200px]:col-start-3 min-[1200px]:row-span-1">
                {figure ? (
                  <p className={cn(FIGURE_INLINE, "md:whitespace-nowrap")}>{figure}</p>
                ) : null}
                {effectDetail(driver)}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-(--section-block) grid gap-16 min-[900px]:grid-cols-2 min-[900px]:gap-x-24">
        {(["review", "monthly"] as const).map((effect) => (
          <div key={effect} className="min-w-0">
            <h4 className={MINOR}>{t(`columns.${effect}.title`)}</h4>
            <p className={cn(BODY, "mt-4 max-w-[40ch]")}>{t(`columns.${effect}.lead`)}</p>
            <ul className="mt-8 list-none space-y-8">
              {driversFor(effect).map((driver) => (
                <li key={driver.id} className="max-w-[40ch]">
                  <p className="font-medium text-foreground">{t(`drivers.${driver.id}.name`)}</p>
                  <p className={cn(BODY, "mt-1")}>{t(`drivers.${driver.id}.line`)}</p>
                  {afterDetail(driver)}
                </li>
              ))}
            </ul>
            {effect === "monthly" ? (
              <a href="#investment" className={cn(LINK, "mt-8")}>
                {t("columns.plansLink")}
                <ArrowIcon />
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
