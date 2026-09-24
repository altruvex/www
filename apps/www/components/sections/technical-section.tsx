import {
   fillPricingTokens,
   type Locale,
   type ResolvedPricing,
} from "@repo/pricing-schema";
import { useLocale, useTranslations } from "next-intl";
import { accentWorldClass, serviceWorld } from "@/lib/config/accent-world";
import { cn } from "@/lib/utils/utils";
import { Container } from "../shared/container";
import { Eyebrow } from "../ui/eyebrow";
import { FaqSectionView } from "./faq-section";
import { plainFaqItems } from "@/lib/faq";

type TechnicalFaq = {
   a: string;
   q: string;
};

/*
 * The consulting page's reference content, split in two because the halves do
 * different jobs and belong at different points of the page. The scope answers
 * "what would you actually look at, and what would I get" - it has to come
 * before the fixed-price offer, or the price arrives before its contents. The
 * FAQ answers the objections a visitor has once they have seen that price, so
 * it sits between the offer and the closing call to action. Both stay server
 * components and reach the client page as slots, so this text ships as HTML
 * with no client JavaScript.
 */

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
