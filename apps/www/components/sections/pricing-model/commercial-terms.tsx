import type { PaymentScheduleView, TermsView } from "@repo/pricing-schema";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

/**
 * 04 Commercial terms: one definition list, every value from the schema —
 * the payment split, VAT, the revision rate, the warranty window, proposal
 * validity and ownership at final payment.
 */
export async function CommercialTerms({
  locale,
  schedule,
  terms,
  warrantyDays,
}: {
  locale: string;
  schedule: PaymentScheduleView;
  terms: TermsView;
  /** Localized, from `pricingTokens().warrantyDays`. */
  warrantyDays: string;
}) {
  const t = await getTranslations({ locale, namespace: "pricingModel.terms" });

  const rows: { id: string; label: string; value: ReactNode }[] = [
    {
      id: "payment",
      label: t("payment"),
      value: (
        <ol className="list-none space-y-2">
          {schedule.milestones.map((milestone) => (
            <li key={milestone.label} className="tabular-nums">
              {milestone.label}
            </li>
          ))}
        </ol>
      ),
    },
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
    <dl className="border-t-2 border-foreground">
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid gap-3 border-b border-border-subtle py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10 md:py-9"
        >
          <dt className="text-base text-foreground">{row.label}</dt>
          <dd className="max-w-[56ch] text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem]">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
