"use client";

import {
  LegalPageLayout,
  LegalSection,
  LegalSummary,
} from "@/components/legal/legal-page-layout";
import { LegalDetails, LegalList, LegalProse } from "@/components/legal/legal-prose";
import { localizeNumbers } from "@/lib/utils/number";
import { useLocale, useTranslations } from "next-intl";

const SECTION_COUNT = 13;

type PrivacyPageClientProps = {
  formattedDate: string;
};

export default function PrivacyPageClient({ formattedDate }: PrivacyPageClientProps) {
  const t = useTranslations("privacy");
  const locale = useLocale();

  const sections = Array.from({ length: SECTION_COUNT }, (_, i) => i + 1);

  return (
    <LegalPageLayout
      namespace="privacy"
      formattedDate={formattedDate}
      contents={sections.map((number) => ({
        number,
        title: t(`sections.${number}.title`),
      }))}
      summary={
        <LegalSummary
          eyebrow={t("summary.eyebrow")}
          items={t.raw("summary.items") as Array<{ section: number; text: string }>}
          note={t("summary.note")}
          sectionLabel={(number) =>
            t("summary.sectionLabel", { number: localizeNumbers(String(number), locale) })
          }
        />
      }
    >
      {sections.map((number) => {
        const key = `sections.${number}`;
        return (
          <LegalSection key={number} number={number} title={t(`${key}.title`)}>
            <LegalProse content={t(`${key}.description`)} />
            {t.has(`${key}.details`) ? (
              <LegalDetails
                details={t.raw(`${key}.details`) as Array<{ label: string; value: string }>}
              />
            ) : null}
            {t.has(`${key}.items`) ? (
              <LegalList items={t.raw(`${key}.items`) as string[]} />
            ) : null}
            {t.has(`${key}.after`) ? (
              <LegalProse className="mt-6" content={t(`${key}.after`)} />
            ) : null}
          </LegalSection>
        );
      })}
    </LegalPageLayout>
  );
}
