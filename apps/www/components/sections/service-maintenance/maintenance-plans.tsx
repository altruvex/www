"use client";

import { PlanSummary } from "@/components/sections/plan-summary";
import { SectionHeading } from "@/components/sections/section-heading";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import {
  MOTION,
  useSectionCardGrid,
  useSectionDescription,
  useSectionElement,
  useSectionEyebrow,
  useSectionTitle,
} from "@/lib/motion";
import { localizeNumbers } from "@/lib/utils/number";
import { cn } from "@/lib/utils/utils";
import type { MaintenanceView } from "@repo/pricing-schema";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

const QUOTED_TOKENS = 3;

type RowId =
  | "requests"
  | "cadence"
  | "monitoring"
  | "reporting"
  | "support"
  | "turnaround"
  | "portal"
  | "overage";

const ROWS: readonly RowId[] = [
  "requests",
  "cadence",
  "reporting",
  "support",
  "monitoring",
  "turnaround",
  "portal",
  "overage",
];

function Tokens({ plan }: { plan: MaintenanceView }) {
  const count = plan.requestsPerCycle;

  return (
    <ol aria-hidden className="flex list-none flex-wrap gap-1.5 md:gap-2">
      {count === null
        ? Array.from({ length: QUOTED_TOKENS }, (_, index) => (
            <li
              key={index}
              data-token
              className="size-6 md:size-8 rounded-[0.5rem] border border-dashed border-brand/60"
            />
          ))
        : Array.from({ length: count }, (_, index) => (
            <li
              key={index}
              data-token
              className="flex size-6 md:size-8 items-end rounded-[0.5rem] bg-brand p-0.5 md:p-1 text-brand-foreground"
            >
              <span className="text-[9px] md:text-[10px] leading-none tabular-nums ltr:font-mono">
                <Num value={index + 1} pad={2} />
              </span>
            </li>
          ))}
    </ol>
  );
}

