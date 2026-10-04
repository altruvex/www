import { cn } from "@/lib/utils/utils";
import type { PaymentScheduleView, TermsView } from "@repo/pricing-schema";
import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import { BODY, FIGURE_SHARE, LABEL, MINOR } from "./type";

const SHARE_RULE = [
  "border-t-2 border-foreground",
  "border-t border-foreground/60",
  "border-t border-foreground/30",
] as const;

export async function CommercialTerms({
  locale,
  schedule,
  terms,
  warrantyDays,
}: {
  locale: string;
  schedule: PaymentScheduleView;
  terms: TermsView;
  warrantyDays: string;
}) {
  const t = await getTranslations({ locale, namespace: "pricingModel.terms" });

  const columns = {
    "--pay-cols": schedule.milestones.map((m) => `${m.percent}fr`).join(" "),
  } as CSSProperties;

  const rows: { id: string; label: string; value: string }[] = [
    { id: "vat", label: terms.vatLabel, value: terms.vatNote },
    { id: "revision", label: terms.revisionLabel, value: terms.revisionNote },
    {
      id: "warranty",
      label: t("warranty"),
      value: t("warrantyNote", { days: warrantyDays }),
    },
    { id: "validity", label: t("validity"), value: schedule.validity },
    { id: "ownership", label: t("ownership"), value: schedule.ownership },
  ];

  return (
    <div>
      <p className={cn(LABEL, "mb-6")}>{t("payment")}</p>
      <ol
        style={columns}
        className="grid list-none gap-8 min-[760px]:grid-cols-(--pay-cols) min-[760px]:gap-4"
      >
        {schedule.milestones.map((milestone, index) => (
          <li
            key={milestone.label}
            className={cn(
              SHARE_RULE[index],
              "flex min-w-0 items-baseline justify-between gap-6 pt-6 min-[760px]:block min-[760px]:pt-7",
            )}
          >
            <p className={FIGURE_SHARE}>{milestone.percentLabel}</p>
            <p
              className={cn(
                BODY,
                "max-w-[18ch] text-end text-foreground min-[760px]:mt-4 min-[760px]:text-start",
              )}
            >
              {milestone.label.replace(milestone.percentLabel, "").trim()}
            </p>
          </li>
        ))}
      </ol>

      <dl className="mt-(--section-block) grid gap-x-24 gap-y-14 min-[900px]:grid-cols-2">
        {rows.map((row) => (
          <div key={row.id} className="min-w-0">
            <dt className={MINOR}>{row.label}</dt>
            <dd className={cn(BODY, "mt-3 max-w-[40ch]")}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
