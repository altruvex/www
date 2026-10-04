"use client";

import {
  LegalPageLayout,
  LegalSection,
} from "@/components/legal/legal-page-layout";
import { LegalProse } from "@/components/legal/legal-prose";
import { useFillPricingTokens } from "@/components/providers/pricing-tokens-provider";
import { useTranslations } from "next-intl";

type TermsPageClientProps = {
  formattedDate: string;
};

export default function TermsPageClient({ formattedDate }: TermsPageClientProps) {
  const t = useTranslations("terms");
  const fillTokens = useFillPricingTokens();

  return (
    <LegalPageLayout
      namespace="terms"
      formattedDate={formattedDate}
      accentClass="accent-world-orange"
      contents={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((number) => ({
        number,
        title: t(`sections.${number}.title`),
      }))}
    >
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
        <LegalSection key={num} number={num} title={t(`sections.${num}.title`)}>
          <LegalProse content={fillTokens(t.raw(`sections.${num}.description`))} />
        </LegalSection>
      ))}

      <LegalSection number={12} title={t("sections.12.title")}>
        <LegalProse content={t("sections.12.description")} />
      </LegalSection>
    </LegalPageLayout>
  );
}
