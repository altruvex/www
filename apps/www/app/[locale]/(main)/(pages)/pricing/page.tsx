import { JsonLd } from "@/components/seo/json-ld";
import { generateRouteMetadata, type RouteMetaKey } from "@/lib/metadata";
import {
  buildFaqPageSchemas,
  buildPageSchemas,
  buildPricingOfferSchemas,
} from "@/lib/schema";
import { getTranslations } from "next-intl/server";
import PageClient from "./page-client";

const metaKey: RouteMetaKey = "pricing";
const pathSuffix = "/pricing";
const pricingTierKeys = [
  "essential",
  "professional",
  "ecommerce",
  "flagship",
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateRouteMetadata(locale, metaKey, pathSuffix);
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  const commercialPricing = await getTranslations({
    locale,
    namespace: "commercial.pricing",
  });
  const faqEntries = Object.values(
    t.raw("faq.questions") as Record<string, { a: string; q: string }>,
  ).map((entry) => ({
    answer: entry.a,
    question: entry.q,
  }));
  const tiers = t.raw("tiers") as Record<
    (typeof pricingTierKeys)[number],
    {
      features: string[];
      idealFor: string;
      priceRange: string;
    }
  >;
  const offerEntries = pricingTierKeys.map((key) => ({
    description: tiers[key].idealFor,
    features: tiers[key].features,
    name: commercialPricing(`${key}.buyerLabel`),
    price: tiers[key].priceRange,
  }));

  return (
    <>
      <JsonLd
        schemas={[
          ...buildPageSchemas(locale, metaKey),
          ...buildFaqPageSchemas(faqEntries),
          ...buildPricingOfferSchemas(locale, offerEntries),
        ]}
      />
      <PageClient />
    </>
  );
}
