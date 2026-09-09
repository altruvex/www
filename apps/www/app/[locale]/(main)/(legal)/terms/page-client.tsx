"use client";

import {
  LegalContactSection,
  LegalPageLayout,
  LegalSection,
} from "@/components/legal/legal-page-layout";
import { LegalProse } from "@/components/legal/legal-prose";
import { useFillPricingTokens } from "@/components/providers/pricing-tokens-provider";
import { SITE_CONFIG } from "@/lib/metadata";
import { useTranslations } from "next-intl";

type TermsPageClientProps = {
  formattedDate: string;
};

export default function TermsPageClient({ formattedDate }: TermsPageClientProps) {
  const t = useTranslations("terms");
  // The warranty section states the post-launch support window, which is the
  // same term the contract grants and /transparency publishes. It is carried
  // as a {token} and filled from the resolved pricing, so the two cannot say
  // different numbers. `t.raw` because the fill happens here, not in ICU.
  const fillTokens = useFillPricingTokens();

  return (
    <LegalPageLayout namespace="terms" formattedDate={formattedDate} accentClass="accent-world-orange">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
        <LegalSection key={num} number={num} title={t(`sections.${num}.title`)}>
          <LegalProse content={fillTokens(t.raw(`sections.${num}.description`))} />
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
