import { getPublicPricing } from "@/lib/server/pricing";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import {
  serviceInvestmentViews,
  WORKED_EXAMPLE_INPUT,
  type InvestmentCellView,
  type InvestmentMatrixView,
  type Locale,
  type ServiceInvestmentId,
  type ServiceInvestmentRowView,
} from "@repo/pricing-schema";
import { getLocale, getTranslations } from "next-intl/server";
import { BODY, FIGURE, FIGURE_INLINE, LABEL, SUBHEAD } from "./type";

const COPY_KEY: Record<ServiceInvestmentId, string> = {
  design: "interface",
  development: "development",
  audit: "audit",
  maintenance: "maintenance",
};

const ROW_Y = "py-[clamp(3rem,7vh,5rem)]";

const FOCUS =
  "rounded-ctl-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

async function loadRows(rows?: readonly ServiceInvestmentRowView[]) {
  const locale = await getLocale();
  if (rows) return { locale, rows };
  const pricing = await getPublicPricing();
  return { locale, rows: serviceInvestmentViews(locale as Locale, pricing) };
}

function isWorkedCell(cell: InvestmentCellView) {
  return (
    cell.serviceId === WORKED_EXAMPLE_INPUT.serviceId &&
    cell.complexityId === WORKED_EXAMPLE_INPUT.complexityId
  );
}

function CellFigure({ cell }: { cell: InvestmentCellView }) {
  return (
    <>
      <span
        className={cn(
          FIGURE_INLINE,
          "block whitespace-nowrap",
          isWorkedCell(cell) && "text-brand-text",
        )}
      >
        {cell.priceLabel}
      </span>
      <span className={cn(LABEL, "mt-1 block")}>{cell.weeksLabel}</span>
    </>
  );
}

function Matrix({
  matrix,
  head,
  labelledBy,
}: {
  matrix: InvestmentMatrixView;
  head: string;
  labelledBy: string;
}) {
  return (
    <>
      <div
        role="region"
        aria-labelledby={labelledBy}
        tabIndex={0}
        className={cn("hidden overflow-x-auto lg:block", FOCUS)}
      >
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle">
              <th
                scope="col"
                className={cn(LABEL, "px-4 xl:px-6 pb-5 text-start align-bottom font-normal first:ps-0")}
              >
                {head}
              </th>
              {matrix.bands.map((band) => (
                <th
                  key={band.id}
                  scope="col"
                  className={cn(LABEL, "px-4 xl:px-6 pb-5 text-start align-bottom font-normal last:pe-0")}
                >
                  {band.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.serviceId} className="border-b border-border-subtle last:border-b-0">
                <th
                  scope="row"
                  className={cn(BODY, "py-5 pe-6 text-start align-top font-normal text-foreground")}
                >
                  {row.name}
                </th>
                {row.cells.map((cell) => (
                  <td key={cell.complexityId} className="px-4 xl:px-6 py-5 text-start align-top last:pe-0">
                    <CellFigure cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="list-none lg:hidden">
        {matrix.rows.map((row) => (
          <li key={row.serviceId} className="border-b border-border-subtle py-5 last:border-b-0">
            <p className={cn(BODY, "text-foreground")}>{row.name}</p>
            <dl className="mt-4 grid gap-4">
              {row.cells.map((cell, index) => (
                <div key={cell.complexityId} className="flex items-baseline justify-between gap-4">
                  <dt className={LABEL}>{matrix.bands[index]?.label}</dt>
                  <dd className="text-end">
                    <CellFigure cell={cell} />
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export async function ServiceInvestmentRegister({
  rows: givenRows,
  className,
}: {
  rows?: readonly ServiceInvestmentRowView[];
  className?: string;
}) {
  const { locale, rows } = await loadRows(givenRows);
  const t = await getTranslations({ locale, namespace: "pricingModel.register" });

  const figureFor = (row: ServiceInvestmentRowView) => {
    if (row.id === "maintenance" && row.plans) {
      return (
        <ul className="w-full list-none">
          {row.plans.map((plan) => (
            <li
              key={plan.id}
              className="flex items-baseline justify-between gap-6 border-t border-border-subtle py-5 text-start first:border-t-0 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className={cn(BODY, "text-foreground")}>{plan.name}</p>
                {plan.features[0] ? (
                  <p className={cn(LABEL, "mt-1 max-w-[40ch]")}>{plan.features[0]}</p>
                ) : null}
              </div>
              <p className="shrink-0 whitespace-nowrap text-end">
                <span className={FIGURE_INLINE}>{plan.priceLabel}</span>
                {plan.cycleLabel ? (
                  <span className={LABEL}> {plan.cycleLabel}</span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      );
    }
    if (row.isScopedPerProject) {
      return <p className={FIGURE}>{t("interface.figure")}</p>;
    }
    return <p className={cn(FIGURE, "whitespace-nowrap")}>{row.figureLabel}</p>;
  };

  return (
    <ul className={cn("list-none", className)}>
      {rows.map((row) => {
        const key = COPY_KEY[row.id];
        const covers =
          row.id === "audit" && row.audit
            ? t("audit.covers", { duration: row.audit.duration })
            : t(`${key}.covers`);
        const summaryId = `investment-${row.id}-ranges`;

        return (
          <li key={row.id} className="border-t border-border-subtle first:border-t-0">
            <div
              className={cn(
                "grid gap-x-16 gap-y-6 min-[1000px]:grid-cols-[minmax(0,3.5fr)_minmax(0,4fr)_minmax(0,4.5fr)]",
                ROW_Y,
              )}
            >
              <h3 className={cn(SUBHEAD, "min-w-0")}>{t(`${key}.name`)}</h3>

              <div className="min-w-0">
                <p className={cn(BODY, "max-w-[40ch]")}>{covers}</p>
                {row.matrix ? (
                  <p className={cn(BODY, "mt-5 max-w-[40ch] text-foreground")}>
                    {row.matrix.rows.map((matrixRow) => matrixRow.name).join(" · ")}
                  </p>
                ) : null}
                {row.audit?.creditAmountLabel ? (
                  <p className={cn(BODY, "mt-5 max-w-[40ch] text-foreground")}>
                    {row.audit.creditIfBuild}
                  </p>
                ) : null}
                <p className={cn(LABEL, "mt-5 max-w-[40ch]")}>{t(`${key}.how`)}</p>
              </div>

              <div className="flex min-w-0 flex-col items-start min-[1000px]:items-end min-[1000px]:text-end">
                {figureFor(row)}
              </div>
            </div>

            {row.matrix ? (
              <details className="group/details pb-[clamp(3rem,7vh,5rem)]">
                <summary
                  className={cn(
                    "inline-flex cursor-pointer list-none items-center gap-3 font-medium text-brand-text [&::-webkit-details-marker]:hidden",
                    FOCUS,
                  )}
                >
                  <span id={summaryId}>
                    {t("development.more", {
                      count: localizeNumbers(String(row.matrix.cellCount), locale),
                    })}
                  </span>
                  <span
                    aria-hidden
                    className="text-[1.375rem] leading-none transition-transform duration-(--motion-hover) group-open/details:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="pt-10">
                  <Matrix
                    matrix={row.matrix}
                    head={t("development.matrixHead")}
                    labelledBy={summaryId}
                  />
                </div>
              </details>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
