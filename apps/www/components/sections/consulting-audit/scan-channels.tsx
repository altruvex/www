"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Num } from "@/components/ui/num";
import { useSectionCardGrid } from "@/lib/motion";
import { useLocale, useTranslations } from "next-intl";
import { AuditSection } from "./audit-section";

/** The channels an audit opens, in the order the scope is written. */
const CHANNELS = [
  "architecture",
  "performance",
  "security",
  "searchData",
  "delivery",
  "ownership",
] as const;

/**
 * "Six questions. Six written answers."
 *
 * It turns each channel the audit opens into the question an owner already
 * asks, and sets it beside what comes back in
 * writing. Every row is visible at once — a ledger to read, not a control to
 * operate — and what gets looked at is demoted to one quiet line under the
 * question, because it is the method, not the product.
 *
 * The questions describe the scope, never a client's system; the note under
 * the ledger says so.
 */
export function ScanChannels() {
  const t = useTranslations("serviceDetails.consulting.audit.channels");
  const separator = useLocale() === "ar" ? "، " : " · ";
  const ledgerRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-channel-row]",
  });

  return (
    <AuditSection
      id="scan-plan"
      titleId="consulting-channels-heading"
      eyebrow={t("eyebrow")}
      title={t("title")}
      titleAccent={t("titleAccent")}
      description={t("description")}
      note={t("honesty")}
    >
      <div
        aria-hidden
        className="hidden gap-x-10 border-b border-border pb-4 lg:grid lg:grid-cols-[3rem_minmax(0,7fr)_minmax(0,5fr)]"
      >
        <Eyebrow className="col-span-2 m-0">{t("questionLabel")}</Eyebrow>
        <Eyebrow className="m-0">{t("returnsLabel")}</Eyebrow>
      </div>

      <ol ref={ledgerRef} className="list-none">
        {CHANNELS.map((id, index) => {
          const examines = t.raw(`items.${id}.examines`) as string[];
          const returns = t.raw(`items.${id}.returns`) as string[];

          return (
            <li
              key={id}
              data-channel-row
              className="grid gap-x-10 gap-y-6 border-b border-border-subtle py-[clamp(1.75rem,3vw,2.5rem)] lg:grid-cols-[3rem_minmax(0,7fr)_minmax(0,5fr)]"
            >
              <span
                aria-hidden
                className="hidden text-sm tabular-nums text-muted-foreground lg:block ltr:font-mono"
              >
                <Num value={index + 1} pad={2} />
              </span>

              <div>
                <Eyebrow tone="accent" className="m-0">
                  <span className="text-muted-foreground lg:hidden">
                    <Num value={index + 1} pad={2} />
                    {" — "}
                  </span>
                  {t(`items.${id}.name`)}
                </Eyebrow>
                <h3 className="mt-3 text-balance text-[clamp(1.625rem,3vw,2.625rem)] font-light leading-[1.1] tracking-[-0.025em] text-foreground rtl:leading-[1.4] rtl:tracking-normal">
                  {t(`items.${id}.question`)}
                </h3>
                <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {t("examinesLabel")}:
                  </span>{" "}
                  {examines.join(separator)}
                </p>
              </div>

              <div>
                <Eyebrow className="mb-3 lg:sr-only">{t("returnsLabel")}</Eyebrow>
                <ul className="list-none border-t border-border-subtle lg:mt-1.5">
                  {returns.map((item) => (
                    <li
                      key={item}
                      className="grid grid-cols-[1.5rem_minmax(0,1fr)] border-b border-border-subtle py-3 text-base leading-normal text-foreground"
                    >
                      <span
                        aria-hidden
                        className="inline-block text-local-accent-text rtl:-scale-x-100"
                      >
                        →
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </AuditSection>
  );
}
