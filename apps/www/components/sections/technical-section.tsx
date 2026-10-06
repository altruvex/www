"use client";

import { useFillPricingTokens } from "@/components/providers/pricing-tokens-provider";
import { accentWorldClass, type AccentPalette } from "@/lib/config/accent-world";
import { plainFaqItems } from "@/lib/faq";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { FaqSectionView } from "./faq-section";

type ServiceFaq = {
  a: string;
  q: string;
};

/*
 * The questions block on the services pages. `namespace` points at an object
 * with `title` and `items: { q, a }[]`; the page's FAQPage JSON-LD reads the
 * same key (services/_shared/service-faq-schema.ts), so the two never drift.
 */
export function ServiceFaqSection({
  namespace,
  world,
}: {
  namespace: string;
  world?: AccentPalette;
}) {
  const t = useTranslations(namespace);
  const tFaq = useTranslations("faq");
  const fill = useFillPricingTokens();
  const faqItems = (t.raw("items") as ServiceFaq[]).map((item) => ({
    q: fill(item.q),
    a: fill(item.a),
  }));

  return (
    <FaqSectionView
      eyebrow={tFaq("eyebrow")}
      title={t("title")}
      items={plainFaqItems(faqItems)}
      className={cn("bg-background", world ? accentWorldClass(world) : undefined)}
    />
  );
}
