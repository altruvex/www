"use client";

import { ArrowIcon } from "@repo/ui";
import { Eyebrow } from "@repo/ui/www";
import { useSectionCardGrid } from "@/lib/motion";
import { useLocale, useTranslations } from "next-intl";
import { ServiceSection } from "@/components/sections/services-index/service-section";
import { localeMeta } from "@/i18n/locale-meta";

const CHANNELS = [
  "architecture",
  "performance",
  "security",
  "searchData",
  "delivery",
  "ownership",
] as const;

export function ScanChannels() {
  const t = useTranslations("serviceDetails.consulting.audit.channels");
  const separator = localeMeta(useLocale()).listSeparator;
  const ledgerRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-channel-row]",
  });

  return (
    <ServiceSection
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
        className="hidden gap-x-10 border-b border-border-subtle pb-4 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
      >
        <Eyebrow className="m-0">{t("questionLabel")}</Eyebrow>
        <Eyebrow className="m-0">{t("returnsLabel")}</Eyebrow>
      </div>

      <ol ref={ledgerRef} className="list-none">
        {CHANNELS.map((id) => {
          const examines = t.raw(`items.${id}.examines`) as string[];
          const returns = t.raw(`items.${id}.returns`) as string[];

          return (
            <li
              key={id}
              data-channel-row
              className="grid gap-x-10 gap-y-6 border-b border-border-subtle py-8 lg:py-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
            >
              <div>
                <Eyebrow tone="accent" className="m-0">
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
                <ul className="list-none lg:mt-1.5">
                  {returns.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 py-2 first:pt-0 last:pb-0 text-base leading-normal text-foreground"
                    >
                      <ArrowIcon
                        motion="none"
                        className="mt-[0.35em] size-4 shrink-0 text-local-accent-text"
                      />
                      <span className="min-w-0">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </ServiceSection>
  );
}
