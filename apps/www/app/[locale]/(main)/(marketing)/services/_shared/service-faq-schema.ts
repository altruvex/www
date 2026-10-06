import { buildFaqPageSchemas } from "@/lib/schema";
import type { ResolvedPricing } from "@repo/pricing-schema";
import { getTranslations } from "next-intl/server";

type ServiceFaq = { q: string; a: string };

/*
 * FAQPage JSON-LD for a services page, read from the same message key the
 * visible ServiceFaqSection renders, with live pricing tokens filled in.
 */
export async function serviceFaqSchemas(
  locale: string,
  namespace: string,
  pricing: ResolvedPricing,
) {
  const t = await getTranslations({ locale, namespace });
  const entries = (t.raw("items") as ServiceFaq[]).map((item) => ({
    answer: item.a,
    question: item.q,
  }));
  return buildFaqPageSchemas(entries, locale, pricing);
}
