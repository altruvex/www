import {
   fillPricingTokens,
   type Locale,
   type ResolvedPricing,
} from "@repo/pricing-schema";
import { useLocale, useTranslations } from "next-intl";
import { accentWorldClass, serviceWorld } from "@/lib/config/accent-world";
import { cn } from "@/lib/utils/utils";
import { FaqSectionView } from "./faq-section";
import { plainFaqItems } from "@/lib/faq";

type TechnicalFaq = {
   a: string;
   q: string;
};

export function ConsultingFaqSection({
   pricing,
}: {
   pricing?: ResolvedPricing;
}) {
   const t = useTranslations("serviceDetails.consulting.seo");
   const tFaq = useTranslations("faq");
   const locale = useLocale() as Locale;
   const faqItems = (t.raw("faq.items") as TechnicalFaq[]).map((item) => ({
      q: fillPricingTokens(item.q, locale, pricing),
      a: fillPricingTokens(item.a, locale, pricing),
   }));
   return (
      <FaqSectionView
         eyebrow={tFaq("eyebrow")}
         title={t("faq.title")}
         items={plainFaqItems(faqItems)}
         className={cn(
            "bg-background",
            accentWorldClass(serviceWorld("consulting")),
         )}
      />
   );
}