export function MaintenancePlans({
  plans,
}: {
  plans: readonly MaintenanceView[];
}) {
  const t = useTranslations("serviceDetails.maintenance");
  const locale = useLocale();

  const eyebrowRef = useSectionEyebrow<HTMLParagraphElement>();
  const titleRef = useSectionTitle<HTMLHeadingElement>();
  const descRef = useSectionDescription<HTMLParagraphElement>();
  const tableRef = useSectionElement<HTMLDivElement>();
  const tokensRef = useSectionCardGrid<HTMLDivElement>({
    selector: "[data-token]",
    direction: "scale",
    stagger: MOTION.stagger.loose,
    delay: MOTION.section.element,
  });
  const outsideRef = useSectionElement<HTMLDivElement>();

  const recommended = Math.max(
    0,
    plans.findIndex((plan) => plan.highlight),
  );

  const notes = (["infra", "scope", "addons"] as const).map((key) => ({
    key,
    label: t(`pricing.notes.${key}.label`),
    value: t(`pricing.notes.${key}.value`),
  }));

  const cell = (plan: MaintenanceView, row: RowId): ReactNode => {
    switch (row) {
      case "requests":
        return (
          <div className="flex flex-col gap-2.5">
            <Tokens plan={plan} />
            <span className="text-sm font-medium text-foreground">
              {plan.requestsPerCycle === null
                ? t("plans.table.values.quoted")
                : t("plans.requests", {
                    count: plan.requestsPerCycle,
                    n: localizeNumbers(String(plan.requestsPerCycle), locale),
                  })}
            </span>
          </div>
        );
      case "cadence":
      case "monitoring":
      case "reporting":
      case "support":
        return plan.compare[row];
      case "turnaround":
        return plan.priorityTurnaround ? (
          <span className="font-medium text-brand-text">
            {t("plans.table.values.priority")}
          </span>
        ) : (
          t("plans.table.values.standard")
        );
      case "portal":
        return t("plans.table.values.included");
      case "overage":
        return plan.overageShort ?? t("plans.table.values.quoted");
    }
  };

  const columnClass = (index: number) =>
    cn(
      "align-top relative transition-colors duration-(--motion-instant)",
      index === recommended && "bg-brand/[0.05]"
    );

  const stickyLabel =
    "sticky start-0 z-20 bg-background max-lg:border-e max-lg:border-border-subtle lg:static";

  return (
    <section
      id="pricing"
      aria-labelledby="maintenance-plans-heading"
      className="accent-world-green scroll-mt-24 border-t border-border-subtle pt-(--section-y-top) pb-(--section-y-bottom)"
    >
      <div className="mx-auto w-full max-w-352 px-4 md:px-8 lg:px-16">
        <SectionHeading
          titleId="maintenance-plans-heading"
          eyebrowRef={eyebrowRef}
          titleRef={titleRef}
          descriptionRef={descRef}
          eyebrow={t("pricing.eyebrow")}
          firstTitle={t("plans.title")}
          secondTitle={t("plans.titleAccent")}
          accent="mint"
          description={t("plans.description")}
          className="mb-12 md:mb-16"
        />
      </div>
      <div ref={tableRef} className="w-full">
        <div
          ref={tokensRef}
          className="w-full ps-0 pe-4 md:pe-8 lg:px-16 lg:mx-auto lg:max-w-352"
        >
          <div
            role="region"
            aria-label={t("plans.table.caption")}
            tabIndex={0}
            data-lenis-prevent
            className="snap-x snap-proximity scroll-ps-36 md:scroll-ps-48 lg:scroll-ps-0 overflow-x-auto overscroll-x-contain scrollbar-none [&::-webkit-scrollbar]:hidden rounded-ctl-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:overflow-visible"
          >
            <table className="w-full min-w-max lg:min-w-0 table-fixed border-separate border-spacing-0 text-start">
              <caption className="sr-only">
                {t("plans.table.caption")}
              </caption>
              <thead>
                <tr>
                  <td
                    className={cn(
                      stickyLabel,
                      "w-36 md:w-48 pb-8 lg:w-[22%] ps-4 md:ps-8 lg:ps-0"
                    )}
                  />
                  {plans.map((plan, index) => (
                    <th
                      key={plan.id}
                      scope="col"
                      className={cn(
                        columnClass(index),
                        "w-67.5 sm:w-75 lg:w-[26%] snap-start px-4 pt-6 pb-8 text-start font-normal lg:px-6",
                        index === recommended && "rounded-t-panel-sm"
                      )}
                    >
                      <PlanSummary
                        name={plan.name}
                        badge={t("pricing.recommended")}
                        recommended={index === recommended}
                        price={plan.priceLabel}
                        cycle={plan.cycleLabel}
                        bestForLabel={t("plans.table.bestFor")}
                        bestFor={plan.compare.bestFor}
                        cta={{
                          href: "/contact",
                          label: t("plans.cta", { name: plan.name }),
                        }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row}>
                    <th
                      scope="row"
                      className={cn(
                        stickyLabel,
                        "w-36 md:w-48 lg:w-[22%] border-t border-border-subtle py-4 md:py-5 ps-4 md:ps-8 lg:ps-0 pe-3 md:pe-4 text-start align-top text-xs md:text-sm font-normal text-muted-foreground"
                      )}
                    >
                      {t(`plans.table.rows.${row}`)}
                    </th>
                    {plans.map((plan, index) => (
                      <td
                        key={plan.id}
                        className={cn(
                          columnClass(index),
                          "border-t border-border-subtle px-4 py-4 md:py-5 text-sm md:text-[0.9375rem] leading-snug text-foreground lg:px-6",
                          row === ROWS[ROWS.length - 1] && index === recommended && "rounded-b-panel-sm"
                        )}
                      >
                        {cell(plan, row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-352 px-4 md:px-8 lg:px-16 mt-14 md:mt-16">
        <div ref={outsideRef}>
          <Eyebrow className="mb-6 text-xs">{t("plans.outside")}</Eyebrow>
          <dl className="grid gap-x-10 gap-y-8 md:grid-cols-3">
            {notes.map((note) => (
              <div key={note.key}>
                <dt className="text-base md:text-lg font-medium text-foreground">
                  {note.label}
                </dt>
                <dd className="mt-1.5 md:mt-2 text-sm md:text-base leading-relaxed text-muted-foreground">
                  {note.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}