import { ESTIMATOR_STEP } from "@/components/sections/transparency-estimator/constants";
import { ArrowIcon, DirectionalLink } from "@/components/shared/directional-link";
import { getCommercialCta } from "@/lib/config/commercial";
import { formatIndex, localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import type {
  MaintenanceView,
  PricingDriverView,
} from "@repo/pricing-schema";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

type DriverId = PricingDriverView["id"];
type Effect = PricingDriverView["effect"];

/**
 * Which estimator step carries each driver. Structural, not copy: it reads the
 * estimator's own step order.
 */
const QUESTION_NUMBER: Record<DriverId, number> = {
  scope: ESTIMATOR_STEP.projectType,
  complexity: ESTIMATOR_STEP.complexity,
  integrations: ESTIMATOR_STEP.scopeNotes,
  performance: ESTIMATOR_STEP.scopeNotes,
  operation: ESTIMATOR_STEP.scopeNotes,
  content: ESTIMATOR_STEP.conditions,
  timeline: ESTIMATOR_STEP.conditions,
};

/** Splits a "what is checked" sentence run into its items. */
const sentences = (text: string) =>
  text
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

export type CostSplitData = {
  drivers: readonly PricingDriverView[];
  /** The estimator's opening range, before any answer. */
  openingRange: string;
  /** "From …" — the engagement floor. */
  floorLabel: string;
  /** Each project type from its lowest cell to its highest. */
  serviceRanges: readonly { serviceId: string; name: string; range: string }[];
  /** The worked example's project type, by complexity band. */
  exampleService: {
    name: string;
    cells: readonly { band: string; price: string }[];
  };
  plans: readonly MaintenanceView[];
};

function Figures({ rows }: { rows: readonly { label: string; value: string }[] }) {
  return (
    <dl className="divide-y divide-border-subtle/60 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="min-w-0 text-muted-foreground">{row.label}</dt>
          <dd className="shrink-0 text-end tabular-nums text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const CAPTION = "text-xs leading-snug text-muted-foreground";

const LINK =
  "min-h-6 text-sm text-foreground underline decoration-border underline-offset-4 transition-colors duration-(--motion-hover) hover:decoration-foreground pointer-coarse:min-h-11";

/**
 * 02 What determines cost, read top to bottom. What the estimator prices sits
 * first and full width, one row per driver: what it is, its real figures, and
 * the estimator question that carries it. What scope review settles and what
 * is billed monthly sit side by side beneath it. Every figure is the schema's;
 * the floor is the one decision figure here and the only one in brand blue.
 */
export async function CostSplit({
  locale,
  data,
}: {
  locale: string;
  data: CostSplitData;
}) {
  const t = await getTranslations({ locale, namespace: "pricingModel" });
  const estimatorHref = `${getCommercialCta("projectRange").href}#transparency-estimator`;

  const effectFor = (driver: PricingDriverView): ReactNode => {
    switch (driver.id) {
      case "scope":
        return (
          <div>
            <p className="text-[clamp(1.25rem,1.8vw,1.5rem)] font-light leading-tight tabular-nums tracking-[-0.02em] text-brand-text rtl:tracking-normal">
              {data.floorLabel}
            </p>
            <p className={cn(CAPTION, "mt-2 mb-5")}>{t("columns.moves.floorNote")}</p>
            <Figures
              rows={data.serviceRanges.map((row) => ({ label: row.name, value: row.range }))}
            />
          </div>
        );
      case "complexity":
        return (
          <div>
            <p className={cn(CAPTION, "mb-4")}>
              {t("columns.moves.byBand", { name: data.exampleService.name })}
            </p>
            <Figures
              rows={data.exampleService.cells.map((cell) => ({
                label: cell.band,
                value: cell.price,
              }))}
            />
          </div>
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

  /** Where the estimator asks about this driver: a plain text link. */
  const questionRef = (driver: PricingDriverView) => (
    <div>
      <DirectionalLink href={estimatorHref} className={LINK}>
        {t("columns.questionLabel", {
          n: localizeNumbers(String(QUESTION_NUMBER[driver.id]), locale),
        })}
      </DirectionalLink>
      <p className={cn(CAPTION, "mt-2")}>{t(`drivers.${driver.id}.question`)}</p>
    </div>
  );

  const extraFor = (driver: PricingDriverView): ReactNode => {
    if (driver.id === "integrations" || driver.id === "performance") {
      return (
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-foreground">
          {sentences(t(`drivers.${driver.id}.checked`)).map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-foreground/45" />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      );
    }
    if (driver.id === "operation") {
      return (
        <>
          <ul className="mt-5 divide-y divide-border-subtle/60 text-sm">
            {data.plans.map((plan) => (
              <li key={plan.id} className="flex items-baseline justify-between gap-4 py-2.5">
                <span className="min-w-0 text-muted-foreground">{plan.name}</span>
                <span className="whitespace-nowrap text-end tabular-nums text-foreground">
                  {plan.priceLabel}
                  {plan.cycleLabel ? (
                    <span className="text-muted-foreground"> {plan.cycleLabel}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <a
            href="#investment"
            className={cn("group mt-5 inline-flex items-center gap-2", LINK)}
          >
            {t("columns.plansLink")}
            <ArrowIcon />
          </a>
        </>
      );
    }
    return null;
  };

  const groupHead = (effect: Effect, index: number) => (
    <>
      <div className="flex items-baseline gap-3">
        <span aria-hidden className="text-xs tabular-nums text-muted-foreground ltr:font-mono">
          {formatIndex(index + 1, 2, locale)}
        </span>
        <h3 className="text-lg leading-snug text-foreground md:text-xl">
          {t(`columns.${effect}.title`)}
        </h3>
      </div>
      <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
        {t(`columns.${effect}.lead`)}
      </p>
    </>
  );

  const driversFor = (effect: Effect) =>
    data.drivers.filter((driver) => driver.effect === effect);

  return (
    <div className="border-t-2 border-foreground">
      <div className="py-12 lg:py-16">
        {groupHead("moves", 0)}
        <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <span className="text-muted-foreground">{t("columns.moves.opening")}</span>
          <span className="tabular-nums text-foreground">{data.openingRange}</span>
        </p>

        <ul className="mt-10 list-none border-t border-border-subtle">
          {driversFor("moves").map((driver) => (
            <li
              key={driver.id}
              className="grid gap-6 border-b border-border-subtle py-9 md:grid-cols-2 md:gap-x-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_minmax(0,3fr)] lg:gap-x-14 lg:py-10"
            >
              <div className="min-w-0">
                <h4 className="text-base text-foreground">{t(`drivers.${driver.id}.name`)}</h4>
                <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
                  {t(`drivers.${driver.id}.line`)}
                </p>
              </div>
              <div className="min-w-0 md:col-start-2 md:row-span-2 md:row-start-1 lg:row-span-1">
                {effectFor(driver)}
              </div>
              <div className="min-w-0 md:col-start-1 md:row-start-2 lg:col-start-3 lg:row-start-1">
                {questionRef(driver)}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid lg:grid-cols-2 lg:gap-x-24">
        {(["review", "monthly"] as const).map((effect, offset) => (
          <div key={effect} className="min-w-0 py-12 lg:py-16">
            {groupHead(effect, offset + 1)}
            <ul className="mt-10 list-none border-t border-border-subtle">
              {driversFor(effect).map((driver) => (
                <li key={driver.id} className="border-b border-border-subtle py-9 lg:py-10">
                  <h4 className="text-base text-foreground">{t(`drivers.${driver.id}.name`)}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`drivers.${driver.id}.line`)}
                  </p>
                  {extraFor(driver)}
                  <div className="mt-6">{questionRef(driver)}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
