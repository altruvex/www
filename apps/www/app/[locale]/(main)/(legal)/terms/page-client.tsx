"use client";

import {
  LegalContactSection,
  LegalPageLayout,
  LegalSection,
} from "@/components/legal/legal-page-layout";
import { LegalProse } from "@/components/legal/legal-prose";
import { SITE_CONFIG } from "@/lib/metadata";
import { useTranslations } from "next-intl";

type TermsPageClientProps = {
  formattedDate: string;
};

export default function TermsPageClient({ formattedDate }: TermsPageClientProps) {
  const t = useTranslations("terms");

  return (
    <LegalPageLayout namespace="terms" formattedDate={formattedDate} accentClass="accent-world-orange">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
        <LegalSection key={num} number={num} title={t(`sections.${num}.title`)}>
          <LegalProse content={t(`sections.${num}.description`)} />
        </LegalSection>
      ))}

      <LegalContactSection
        title={t("sections.12.title")}
        description={t("sections.12.description")}
        email={SITE_CONFIG.email}
      />
    </LegalPageLayout>
  );
}
