import { getPublicPricing } from "@/lib/server/pricing";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import {
  serviceInvestmentViews,
  type InvestmentMatrixView,
  type Locale,
  type ServiceInvestmentId,
  type ServiceInvestmentRowView,
} from "@repo/pricing-schema";
import { getLocale, getTranslations } from "next-intl/server";

/** The register's copy key per service row ("design" reads as "interface"). */
const COPY_KEY: Record<ServiceInvestmentId, string> = {
  design: "interface",
  development: "development",
  audit: "audit",
  maintenance: "maintenance",
};

const CELL_LABEL =
  "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.08em] text-muted-foreground ltr:font-mono rtl:text-xs rtl:normal-case rtl:tracking-normal lg:sr-only";

const FIGURE =
  "text-[clamp(1.125rem,1.6vw,1.375rem)] font-light leading-tight tabular-nums tracking-[-0.02em] rtl:tracking-normal";

async function loadRows(rows?: readonly ServiceInvestmentRowView[]) {
  const locale = await getLocale();
  if (rows) return { locale, rows };
  const pricing = await getPublicPricing();
  return { locale, rows: serviceInvestmentViews(locale as Locale, pricing) };
}

/** The twelve published ranges, unnamed: project type × complexity. */
function Matrix({
  matrix,
  head,
}: {
  matrix: InvestmentMatrixView;
  head: string;
}) {
  return (
    <>
      <table className="hidden w-full border-collapse text-sm md:table">
        <thead>
          <tr className="border-b border-border-subtle text-start">
            <th scope="col" className="py-3 pe-4 text-start font-normal text-muted-foreground">
              {head}
            </th>
            {matrix.bands.map((band) => (
              <th
                key={band.id}
                scope="col"
                className="py-3 pe-4 text-start font-normal text-muted-foreground last:pe-0"
              >
                {band.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.serviceId} className="border-b border-border-subtle/60 last:border-b-0">
              <th scope="row" className="py-4 pe-4 text-start font-normal text-foreground">
                {row.name}
              </th>
              {row.cells.map((cell) => (
                <td key={cell.complexityId} className="py-4 pe-4 align-top last:pe-0">
                  <span className="block tabular-nums text-foreground">{cell.priceLabel}</span>
                  <span className="block text-xs text-muted-foreground">{cell.weeksLabel}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="list-none md:hidden">
        {matrix.rows.map((row) => (
          <li key={row.serviceId} className="border-b border-border-subtle/60 py-4 last:border-b-0">
            <p className="text-sm text-foreground">{row.name}</p>
            <dl className="mt-2 divide-y divide-border-subtle/40 text-sm">
              {row.cells.map((cell, index) => (
                <div key={cell.complexityId} className="flex items-baseline justify-between gap-4 py-1.5">
                  <dt className="text-muted-foreground">{matrix.bands[index]?.label}</dt>
                  <dd className="text-end">
                    <span className="block tabular-nums text-foreground">{cell.priceLabel}</span>
                    <span className="block text-xs text-muted-foreground">{cell.weeksLabel}</span>
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

/**
 * The service investment register: one hairline row per service line, every
 * figure from the resolved pricing. Custom development discloses its twelve
 * published ranges in a native <details>. Reusable on any server-rendered
 * page; pass `rows` when the page already resolved them.
 */
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
        <ul className="w-full divide-y divide-border-subtle/60 text-sm">
          {row.plans.map((plan) => (
            <li key={plan.id} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
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
      );
    }
    if (row.isScopedPerProject) {
      return <p className="text-base text-foreground">{t("interface.figure")}</p>;
    }
    return (
      <p className={cn(FIGURE, row.id === "development" ? "text-brand-text" : "text-foreground")}>
        {row.figureLabel}
      </p>
    );
  };

  return (
    <div className={className}>
      <div
        aria-hidden
        className="hidden border-b border-border-subtle pb-4 text-[0.6875rem] uppercase tracking-[0.08em] text-muted-foreground ltr:font-mono rtl:text-xs rtl:normal-case rtl:tracking-normal lg:grid lg:grid-cols-[2.5fr_4fr_3fr_2.5fr] lg:gap-10"
      >
        <span>{t("columns.service")}</span>
        <span>{t("columns.covers")}</span>
        <span>{t("columns.how")}</span>
        <span className="text-end">{t("columns.figure")}</span>
      </div>

      <ul className="list-none border-t-2 border-foreground lg:border-t-0">
        {rows.map((row) => {
          const key = COPY_KEY[row.id];
          const covers =
            row.id === "audit" && row.audit
              ? t("audit.covers", { duration: row.audit.duration })
              : t(`${key}.covers`);

          return (
            <li key={row.id} className="border-b border-border-subtle">
              <div className="grid gap-6 py-9 lg:grid-cols-[2.5fr_4fr_3fr_2.5fr] lg:gap-10 lg:py-12">
                <div className="min-w-0">
                  <h3 className="text-lg leading-snug text-foreground">{t(`${key}.name`)}</h3>
                </div>
                <div className="min-w-0 text-sm leading-relaxed text-muted-foreground">
                  <span className={CELL_LABEL}>{t("columns.covers")}</span>
                  <p>{covers}</p>
                  {row.matrix ? (
                    <p className="mt-3 text-foreground">
                      {row.matrix.rows.map((matrixRow) => matrixRow.name).join(" · ")}
                    </p>
                  ) : null}
                  {row.audit?.creditAmountLabel ? (
                    <p className="mt-3 text-foreground">{row.audit.creditIfBuild}</p>
                  ) : null}
                </div>
                <div className="min-w-0 text-sm leading-relaxed text-foreground">
                  <span className={CELL_LABEL}>{t("columns.how")}</span>
                  <p>{t(`${key}.how`)}</p>
                </div>
                <div className="flex min-w-0 flex-col items-start lg:items-end lg:text-end">
                  <span className={CELL_LABEL}>{t("columns.figure")}</span>
                  {figureFor(row)}
                </div>
              </div>

              {row.matrix ? (
                <details className="group/details border-t border-border-subtle/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-ctl-xs py-5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
                    <span>
                      {t("development.more", {
                        count: localizeNumbers(String(row.matrix.cellCount), locale),
                      })}
                    </span>
                    <span
                      aria-hidden
                      className="text-lg leading-none text-muted-foreground transition-transform duration-(--motion-hover) group-open/details:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="pb-8 pt-2">
                    <Matrix matrix={row.matrix} head={t("development.matrixHead")} />
                  </div>
                </details>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
