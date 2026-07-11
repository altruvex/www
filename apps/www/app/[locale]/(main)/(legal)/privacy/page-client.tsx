"use client";

import {
  LegalContactSection,
  LegalPageLayout,
  LegalSection,
} from "@/components/legal/legal-page-layout";
import { LegalDetails, LegalList, LegalProse } from "@/components/legal/legal-prose";
import { SITE_CONFIG } from "@/lib/metadata";
import { useTranslations } from "next-intl";

type PrivacyPageClientProps = {
  formattedDate: string;
};

export default function PrivacyPageClient({ formattedDate }: PrivacyPageClientProps) {
  const t = useTranslations("privacy");

  const sectionTwoItems = [
    t("sections.2.item1"),
    t("sections.2.item2"),
    t("sections.2.item3"),
    t("sections.2.item4"),
  ];

  const sectionFourItems = [
    t("sections.4.item1"),
    t("sections.4.item2"),
    t("sections.4.item3"),
    t("sections.4.item4"),
  ];

  const sectionOneDetails = [
    { label: t("sections.1.contactLabel"), value: t("sections.1.contactValue") },
    { label: t("sections.1.projectLabel"), value: t("sections.1.projectValue") },
    { label: t("sections.1.techLabel"), value: t("sections.1.techValue") },
  ];

  return (
    <LegalPageLayout namespace="privacy" formattedDate={formattedDate}>
      <LegalSection number={1} title={t("sections.1.title")}>
        <LegalProse content={t("sections.1.description")} />
        <LegalDetails details={sectionOneDetails} />
      </LegalSection>

      <LegalSection number={2} title={t("sections.2.title")}>
        <LegalProse content={t("sections.2.description")} />
        <LegalList items={sectionTwoItems} />
      </LegalSection>

      <LegalSection number={3} title={t("sections.3.title")}>
        <LegalProse content={t("sections.3.description")} />
      </LegalSection>

      <LegalSection number={4} title={t("sections.4.title")}>
        <LegalProse content={t("sections.4.description")} />
        <LegalList items={sectionFourItems} />
      </LegalSection>

      {[5, 6, 7, 8].map((num) => (
        <LegalSection key={num} number={num} title={t(`sections.${num}.title`)}>
          <LegalProse content={t(`sections.${num}.description`)} />
        </LegalSection>
      ))}

      <LegalContactSection
        title={t("sections.9.title")}
        description={t("sections.9.description")}
        email={SITE_CONFIG.email}
      />
    </LegalPageLayout>
  );
}
